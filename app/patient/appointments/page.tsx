// app/patient/appointments/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppointmentsView from "./appointments-view";

export default async function AppointmentsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  return <AppointmentsView />;
}