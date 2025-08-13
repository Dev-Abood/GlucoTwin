"use server"

import { prisma } from "@/lib/prisma"

export type NotificationType =
  | "DANGEROUS_READING_PATIENT"
  | "DANGEROUS_READING_DOCTOR"
  | "NEW_MESSAGE_PATIENT"
  | "NEW_MESSAGE_DOCTOR"
  | "DAILY_REMINDER"
  | "NEW_RECOMMENDATION"

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  patientId?: string
  doctorId?: string
  readingId?: string
  messageId?: string
  recommendationId?: string
}

// Create a new notification
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || "NORMAL",
        patientId: params.patientId,
        doctorId: params.doctorId,
        readingId: params.readingId,
        messageId: params.messageId,
        recommendationId: params.recommendationId,
      },
    })

    return { success: true, notification }
  } catch (error) {
    console.error("Failed to create notification:", error)
    return { success: false, error: "Failed to create notification" }
  }
}

// Get notifications for a user
export async function getNotifications(userId: string, userType: "patient" | "doctor") {
  try {
    const whereClause = userType === "patient" ? { patientId: userId } : { doctorId: userId }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 notifications
    })

    return { success: true, notifications }
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return { success: false, error: "Failed to fetch notifications" }
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to mark notification as read:", error)
    return { success: false, error: "Failed to mark notification as read" }
  }
}

// Archive notification
export async function archiveNotification(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isArchived: true, isRead: true },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to archive notification:", error)
    return { success: false, error: "Failed to archive notification" }
  }
}

// Archive all notifications for a user
export async function archiveAllNotifications(userId: string, userType: "patient" | "doctor") {
  try {
    const whereClause = userType === "patient" ? { patientId: userId } : { doctorId: userId }

    await prisma.notification.updateMany({
      where: {
        ...whereClause,
        isArchived: false,
      },
      data: { isArchived: true, isRead: true },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to archive all notifications:", error)
    return { success: false, error: "Failed to archive all notifications" }
  }
}

// Create dangerous reading notification for patient
export async function createDangerousReadingNotificationForPatient(
  patientId: string,
  readingLevel: number,
  readingType: string,
  readingTime: string,
  readingId: string,
) {
  const title = "Dangerous Glucose Reading Recorded"
  const message = `Your ${readingType.toLowerCase().replace("_", " ")} reading of ${readingLevel} mg/dL at ${readingTime} is dangerously high. Please consult your healthcare provider immediately.`

  return await createNotification({
    type: "DANGEROUS_READING_PATIENT",
    title,
    message,
    priority: "URGENT",
    patientId,
    readingId,
  })
}

// Create dangerous reading notification for doctors
export async function createDangerousReadingNotificationForDoctors(
  patientId: string,
  patientName: string,
  readingLevel: number,
  readingType: string,
  readingTime: string,
  readingId: string,
) {
  try {
    // Get all doctors assigned to this patient
    const patientAssignments = await prisma.patientAssignment.findMany({
      where: { patientId },
      include: { doctor: true },
    })

    const title = "Patient Recorded Dangerous Reading"
    const message = `${patientName} recorded a dangerous ${readingType.toLowerCase().replace("_", " ")} reading of ${readingLevel} mg/dL at ${readingTime}. Immediate attention required.`

    // Create notification for each assigned doctor
    const notifications = await Promise.all(
      patientAssignments.map((assignment) =>
        createNotification({
          type: "DANGEROUS_READING_DOCTOR",
          title,
          message,
          priority: "URGENT",
          doctorId: assignment.doctorId,
          readingId,
        }),
      ),
    )

    return { success: true, notifications }
  } catch (error) {
    console.error("Failed to create dangerous reading notifications for doctors:", error)
    return { success: false, error: "Failed to create notifications" }
  }
}

// Create new message notification
export async function createMessageNotification(
  recipientId: string,
  recipientType: "patient" | "doctor",
  senderName: string,
  senderType: "patient" | "doctor",
  messageId: string,
) {
  const title = `New Message from ${senderType === "doctor" ? "Dr." : ""} ${senderName}`
  const message = `You have received a new message. Click to view and respond.`

  const notificationType = recipientType === "patient" ? "NEW_MESSAGE_PATIENT" : "NEW_MESSAGE_DOCTOR"

  return await createNotification({
    type: notificationType,
    title,
    message,
    priority: "NORMAL",
    patientId: recipientType === "patient" ? recipientId : undefined,
    doctorId: recipientType === "doctor" ? recipientId : undefined,
    messageId,
  })
}

// Create daily reminder notification
export async function createDailyReminderNotification(patientId: string) {
  const title = "Daily Glucose Reading Reminder"
  const message = "Please record your 6 daily glucose readings for today to help track your gestational diabetes."

  return await createNotification({
    type: "DAILY_REMINDER",
    title,
    message,
    priority: "NORMAL",
    patientId,
  })
}

// Create new recommendation notification
export async function createNewRecommendationNotification(
  patientId: string,
  doctorName: string,
  recommendationTitle: string,
  recommendationId: string,
) {
  const title = `New Recommendation from Dr. ${doctorName}`
  const message = `Dr. ${doctorName} has set a new personalized recommendation: "${recommendationTitle}". Please check it out in your dashboard.`

  return await createNotification({
    type: "NEW_RECOMMENDATION",
    title,
    message,
    priority: "NORMAL",
    patientId,
    recommendationId,
  })
}

// Check if patient needs daily reminder (hasn't recorded any readings today)
export async function checkAndCreateDailyReminder(patientId: string) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if patient has any readings today
    const todayReadings = await prisma.reading.findFirst({
      where: {
        patientId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Check if we already sent a reminder today
    const todayReminder = await prisma.notification.findFirst({
      where: {
        patientId,
        type: "DAILY_REMINDER",
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // If no readings today and no reminder sent, create reminder
    if (!todayReadings && !todayReminder) {
      return await createDailyReminderNotification(patientId)
    }

    return { success: true, message: "No reminder needed" }
  } catch (error) {
    console.error("Failed to check daily reminder:", error)
    return { success: false, error: "Failed to check daily reminder" }
  }
}
