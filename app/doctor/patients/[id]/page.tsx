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

	// First get the doctor to verify they can access this patient
	const doctor = await prisma.doctor.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
		},
	});

	if (!doctor) {
		return notFound();
	}

	// Check if the patient is assigned to this doctor
	const patientAssignment = await prisma.patientAssignment.findFirst({
		where: {
			doctorId: doctor.id,
			patientId: params.id,
		},
	});

	if (!patientAssignment) {
		return notFound(); // Patient not found or not assigned to this doctor
	}

	// Get detailed patient data with readings
	const patientData = await prisma.patient.findUnique({
		where: {
			id: params.id,
		},
		select: {
			id: true,
			patientId: true,
			name: true,
			age: true,
			dateOfBirth: true,
			term: true,
			dueDate: true,
			hasMessage: true,
			readings: {
				orderBy: {
					date: "desc",
				},
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
				where: {
					doctorId: doctor.id,
				},
				select: {
					lastVisitDate: true,
					addedDate: true,
				},
			},
		},
	});

	if (!patientData) {
		return notFound();
	}

	// Get the last visit date from the assignment
	const lastVisit = patientData.patientAssignments[0]?.lastVisitDate;

	return <PatientDetailsView patientData={patientData} lastVisit={lastVisit} />;
}
