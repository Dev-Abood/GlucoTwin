import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MessagesPageClient from "./MessagesPageClient";

const prisma = new PrismaClient();

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  // Fetch patient and their assigned doctors
  const patient = await prisma.patient.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      patientAssignments: {
        select: {
          id: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
        },
      },
    },
  });

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">You don't currently have a doctor assigned.</div>;
  }

  // Map data to UI-friendly format
  const doctors = patient.patientAssignments.map((assignment) => ({
    assignmentId: assignment.id,
    doctor: assignment.doctor,
  }));

  return <MessagesPageClient patientData={patient} doctors={doctors} />;
}
