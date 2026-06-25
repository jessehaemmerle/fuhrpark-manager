import "server-only";

import type { NotificationType, UserRole } from "@prisma/client";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export type NotifyInput = {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  entityType?: string;
  entityId?: string;
  /** Override e-mail delivery. Defaults to the recipient's `notifyByEmail` preference. */
  email?: boolean;
};

export async function notifyUser(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url,
      entityType: input.entityType,
      entityId: input.entityId
    }
  });

  if (input.email ?? true) {
    const recipient = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, active: true, notifyByEmail: true }
    });

    if (recipient?.active && recipient.notifyByEmail) {
      const link = input.url ? `${getAppUrl()}${input.url}` : getAppUrl();
      const result = await sendMail({
        to: recipient.email,
        subject: input.title,
        text: `${input.body ?? input.title}\n\n${link}`
      });
      if (result.delivered) {
        await prisma.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
      }
    }
  }

  return notification;
}

const MANAGER_ROLES: UserRole[] = ["OWNER", "FLEET_MANAGER"];

/** Fan a notification out to every active manager/owner of a company. */
export async function notifyCompanyManagers(
  companyId: string,
  input: Omit<NotifyInput, "companyId" | "userId">,
  options?: { excludeUserId?: string }
) {
  const managers = await prisma.user.findMany({
    where: {
      companyId,
      active: true,
      role: { in: MANAGER_ROLES },
      id: options?.excludeUserId ? { not: options.excludeUserId } : undefined
    },
    select: { id: true }
  });

  await Promise.all(managers.map((manager) => notifyUser({ ...input, companyId, userId: manager.id })));
  return managers.length;
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
