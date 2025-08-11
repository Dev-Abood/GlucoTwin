"use client"

import type React from "react"

// React & Next.js
import { useState, useEffect } from "react"
import Link from "next/link"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Data Visualization
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts"

// Icons
import { Bell } from "lucide-react"

// Types
import { ReadingType } from "@prisma/client"
import type { GlucoseReading } from "@/lib/types"
import { formatReadingType } from "../utils/patient-utils"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { getPatientRecommendations } from "./recommendation-actions"

/**
 * Props for the Dashboard component
 */
interface DashboardProps {
  patientData: {
    name: string
    readings: GlucoseReading[]
  }
}

/**
 * Type for chart data entries
 */
interface ChartDataEntry {
  date: string
  [key: string]: number | string // Dynamic keys for reading types
}

/**
 * Type for line colors mapping
 */
type LineColors = {
  [key: string]: string
}

/**
 * Type for recommendations
 */
interface Recommendation {
  id: string
  title: string
  description: string
  createdAt: Date
  updatedAt: Date
  patientAssignment: {
    doctor: {
      name: string
      specialty: string | null
    }
  }
}

/**
 * Dashboard component for patient portal displaying glucose readings and trends
 * @param {DashboardProps} props - Component props containing patient data
 * @returns {JSX.Element} - The dashboard UI
 */
export default function Dashboard({ patientData }: DashboardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (patientData?.readings) {
      setIsLoading(false)
    }
  }, [patientData])

  // Load recommendations when the recommendations tab is accessed
  useEffect(() => {
    if (activeTab === "recommendations" && recommendations.length === 0) {
      loadRecommendations()
    }
  }, [activeTab])

  const loadRecommendations = async () => {
    setRecommendationsLoading(true)
    try {
      const data = await getPatientRecommendations()
      setRecommendations(data)
    } catch (error) {
      console.error("Failed to load recommendations:", error)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  // All possible reading types
  const readingTypes: ReadingType[] = [
    ReadingType.BEFORE_BREAKFAST,
    ReadingType.AFTER_BREAKFAST,
    ReadingType.BEFORE_LUNCH,
    ReadingType.AFTER_LUNCH,
    ReadingType.BEFORE_DINNER,
    ReadingType.AFTER_DINNER,
  ]

  /**
   * Gets the latest reading for a specific type
   * @param {ReadingType} type - The reading type to filter by
   * @returns {GlucoseReading | null} - The latest reading object or null if none exists
   */
  const getLatestReading = (type: ReadingType): GlucoseReading | null => {
    const filteredReadings = patientData.readings.filter((r) => r.type === type)
    if (filteredReadings.length === 0) return null

    // Sort by date and time, most recent first
    filteredReadings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateB.getTime() - dateA.getTime()
    })

    return filteredReadings[0]
  }

  /**
   * Converts a reading type enum to camelCase format for chart keys
   * (e.g., "BEFORE_BREAKFAST" -> "BeforeBreakfast")
   * @param {ReadingType} type - The reading type to convert
   * @returns {string} - Formatted chart key
   */
  const getChartKeyFromType = (type: ReadingType): string => {
    return type
      .toString()
      .split("_")
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join("")
  }

  /**
   * Processes readings data for the chart
   * Groups readings by date and transforms them into the format required by Recharts
   * @returns {ChartDataEntry[]} - Array of chart data objects
   */
  const processChartData = (): ChartDataEntry[] => {
    const dataMap = new Map<string, ChartDataEntry>()

    patientData.readings.forEach((reading) => {
      // Format date consistently for grouping
      const dateStr = new Date(reading.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })

      const typeKey = getChartKeyFromType(reading.type)

      // Get or create entry for this date
      const entry = dataMap.get(dateStr) || { date: dateStr }
      entry[typeKey] = reading.level
      dataMap.set(dateStr, entry)
    })

    // Convert map to array and sort by date
    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const chartData: ChartDataEntry[] = processChartData()
  const latestReadings = readingTypes.map((type) => getLatestReading(type))

  // Chart line colors for each reading type
  const lineColors: LineColors = {
    //* Pink Purple Burgundy Navy lilic LightBlue
    BeforeBreakfast: "#FFC0CB",
    AfterBreakfast: "#A020F0",
    BeforeLunch: "#800020",
    AfterLunch: "#000080",
    BeforeDinner: "#C8A2C8",
    AfterDinner: "#ADD8E6",
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <Header userType="patient" />

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Side navigation */}
        <Sidebar userType="patient" />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Welcome, {patientData.name}</h1>
              <Link href="/patient/readings/new" passHref legacyBehavior>
                <Button>Record New Reading</Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                {/* Overview Tab Content */}
                <TabsContent value="overview" className="space-y-4">
                  <section>
                    <h2 className="text-xl font-semibold mb-2">Latest Readings</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {readingTypes.map((type, index) => {
                        const reading = latestReadings[index]
                        const isFasting = type.startsWith("BEFORE")
                        const targetRange = isFasting ? 95 : 140

                        return (
                          <Card key={type}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">{formatReadingType(type)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {reading ? (
                                <>
                                  <div className="text-2xl font-bold">{reading.level} mg/dL</div>
                                  <p className="text-xs text-muted-foreground">
                                    {reading.level <= targetRange ? "Within target range" : "Above target range"}
                                  </p>
                                </>
                              ) : (
                                <div className="text-muted-foreground">No reading available</div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </section>

                  {/* Glucose Trends Chart */}
                  <section>
                    <Card>
                      <CardHeader>
                        <CardTitle>Weekly Glucose Trends</CardTitle>
                        <CardDescription>Your glucose readings for the past 7 days</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickMargin={10} tick={{ fontSize: 12 }} />
                              <YAxis
                                domain={[60, 180]}
                                tickCount={7}
                                tick={{ fontSize: 12 }}
                                label={{
                                  value: "mg/dL",
                                  angle: -90,
                                  position: "insideLeft",
                                  fontSize: 12,
                                }}
                              />
                              <Tooltip
                                formatter={(value) => [`${value} mg/dL`, ""]}
                                labelFormatter={(date) => `Date: ${date}`}
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                              />
                              <ReferenceLine
                                y={95}
                                stroke="red"
                                strokeDasharray="3 3"
                                label={{
                                  value: "Fasting Target",
                                  position: "top",
                                  fill: "red",
                                  fontSize: 12,
                                }}
                              />
                              <ReferenceLine
                                y={140}
                                stroke="red"
                                strokeDasharray="3 3"
                                label={{
                                  value: "Post-meal Target",
                                  position: "top",
                                  fill: "red",
                                  fontSize: 12,
                                }}
                              />
                              <Legend />
                              {readingTypes.map((type) => {
                                const typeKey = getChartKeyFromType(type)
                                return (
                                  <Line
                                    key={typeKey}
                                    type="monotone"
                                    dataKey={typeKey}
                                    stroke={lineColors[typeKey]}
                                    name={formatReadingType(type)}
                                    connectNulls
                                  />
                                )
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  {/* Reminders Section */}
                  <section>
                    <Card>
                      <CardHeader>
                        <CardTitle>Reminders</CardTitle>
                        <CardDescription>Important tasks and reminders</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="rounded-full bg-primary/10 p-2">
                              <Bell className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Record fasting glucose</p>
                              <p className="text-sm text-muted-foreground">Tomorrow morning</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="rounded-full bg-primary/10 p-2">
                              <Bell className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Upcoming appointment with Dr. Abdulla</p>
                              <p className="text-sm text-muted-foreground">Next appointment in 4 days</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </TabsContent>

                {/* Recommendations Tab Content */}
                <TabsContent value="recommendations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personalized Recommendations</CardTitle>
                      <CardDescription>
                        Based on your recent glucose readings and provided by your healthcare team
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recommendationsLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                        </div>
                      ) : recommendations.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No recommendations available yet.</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your doctor will provide personalized recommendations based on your readings.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recommendations.map((recommendation) => (
                            <div key={recommendation.id} className="rounded-lg border p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium">{recommendation.title}</h3>
                                <div className="text-xs text-muted-foreground">
                                  by {recommendation.patientAssignment.doctor.name}
                                  {recommendation.patientAssignment.doctor.specialty && (
                                    <span className="ml-1">({recommendation.patientAssignment.doctor.specialty})</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {recommendation.description}
                              </p>
                              <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                                Updated: {formatDate(recommendation.updatedAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
