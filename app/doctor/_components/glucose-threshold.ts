"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { GlucoseThresholdValues } from "./glucose-monitoring"

export async function saveGlucoseThresholds(thresholds: GlucoseThresholdValues) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    // Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: userId }
    })

    if (!doctor) {
      return { success: false, error: "Doctor not found" }
    }

    // Upsert the glucose thresholds
    await prisma.glucoseThresholds.upsert({
      where: {
        doctorId: userId
      },
      update: {
        hyperglycemiaBeforeMeal: thresholds.hyperglycemiaBeforeMeal,
        hyperglycemiaAfterMeal: thresholds.hyperglycemiaAfterMeal,
        hyperglycemiaMajor: thresholds.hyperglycemiaMajor,
        hypoglycemia: thresholds.hypoglycemia,
        hypoglycemiaMajor: thresholds.hypoglycemiaMajor,
        frequentThreshold: thresholds.frequentThreshold,
        updatedAt: new Date()
      },
      create: {
        doctorId: userId,
        hyperglycemiaBeforeMeal: thresholds.hyperglycemiaBeforeMeal,
        hyperglycemiaAfterMeal: thresholds.hyperglycemiaAfterMeal,
        hyperglycemiaMajor: thresholds.hyperglycemiaMajor,
        hypoglycemia: thresholds.hypoglycemia,
        hypoglycemiaMajor: thresholds.hypoglycemiaMajor,
        frequentThreshold: thresholds.frequentThreshold,
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Error saving glucose thresholds:", error)
    return { success: false, error: "Failed to save thresholds" }
  }
}