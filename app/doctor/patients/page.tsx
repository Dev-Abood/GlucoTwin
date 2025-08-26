import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PatientsList from "./patients-list";

export default async function DoctorPatientsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  const doctorData = await prisma.doctor.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      patientAssignments: {
        select: {
          id: true,
          lastVisitDate: true,
          hasMessageForDoctor: true, 
          patient: {
            select: {
              id: true,
              patientId: true,
              name: true,
              age: true,
              dateOfBirth: true,
              term: true,
              readings: {
                orderBy: {
                  date: "desc",
                },
                select: {
                  level: true,
                  type: true,
                  status: true,
                },
              },
                                // Include clinical information and AI predictions
              clinicalInfo: {
                select: {
                  id: true,
                  aiPredictions: {
                    where: {
                      isActive: true, // Get only the active/latest prediction
                    },
                    orderBy: {
                      predictedAt: "desc",
                    },
                    select: {
                      id: true,
                      predictedGDMRisk: true,
                      riskCategory: true,
                      confidence: true,
                      modelVersion: true,
                      topInfluentialFeatures: true,
                      predictedAt: true,
                    },
                    take: 1, // Get the most recent active prediction
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!doctorData) {
    return notFound();
  }

  return <PatientsList doctorData={doctorData} />;
}