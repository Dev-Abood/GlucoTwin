"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, FileText, Trash, Brain, Shield, TrendingUp, AlertTriangle, Zap, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { createOrUpdateClinicalInfo, resetClinicalInfo } from "./actions"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import rawCountries from "world-countries"

interface Patient {
  id: string
  name: string
  patientId: string
  age: number
}

interface GDMPrediction {
  id: string
  predictedGDMRisk: number
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  confidence: number
  modelVersion: string
  topInfluentialFeatures: string[]
  predictedAt: Date
}

interface ClinicalInfo {
  id?: string
  patientId: string
  nationality?: string | null
  bmi?: number | null
  weight?: number | null
  height?: number | null
  weightGainDuringPregnancy?: number | null
  fastingBloodGlucose?: number | null
  oneHour75Glucose?: number | null
  twoHour75Glucose?: number | null
  hypertensiveDisorders?: string | null
  pulseHeartRate?: number | null
  bpSystolic?: number | null
  bpDiastolic?: number | null
  createdAt?: Date
  updatedAt?: Date
  aiPredictions?: GDMPrediction[]
}

interface ClinicalInfoPageProps {
  patient: Patient
  clinicalInfo: ClinicalInfo | null
}

export default function ClinicalInfoPage({ patient, clinicalInfo }: ClinicalInfoPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Controlled inputs for weight/height to auto-calc BMI
  const [weight, setWeight] = useState<string>(clinicalInfo?.weight?.toString() ?? "")
  const [height, setHeight] = useState<string>(clinicalInfo?.height?.toString() ?? "")
  const [computedBmi, setComputedBmi] = useState<string>(clinicalInfo?.bmi?.toFixed(1) ?? "")

  // Feature mapping for display purposes
  const FEATURE_DISPLAY_MAPPING: Record<string, string> = {
    'oneHourGlucose': '1 Hour Glucose Level',
    'bpSystolic': 'Systolic Blood Pressure',
    'bmiBaseline': 'BMI (Body Mass Index)',
    'fastingBloodGlucose': 'Fasting Blood Glucose',
    'weightKg': 'Weight',
    'pulseHeartRate': 'Pulse/Heart Rate',
    'hypertensiveDisorders': 'Hypertensive Disorders',
    'typeOfTreatment': 'Type of Treatment',
    'twoHourGlucose': '2 Hour Glucose Level',
    'nationality': 'Nationality',
    'ageYears': 'Age',
    'bpDiastolic': 'Diastolic Blood Pressure',
    'height': 'Height',
    'weightGainDuringPregnancy': 'Weight Gain During Pregnancy'
  }

  // Function to map feature names to display names
  const mapFeaturesToDisplayNames = (features: string[]): string[] => {
    return features.map(feature => FEATURE_DISPLAY_MAPPING[feature] || feature)
  }

  // Get the latest AI prediction
  const latestPrediction = clinicalInfo?.aiPredictions?.[0]

  useEffect(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    if (!isNaN(w) && !isNaN(h) && h > 0) {
      const bmi = w / Math.pow(h / 100, 2)
      const rounded = Math.round(bmi * 10) / 10
      if (isFinite(rounded)) setComputedBmi(rounded.toFixed(1))
    } else {
      setComputedBmi("")
    }
  }, [weight, height])

  // Build a sorted list of countries once per render
  const COUNTRIES = useMemo(
    () =>
      rawCountries
        .map((c) => ({
          label: c.name.common,
          value: c.name.common,
          cca2: c.cca2,
          flag: c.flag,
          region: c.region,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  )

  // Function to get prediction badge
  const getPredictionBadge = (prediction?: GDMPrediction) => {
    if (!prediction) return null

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

  // Function to get prediction message
  const getPredictionMessage = (prediction?: GDMPrediction) => {
    if (!prediction) return null

    const riskPercentage = Math.round(prediction.predictedGDMRisk * 100)
    const confidence = Math.round(prediction.confidence * 100)

    const messages = {
      LOW: `AI analysis indicates a low probability (${riskPercentage}%) of developing gestational diabetes mellitus. Continue regular monitoring and maintain healthy lifestyle practices.`,
      MODERATE: `AI analysis suggests a moderate risk (${riskPercentage}%) for gestational diabetes mellitus. Close monitoring and preventive measures are recommended.`,
      HIGH: `AI analysis indicates a high probability (${riskPercentage}%) of gestational diabetes mellitus. Immediate attention and comprehensive management plan recommended.`,
      CRITICAL: `AI analysis shows a critical risk level (${riskPercentage}%) for gestational diabetes mellitus. Urgent medical intervention and intensive monitoring required.`
    }

    return messages[prediction.riskCategory] || "Unable to generate prediction message."
  }

  // Client-side validation
  const validateForm = (fd: FormData) => {
    const requiredFields: Array<{ name: string; label: string; type: "text" | "number" | "select"; inputId?: string }> = [
      { name: "nationality", label: "Country", type: "select" },
      { name: "weight", label: "Weight", type: "number", inputId: "weight" },
      { name: "height", label: "Height", type: "number", inputId: "height" },
      { name: "weightGainDuringPregnancy", label: "Weight Gain During Pregnancy", type: "number", inputId: "weightGainDuringPregnancy" },
      { name: "fastingBloodGlucose", label: "Fasting Blood Glucose", type: "number", inputId: "fastingBloodGlucose" },
      { name: "oneHour75Glucose", label: "1 Hour (75g Glucose)", type: "number", inputId: "oneHour75Glucose" },
      { name: "twoHour75Glucose", label: "2 Hour (75g Glucose)", type: "number", inputId: "twoHour75Glucose" },
      { name: "hypertensiveDisorders", label: "Hypertensive Disorders", type: "select" },
      { name: "pulseHeartRate", label: "Pulse/Heart Rate", type: "number", inputId: "pulseHeartRate" },
      { name: "bpSystolic", label: "BP Systolic", type: "number", inputId: "bpSystolic" },
      { name: "bpDiastolic", label: "BP Diastolic", type: "number", inputId: "bpDiastolic" },
    ]

    // clear any previous error rings
    const clearRings = () => {
      if (!formRef.current) return
      formRef.current.querySelectorAll(".ring-2.ring-red-500").forEach((el) => {
        el.classList.remove("ring-2", "ring-red-500")
      })
    }
    clearRings()

    const errors: string[] = []
    let firstInvalidElement: HTMLElement | null = null

    for (const field of requiredFields) {
      const raw = fd.get(field.name)
      const value = typeof raw === "string" ? raw.trim() : raw

      let isInvalid = false

      if (field.name === "nationality") {
        isInvalid = !value || value === "not_specified"
      } else if (field.type === "number") {
        isInvalid = value === "" || value === null || value === undefined
      } else if (field.type === "select") {
        isInvalid = !value || value === "" || value === "not_specified"
      } else {
        isInvalid = !value
      }

      if (isInvalid) {
        errors.push(`${field.label} is required`)
        if (field.inputId) {
          const el = document.getElementById(field.inputId)
          if (el) {
            el.classList.add("ring-2", "ring-red-500")
            if (!firstInvalidElement) firstInvalidElement = el as HTMLElement
          }
        } else {
          const trigger = formRef.current?.querySelector<HTMLElement>(`[name="${field.name}"]`)?.closest("[role=combobox]") as HTMLElement | null
          if (trigger) {
            trigger.classList.add("ring-2", "ring-red-500")
            if (!firstInvalidElement) firstInvalidElement = trigger
          }
        }
      }
    }

    // Extra check: computed BMI must exist based on weight+height
    if (!computedBmi) {
      errors.push("BMI cannot be calculated (check Weight and Height).")
      const wEl = document.getElementById("weight")
      const hEl = document.getElementById("height")
      wEl?.classList.add("ring-2", "ring-red-500")
      hEl?.classList.add("ring-2", "ring-red-500")
      if (!firstInvalidElement) firstInvalidElement = (wEl || hEl) as HTMLElement | null
    }

    if (errors.length > 0) {
      toast({
        title: "Missing required fields",
        description: errors[0],
        variant: "destructive",
      })
      if (firstInvalidElement) {
        firstInvalidElement.focus()
      }
      return false
    }

    return true
  }

  // Client-side submit handler
  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await createOrUpdateClinicalInfo(patient.id, formData)
      if (result.success) {
        const message = result.predictionMade 
          ? "Clinical information saved and AI prediction generated successfully! Scroll down to see the AI prediction." 
          : "Clinical information saved successfully"
        
        toast({ 
          title: "Success", 
          description: message,
          duration: 5000
        })
        
        // Stay on the page and refresh data
        router.refresh()
        
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to save clinical information", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const result = await resetClinicalInfo(patient.id)
      if (result.success) {
        // Clear visible inputs immediately
        formRef.current?.reset()
        setWeight("")
        setHeight("")
        setComputedBmi("")
        toast({ title: "Success", description: result.message })
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to reset clinical information", variant: "destructive" })
    } finally {
      setIsResetting(false)
    }
  }

  // Form submit handler
  const onSubmitValidateThenSave: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)

    // Put the controlled weight/height values back into FormData
    fd.set("weight", weight)
    fd.set("height", height)

    // Inject derived BMI into the form data
    if (computedBmi) {
      fd.set("bmi", computedBmi)
    } else {
      fd.set("bmi", "")
    }

    const ok = validateForm(fd)
    if (!ok) return

    await handleSubmit(fd)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="doctor" />

      <div className="flex flex-1">
        <Sidebar userType="doctor" />

        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6 flex items-center">
              <Link href={`/doctor/patients/${patient.id}`} className="mr-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Patient Details
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Clinical Information</h1>
                <p className="text-muted-foreground">
                  Manage clinical data for {patient.name} (ID: {patient.patientId})
                </p>
              </div>
            </div>

            <form
              key={clinicalInfo?.id ?? "empty"}
              onSubmit={onSubmitValidateThenSave}
              ref={formRef}
            >
              <div className="grid gap-6">
                {/* Demographics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Demographics
                    </CardTitle>
                    <CardDescription>Patient demographics information</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Country</Label>
                      <Select
                        name="nationality"
                        defaultValue={clinicalInfo?.nationality ?? "not_specified"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          <SelectItem value="not_specified">Not specified</SelectItem>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.cca2} value={c.value}>
                              <span className="mr-2">{c.flag}</span>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Physical Measurements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Physical Measurements</CardTitle>
                    <CardDescription>Body measurements and pregnancy-related metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bmi">BMI (kg/m²)</Label>
                      <Input
                        id="bmi"
                        name="bmi"
                        type="text"
                        value={computedBmi}
                        placeholder="Auto-calculated"
                        readOnly
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        name="weight"
                        type="number"
                        step="0.1"
                        min="30"
                        max="300"
                        placeholder="Enter weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        name="height"
                        type="number"
                        step="0.1"
                        min="100"
                        max="250"
                        placeholder="Enter height"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weightGainDuringPregnancy">Weight Gain During Pregnancy (kg)</Label>
                      <Input
                        id="weightGainDuringPregnancy"
                        name="weightGainDuringPregnancy"
                        type="number"
                        step="0.1"
                        min="-20"
                        max="50"
                        placeholder="Enter weight gain"
                        defaultValue={clinicalInfo?.weightGainDuringPregnancy?.toString() ?? ""}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Glucose and Lab Values */}
                <Card>
                  <CardHeader>
                    <CardTitle>Glucose & Lab Values</CardTitle>
                    <CardDescription>Glucose tolerance test results and lab measurements</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="fastingBloodGlucose">Fasting Blood Glucose (mg/dL)</Label>
                      <Input
                        id="fastingBloodGlucose"
                        name="fastingBloodGlucose"
                        type="number"
                        step="0.1"
                        min="50"
                        max="400"
                        placeholder="Enter fasting glucose"
                        defaultValue={clinicalInfo?.fastingBloodGlucose?.toString() ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="oneHour75Glucose">1 Hour (75g Glucose) (mg/dL)</Label>
                      <Input
                        id="oneHour75Glucose"
                        name="oneHour75Glucose"
                        type="number"
                        step="0.1"
                        min="50"
                        max="500"
                        placeholder="Enter 1-hour glucose"
                        defaultValue={clinicalInfo?.oneHour75Glucose?.toString() ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twoHour75Glucose">2 Hour (75g Glucose) (mg/dL)</Label>
                      <Input
                        id="twoHour75Glucose"
                        name="twoHour75Glucose"
                        type="number"
                        step="0.1"
                        min="50"
                        max="500"
                        placeholder="Enter 2-hour glucose"
                        defaultValue={clinicalInfo?.twoHour75Glucose?.toString() ?? ""}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Conditions & Vital Signs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Clinical Conditions & Vital Signs</CardTitle>
                    <CardDescription>Medical conditions and vital sign measurements</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hypertensiveDisorders">Hypertensive Disorders</Label>
                      <Select
                        name="hypertensiveDisorders"
                        defaultValue={clinicalInfo?.hypertensiveDisorders ?? "No"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pulseHeartRate">Pulse/Heart Rate (bpm)</Label>
                      <Input
                        id="pulseHeartRate"
                        name="pulseHeartRate"
                        type="number"
                        min="40"
                        max="200"
                        placeholder="Enter heart rate"
                        defaultValue={clinicalInfo?.pulseHeartRate?.toString() ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bpSystolic">BP Systolic (mmHg)</Label>
                      <Input
                        id="bpSystolic"
                        name="bpSystolic"
                        type="number"
                        min="70"
                        max="250"
                        placeholder="Enter systolic BP"
                        defaultValue={clinicalInfo?.bpSystolic?.toString() ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bpDiastolic">BP Diastolic (mmHg)</Label>
                      <Input
                        id="bpDiastolic"
                        name="bpDiastolic"
                        type="number"
                        min="40"
                        max="150"
                        placeholder="Enter diastolic BP"
                        defaultValue={clinicalInfo?.bpDiastolic?.toString() ?? ""}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* AI Prediction Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Risk Assessment
                    </CardTitle>
                    <CardDescription>
                      Machine learning prediction for gestational diabetes mellitus risk
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {latestPrediction ? (
                      <div className="space-y-4">
                        {/* Risk Level Badge and Confidence */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getPredictionBadge(latestPrediction)}
                            <span className="text-sm text-muted-foreground">
                              Confidence: {Math.round(latestPrediction.confidence * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(latestPrediction.predictedAt).toLocaleString()}
                          </div>
                        </div>

                        {/* Prediction Message */}
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p className="text-sm leading-relaxed">
                            {getPredictionMessage(latestPrediction)}
                          </p>
                        </div>

                        {/* Top Influential Features */}
                        {latestPrediction.topInfluentialFeatures && latestPrediction.topInfluentialFeatures.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Top Influential Factors:</Label>
                            <div className="flex flex-wrap gap-2">
                              {mapFeaturesToDisplayNames(latestPrediction.topInfluentialFeatures).map((feature, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  #{index + 1} {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium mb-2">No AI Prediction Available</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Complete and save the clinical information above to generate an AI risk assessment for gestational diabetes mellitus.
                        </p>
                        <Badge variant="outline">Prediction will be generated on save</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>

                  {clinicalInfo && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={isResetting || isLoading}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {isResetting ? "Resetting..." : "Reset Clinical Info"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete all clinical info?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete all clinical information and AI predictions for this patient.
                            This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await handleReset()
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <Button type="submit" disabled={isLoading || isResetting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Saving..." : "Save & Generate AI Prediction"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}