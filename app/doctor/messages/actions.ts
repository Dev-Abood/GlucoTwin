// app/doctor/messages/actions.ts
"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function getMessages(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const messages = await prisma.message.findMany({
    where: { patientAssignmentId },
    orderBy: { timestamp: "asc" },
  });

  // Convert timestamp to Date objects (important for client formatting)
  return messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
}

export async function sendMessageToPatient(patientAssignmentId: string, content: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const newMessage = await prisma.message.create({
    data: {
      patientAssignmentId,
      senderId: userId,
      senderType: "DOCTOR",
      content,
    },
  });

  return {
    ...newMessage,
    timestamp: new Date(newMessage.timestamp),
  };
}

export async function markMessagesAsRead(patientId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  await prisma.patient.update({
    where: { id: patientId },
    data: { hasMessage: false },
  });

  return { success: true };
}