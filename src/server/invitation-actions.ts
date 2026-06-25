"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword, requireOwner, requireAuth, setSessionCookie } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import {
  buildInvitationUrl,
  generatePasswordToken,
  hashPasswordToken,
  invitationExpiry,
  shouldExposePasswordResetLink
} from "@/lib/password-tokens";
import { assertWithinPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { toFormDataObject } from "@/lib/utils";
import { idSchema, invitationAcceptSchema, invitationSchema } from "@/lib/validators";

function redirectToInvitationError(message: string): never {
  const params = new URLSearchParams({ inviteError: message.slice(0, 300) });
  redirect(`/invitations?${params.toString()}#new-invitation`);
}

export async function createInvitation(formData: FormData) {
  const actor = await requireAuth();
  requireOwner(actor);
  const parsed = invitationSchema.safeParse(toFormDataObject(formData));
  if (!parsed.success) {
    redirectToInvitationError(parsed.error.issues[0]?.message ?? "Bitte Eingaben pruefen.");
  }
  const data = parsed.data;
  let link: string | null = null;

  try {
    if (data.role === "PLATFORM_ADMIN") {
      throw new Error("Diese Rolle darf nicht per Einladung vergeben werden.");
    }
    await assertWithinPlan(actor.companyId, "users");

    const existingUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existingUser) {
      throw new Error("Es existiert bereits ein Konto mit dieser E-Mail.");
    }

    const pending = await prisma.invitation.findFirst({
      where: { companyId: actor.companyId, email: data.email, status: "PENDING" },
      select: { id: true }
    });
    if (pending) {
      throw new Error("Für diese E-Mail ist bereits eine Einladung offen.");
    }

    if (data.departmentId) {
      await prisma.department.findFirstOrThrow({ where: { id: data.departmentId, companyId: actor.companyId } });
    }

    const token = generatePasswordToken();
    const invitation = await prisma.invitation.create({
      data: {
        companyId: actor.companyId,
        email: data.email,
        name: data.name,
        role: data.role,
        departmentId: data.departmentId,
        tokenHash: hashPasswordToken(token),
        invitedById: actor.id,
        expiresAt: invitationExpiry()
      }
    });

    const acceptUrl = buildInvitationUrl(token);
    await sendMail({
      to: data.email,
      subject: "Einladung zu Fleetbase",
      text: `Sie wurden zu Fleetbase eingeladen. Konto aktivieren:\n\n${acceptUrl}\n\nDer Link ist 7 Tage gültig.`
    });
    if (shouldExposePasswordResetLink()) {
      link = acceptUrl;
    }

    await writeAuditLog({
      companyId: actor.companyId,
      actorUserId: actor.id,
      action: "invitation.created",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: { email: data.email, role: data.role }
    });
  } catch (error) {
    redirectToInvitationError(error instanceof Error ? error.message : "Einladung konnte nicht erstellt werden.");
  }

  revalidatePath("/invitations");
  const params = new URLSearchParams({ invited: "1" });
  if (link) params.set("link", link);
  redirect(`/invitations?${params.toString()}#new-invitation`);
}

export async function revokeInvitation(formData: FormData) {
  const actor = await requireAuth();
  requireOwner(actor);
  const invitationId = idSchema.parse(formData.get("invitationId"));
  const invitation = await prisma.invitation.findFirstOrThrow({
    where: { id: invitationId, companyId: actor.companyId }
  });

  if (invitation.status === "PENDING") {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "REVOKED" } });
  }

  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "invitation.revoked",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: { email: invitation.email }
  });
  revalidatePath("/invitations");
}

export async function acceptInvitation(formData: FormData) {
  const parsed = invitationAcceptSchema.safeParse(toFormDataObject(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Bitte Eingaben pruefen.";
    redirect(`/invite/error?reason=${encodeURIComponent(message)}`);
  }
  const data = parsed.data;
  let redirectTo = "/dashboard";

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { tokenHash: hashPasswordToken(data.token), status: "PENDING", expiresAt: { gt: new Date() } },
      include: { company: true }
    });

    if (!invitation) {
      throw new Error("Der Einladungslink ist ungültig oder abgelaufen.");
    }
    if (!invitation.company.active) {
      throw new Error("Der Mandant ist nicht aktiv. Bitte den Administrator kontaktieren.");
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    if (existingUser) {
      throw new Error("Für diese E-Mail existiert bereits ein Konto. Bitte einloggen.");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId: invitation.companyId,
          departmentId: invitation.departmentId,
          name: data.name,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          active: true,
          driverApproved: invitation.role === "OWNER" || invitation.role === "FLEET_MANAGER",
          passwordChangedAt: new Date()
        },
        select: { id: true, companyId: true, role: true }
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedUserId: created.id }
      });
      return created;
    });

    await writeAuditLog({
      companyId: invitation.companyId,
      actorUserId: user.id,
      action: "invitation.accepted",
      entityType: "User",
      entityId: user.id,
      metadata: { email: invitation.email, role: invitation.role }
    });

    await setSessionCookie(user);
    redirectTo = user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard";
  } catch (error) {
    redirect(`/invite/error?reason=${encodeURIComponent(error instanceof Error ? error.message : "Aktivierung fehlgeschlagen.")}`);
  }

  redirect(redirectTo);
}
