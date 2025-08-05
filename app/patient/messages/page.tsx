import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MessagesPage from "./MessagesPageClient";

const prisma = new PrismaClient();

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const patient = await prisma.patient.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      patientAssignments: {
        select: {
          id: true,
          lastVisitDate: true,
          hasMessageForPatient: true,
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
    return <div>No doctors assigned yet.</div>;
  }

  return (
    <MessagesPage
      patientData={{ id: patient.id, name: patient.name }}
      doctorAssignments={patient.patientAssignments}
    />
  );
}
