import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PatientReadingsTable from "./patient-readings-table";
import { prisma } from "@/lib/prisma";

export default async function ReadingsPage() {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-up");
	}

	const patientReadings = await prisma.patient.findUnique({
		where: {
			id: userId,
		},
		select: {
			readings: {
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
		},
	});

	console.log("Patient Readings:", patientReadings);

	return (
		<PatientReadingsTable patientReadings={patientReadings?.readings || []} />
	);
}
