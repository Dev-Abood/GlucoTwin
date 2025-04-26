"use server"

import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { auth } from "@clerk/nextjs/server"


const prisma = new PrismaClient()

// Input validation schema
const PatientSchema = z.object({
  name: z.string().min(2),
  patientId: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.date(),
  age: z.number().int().min(0),
  term: z.number().int().min(0),
  dueDate: z.date(),
})

type PatientInput = z.infer<typeof PatientSchema>


export async function createPatient(data: PatientInput) {
    const {userId} = await auth()

    if (!userId) {
        return { error: "User not authenticated" }

    }

  try {
    // Validate input data
    const validatedData = PatientSchema.parse(data)

    // Check if patient with this ID already exists
    const existingPatient = await prisma.patient.findUnique({
      where: { patientId: validatedData.patientId },
    })

    if (existingPatient) {
      return {
        error: "A patient with this ID already exists. Please use a different ID.",
      }
    }

    // Check if email already exists
    const existingEmail = await prisma.patient.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return {
        error: "This email is already registered. Please contact support if you need assistance.",
      }
    }

    // Create new patient
    await prisma.patient.create({
      data: {
        id: userId,
        name: validatedData.name,
        patientId: validatedData.patientId,
        email: validatedData.email,
        dateOfBirth: validatedData.dateOfBirth,
        age: validatedData.age,
        term: validatedData.term,
        dueDate: validatedData.dueDate,
      },
    })


    return { success: true }
  } catch (error) {
    console.error("Error creating patient:", error)
    return {
      error: "Failed to create patient. Please try again.",
    }
  }
}

