"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validators";

export async function markNotificationRead(formData: FormData) {
  const user = await requireAuth();
  const notificationId = idSchema.parse(formData.get("notificationId"));

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() }
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() }
  });

  revalidatePath("/notifications");
}

export async function deleteNotification(formData: FormData) {
  const user = await requireAuth();
  const notificationId = idSchema.parse(formData.get("notificationId"));

  await prisma.notification.deleteMany({
    where: { id: notificationId, userId: user.id }
  });

  revalidatePath("/notifications");
}
