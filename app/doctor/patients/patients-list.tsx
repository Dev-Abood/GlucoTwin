"use client"; //! Client component, re-renders and auth and react hooks run here, commands run on browser console.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2 } from "lucide-react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

// Types
type PatientWithStatus = {
	id: string;
	patientId: string;
	name: string;
	age: number;
	dateOfBirth: Date;
	term: number;
	hasMessage: boolean;
	status: "normal" | "elevated" | "high";
	lastVisitDate: Date;
};

interface PatientsListProps {
	doctorData: {
		name: string;
		patientAssignments: {
			patient: {
				id: string;
				name: string;
				readings: {
					level: number;
					type: string;
				}[];
				patientId: string;
				age: number;
				dateOfBirth: Date;
				term: number;
				hasMessage: boolean;
			};
			lastVisitDate: Date;
		}[];
	};
}

export default function PatientsList({ doctorData }: PatientsListProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		if (doctorData) {
			setIsLoading(false);
		}
	}, [doctorData]);

	// Process the patient data to include status based on readings
	const patients: PatientWithStatus[] = doctorData.patientAssignments.map(
		({ patient, lastVisitDate }) => {
			let status: "normal" | "elevated" | "high" = "normal"; // no "unknown"
			const readings = patient.readings;
	  
		  if (readings && readings.length > 0) {
			let hasElevated = false;
	  
			for (const r of readings) {
			  const isBeforeMeal = r.type.toUpperCase().includes("BEFORE");
			  const highThreshold = isBeforeMeal ? 105 : 160;
			  const elevatedThreshold = isBeforeMeal ? 95 : 140;
	  
			  if (r.level > highThreshold) {
				status = "high";
				break; // Exit early on hgh
			  } else if (r.level > elevatedThreshold) {
				hasElevated = true;
			  }
			}
	  
			if (status !== "high") {
			  status = hasElevated ? "elevated" : "normal";
			}
		  }
	  
		  return {
			...patient,
			status,
			lastVisitDate,
		  };
		}
	  );
	  


	  console.log(patients)
	// Format date to display nicely
	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Filter patients based on search term across multiple fields
	const filteredPatients = patients.filter((patient) => {
		const search = searchTerm.toLowerCase().trim();
		if (!search) return true;

		// Search by patient ID
		if (patient.patientId.toLowerCase().includes(search)) return true;

		// Search by name
		if (patient.name.toLowerCase().includes(search)) return true;

		// Search by age (convert to string for search)
		if (patient.age.toString().includes(search)) return true;

		// Search by date of birth (formatted)
		const dobFormatted = formatDate(patient.dateOfBirth).toLowerCase();
		if (dobFormatted.includes(search)) return true;

		// Search by term (weeks)
		if (
			patient.term.toString().includes(search) ||
			`${patient.term} weeks`.toLowerCase().includes(search)
		)
			return true;

		// Search by status
		if (patient.status.toLowerCase().includes(search)) return true;

		// Search by message status
		if (
			(patient.hasMessage && "has message".includes(search)) ||
			(!patient.hasMessage && "no message".includes(search))
		)
			return true;

		// Search by last visit date (formatted)
		const lastVisitFormatted = formatDate(patient.lastVisitDate).toLowerCase();
		if (lastVisitFormatted.includes(search)) return true;

		return false;
	});

	const handleViewPatient = (id: string) => {
		router.push(`/doctor/patients/${id}`);
	};

	return (
		<div className="flex min-h-screen flex-col">
			{/* Header section */}
			<Header />

			{/* Main content area */}
			<div className="flex flex-1">
				{/* Sidebar Navigation */}
				<Sidebar userType="doctor" />

				{/* Main Content */}
				<main className="flex-1 overflow-auto">
					<div className="container py-6">
						<div className="mb-6">
							<h1 className="text-3xl font-bold">Welcome, {doctorData.name}</h1>
							<p className="text-muted-foreground">
								Manage and monitor your gestational diabetes patients
							</p>
						</div>

						<Card className="mb-6">
							<CardHeader>
								<CardTitle>Patient List</CardTitle>
								<CardDescription>
									Manage and monitor your gestational diabetes patients
								</CardDescription>
								<div className="relative mt-2">
									<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by name, ID, age, status, date, has message, no message, ..."
										className="pl-8"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
								</div>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Patient ID</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Age</TableHead>
											<TableHead>Date of Birth</TableHead>
											<TableHead>Term</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Message</TableHead>
											<TableHead>Last Visit</TableHead>
											<TableHead></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{isLoading ? (
											<TableRow>
												<TableCell colSpan={9} className="text-center py-4">
													<div className="flex justify-center items-center py-10">
														<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
													</div>
												</TableCell>
											</TableRow>
										) : filteredPatients.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={9}
													className="text-center py-4 text-muted-foreground"
												>
													No patients found
												</TableCell>
											</TableRow>
										) : (
											filteredPatients.map((patient) => (
												<TableRow key={patient.id}>
													<TableCell>{patient.patientId}</TableCell>
													<TableCell className="font-medium">
														{patient.name}
													</TableCell>
													<TableCell>{patient.age}</TableCell>
													<TableCell>
														{formatDate(patient.dateOfBirth)}
													</TableCell>
													<TableCell>{patient.term} weeks</TableCell>
													<TableCell>
														<Badge
															variant={
																patient.status === "normal"
																	? "outline"
																	: patient.status === "elevated"
																		? "secondary"
																		: "destructive"
															}
														>
															{patient.status}
														</Badge>
													</TableCell>
													<TableCell>
														{patient.hasMessage ? (
															<CheckCircle2 className="h-4 w-4 text-green-600" />
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</TableCell>
													<TableCell>
														{formatDate(patient.lastVisitDate)}
													</TableCell>
													<TableCell>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleViewPatient(patient.id)}
														>
															View
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>
				</main>
			</div>
		</div>
	);
}
