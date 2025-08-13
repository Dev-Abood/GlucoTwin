// notification-panel-actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NotificationType } from "@prisma/client";

export type PanelNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.JsonValue; // matches Prisma Json?
  isRead: boolean;
  isArchived: boolean;
  timestamp: string; // ISO string
};

// Resolve whether the current user exists as Patient and/or Doctor (using Clerk userId)
async function resolveRecipientIds(userId: string) {
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.doctor.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  return { patientId: patient?.id ?? null, doctorId: doctor?.id ?? null };
}

/** Fetch last 50 notifications for the signed-in user (patient and/or doctor). */
export async function fetchMyNotifications(): Promise<{
  notifications: PanelNotification[];
  error?: string;
}> {
  const { userId } = await auth();
  if (!userId) return { notifications: [], error: "Not authenticated" };

  const { patientId, doctorId } = await resolveRecipientIds(userId);
  if (!patientId && !doctorId) {
    return { notifications: [], error: "No recipient record found" };
  }

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        patientId ? { patientId } : undefined,
        doctorId ? { doctorId } : undefined,
      ].filter(Boolean) as any,
    },
    orderBy: { createdAt: "desc" }, // newest first
    take: 50,
  });

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.content,
      metadata: n.metadata ?? undefined,
      isRead: n.isRead,
      isArchived: n.isArchived,
      timestamp: n.createdAt.toISOString(),
    })),
  };
}

/** Mark a single notification as read (only if it belongs to the current user). */
export async function markMyNotificationAsRead(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated" };

  const { patientId, doctorId } = await resolveRecipientIds(userId);
  if (!patientId && !doctorId) return { success: false, error: "No recipient record found" };

  await prisma.notification.updateMany({
    where: {
      id,
      OR: [
        patientId ? { patientId } : undefined,
        doctorId ? { doctorId } : undefined,
      ].filter(Boolean) as any,
    },
    data: { isRead: true, readAt: new Date() },
  });

  return { success: true };
}

/** Archive a single notification (only if it belongs to the current user). */
export async function archiveMyNotification(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated" };

  const { patientId, doctorId } = await resolveRecipientIds(userId);
  if (!patientId && !doctorId) return { success: false, error: "No recipient record found" };

  await prisma.notification.updateMany({
    where: {
      id,
      OR: [
        patientId ? { patientId } : undefined,
        doctorId ? { doctorId } : undefined,
      ].filter(Boolean) as any,
    },
    data: { isArchived: true, isRead: true, readAt: new Date() },
  });

  return { success: true };
}

/** Archive all inbox notifications for the current user. */
export async function archiveAllMyInbox(): Promise<{
  success: boolean;
  error?: string;
  updated: number;
}> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated", updated: 0 };

  const { patientId, doctorId } = await resolveRecipientIds(userId);
  if (!patientId && !doctorId) {
    return { success: false, error: "No recipient record found", updated: 0 };
  }

  const res = await prisma.notification.updateMany({
    where: {
      isArchived: false,
      OR: [
        patientId ? { patientId } : undefined,
        doctorId ? { doctorId } : undefined,
      ].filter(Boolean) as any,
    },
    data: { isArchived: true, isRead: true, readAt: new Date() },
  });

  return { success: true, updated: res.count };
}
