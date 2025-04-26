import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PatientsList from "./patients-list";

export default async function DoctorPatientsPage() {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-up");
	}

	const doctorData = await prisma.doctor.findUnique({
		where: {
			id: userId,
		},
		select: {
			name: true,
			patientAssignments: {
				select: {
					patient: {
						select: {
							id: true,
							patientId: true,
							name: true,
							age: true,
							dateOfBirth: true,
							term: true,
							hasMessage: true,
							readings: {
								orderBy: {
									date: "desc",
								},
								select: {
									level: true,
									type: true,
								},
							},
						},
					},
					lastVisitDate: true,
				},
			},
		},
	});

	if (!doctorData) {
		return notFound();
	}

	return <PatientsList doctorData={doctorData} />;
}
