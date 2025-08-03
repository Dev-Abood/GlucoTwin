"use server"

import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { auth } from "@clerk/nextjs/server"


const prisma = new PrismaClient()


export async function retrievePatientsList(){
    // Check if user (doctor) exists already
    const {userId} = await auth()

    if (!userId) {
        return { error: "User not authenticated" }
    }

  try {
      //! Retrieve the list of patients assigned to this doctor
      const patientsList = await prisma.doctor.findUnique({
        where: {
            // track doctor specific records
            id: userId,
        },
        select: {
    //             {
    //     id: "1",
    //     patientId: "P22103623",
    //     email: "layla@example.com",
    //     name: "Layla Abdulwahab Mahmoud",
    //     age: 28,
    //     dateOfBirth: new Date("1996-06-14"),
    //     term: 19,
    //     dueDate: new Date("2026-02-21"),
    //     hasMessage: false,
    //     status: "high",
    //     assignment: {
    //     id: "assign1",
    //     doctorId: "doc1",
    //     lastVisitDate: new Date("2025-01-01"),
    //     },
    //     lastReading: {
    //     level: 151,
    //     type: "AFTER_LUNCH",
    //     },
    // }
            patientAssignments: {
                select: {
                    patient: {
                        select: {
                            readings: {
                                select: {
                                    level: true,
                                    type: true,
                                },
                                orderBy: {
                                    date: 'desc',
                                    time: 'desc'
                                },
                                take: 1
                            },
                            id: true,
                            patientId: true,
                            email: true,
                            name: true,
                            age: true,
                            dateOfBirth: true,
                            term: true,
                            dueDate: true,
                            hasMessage: true,
                            patientAssignments: {
                                select: {
                                    lastVisitDate: true,
                                    id: true,
                                    doctorId: true,
                                }
                            }
                        }
                    }
                }
            }
        }
      }
      )
        console.log(patientsList)
        return { success: true }
    }
     catch (error) {
    console.error("Error retrieving patients list:", error)
    return {
      error: "Failed to retrieve patients list",
    }
  }
}

