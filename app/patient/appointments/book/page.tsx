// app/patient/appointments/book/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BookAppointmentView from "./book-appointments-view";

export default async function BookAppointmentPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  return <BookAppointmentView />;
}