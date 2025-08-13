"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  createDangerousReadingNotificationForPatient,
  createDangerousReadingNotificationForDoctors,
  checkAndCreateDailyReminder,
} from "@/actions/notification-actions"

// Type for result returned by the action
type ActionResult = {
  success: boolean
  error?: string
}

/**
 * Action to delete a glucose reading by ID with ownership verification
 *
 * @param {string} id - The ID of the reading to delete
 * @returns {Promise<{ActionResult}>} Result of the operation
 */
export async function deleteReading(id: string): Promise<ActionResult> {
  try {
    // Get current user ID from Clerk
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input
    if (!id) {
      return {
        success: false,
        error: "Reading ID is required",
      }
    }

    // First, get the patient record for the current user
    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!patient) {
      return {
        success: false,
        error: "Patient record not found",
      }
    }

    // Verify the reading belongs to the current patient
    const reading = await prisma.reading.findUnique({
      where: { id },
      select: { patientId: true },
    })

    if (!reading) {
      return {
        success: false,
        error: "Reading not found",
      }
    }

    if (reading.patientId !== patient.id) {
      return {
        success: false,
        error: "Unauthorized - you can only delete your own readings",
      }
    }

    // Delete the reading from database
    await prisma.reading.delete({
      where: { id },
    })

    // Revalidate the readings page to refresh data
    revalidatePath("/patient/readings")

    return {
      success: true,
      error: "Reading deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting reading:", error)

    return {
      success: false,
      error: "Failed to delete reading. Please try again.",
    }
  }
}

// Schema for validating the incoming glucose reading data (WITHOUT status)
const glucoseReadingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  type: z.enum(["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_LUNCH", "AFTER_LUNCH", "BEFORE_DINNER", "AFTER_DINNER"]),
  level: z.number().positive().multipleOf(0.01), // Number with up to 2 decimal places
  notes: z.string(),
})

// Function to calculate reading status based on level and type
const calculateReadingStatus = (level: number, type: string): "NORMAL" | "ELEVATED" | "HIGH" => {
  const isBeforeMeal = type.toLowerCase().includes("before")

  if (isBeforeMeal) {
    if (level <= 95) return "NORMAL"
    if (level <= 105) return "ELEVATED"
    return "HIGH"
  } else {
    if (level <= 140) return "NORMAL"
    if (level <= 160) return "ELEVATED"
    return "HIGH"
  }
}

export default calculateReadingStatus

// Type for glucose reading inputs derived from the schema
type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>

/**
 * Creates a new glucose reading for a patient
 *
 * @param data - The glucose reading data to create
 * @returns An object indicating success or failure with error message
 */
export async function createGlucoseReading(data: GlucoseReadingInput): Promise<ActionResult> {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth()

    // Check if user is authenticated
    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data against schema
    const validatedData = glucoseReadingSchema.parse(data)

    // Calculate status based on level and type
    const status = calculateReadingStatus(validatedData.level, validatedData.type)

    console.log({ ...validatedData, status })

    // Create the reading in database
    const reading = await prisma.reading.create({
      data: {
        patientId: userId,
        date: new Date(validatedData.date).toISOString(),
        time: validatedData.time,
        type: validatedData.type,
        level: validatedData.level,
        status: status,
        notes: validatedData.notes,
      },
    })

    if (status === "HIGH") {
      // Get patient details for notifications
      const patient = await prisma.patient.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      if (patient) {
        // Create notification for patient
        await createDangerousReadingNotificationForPatient(
          userId,
          validatedData.level,
          validatedData.type,
          validatedData.time,
          reading.id,
        )

        // Create notifications for assigned doctors
        await createDangerousReadingNotificationForDoctors(
          userId,
          patient.name,
          validatedData.level,
          validatedData.type,
          validatedData.time,
          reading.id,
        )
      }
    }

    await checkAndCreateDailyReminder(userId)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error creating glucose reading:", error)

    // Handle other errors
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Schema for validating the update glucose reading data
const updateGlucoseReadingSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  type: z.enum(["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_LUNCH", "AFTER_LUNCH", "BEFORE_DINNER", "AFTER_DINNER"]),
  level: z.number().positive().multipleOf(0.01), // Number with up to 2 decimal places
  notes: z.string(),
})

// Type for update glucose reading input
type UpdateGlucoseReadingInput = z.infer<typeof updateGlucoseReadingSchema>

/**
 * Updates an existing glucose reading for a patient
 *
 * @param data - The updated glucose reading data
 * @returns An object indicating success or failure with error message
 */
export async function updateGlucoseReading(data: UpdateGlucoseReadingInput): Promise<ActionResult> {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth()

    // Check if user is authenticated
    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data against schema
    const validatedData = updateGlucoseReadingSchema.parse(data)

    // Find the reading to verify ownership
    const existingReading = await prisma.reading.findUnique({
      where: { id: validatedData.id },
      select: { patientId: true, status: true },
    })

    // Check if reading exists
    if (!existingReading) {
      return {
        success: false,
        error: "Reading not found",
      }
    }

    // Verify ownership
    if (existingReading.patientId !== userId) {
      return {
        success: false,
        error: "Unauthorized - you can only update your own readings",
      }
    }

    // Calculate new status
    const newStatus = calculateReadingStatus(validatedData.level, validatedData.type)

    // Update the reading in the database
    const updatedReading = await prisma.reading.update({
      where: { id: validatedData.id },
      data: {
        type: validatedData.type,
        level: validatedData.level,
        status: newStatus,
        notes: validatedData.notes,
      },
    })

    if (newStatus === "HIGH" && existingReading.status !== "HIGH") {
      // Get patient details for notifications
      const patient = await prisma.patient.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      if (patient) {
        // Create notification for patient
        await createDangerousReadingNotificationForPatient(
          userId,
          validatedData.level,
          validatedData.type,
          validatedData.time,
          updatedReading.id,
        )

        // Create notifications for assigned doctors
        await createDangerousReadingNotificationForDoctors(
          userId,
          patient.name,
          validatedData.level,
          validatedData.type,
          validatedData.time,
          updatedReading.id,
        )
      }
    }

    // Revalidate the readings page
    revalidatePath("/patient/readings")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error updating glucose reading:", error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input data",
      }
    }

    // Handle other errors
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}
