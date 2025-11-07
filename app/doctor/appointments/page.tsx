// app/doctor/appointments/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DoctorAppointmentsView from "./appointments-view";

export default async function DoctorAppointmentsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <DoctorAppointmentsView />;
}