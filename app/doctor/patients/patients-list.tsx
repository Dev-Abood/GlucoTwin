"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2 } from "lucide-react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

type PatientWithStatus = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  dateOfBirth: Date;
  term: number;
  hasMessageForDoctor: boolean;
  status: "NORMAL" | "ELEVATED" | "HIGH";
  lastVisitDate: Date;
};

type StatusFilter = "all" | "NORMAL" | "ELEVATED" | "HIGH";

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
          status: string;
        }[];
        patientId: string;
        age: number;
        dateOfBirth: Date;
        term: number;
      };
      lastVisitDate: Date;
      hasMessageForDoctor: boolean; // now correctly defined here
    }[];
  };
}

export default function PatientsList({ doctorData }: PatientsListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    if (doctorData) {
      setIsLoading(false);
    }
  }, [doctorData]);

  // Process patient data: merge hasMessageForDoctor into patient object
  const patients: PatientWithStatus[] = useMemo(() => {
    return doctorData.patientAssignments.map(({ patient, lastVisitDate, hasMessageForDoctor }) => {
      let overallStatus: "NORMAL" | "ELEVATED" | "HIGH" = "NORMAL";
      const readings = patient.readings;

      if (readings && readings.length > 0) {
        // Determine highest status
        let hasHigh = false;
        let hasElevated = false;

        for (const reading of readings) {
          const status = reading.status.toUpperCase();

          if (status === "HIGH") {
            hasHigh = true;
            break;
          } else if (status === "ELEVATED") {
            hasElevated = true;
          }
        }

        if (hasHigh) overallStatus = "HIGH";
        else if (hasElevated) overallStatus = "ELEVATED";
        else overallStatus = "NORMAL";
      }

      return {
        ...patient,
        hasMessageForDoctor,
        status: overallStatus,
        lastVisitDate,
      };
    });
  }, [doctorData.patientAssignments]);

  // Format date helper
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // Status badge UI
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NORMAL":
        return <Badge variant="outline">Normal</Badge>;
      case "ELEVATED":
        return <Badge variant="secondary">Elevated</Badge>;
      case "HIGH":
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Filtering logic
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesStatus = filterStatus === "all" || patient.status === filterStatus;

      if (!search) return matchesStatus;

      const displayStatus = patient.status.toLowerCase();

      const matchesSearch =
        patient.patientId.toLowerCase().includes(search) ||
        patient.name.toLowerCase().includes(search) ||
        patient.age.toString().includes(search) ||
        formatDate(patient.dateOfBirth).toLowerCase().includes(search) ||
        patient.term.toString().includes(search) ||
        `${patient.term} weeks`.toLowerCase().includes(search) ||
        displayStatus.includes(search) ||
        (patient.hasMessageForDoctor && "has message".includes(search)) ||
        (!patient.hasMessageForDoctor && "no message".includes(search)) ||
        formatDate(patient.lastVisitDate).toLowerCase().includes(search);

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, filterStatus]);

  const handleViewPatient = (id: string) => {
    router.push(`/doctor/patients/${id}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <Header userType="doctor"/>

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar userType="doctor" />

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

                {/* Search + Filter */}
                <div className="flex flex-col gap-4 mt-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, age, status, date, message status..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="w-full sm:w-[200px]">
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => setFilterStatus(value as StatusFilter)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="ELEVATED">Elevated</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          No patients match your search criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>{patient.patientId}</TableCell>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>{patient.age}</TableCell>
                          <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                          <TableCell>{patient.term} weeks</TableCell>
                          <TableCell>{getStatusBadge(patient.status)}</TableCell>
                          <TableCell>
                            {patient.hasMessageForDoctor ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(patient.lastVisitDate)}</TableCell>
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
