// app/doctor/appointments/availability/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AvailabilityManagementView from "./availability-view";

export default async function AvailabilityPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <AvailabilityManagementView />;
}