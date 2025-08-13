"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { createMessageNotification } from "./notification-actions"

export type ActionResult = {
  success: boolean
  error?: string
  data?: any
}

// Send a new message
export async function sendMessage(
  patientAssignmentId: string,
  content: string,
  senderType: "DOCTOR" | "PATIENT",
): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    if (!content.trim()) {
      return { success: false, error: "Message content is required" }
    }

    // Get patient assignment details for notification
    const patientAssignment = await prisma.patientAssignment.findUnique({
      where: { id: patientAssignmentId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!patientAssignment) {
      return { success: false, error: "Patient assignment not found" }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        patientAssignmentId,
        senderId: userId,
        senderType,
        content: content.trim(),
      },
    })

    if (senderType === "DOCTOR") {
      // Doctor sent message to patient
      await createMessageNotification(
        patientAssignment.patientId,
        "patient",
        patientAssignment.doctor.name,
        "doctor",
        message.id,
      )
    } else {
      // Patient sent message to doctor
      await createMessageNotification(
        patientAssignment.doctorId,
        "doctor",
        patientAssignment.patient.name,
        "patient",
        message.id,
      )
    }

    // Update message flags
    if (senderType === "PATIENT") {
      await prisma.patientAssignment.update({
        where: { id: patientAssignmentId },
        data: { hasMessageForDoctor: true },
      })
    } else {
      await prisma.patientAssignment.update({
        where: { id: patientAssignmentId },
        data: { hasMessageForPatient: true },
      })
    }

    revalidatePath("/messages")
    revalidatePath("/doctor/patients")

    return { success: true, data: message }
  } catch (error) {
    console.error("Failed to send message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

// Get messages for a patient assignment
export async function getMessages(patientAssignmentId: string): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    const messages = await prisma.message.findMany({
      where: { patientAssignmentId },
      orderBy: { timestamp: "asc" },
    })

    return { success: true, data: messages }
  } catch (error) {
    console.error("Failed to get messages:", error)
    return { success: false, error: "Failed to get messages" }
  }
}

// Mark messages as read
export async function markMessagesAsRead(
  patientAssignmentId: string,
  userType: "DOCTOR" | "PATIENT",
): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    // Mark messages as read for the current user
    await prisma.message.updateMany({
      where: {
        patientAssignmentId,
        senderType: userType === "DOCTOR" ? "PATIENT" : "DOCTOR", // Mark messages from the other party as read
      },
      data: { isRead: true },
    })

    // Update message flags
    if (userType === "DOCTOR") {
      await prisma.patientAssignment.update({
        where: { id: patientAssignmentId },
        data: { hasMessageForDoctor: false },
      })
    } else {
      await prisma.patientAssignment.update({
        where: { id: patientAssignmentId },
        data: { hasMessageForPatient: false },
      })
    }

    revalidatePath("/messages")
    revalidatePath("/doctor/patients")

    return { success: true }
  } catch (error) {
    console.error("Failed to mark messages as read:", error)
    return { success: false, error: "Failed to mark messages as read" }
  }
}
