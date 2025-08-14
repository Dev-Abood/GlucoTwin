"use server";

import { prisma } from "@/lib/prisma";

/** Reuse your string-union for clarity in code that imports this file. */
export type NotificationType =
  | "DANGEROUS_READING"
  | "NEW_MESSAGE"
  | "NEW_RECOMMENDATION"
  | "DAILY_REMINDER";

// Get notifications for a user (patient or doctor)
export async function getNotifications(userId: string, userType: "patient" | "doctor") {
  try {
    const whereClause = userType === "patient" ? { patientId: userId } : { doctorId: userId };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 notifications
    });

    return { success: true, notifications };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

// Archive notification
export async function archiveNotification(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isArchived: true,
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to archive notification:", error);
    return { success: false, error: "Failed to archive notification" };
  }
}

// Archive all notifications for a user
export async function archiveAllNotifications(userId: string, userType: "patient" | "doctor") {
  try {
    const whereClause =
      userType === "patient" ? { patientId: userId, isArchived: false } : { doctorId: userId, isArchived: false };

    await prisma.notification.updateMany({
      where: whereClause,
      data: {
        isArchived: true,
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to archive all notifications:", error);
    return { success: false, error: "Failed to archive all notifications" };
  }
}

// Create dangerous reading notification for patient
export async function createDangerousReadingNotificationForPatient(
  patientId: string,
  readingLevel: number,
  readingType: string,
  readingTime: string,
  readingId: string
) {
  const title = "Dangerous Glucose Reading Recorded";
  const message = `Your ${readingType.toLowerCase().replace("_", " ")} reading of ${readingLevel} mg/dL at ${readingTime} is dangerously high. Please consult your healthcare provider immediately.`;

  return await prisma.notification.create({
    data: {
      type: "DANGEROUS_READING",
      title,
      content: message,
      metadata: {
        patientId,
        readingLevel,
        readingType,
        readingTime,
        readingId,
      },
      patientId,
      isRead: false,
      isArchived: false,
    },
  });
}

// Create dangerous reading notification for doctors
export async function createDangerousReadingNotificationForDoctors(
  patientId: string,
  patientName: string,
  readingLevel: number,
  readingType: string,
  readingTime: string,
  readingId: string
) {
  try {
    // Get all doctors assigned to this patient
    const patientAssignments = await prisma.patientAssignment.findMany({
      where: { patientId },
      include: { doctor: true },
    });

    const title = "Patient Recorded Dangerous Reading";
    const message = `${patientName} recorded a dangerous ${readingType
      .toLowerCase()
      .replace("_", " ")} reading of ${readingLevel} mg/dL at ${readingTime}. Immediate attention required.`;

    // Create notification for each assigned doctor
    const notifications = await Promise.all(
      patientAssignments.map((assignment) => {
        return prisma.notification.create({
          data: {
            type: "DANGEROUS_READING",
            title: title,
            content: message,
            metadata: {
              patientId,
              patientName,
              readingLevel,
              readingType,
              readingTime,
              readingId,
              doctorId: assignment.doctorId,
            },
            doctorId: assignment.doctorId,
            isRead: false,
            isArchived: false,
          },
        });
      })
    );

    return { success: true, notifications };
  } catch (error) {
    console.error("Failed to create dangerous reading notifications for doctors:", error);
    return { success: false, error: "Failed to create notifications" };
  }
}

// Create new message notification for patient
export async function createMessageNotificationForPatient(
  recipientId: string,
  senderName: string,
  senderType: "doctor" | "patient",
  messageId: string
) {
  const title = `New Message from ${senderName}`;
  const message = `You have received a new message. Please check your messages.`;

  return await prisma.notification.create({
    data: {
      type: "NEW_MESSAGE",
      title: title,
      content: message,
      metadata: {
        messageId,
        senderName,
        senderType,
        recipientId,
        recipientType: "patient",
      },
      patientId: recipientId,
      isRead: false,
      isArchived: false,
    },
  });
}

// Create new message notification for doctor
export async function createMessageNotificationForDoctor(recipientId: string, senderName: string, messageId: string) {
  const title = `New Message from your patient ${senderName}`;
  const message = `You have received a new message. Please check your messages.`;

  return await prisma.notification.create({
    data: {
      type: "NEW_MESSAGE",
      title: title,
      content: message,
      metadata: {
        messageId,
        senderName,
        senderType: "patient",
        recipientId,
        recipientType: "doctor",
      },
      doctorId: recipientId,
      isRead: false,
      isArchived: false,
    },
  });
}

// Create daily reminder notification
export async function createDailyReminderNotificationForPatient(patientId: string) {
  const title = "Daily Glucose Reading Reminder";
  const message = "Please record your 6 daily glucose readings for today to help track your gestational diabetes.";

  return await prisma.notification.create({
    data: {
      type: "DAILY_REMINDER",
      title: title,
      content: message,
      metadata: {
        patientId,
        reminderDate: new Date().toISOString(),
      },
      patientId: patientId,
      isRead: false,
      isArchived: false,
    },
  });
}

// Create new recommendation notification
export async function createNewRecommendationNotificationForPatient(
  patientId: string,
  doctorName: string,
  recommendationTitle: string,
  recommendationId: string
) {
  const title = `New Recommendation from ${doctorName}`;
  const message = `${doctorName} has set a new personalized recommendation: "${recommendationTitle}". Please check it out in your dashboard.`;

  return await prisma.notification.create({
    data: {
      type: "NEW_RECOMMENDATION",
      title: title,
      content: message,
      metadata: {
        doctorName,
        recommendationTitle,
        recommendationId,
        patientId,
      },
      patientId: patientId,
      isRead: false,
      isArchived: false,
    },
  });
}

// Check if patient needs daily reminder (hasn't recorded any readings today)
export async function checkAndCreateDailyReminder(patientId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if patient has any readings today
    const todayReadings = await prisma.reading.findFirst({
      where: {
        patientId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

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
    });

    // If no readings today and no reminder sent, create reminder
    if (!todayReadings && !todayReminder) {
      return await createDailyReminderNotificationForPatient(patientId);
    }

    return { success: true, message: "No reminder needed" };
  } catch (error) {
    console.error("Failed to check daily reminder:", error);
    return { success: false, error: "Failed to check daily reminder" };
  }
}
