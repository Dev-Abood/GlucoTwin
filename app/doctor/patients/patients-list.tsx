"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle2, AlertTriangle, Shield, TrendingUp, Zap } from "lucide-react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { analyzeDetailedGlucoseReadings, DEFAULT_THRESHOLDS, getDetailedAlertSeverity, GlucoseThresholdValues, DetailedGlucoseAlerts } from "../_components/glucose-monitoring"
import { 
  HyperglycemiaBadge, 
  HyperglycemiaFrequentBadge, 
  HyperglycemiaMajorBadge,
  HypoglycemiaBadge,
  HypoglycemiaFrequentBadge,
  HypoglycemiaMajorBadge
} from "../_components/glucose-alerts-badge"
import { ThresholdSettingsDialog } from "../_components/threshold-dialog-settings"

// Types for prediction data
type GDMRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL"

type GDMPrediction = {
  id: string
  predictedGDMRisk: number
  riskCategory: GDMRiskLevel
  confidence: number
  modelVersion: string
  predictedAt: Date
}

type PatientWithStatus = {
  id: string
  patientId: string
  name: string
  age: number
  dateOfBirth: Date
  term: number
  hasMessageForDoctor: boolean
  status: "NORMAL" | "ELEVATED" | "HIGH"
  lastVisitDate: Date
  prediction?: GDMPrediction
  glucoseAlerts?: DetailedGlucoseAlerts
}

type StatusFilter = "all" | "NORMAL" | "ELEVATED" | "HIGH"
type PredictionFilter = "all" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "no-prediction"
type GlucoseAlertFilter = "all" | "normal" | "warning" | "danger" | "critical"

interface PatientsListProps {
  doctorData: {
    name: string
    glucoseThresholds?: {
      hyperglycemiaBeforeMeal: number
      hyperglycemiaAfterMeal: number
      hyperglycemiaMajor: number
      hypoglycemia: number
      hypoglycemiaMajor: number
      frequentThreshold: number
    } | null
    patientAssignments: {
      id: string
      patient: {
        id: string
        name: string
        readings: {
          level: number
          type: string
          status: string
          date: Date
        }[]
        patientId: string
        age: number
        dateOfBirth: Date
        term: number
        clinicalInfo: {
          id: string
          aiPredictions: {
            id: string
            predictedGDMRisk: number
            riskCategory: GDMRiskLevel
            confidence: number
            modelVersion: string
            predictedAt: Date
          }[]
        } | null
      }
      lastVisitDate: Date
      hasMessageForDoctor: boolean
    }[]
  }
}

export default function PatientsList({ doctorData }: PatientsListProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all")
  const [filterPrediction, setFilterPrediction] = useState<PredictionFilter>("all")
  const [filterGlucoseAlert, setFilterGlucoseAlert] = useState<GlucoseAlertFilter>("all")

  const [thresholds, setThresholds] = useState<GlucoseThresholdValues>(
    doctorData.glucoseThresholds || DEFAULT_THRESHOLDS
  )

  useEffect(() => {
    if (doctorData) {
      setIsLoading(false)
      console.log(doctorData)
    }
  }, [doctorData])

  const patients: PatientWithStatus[] = useMemo(() => {
    return doctorData.patientAssignments.map(({ patient, lastVisitDate, hasMessageForDoctor }) => {
      let overallStatus: "NORMAL" | "ELEVATED" | "HIGH" = "NORMAL"
      const readings = patient.readings

      if (readings && readings.length > 0) {
        let hasHigh = false
        let hasElevated = false

        for (const reading of readings) {
          const status = reading.status.toUpperCase()

          if (status === "HIGH") {
            hasHigh = true
            break
          } else if (status === "ELEVATED") {
            hasElevated = true
          }
        }

        if (hasHigh) overallStatus = "HIGH"
        else if (hasElevated) overallStatus = "ELEVATED"
        else overallStatus = "NORMAL"
      }

      const latestPrediction = patient.clinicalInfo?.aiPredictions?.[0]

      const glucoseReadings = readings.map((reading) => ({
        level: reading.level,
        type: reading.type as any,
        date: new Date(reading.date),
      }))

      const glucoseAlerts = analyzeDetailedGlucoseReadings(glucoseReadings, thresholds)

      return {
        ...patient,
        hasMessageForDoctor,
        status: overallStatus,
        lastVisitDate,
        prediction: latestPrediction,
        glucoseAlerts,
      }
    })
  }, [doctorData.patientAssignments, thresholds])

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const search = searchTerm.toLowerCase().trim()

      const matchesStatus = filterStatus === "all" || patient.status === filterStatus

      let matchesPrediction = true
      if (filterPrediction !== "all") {
        if (filterPrediction === "no-prediction") {
          matchesPrediction = !patient.prediction
        } else {
          matchesPrediction = patient.prediction?.riskCategory === filterPrediction
        }
      }

      let matchesGlucoseAlert = true
      if (filterGlucoseAlert !== "all" && patient.glucoseAlerts) {
        const severity = getDetailedAlertSeverity(patient.glucoseAlerts)
        matchesGlucoseAlert = severity === filterGlucoseAlert
      }

      if (!search) return matchesStatus && matchesPrediction && matchesGlucoseAlert

      const displayStatus = patient.status.toLowerCase()
      const predictionText = patient.prediction ? patient.prediction.riskCategory.toLowerCase() : "no prediction"

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
        formatDate(patient.lastVisitDate).toLowerCase().includes(search)

      return matchesSearch && matchesStatus && matchesPrediction && matchesGlucoseAlert
    })
  }, [patients, searchTerm, filterStatus, filterPrediction, filterGlucoseAlert])

  const handleViewPatient = (id: string) => {
    router.push(`/doctor/patients/${id}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="doctor" />

      <div className="flex flex-1">
        <Sidebar userType="doctor" />

        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Welcome, {doctorData.name}</h1>
              <p className="text-muted-foreground">
                Manage and monitor your gestational diabetes patients with detailed glucose monitoring alerts
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Patient List</CardTitle>
                    <CardDescription>
                      Detailed glucose monitoring with individual alerts for hyperglycemia and hypoglycemia conditions
                    </CardDescription>
                  </div>
                  <ThresholdSettingsDialog currentThresholds={thresholds} />
                </div>

                <div className="flex flex-col gap-4 mt-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, age, status, prediction..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="w-full sm:w-[180px]">
                    <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
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

                  <div className="w-full sm:w-[180px]">
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

                  <div className="w-full sm:w-[180px]">
                    <Select
                      value={filterGlucoseAlert}
                      onValueChange={(value) => setFilterGlucoseAlert(value as GlucoseAlertFilter)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by alerts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Alerts</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="danger">Danger</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-[1800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Patient ID</TableHead>
                        <TableHead className="whitespace-nowrap">Name</TableHead>
                        <TableHead className="whitespace-nowrap">Age</TableHead>
                        <TableHead className="whitespace-nowrap">Date of Birth</TableHead>
                        <TableHead className="whitespace-nowrap">Term</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">AI Prediction</TableHead>
                        {/* Glucose Alert Columns */}
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hyperglycemia</div>
                          <div className="text-xs text-muted-foreground font-normal">Elevated</div>
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hyper Frequent</div>
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hyper Major</div>
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hypoglycemia</div>
                          <div className="text-xs text-muted-foreground font-normal">Low</div>
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hypo Frequent</div>
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">
                          <div className="text-xs font-medium">Hypo Major</div>
                        </TableHead>
                        <TableHead className="whitespace-nowrap">Message</TableHead>
                        <TableHead className="whitespace-nowrap">Last Visit</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-4">
                            <div className="flex justify-center items-center py-10">
                              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredPatients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-4 text-muted-foreground">
                            No patients match your search criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell className="font-medium">{patient.patientId}</TableCell>
                            <TableCell className="font-medium">{patient.name}</TableCell>
                            <TableCell>{patient.age}</TableCell>
                            <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                            <TableCell>{patient.term} weeks</TableCell>
                            <TableCell>{getStatusBadge(patient.status)}</TableCell>
                            <TableCell>{getPredictionBadge(patient.prediction)}</TableCell>
                            
                            {/* Individual Glucose Alert Columns */}
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HyperglycemiaBadge alert={patient.glucoseAlerts.hyperglycemia} />}
                            </TableCell>
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HyperglycemiaFrequentBadge alert={patient.glucoseAlerts.hyperglycemiaFrequent} />}
                            </TableCell>
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HyperglycemiaMajorBadge alert={patient.glucoseAlerts.hyperglycemiaMajor} />}
                            </TableCell>
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HypoglycemiaBadge alert={patient.glucoseAlerts.hypoglycemia} />}
                            </TableCell>
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HypoglycemiaFrequentBadge alert={patient.glucoseAlerts.hypoglycemiaFrequent} />}
                            </TableCell>
                            <TableCell className="text-center">
                              {patient.glucoseAlerts && <HypoglycemiaMajorBadge alert={patient.glucoseAlerts.hypoglycemiaMajor} />}
                            </TableCell>
                            
                            <TableCell>
                              {patient.hasMessageForDoctor ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(patient.lastVisitDate)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleViewPatient(patient.id)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case "NORMAL":
      return <Badge variant="outline">Normal</Badge>
    case "ELEVATED":
      return <Badge variant="secondary">Elevated</Badge>
    case "HIGH":
      return <Badge variant="destructive">High</Badge>
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

function getPredictionBadge(prediction?: GDMPrediction) {
  if (!prediction) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Prediction
      </Badge>
    )
  }

  const { riskCategory } = prediction

  switch (riskCategory) {
    case "LOW":
      return (
        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
          <Shield className="w-3 h-3 mr-1" />
          Low Risk
        </Badge>
      )
    case "MODERATE":
      return (
        <Badge variant="secondary" className="text-yellow-700 border-yellow-200 bg-yellow-50">
          <TrendingUp className="w-3 h-3 mr-1" />
          Moderate Risk
        </Badge>
      )
    case "HIGH":
      return (
        <Badge variant="destructive" className="text-orange-700 border-orange-200 bg-orange-50">
          <AlertTriangle className="w-3 h-3 mr-1" />
          High Risk
        </Badge>
      )
    case "CRITICAL":
      return (
        <Badge variant="destructive" className="text-red-700 border-red-200 bg-red-50">
          <Zap className="w-3 h-3 mr-1" />
          Critical Risk
        </Badge>
      )
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}