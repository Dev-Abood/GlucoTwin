"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { clinicalInfoSchema } from "@/lib/clinical-info-val"

const prisma = new PrismaClient()

// Define the Flask API response type
type FlaskApiResponse = {
  prediction: 'GDM Risk' | 'No GDM Risk';
  confidence: number;
  gdm_probability: number;
  factors: string[];
  model_version: string;
  apiResponseTime: number;
}

// Feature mapping for display purposes
const FEATURE_DISPLAY_MAPPING: Record<string, string> = {
  'oneHourGlucose': '1 Hour Glucose Level',
  'bpSystolic': 'Systolic Blood Pressure',
  'bmiBaseline': 'BMI (Body Mass Index)',
  'fastingBloodGlucose': 'Fasting Blood Glucose',
  'weightKg': 'Weight',
  'pulseHeartRate': 'Pulse/Heart Rate',
  'hypertensiveDisorders': 'Hypertensive Disorders',
  'typeOfTreatment': 'Type of Treatment',
  'twoHourGlucose': '2 Hour Glucose Level',
  'nationality': 'Nationality',
  'ageYears': 'Age',
  'bpDiastolic': 'Diastolic Blood Pressure',
  'height': 'Height',
  'weightGainDuringPregnancy': 'Weight Gain During Pregnancy'
}


// Function to determine risk category based on probability
function getRiskCategory(probability: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (probability <= 30) return 'LOW'
  if (probability <= 60) return 'MODERATE'
  if (probability <= 80) return 'HIGH'
  return 'CRITICAL'
}

// Function to call Flask API for prediction
async function callPredictionAPI(clinicalData: any, patientAge: number): Promise<FlaskApiResponse | null> {
  try {
    const payload = {
      patientData: {
        oneHourGlucose: clinicalData.oneHour75Glucose,
        bpSystolic: clinicalData.bpSystolic,
        bmiBaseline: clinicalData.bmi,
        fastingBloodGlucose: clinicalData.fastingBloodGlucose,
        weightKg: clinicalData.weight,
        pulseHeartRate: clinicalData.pulseHeartRate,
        hypertensiveDisorders: clinicalData.hypertensiveDisorders,
        typeOfTreatment: 'No Treatment', // default value 
        twoHourGlucose: clinicalData.twoHour75Glucose,
        nationality: clinicalData.nationality,
        ageYears: patientAge,
        bpDiastolic: clinicalData.bpDiastolic,
        height: clinicalData.height,
        weightGainDuringPregnancy: clinicalData.weightGainDuringPregnancy
      }
    }

    const response = await fetch(`${process.env.FLASK_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Flask API error:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error calling prediction API:', error)
    return null
  }
}

async function getClinicalInfo(patientId: string) {
  try {
    return await prisma.clinicalInformation.findUnique({
      where: { patientId },
      include: { 
        patient: true,
        aiPredictions: {
          where: { isActive: true },
          orderBy: { predictedAt: 'desc' },
          take: 1
        }
      },
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

    // Get patient age for prediction API
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { age: true }
    })

    if (!patient) {
      throw new Error("Patient not found")
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

    // Make AI prediction if we have sufficient data
    const predictionResult = await callPredictionAPI(validatedData, patient.age)
    
    if (predictionResult) {
      // Deactivate previous predictions
      await prisma.gDMPrediction.updateMany({
        where: { 
          clinicalInfoId: clinicalInfo.id,
          isActive: true 
        },
        data: { isActive: false }
      })

      // Create new prediction record
      await prisma.gDMPrediction.create({
        data: {
          clinicalInfoId: clinicalInfo.id,
          predictedGDMRisk: predictionResult.gdm_probability / 100, // Convert percentage to decimal
          riskCategory: getRiskCategory(predictionResult.gdm_probability),
          confidence: predictionResult.confidence / 100, // Convert percentage to decimal
          modelVersion: predictionResult.model_version,
          featuresUsed: predictionResult.factors, // Store as JSON
          topInfluentialFeatures: predictionResult.factors, // Store the feature names
          isActive: true
        }
      })

      console.log("AI prediction saved successfully")
    }

    revalidatePath(`/doctor/patients/${patientId}/clinical-info`)
    return {
      success: true,
      message: "Clinical information updated successfully",
      data: clinicalInfo,
      predictionMade: !!predictionResult
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
