import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditReadingForm from "./edit-reading-form";

export default async function EditReading({
	params,
}: {
	params: { id: string };
}) {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-up");
	}

	// Fetch the existing reading
	const reading = await prisma.reading.findUnique({
		where: { id: params.id },
	});

	// Check if reading exists and belongs to the current user
	if (!reading || reading.patientId !== userId) {
		redirect("/patient/readings");
	}

	return <EditReadingForm reading={reading} />;
}
