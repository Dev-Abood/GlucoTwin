import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PatientDetailsView from "./patient-details-view";

export default async function PatientDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  // Verify the doctor exists
  const doctor = await prisma.doctor.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!doctor) return notFound();

  // Verify patient is assigned to this doctor
  const patientAssignment = await prisma.patientAssignment.findFirst({
    where: {
      doctorId: doctor.id,
      patientId: params.id,
    },
  });

  if (!patientAssignment) return notFound();

  // Fetch patient details (note: no hasMessageForDoctor in Patient itself)
  const patientData = await prisma.patient.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      patientId: true,
      name: true,
      age: true,
      dateOfBirth: true,
      term: true,
      dueDate: true,
      readings: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          time: true,
          type: true,
          level: true,
          status: true,
          notes: true,
        },
      },
      patientAssignments: {
        where: { doctorId: doctor.id },
        select: {
          lastVisitDate: true,
          addedDate: true,
          hasMessageForDoctor: true, // <--- Moved here (correct place)
        },
      },
    },
  });

  if (!patientData) return notFound();

  const lastVisit = patientData.patientAssignments[0]?.lastVisitDate || null;

  return <PatientDetailsView patientData={patientData} lastVisit={lastVisit} />;
}
