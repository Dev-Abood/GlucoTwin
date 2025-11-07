"use server"

import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { auth } from "@clerk/nextjs/server"

const prisma = new PrismaClient()

const PatientSchema = z.object({
  name: z.string().min(2),
  patientId: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.date(),
  age: z.number().int().min(0),
  term: z.number().int().min(0),
  dueDate: z.date(),
  hospitalId: z.string().min(1),
})

type PatientInput = z.infer<typeof PatientSchema>

export async function createPatient(data: PatientInput) {
  const { userId } = await auth()
  if (!userId) return { error: "User not authenticated" }

  try {
    const validatedData = PatientSchema.parse(data)

    const hospital = await prisma.hospital.findUnique({
      where: { id: validatedData.hospitalId },
      select: { id: true },
    })
    if (!hospital) return { error: "Selected hospital does not exist." }

    const existingById = await prisma.patient.findUnique({
      where: { patientId: validatedData.patientId },
    })
    if (existingById) return { error: "A patient with this ID already exists. Please use a different ID." }

    const existingByEmail = await prisma.patient.findUnique({
      where: { email: validatedData.email },
    })
    if (existingByEmail) return { error: "This email is already registered. Please contact support if you need assistance." }

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
        hospital: { connect: { id: validatedData.hospitalId } },
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error creating patient:", error)
    return { error: "Failed to create patient. Please try again." }
  }
}
