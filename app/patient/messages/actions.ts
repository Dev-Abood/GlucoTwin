"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Fetch messages for a given doctor-patient assignment
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

// Send message from patient → doctor
export async function sendMessageToDoctor(patientAssignmentId: string, content: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const newMessage = await prisma.message.create({
    data: {
      patientAssignmentId,
      senderId: userId,
      senderType: "PATIENT",
      content,
    },
  });

  // Set unread flag for doctor
  await prisma.patientAssignment.update({
    where: { id: patientAssignmentId },
    data: { hasMessageForDoctor: true },
  });

  return {
    ...newMessage,
    timestamp: new Date(newMessage.timestamp),
  };
}

// Mark doctor → patient messages as read (green dot disappears for patient)
export async function markMessagesAsRead(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  await prisma.patientAssignment.update({
    where: { id: patientAssignmentId },
    data: { hasMessageForPatient: false },
  });

  return { success: true };
}
