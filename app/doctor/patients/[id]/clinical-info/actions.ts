"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { clinicalInfoSchema } from "@/lib/clinical-info-val"

const prisma = new PrismaClient()

async function getClinicalInfo(patientId: string) {
  try {
    return await prisma.clinicalInformation.findUnique({
      where: { patientId },
      include: { patient: true },
    })
  } catch (error) {
    console.error("Error fetching clinical info:", error)
    return null
  }
}

async function getPatient(patientId: string) {
  try {
    return await prisma.patient.findUnique({
      where: { id: patientId },
    })
  } catch (error) {
    console.error("Error fetching patient:", error)
    return null
  }
}

export async function getClinicalInfoHistory(patientId: string) {
  try {
    return await prisma.clinicalInformation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
          },
        },
      },
    })
  } catch (error) {
    console.error("Error fetching clinical info history:", error)
    return []
  }
}

export async function createOrUpdateClinicalInfo(patientId: string, formData: FormData) {
  try {
    // Convert FormData to a plain object
    const rawData = Object.fromEntries(formData.entries())
    
    // The schema will handle all the transformation and validation
    const validatedData = clinicalInfoSchema.parse(rawData)

     // --- Ensure BMI is derived on the server as well (safety) ---
    const updatePayload: typeof validatedData & { bmi?: number } = { ...validatedData }
    const w = typeof validatedData.weight === "number" ? validatedData.weight : undefined
    const h = typeof validatedData.height === "number" ? validatedData.height : undefined
    if (w && h) {
      const bmi = +(w / Math.pow(h / 100, 2)).toFixed(1) // height in cm -> m
      if (!Number.isNaN(bmi) && Number.isFinite(bmi)) {
        updatePayload.bmi = bmi
      }
    }

    const clinicalInfo = await prisma.clinicalInformation.upsert({
      where: { patientId },
      update: {
        ...validatedData,
        updatedAt: new Date(),
      },
      create: {
        patientId,
        ...validatedData,
      },
    })

    console.log("Clinical info saved successfully:", clinicalInfo.id)

    revalidatePath(`/doctor/patients/${patientId}/clinical-info`)
    return {
      success: true,
      message: "Clinical information updated successfully",
      data: clinicalInfo,
    }
  } catch (error) {
    console.error("Error saving clinical info:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation error",
        errors: error.errors,
      }
    }
    return {
      success: false,
      message: "Failed to save clinical information",
    }
  }
}

export async function deleteClinicalInfo(clinicalInfoId: string, patientId: string) {
  try {
    await prisma.clinicalInformation.delete({
      where: { id: clinicalInfoId },
    })

    revalidatePath(`/doctor/patients/${patientId}/clinical-info`)
    return {
      success: true,
      message: "Clinical information deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting clinical info:", error)
    return {
      success: false,
      message: "Failed to delete clinical information",
    }
  }
}

/**
 * Reset (trash) all clinical info for a patient:
 * - Deletes the ClinicalInformation record by patientId (1:1)
 * - Cascades to GDMPrediction via schema onDelete: Cascade
 * - Revalidates the page so fields render empty
 */
export async function resetClinicalInfo(patientId: string) {
  try {
    const existing = await prisma.clinicalInformation.findUnique({
      where: { patientId },
      select: { id: true },
    })

    if (existing) {
      await prisma.clinicalInformation.delete({
        where: { id: existing.id },
      })
    }

    revalidatePath(`/doctor/patients/${patientId}/clinical-info`)
    return {
      success: true,
      message: "Clinical information reset successfully",
    }
  } catch (error) {
    console.error("Error resetting clinical info:", error)
    return {
      success: false,
      message: "Failed to reset clinical information",
    }
  }
}



export async function bulkUpdateClinicalInfo(updates: Array<{ id: string; data: any }>) {
  try {
    const results = await Promise.all(
      updates.map(({ id, data }) =>
        prisma.clinicalInformation.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        }),
      ),
    )

    return {
      success: true,
      message: `Updated ${results.length} clinical information records`,
      data: results,
    }
  } catch (error) {
    console.error("Error bulk updating clinical info:", error)
    return {
      success: false,
      message: "Failed to update clinical information records",
    }
  }
}

export { getClinicalInfo, getPatient }