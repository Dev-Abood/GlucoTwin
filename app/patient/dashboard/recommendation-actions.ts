"use server"

import { createNewRecommendationNotificationForPatient } from "@/components/notifications/notification-actions"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { truncateByDomain } from "recharts/types/util/ChartUtils"
import { z } from "zod"

type ActionResult = {
  success: boolean
  error?: string
  message?: string
  data?: any
}

// Schema for validating recommendation data
const recommendationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters"),
})

const updateRecommendationSchema = recommendationSchema.extend({
  id: z.string().min(1, "Invalid recommendation ID"),
})

type CreateRecommendationInput = z.infer<typeof recommendationSchema> & {
  patientAssignmentId: string
}

type UpdateRecommendationInput = z.infer<typeof updateRecommendationSchema>

/**
 * Creates a new recommendation for a patient
 */
export async function createRecommendation(data: CreateRecommendationInput): Promise<ActionResult> {
  try {
    console.log("Creating recommendation with data:", data)

    const { userId } = await auth()
    console.log("Authenticated user ID:", userId)

    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    const validatedData = recommendationSchema.parse({
      title: data.title,
      description: data.description,
    })

    // Create the recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        patientAssignmentId: data.patientAssignmentId,
        title: validatedData.title,
        description: validatedData.description,
      },
    })

    // ⬇️ New: fetch assignment to notify the correct patient
    const assignment = await prisma.patientAssignment.findUnique({
      where: { id: data.patientAssignmentId },
      include: { doctor: { select: { name: true } } },
    })

    if (assignment?.patientId) {
      const doctorName = assignment.doctor?.name ?? "Your doctor"
      // Fire-and-forget with safety
      try {
        await createNewRecommendationNotificationForPatient(
          assignment.patientId,
          doctorName,
          validatedData.title,
          recommendation.id
        )
      } catch (e) {
        console.error("Failed to create NEW_RECOMMENDATION notification (create):", e)
      }
    } else {
      console.warn("No patientId found for assignment:", data.patientAssignmentId)
    }

    revalidatePath("/doctor/patients")

    return {
      success: true,
      message: "Recommendation created successfully",
      data: recommendation,
    }
  } catch (error) {
    console.error("Error creating recommendation:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid input data" }
    }
    return {
      success: false,
      error: `Failed to create recommendation: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}


/**
 * Updates an existing recommendation
 */
export async function updateRecommendation(data: UpdateRecommendationInput): Promise<ActionResult> {
  try {
    console.log("Updating recommendation with data:", data)

    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    const validatedData = updateRecommendationSchema.parse(data)

    // ⬇️ New: fetch the existing rec’s assignment to know whom to notify
    const existing = await prisma.recommendation.findUnique({
      where: { id: validatedData.id },
      include: {
        patientAssignment: {
          include: { doctor: { select: { name: true } } },
        },
      },
    })

    if (!existing?.patientAssignment?.patientId) {
      return { success: false, error: "Related patient assignment not found" }
    }

    // Update the recommendation
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: validatedData.id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        updatedAt: new Date(),
      },
    })

    // ⬇️ New: notify patient about the updated recommendation
    try {
      await createNewRecommendationNotificationForPatient(
        existing.patientAssignment.patientId,
        existing.patientAssignment.doctor?.name ?? "Your doctor",
        updatedRecommendation.title,
        updatedRecommendation.id
      )
    } catch (e) {
      console.error("Failed to create NEW_RECOMMENDATION notification (update):", e)
    }

    revalidatePath("/doctor/patients")

    return {
      success: true,
      message: "Recommendation updated successfully",
      data: updatedRecommendation,
    }
  } catch (error) {
    console.error("Error updating recommendation:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid input data" }
    }
    return {
      success: false,
      error: `Failed to update recommendation: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Deletes a recommendation
 */
export async function deleteRecommendation(recommendationId: string): Promise<ActionResult> {
  try {
    console.log("Deleting recommendation ID:", recommendationId)

    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Delete the recommendation directly
    await prisma.recommendation.delete({
      where: { id: recommendationId },
    })

    revalidatePath("/doctor/patients")

    return {
      success: true,
      message: "Recommendation deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting recommendation:", error)

    return {
      success: false,
      error: `Failed to delete recommendation: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Gets all recommendations for a patient assignment
 */
export async function getRecommendations(patientAssignmentId: string) {
  try {
    console.log("Fetching recommendations for assignment ID:", patientAssignmentId)

    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    // Get all recommendations for this patient assignment
    const recommendations = await prisma.recommendation.findMany({
      where: {
        patientAssignmentId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log("Found recommendations:", recommendations)

    return recommendations
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    throw error
  }
}

/**
 * Gets recommendations for a patient (from patient's perspective)
 */
export async function getPatientRecommendations() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    // Get all recommendations for this patient
    const recommendations = await prisma.recommendation.findMany({
      where: {
        patientAssignment: {
          patientId: userId,
        },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        patientAssignment: {
          select: {
            doctor: {
              select: {
                name: true,
                specialty: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return recommendations
  } catch (error) {
    console.error("Error fetching patient recommendations:", error)
    throw error
  }
}
