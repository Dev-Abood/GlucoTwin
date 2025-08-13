"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { createMessageNotificationForDoctor } from "@/components/notifications/notification-actions";

const prisma = new PrismaClient();

// Fetch messages for a given patientAssignment
export async function getMessages(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const messages = await prisma.message.findMany({
    where: { patientAssignmentId },
    orderBy: { timestamp: "asc" },
  });

  return messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
}

// Send a message from doctor -> patient
export async function sendMessageToPatient(patientAssignmentId: string, content: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Create the message
  const newMessage = await prisma.message.create({
    data: {
      patientAssignmentId,
      senderId: userId,
      senderType: "DOCTOR",
      content,
    },
  });

  // Get recipient (patient) + sender (doctor) info in ONE query
  const pa = await prisma.patientAssignment.findUnique({
    where: { id: patientAssignmentId },
    select: {
      patientId: true,
      doctor: { select: { id: true, name: true } },
    },
  });

  if (!pa) return { error: "PatientAssignment not found" };

  await createMessageNotificationForDoctor(
    pa.patientId,         
    pa.doctor?.name ?? "",
    newMessage.id         
  );

  await prisma.patientAssignment.update({
    where: { id: patientAssignmentId },
    data: { hasMessageForPatient: true },
  });

  return {
    ...newMessage,
    timestamp: new Date(newMessage.timestamp),
  };
}


// Mark messages as read (doctor has read patient's messages)
export async function markMessagesAsRead(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  await prisma.patientAssignment.update({
    where: { id: patientAssignmentId },
    data: { hasMessageForDoctor: false },
  });

  return { success: true };
}
