// app/doctor/messages/page.tsx
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import MessagesPageClient from "./MessagesPageClient";
import { notFound, redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: userId },
    select: {
      patientAssignments: {
        select: {
          lastVisitDate: true,
          id: true,
          doctorId: true,
          patient: {
            select: {
              readings: {
                select: { level: true, type: true, status: true },
                orderBy: [{ date: "desc" }, { time: "desc" }],
                take: 1,
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
            },
          },
        },
      },
    },
  });

  if (!doctor) {
    return <div>No patients found</div>;
  }

  // Transform raw Prisma result to PatientWithAssignment[]
  const patients = doctor.patientAssignments.map((assignment) => {
    const patient = assignment.patient;
    return {
      id: patient.id,
      patientId: patient.patientId,
      email: patient.email,
      name: patient.name,
      age: patient.age,
      dateOfBirth: patient.dateOfBirth,
      term: patient.term,
      dueDate: patient.dueDate,
      hasMessage: patient.hasMessage,
      assignment: {
        id: assignment.id,
        doctorId: assignment.doctorId,
        lastVisitDate: assignment.lastVisitDate,
      },
      lastReading: patient.readings[0]
        ? {
            level: patient.readings[0].level,
            type: patient.readings[0].type,
          }
        : undefined,
      status: patient.readings[0]?.status || "NORMAL",
    };
  });

  const doctorName = await prisma.doctor.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
    },
  });

  if (!doctorName) {
    return notFound();
  }

  return <MessagesPageClient doctorData={doctorName} patients={patients} />;
}
