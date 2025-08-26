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
import { Search, CheckCircle2, AlertTriangle, Shield, TrendingUp, Zap } from "lucide-react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

// Types for prediction data
type GDMRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

type GDMPrediction = {
  id: string;
  predictedGDMRisk: number;
  riskCategory: GDMRiskLevel;
  confidence: number;
  modelVersion: string;
  // topInfluentialFeatures: string[]; // Comment out until migration
  predictedAt: Date;
};

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
  prediction?: GDMPrediction; // Add prediction data
};

type StatusFilter = "all" | "NORMAL" | "ELEVATED" | "HIGH";
type PredictionFilter = "all" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "no-prediction";

interface PatientsListProps {
  doctorData: {
    name: string;
    patientAssignments: {
      id: string; // Add missing id field
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
        clinicalInfo: { // Change from optional to required but nullable
          id: string;
          aiPredictions: {
            id: string;
            predictedGDMRisk: number;
            riskCategory: GDMRiskLevel;
            confidence: number;
            modelVersion: string;
            // topInfluentialFeatures: string[]; // Comment out until migration
            predictedAt: Date;
          }[];
        } | null; // Use null instead of undefined to match Prisma
      };
      lastVisitDate: Date;
      hasMessageForDoctor: boolean;
    }[];
  };
}

export default function PatientsList({ doctorData }: PatientsListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterPrediction, setFilterPrediction] = useState<PredictionFilter>("all");

  useEffect(() => {
    if (doctorData) {
      setIsLoading(false);
      console.log(doctorData)
    }
  }, [doctorData]);

  // Process patient data: merge hasMessageForDoctor and prediction into patient object
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

        console.log(overallStatus)
      }

      // Get the latest prediction - handle null clinicalInfo
      const latestPrediction = patient.clinicalInfo?.aiPredictions?.[0];

      return {
        ...patient,
        hasMessageForDoctor,
        status: overallStatus,
        lastVisitDate,
        prediction: latestPrediction,
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

  // Prediction badge UI
  const getPredictionBadge = (prediction?: GDMPrediction) => {
    if (!prediction) {
      return <Badge variant="outline" className="text-muted-foreground">No Prediction</Badge>;
    }

    const { riskCategory, confidence } = prediction;
    
    switch (riskCategory) {
      case "LOW":
        return (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            <Shield className="w-3 h-3 mr-1" />
            Low Risk
          </Badge>
        );
      case "MODERATE":
        return (
          <Badge variant="secondary" className="text-yellow-700 border-yellow-200 bg-yellow-50">
            <TrendingUp className="w-3 h-3 mr-1" />
            Moderate Risk
          </Badge>
        );
      case "HIGH":
        return (
          <Badge variant="destructive" className="text-orange-700 border-orange-200 bg-orange-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            High Risk
          </Badge>
        );
      case "CRITICAL":
        return (
          <Badge variant="destructive" className="text-red-700 border-red-200 bg-red-50">
            <Zap className="w-3 h-3 mr-1" />
            Critical Risk
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Filtering logic
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesStatus = filterStatus === "all" || patient.status === filterStatus;
      
      // Prediction filtering
      let matchesPrediction = true;
      if (filterPrediction !== "all") {
        if (filterPrediction === "no-prediction") {
          matchesPrediction = !patient.prediction;
        } else {
          matchesPrediction = patient.prediction?.riskCategory === filterPrediction;
        }
      }

      if (!search) return matchesStatus && matchesPrediction;

      const displayStatus = patient.status.toLowerCase();
      const predictionText = patient.prediction 
        ? patient.prediction.riskCategory.toLowerCase() 
        : "no prediction";

      const matchesSearch =
        patient.patientId.toLowerCase().includes(search) ||
        patient.name.toLowerCase().includes(search) ||
        patient.age.toString().includes(search) ||
        formatDate(patient.dateOfBirth).toLowerCase().includes(search) ||
        patient.term.toString().includes(search) ||
        `${patient.term} weeks`.toLowerCase().includes(search) ||
        displayStatus.includes(search) ||
        predictionText.includes(search) ||
        (patient.hasMessageForDoctor && "has message".includes(search)) ||
        (!patient.hasMessageForDoctor && "no message".includes(search)) ||
        formatDate(patient.lastVisitDate).toLowerCase().includes(search);

        console.log(patients, patient)

      return matchesSearch && matchesStatus && matchesPrediction;
    });
  }, [patients, searchTerm, filterStatus, filterPrediction]);

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
                  Manage and monitor your gestational diabetes patients with AI predictions
                </CardDescription>

                {/* Search + Filters */}
                <div className="flex flex-col gap-4 mt-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, age, status, prediction, date, message status..."
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

                  {/* Prediction Filter */}
                  <div className="w-full sm:w-[200px]">
                    <Select
                      value={filterPrediction}
                      onValueChange={(value) => setFilterPrediction(value as PredictionFilter)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by prediction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Predictions</SelectItem>
                        <SelectItem value="LOW">Low Risk</SelectItem>
                        <SelectItem value="MODERATE">Moderate Risk</SelectItem>
                        <SelectItem value="HIGH">High Risk</SelectItem>
                        <SelectItem value="CRITICAL">Critical Risk</SelectItem>
                        <SelectItem value="no-prediction">No Prediction</SelectItem>
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
                      <TableHead>AI Prediction</TableHead> {/* New column */}
                      <TableHead>Message</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-4">
                          <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">
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
                          <TableCell>{getPredictionBadge(patient.prediction)}</TableCell> {/* New cell */}
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