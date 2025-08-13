"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createNewRecommendationNotification } from "./notification-actions"

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
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data
    const validatedData = recommendationSchema.parse({
      title: data.title,
      description: data.description,
    })

    console.log("Validated data:", validatedData)
    console.log("Patient assignment ID:", data.patientAssignmentId)

    // Get patient assignment details for notification
    const patientAssignment = await prisma.patientAssignment.findUnique({
      where: { id: data.patientAssignmentId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!patientAssignment) {
      return {
        success: false,
        error: "Patient assignment not found",
      }
    }

    // Create the recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        patientAssignmentId: data.patientAssignmentId,
        title: validatedData.title,
        description: validatedData.description,
      },
    })

    console.log("Created recommendation:", recommendation)

    await createNewRecommendationNotification(
      patientAssignment.patientId,
      patientAssignment.doctor.name,
      validatedData.title,
      recommendation.id,
    )

    revalidatePath("/doctor/patients")

    return {
      success: true,
      message: "Recommendation created successfully",
      data: recommendation,
    }
  } catch (error) {
    console.error("Error creating recommendation:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Invalid input data",
      }
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
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data
    const validatedData = updateRecommendationSchema.parse(data)

    // Update the recommendation directly for now
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: validatedData.id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        updatedAt: new Date(),
      },
    })

    revalidatePath("/doctor/patients")

    return {
      success: true,
      message: "Recommendation updated successfully",
      data: updatedRecommendation,
    }
  } catch (error) {
    console.error("Error updating recommendation:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Invalid input data",
      }
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
