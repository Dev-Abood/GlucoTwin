"use client";

import type React from "react";

// React & Next.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// UI Components (shadcn)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
} from "recharts";

// Types
import { ReadingType } from "@prisma/client";
import type { GlucoseReading } from "@/lib/types";
import { formatReadingType } from "../utils/patient-utils";

// Layout
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

// Business logic
import { getPatientRecommendations } from "./recommendation-actions";
import { checkAndCreateDailyReminder } from "@/components/notifications/notification-actions";

/**
 * Props for the Dashboard component
 */
interface DashboardProps {
  patientData: {
    id: string;
    name: string | null;
    readings: GlucoseReading[];
  };
}

/**
 * Chart modes
 */
type ChartMode = "daily-latest-per-type" | "all-points";

/**
 * Type for chart data entries (daily mode)
 * (Use intersection so dynamic keys can be number|string|undefined safely)
 */
type ChartDataEntry = { date: string } & Record<string, number | string | undefined>;

/**
 * Type for line colors mapping
 */
type LineColors = {
  [key: string]: string;
};

/**
 * Type for recommendations
 */
interface Recommendation {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  patientAssignment: {
    doctor: {
      name: string;
      specialty: string | null;
    };
  };
}

/**
 * Skeleton loader for the latest readings cards
 */
function ReadingsCardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[140px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[100px] mb-2" />
            <Skeleton className="h-3 w-[160px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for the chart
 */
function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[200px] mb-2" />
        <Skeleton className="h-4 w-[280px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for recommendations
 */
function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-5 w-[200px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-[80%]" />
          <div className="mt-3 pt-2 border-t">
            <Skeleton className="h-3 w-[150px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------

// Construct a consistent timestamp (ms since epoch) from date + time.
// If your DB stores UTC and you want strict UTC interpretation, append 'Z' in the template string.
const toTimestamp = (r: { date: string | Date; time: string }) => {
  let dateStr: string;
  
  // Handle Date object or string
  if (r.date instanceof Date) {
    dateStr = r.date.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (typeof r.date === "string") {
    dateStr = r.date.includes('T') ? r.date.split('T')[0] : r.date;
  } else {
    dateStr = new Date(r.date).toISOString().split('T')[0];
  }
  
  const t = r.time?.length ? r.time : "00:00:00";
  const hhmmss = t.split(":").length === 2 ? `${t}:00` : t; // normalize to HH:mm:ss
  
  // Local time (no trailing 'Z'). If you prefer UTC, use `${dateStr}T${hhmmss}Z`.
  const timestamp = new Date(`${dateStr}T${hhmmss}`).getTime();
  
  // Return 0 if invalid date
  return isNaN(timestamp) ? 0 : timestamp;
};

// Map enum to nice camel-cased keys for Recharts series
const getChartKeyFromType = (type: ReadingType): string =>
  type
    .toString()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

// Colors per series
const lineColors: LineColors = {
  BeforeBreakfast: "#FFC0CB", // Pink
  AfterBreakfast: "#A020F0",  // Purple
  BeforeLunch: "#800020",     // Burgundy
  AfterLunch: "#000080",      // Navy
  BeforeDinner: "#C8A2C8",    // Lilac
  AfterDinner: "#ADD8E6",     // Light Blue
};

// Format timestamp to human-readable
const formatFullDateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function Dashboard({ patientData }: DashboardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<ChartMode>("daily-latest-per-type");

  // reading types in fixed order
  const readingTypes: ReadingType[] = [
    ReadingType.BEFORE_BREAKFAST,
    ReadingType.AFTER_BREAKFAST,
    ReadingType.BEFORE_LUNCH,
    ReadingType.AFTER_LUNCH,
    ReadingType.BEFORE_DINNER,
    ReadingType.AFTER_DINNER,
  ];

  useEffect(() => {
    if (patientData?.readings) setIsLoading(false);
    if (patientData?.id) checkAndCreateDailyReminder(patientData.id);
  }, [patientData]);

  // Load recommendations when the recommendations tab is accessed
  useEffect(() => {
    const loadRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const data = await getPatientRecommendations();
        setRecommendations(data);
      } catch (error) {
        console.error("Failed to load recommendations:", error);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    if (activeTab === "recommendations" && recommendations.length === 0) {
      loadRecommendations();
    }
  }, [activeTab, recommendations.length]);

  // Latest reading per type (unified timestamp)
  const getLatestReading = (type: ReadingType): GlucoseReading | null => {
    if (!patientData?.readings?.length) return null;
    const filtered = patientData.readings.filter((r) => r.type === type);
    if (!filtered.length) return null;
    filtered.sort((a, b) => toTimestamp(b) - toTimestamp(a));
    return filtered[0];
  };

  const latestReadings = useMemo(
    () => readingTypes.map((type) => getLatestReading(type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patientData?.readings?.length]
  );

  // ----------------- Chart Data (Daily Aggregation) -----------------
  const chartDataDaily: ChartDataEntry[] = useMemo(() => {
    if (!patientData?.readings?.length) return [];

    // Sort once oldest → newest
    const sorted = [...patientData.readings].sort((a, b) => toTimestamp(a) - toTimestamp(b));

    // Per-day row store (using YYYY-MM-DD as key for uniqueness)
    const dataMap = new Map<string, { row: ChartDataEntry; sortKey: number }>();
    // Per-day, per-type latest timestamp store
    const tsMap = new Map<string, Record<string, number>>();

    for (const r of sorted) {
      const ts = toTimestamp(r);
      
      // Skip invalid timestamps
      if (ts === 0 || isNaN(ts)) continue;
      
      const dt = new Date(ts);
      
      // Use full date as key for accurate grouping
      const dateKey = dt.toISOString().split('T')[0]; // YYYY-MM-DD
      // Display format for chart
      const dateDisplay = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const typeKey = getChartKeyFromType(r.type);

      const existing = dataMap.get(dateKey);
      const row = existing?.row ?? { date: dateDisplay };
      const perTypeTs = tsMap.get(dateKey) ?? {};

      // Keep the most recent for that day/type
      const prevTs = perTypeTs[typeKey] ?? -Infinity;
      if (ts >= prevTs) {
        row[typeKey] = r.level;
        perTypeTs[typeKey] = ts;
        dataMap.set(dateKey, { row, sortKey: ts });
        tsMap.set(dateKey, perTypeTs);
      }
    }

    // Return rows in chronological order using the actual timestamps
    return Array.from(dataMap.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([_, { row }]) => row);
  }, [patientData?.readings]);

  // ----------------- Chart Data (All Points on Time Axis) -----------------
  // We create one row per reading, with a single type key filled and the rest null.
  // X-axis uses numeric timestamp to preserve ordering and spacing.
  // Limited to last 7 days to keep chart readable
  const chartDataAllPoints = useMemo(() => {
    if (!patientData?.readings?.length) return [];

    // Calculate cutoff date (7 days ago)
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const points = patientData.readings
      .map((r) => {
        const ts = toTimestamp(r);
        
        // Skip invalid timestamps or readings older than 7 days
        if (ts === 0 || isNaN(ts) || ts < sevenDaysAgo) return null;
        
        const typeKey = getChartKeyFromType(r.type);

        const row: Record<string, any> = {
          ts, // numeric (ms)
          dtLabel: formatFullDateTime(ts),
        };

        // Initialize all series keys as null so Recharts legends render consistently
        for (const t of readingTypes) {
          row[getChartKeyFromType(t)] = null;
        }
        row[typeKey] = r.level;

        return row;
      })
      .filter((row): row is Record<string, any> => row !== null); // Remove nulls

    // Sort by time (oldest → newest)
    points.sort((a, b) => a.ts - b.ts);
    return points;
  }, [patientData?.readings, readingTypes]);

  // Target thresholds
  const fastingTarget = 95;
  const postMealTarget = 140;

  // Render helpers
  const renderLatestCards = () => (
    <section>
      <h2 className="text-xl font-semibold mb-2">Latest Readings</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {readingTypes.map((type, index) => {
          const reading = latestReadings[index];
          const isFasting = type.startsWith("BEFORE");
          const targetRange = isFasting ? fastingTarget : postMealTarget;

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
          );
        })}
      </div>
    </section>
  );

  const renderChart = () => {
    const commonYAxis = (
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
    );

    const commonRefs = (
      <>
        <ReferenceLine
          y={fastingTarget}
          stroke="red"
          strokeDasharray="3 3"
          label={{ value: "Fasting Target", position: "top", fill: "red", fontSize: 12 }}
        />
        <ReferenceLine
          y={postMealTarget}
          stroke="red"
          strokeDasharray="3 3"
          label={{ value: "Post-meal Target", position: "top", fill: "red", fontSize: 12 }}
        />
      </>
    );

    return (
      <section>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Weekly Glucose Trends</CardTitle>
              <CardDescription>
                {chartMode === "daily-latest-per-type"
                  ? "Latest value per type for each day"
                  : "Every reading plotted on a time axis"}
              </CardDescription>
            </div>

            {/* Small mode switch using Tabs for simplicity */}
            <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as ChartMode)}>
              <TabsList>
                <TabsTrigger value="daily-latest-per-type">Daily</TabsTrigger>
                <TabsTrigger value="all-points">All points</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "daily-latest-per-type" ? (
                  <LineChart data={chartDataDaily} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={10} tick={{ fontSize: 12 }} />
                    {commonYAxis}
                    <Tooltip
                      formatter={(value) => [`${value} mg/dL`, ""]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                    {commonRefs}
                    <Legend />
                    {readingTypes.map((type) => {
                      const typeKey = getChartKeyFromType(type);
                      return (
                        <Line
                          key={typeKey}
                          type="monotone"
                          dataKey={typeKey}
                          stroke={lineColors[typeKey]}
                          name={formatReadingType(type)}
                          connectNulls
                          dot={{ r: 2 }}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </LineChart>
                ) : (
                  <LineChart data={chartDataAllPoints} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      tickMargin={10}
                      tick={{ fontSize: 12 }}
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(ts) =>
                        new Date(ts as number).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                      }
                    />
                    {commonYAxis}
                    <Tooltip
                      formatter={(value) => [`${value} mg/dL`, ""]}
                      labelFormatter={(ts) => `Time: ${formatFullDateTime(Number(ts))}`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                    {commonRefs}
                    <Legend />
                    {readingTypes.map((type) => {
                      const typeKey = getChartKeyFromType(type);
                      return (
                        <Line
                          key={typeKey}
                          type="monotone"
                          dataKey={typeKey}
                          stroke={lineColors[typeKey]}
                          name={formatReadingType(type)}
                          connectNulls
                          dot={{ r: 2 }}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  };

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
            {isLoading ? (
              <div className="space-y-6">
                <div className="mb-6 flex items-center justify-between">
                  <Skeleton className="h-9 w-[280px]" />
                  <Skeleton className="h-10 w-[180px]" />
                </div>
                <section>
                  <Skeleton className="h-6 w-[140px] mb-4" />
                  <ReadingsCardSkeleton />
                </section>
                <ChartSkeleton />
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="text-3xl font-bold">Welcome, {patientData?.name || "User"}</h1>
                  <Link href="/patient/readings/new" passHref legacyBehavior>
                    <Button>Record New Reading</Button>
                  </Link>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab Content */}
                  <TabsContent value="overview" className="space-y-4">
                    {renderLatestCards()}
                    {renderChart()}
                  </TabsContent>

                  {/* Recommendations Tab Content */}
                  <TabsContent value="recommendations" className="space-y-4">
                    {recommendationsLoading ? (
                      <Card>
                        <CardHeader>
                          <Skeleton className="h-6 w-[280px] mb-2" />
                          <Skeleton className="h-4 w-[400px]" />
                        </CardHeader>
                        <CardContent>
                          <RecommendationsSkeleton />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>Personalized Recommendations</CardTitle>
                          <CardDescription>
                            Based on your recent glucose readings and provided by your healthcare team
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {recommendations.length === 0 ? (
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
                                        <span className="ml-1">
                                          ({recommendation.patientAssignment.doctor.specialty})
                                        </span>
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
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}