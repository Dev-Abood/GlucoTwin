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

// Schema for validating doctor profile updates with strict phone validation
const updateDoctorProfileSchema = z.object({
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

type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>

/**
 * Updates doctor profile (email and phone)
 */
export async function updateDoctorProfile(data: UpdateDoctorProfileInput): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Validate input data
    const validatedData = updateDoctorProfileSchema.parse(data)

    // Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!doctor) {
      return {
        success: false,
        error: "Doctor record not found",
      }
    }

    // Update doctor in database
    await prisma.doctor.update({
      where: { id: userId },
      data: {
        email: validatedData.email,
        phone: validatedData.phone, // Now properly formatted as +1XXXXXXXXXX
      },
    })

    // Update email in Clerk if it changed
    if (doctor.email !== validatedData.email) {
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
        
        console.log(`Email updated in Clerk for doctor ${userId}: ${doctor.email} -> ${validatedData.email}`)
        
      } catch (clerkError) {
        console.error("Failed to update email in Clerk:", clerkError)
        // Continue anyway - database is updated
        return {
          success: true,
          message: "Profile updated successfully, but email sync to authentication provider failed. This won't affect your login.",
        }
      }
    }

    revalidatePath("/doctor/profile")

    return {
      success: true,
      message: "Profile updated successfully",
    }
  } catch (error) {
    console.error("Error updating doctor profile:", error)

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
 * Get doctor profile data
 */
export async function getDoctorProfile() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        specialty: true,
        patientAssignments: {
          select: {
            id: true,
            addedDate: true,
            lastVisitDate: true,
            hasMessageForDoctor: true,
            patient: {
              select: {
                id: true,
                name: true,
                patientId: true,
                age: true,
                term: true,
                readings: {
                  select: {
                    level: true,
                    status: true,
                    date: true,
                  },
                  orderBy: {
                    date: "desc",
                  },
                  take: 1, // Get latest reading for each patient
                },
              },
            },
          },
          orderBy: {
            addedDate: "desc",
          },
        },
      },
    })

    if (!doctor) {
      throw new Error("Doctor record not found")
    }

    return doctor
  } catch (error) {
    console.error("Error fetching doctor profile:", error)
    throw error
  }
}

/**
 * Get doctor statistics for profile dashboard
 */
export async function getDoctorStats() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    // Get total patients count
    const totalPatients = await prisma.patientAssignment.count({
      where: {
        doctorId: userId,
      },
    })

    // Get patients with unread messages
    const patientsWithMessages = await prisma.patientAssignment.count({
      where: {
        doctorId: userId,
        hasMessageForDoctor: true,
      },
    })

    // Get patients by status (based on their latest readings)
    const patientStatusStats = (await prisma.$queryRaw`
      SELECT 
        r.status,
        COUNT(DISTINCT pa.patient_id) as count
      FROM "PatientAssignment" pa
      LEFT JOIN LATERAL (
        SELECT status 
        FROM "Reading" r2 
        WHERE r2.patient_id = pa.patient_id 
        ORDER BY r2.date DESC 
        LIMIT 1
      ) r ON true
      WHERE pa.doctor_id = ${userId}
      GROUP BY r.status
    `) as Array<{ status: string; count: bigint }>

    // Get recent activity (patients added in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPatients = await prisma.patientAssignment.count({
      where: {
        doctorId: userId,
        addedDate: {
          gte: thirtyDaysAgo,
        },
      },
    })

    return {
      totalPatients,
      patientsWithMessages,
      recentPatients,
      patientStatusBreakdown: patientStatusStats.reduce(
        (acc, stat) => {
          acc[stat.status || "UNKNOWN"] = Number(stat.count)
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  } catch (error) {
    console.error("Error fetching doctor stats:", error)
    throw error
  }
}

/**
 * Get doctor's recent patient activities
 */
export async function getDoctorRecentActivity() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    // Get recent readings from all assigned patients
    const recentReadings = await prisma.reading.findMany({
      where: {
        patient: {
          patientAssignments: {
            some: {
              doctorId: userId,
            },
          },
        },
      },
      select: {
        id: true,
        level: true,
        type: true,
        status: true,
        date: true,
        patient: {
          select: {
            name: true,
            patientId: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 10, // Get last 10 readings across all patients
    })

    // Get recent messages
    const recentMessages = await prisma.message.findMany({
      where: {
        patientAssignment: {
          doctorId: userId,
        },
        senderType: "PATIENT", // Only patient messages to doctor
      },
      select: {
        id: true,
        content: true,
        timestamp: true,
        isRead: true,
        patientAssignment: {
          select: {
            patient: {
              select: {
                name: true,
                patientId: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 5, // Get last 5 messages
    })

    return {
      recentReadings,
      recentMessages,
    }
  } catch (error) {
    console.error("Error fetching doctor recent activity:", error)
    throw error
  }
}

/**
 * Get patients requiring attention (high readings, unread messages, etc.)
 */
export async function getPatientsRequiringAttention() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error("Authentication required")
    }

    const patientsNeedingAttention = await prisma.patientAssignment.findMany({
      where: {
        doctorId: userId,
        OR: [
          { hasMessageForDoctor: true }, // Has unread messages
          {
            patient: {
              readings: {
                some: {
                  status: "HIGH",
                  date: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // High reading in last 24 hours
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        hasMessageForDoctor: true,
        patient: {
          select: {
            id: true,
            name: true,
            patientId: true,
            term: true,
            readings: {
              select: {
                level: true,
                status: true,
                type: true,
                date: true,
              },
              where: {
                date: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
              orderBy: {
                date: "desc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        lastVisitDate: "asc", // Patients not visited recently first
      },
    })

    return patientsNeedingAttention
  } catch (error) {
    console.error("Error fetching patients requiring attention:", error)
    throw error
  }
}