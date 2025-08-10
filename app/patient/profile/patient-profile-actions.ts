"use server"

import { prisma } from "@/lib/prisma"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type ActionResult = {
  success: boolean
  error?: string
  message?: string
}

// Schema for validating patient profile updates with strict phone validation
const updatePatientProfileSchema = z.object({
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?1?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, 
           "Invalid phone number. Use format: (555) 123-4567 or +1-555-123-4567")
    .transform((phone) => {
      // Clean and format to E.164 (+1XXXXXXXXXX)
      const cleaned = phone.replace(/[^\d]/g, "");
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`;
      }
      return `+1${cleaned}`;
    }),
})

type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>

/**
 * Updates patient profile (email and phone)
 */
export async function updatePatientProfile(data: UpdatePatientProfileInput): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data
    const validatedData = updatePatientProfileSchema.parse(data)

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!patient) {
      return {
        success: false,
        error: "Patient record not found",
      }
    }

    // Update patient in database
    await prisma.patient.update({
      where: { id: userId },
      data: {
        email: validatedData.email,
        phone: validatedData.phone, // Now properly formatted as +1XXXXXXXXXX
      },
    })

    // Update email in Clerk if it changed
    if (patient.email !== validatedData.email) {
      try {
        const clerk = await clerkClient()
        
        // Get the current user to access their email addresses
        const user = await clerk.users.getUser(userId)
        
        // Create new email address and set as primary
        const newEmailAddress = await clerk.emailAddresses.createEmailAddress({
          userId: userId,
          emailAddress: validatedData.email,
          verified: true, // Set as verified since it's an update, not new registration
          primary: true,  // Make this the primary email
        })
        
        // Optional: Delete the old primary email address
        if (user.primaryEmailAddressId) {
          try {
            await clerk.emailAddresses.deleteEmailAddress(user.primaryEmailAddressId)
          } catch (deleteError) {
            console.error("Failed to delete old email address:", deleteError)
            // Continue anyway - new email is created and set as primary
          }
        }
        
        console.log(`Email updated in Clerk for user ${userId}: ${patient.email} -> ${validatedData.email}`)
        
      } catch (clerkError) {
        console.error("Failed to update email in Clerk:", clerkError)
        // Continue anyway - database is updated
        return {
          success: true,
          message: "Profile updated successfully, but email sync to authentication provider failed. This won't affect your login.",
        }
      }
    }

    revalidatePath("/patient/profile")

    return {
      success: true,
      message: "Profile updated successfully",
    }
  } catch (error) {
    console.error("Error updating patient profile:", error)

    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return {
        success: false,
        error: `Invalid input: ${fieldErrors}`,
      }
    }

    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    }
  }
}

/**
 * Get patient profile data
 */
export async function getPatientProfile() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      select: {
        id: true,
        patientId: true,
        email: true,
        name: true,
        phone: true,
        age: true,
        dateOfBirth: true,
        term: true,
        dueDate: true,
        readings: {
          select: {
            id: true,
            level: true,
            type: true,
            status: true,
            date: true,
          },
          orderBy: {
            date: "desc",
          },
          take: 5, // Get last 5 readings for profile summary
        },
        patientAssignments: {
          select: {
            doctor: {
              select: {
                name: true,
                specialty: true,
              },
            },
            addedDate: true,
            lastVisitDate: true,
          },
        },
      },
    })

    if (!patient) {
      throw new Error("Patient record not found")
    }

    return patient
  } catch (error) {
    console.error("Error fetching patient profile:", error)
    throw error
  }
}

/**
 * Get patient statistics for profile dashboard
 */
export async function getPatientStats() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    // Get reading statistics
    const readingStats = await prisma.reading.groupBy({
      by: ["status"],
      where: {
        patientId: userId,
      },
      _count: {
        status: true,
      },
    })

    // Get total readings count
    const totalReadings = await prisma.reading.count({
      where: {
        patientId: userId,
      },
    })

    // Get readings from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentReadings = await prisma.reading.count({
      where: {
        patientId: userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
    })

    return {
      totalReadings,
      recentReadings,
      statusBreakdown: readingStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.status
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  } catch (error) {
    console.error("Error fetching patient stats:", error)
    throw error
  }
}

/**
 * Get patient's assigned doctors
 */
export async function getPatientDoctors() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    const assignments = await prisma.patientAssignment.findMany({
      where: {
        patientId: userId,
      },
      select: {
        id: true,
        addedDate: true,
        lastVisitDate: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        addedDate: "desc",
      },
    })

    return assignments
  } catch (error) {
    console.error("Error fetching patient doctors:", error)
    throw error
  }
}