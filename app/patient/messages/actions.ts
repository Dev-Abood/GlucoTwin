"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { createMessageNotificationForDoctor } from "@/components/notifications/notification-actions";

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
export async function sendMessageToDoctor(
  patientAssignmentId: string,
  content: string
) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  try {
    // 1) Fetch the assignment with the doctor recipient and the patient's name
    const assignment = await prisma.patientAssignment.findUnique({
      where: { id: patientAssignmentId },
      select: {
        doctorId: true,
        patient: { select: { id: true, name: true } },
      },
    });

    if (!assignment) return { error: "Patient assignment not found" };

    // Basic authorization: the sender must be the patient on this assignment
    if (assignment.patient.id !== userId) {
      return { error: "Forbidden: you are not assigned to this conversation" };
    }

    // 2) Create the message
    const newMessage = await prisma.message.create({
      data: {
        patientAssignmentId,
        senderId: userId,
        senderType: "PATIENT",
        content,
      },
    });

    // 3) Set unread flag for the doctor
    await prisma.patientAssignment.update({
      where: { id: patientAssignmentId },
      data: { hasMessageForDoctor: true },
    });

    // 4) Create a notification for the doctor
    await createMessageNotificationForDoctor(
      assignment.doctorId,     // recipientId
      assignment.patient.name, // senderName
      newMessage.id            // messageId
    );

    return {
      ...newMessage,
      timestamp: new Date(newMessage.timestamp),
    };
  } catch (err) {
    console.error("sendMessageToDoctor error:", err);
    return { error: "Failed to send message" };
  }
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
