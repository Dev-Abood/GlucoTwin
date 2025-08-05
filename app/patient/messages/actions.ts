"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Fetch messages for a specific doctor-patient assignment
export async function getMessages(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const messages = await prisma.message.findMany({
    where: { patientAssignmentId },
    orderBy: { timestamp: "asc" },
  });

  return messages;
}

// Send message (patient -> doctor)
export async function sendMessageToDoctor(patientAssignmentId: string, content: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Create message
  const newMessage = await prisma.message.create({
    data: {
      patientAssignmentId,
      senderId: userId,
      senderType: "PATIENT",
      content,
    },
  });

  // Mark unread for doctor
  await prisma.patient.updateMany({
    where: {
      patientAssignments: { some: { id: patientAssignmentId } },
    },
    data: { hasMessageForDoctor: true },
  });

  return newMessage;
}

// Mark messages as read for patient (doctor’s messages)
export async function markMessagesAsRead(patientAssignmentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  await prisma.patient.updateMany({
    where: {
      patientAssignments: { some: { id: patientAssignmentId } },
    },
    data: { hasMessageForPatient: false },
  });

  return { success: true };
}
