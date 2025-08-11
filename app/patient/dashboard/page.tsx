// Next.js
import { notFound, redirect } from "next/navigation";

// Authentication
import { auth } from "@clerk/nextjs/server";

// Database
import { prisma } from "@/lib/prisma";

// Components
import Dashboard from "./dashboard";

export default async function PatientDashboard() {
  const { userId } = await auth();

  if (!userId) {
    // redirect unauthorized users to sign up page
    redirect("/sign-up");
  }

  //* query the patient data for the user id
  const patientData = await prisma.patient.findUnique({
    where: { id: userId },
    select: {
      name: true,
      readings: {
        select: {
          id: true,
          date: true,
          time: true,
          type: true,
          level: true,
          notes: true,
          status: true,
        },
      },
    },
  });

  if (!patientData) {
    //! Redirect to /onboarding
    return notFound();
  }

  return <Dashboard patientData={patientData} />;
}
