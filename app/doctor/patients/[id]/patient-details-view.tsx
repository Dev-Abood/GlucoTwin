"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Settings } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { RecommendationsModal } from "./recommendations-modal";

type Reading = {
  id: string;
  date: Date;
  time: string;
  type: string;
  level: number;
  status: string;
  notes?: string | null;
};

type DayReadings = {
  date: string;
  BeforeBreakfast: { level: number; status: string; notes?: string | null } | null;
  AfterBreakfast:  { level: number; status: string; notes?: string | null } | null;
  BeforeLunch:     { level: number; status: string; notes?: string | null } | null;
  AfterLunch:      { level: number; status: string; notes?: string | null } | null;
  BeforeDinner:    { level: number; status: string; notes?: string | null } | null;
  AfterDinner:     { level: number; status: string; notes?: string | null } | null;
};

type GlucoseChartData = {
  date: string;
  beforeBreakfast: number | null;
  afterBreakfast: number | null;
  beforeLunch: number | null;
  afterLunch: number | null;
  beforeDinner: number | null;
  afterDinner: number | null;
};

type PatientData = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  dateOfBirth: Date;
  term: number;
  dueDate: Date;
  readings: Reading[];
  patientAssignments: Array<{
    id: string;
    lastVisitDate: Date | null;
    addedDate: Date;
    hasMessageForDoctor: boolean;
  }>;
};

interface PatientDetailsViewProps {
  patientData: PatientData | null;
  lastVisit: Date | null;
}

export default function PatientDetailsView({
  patientData,
  lastVisit,
}: PatientDetailsViewProps) {
  const router = useRouter();
  const [isRecommendationsModalOpen, setIsRecommendationsModalOpen] = useState(false);
  const [readingsByDate, setReadingsByDate] = useState<DayReadings[]>([]);
  const [chartData, setChartData] = useState<GlucoseChartData[]>([]);

  // Colors aligned with your main legend (adjust if you have a shared palette)
  const series = [
    { key: "beforeBreakfast", name: "Before Breakfast", color: "#f78da7" }, // soft pink
    { key: "afterBreakfast",  name: "After Breakfast",  color: "#8e44ad" }, // purple
    { key: "beforeLunch",     name: "Before Lunch",     color: "#8b0000" }, // dark red
    { key: "afterLunch",      name: "After Lunch",      color: "#1f3a93" }, // deep blue
    { key: "beforeDinner",    name: "Before Dinner",    color: "#c39bd3" }, // light purple
    { key: "afterDinner",     name: "After Dinner",     color: "#7ed6df" }, // light cyan
  ] as const;

  useEffect(() => {
    if (!patientData?.readings) return;

    const groupedReadings = patientData.readings.reduce(
      (acc: Record<string, DayReadings>, reading: Reading) => {
        const dateStr = reading.date.toISOString().slice(0, 10);

        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            BeforeBreakfast: null,
            AfterBreakfast: null,
            BeforeLunch: null,
            AfterLunch: null,
            BeforeDinner: null,
            AfterDinner: null,
          };
        }

        const readingData = {
          level: reading.level,
          status: reading.status,
          notes: reading.notes,
        };

        switch (reading.type) {
          case "BEFORE_BREAKFAST":
            acc[dateStr].BeforeBreakfast = readingData;
            break;
          case "AFTER_BREAKFAST":
            acc[dateStr].AfterBreakfast = readingData;
            break;
          case "BEFORE_LUNCH":
            acc[dateStr].BeforeLunch = readingData;
            break;
          case "AFTER_LUNCH":
            acc[dateStr].AfterLunch = readingData;
            break;
          case "BEFORE_DINNER":
            acc[dateStr].BeforeDinner = readingData;
            break;
          case "AFTER_DINNER":
            acc[dateStr].AfterDinner = readingData;
            break;
          default:
            console.error("Reading type not defined:", reading.type);
        }

        return acc;
      },
      {}
    );

    const sortedReadings = Object.values(groupedReadings).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setReadingsByDate(sortedReadings);

    const last7Days = sortedReadings.slice(0, 7).reverse();
    const chartFormatData: GlucoseChartData[] = last7Days.map((day) => ({
      date: format(new Date(day.date), "MM/dd"),
      beforeBreakfast: day.BeforeBreakfast?.level ?? null,
      afterBreakfast:  day.AfterBreakfast?.level ?? null,
      beforeLunch:     day.BeforeLunch?.level ?? null,
      afterLunch:      day.AfterLunch?.level ?? null,
      beforeDinner:    day.BeforeDinner?.level ?? null,
      afterDinner:     day.AfterDinner?.level ?? null,
    }));

    setChartData(chartFormatData);
  }, [patientData]);

  const determinePatientStatus = ():
    | "NORMAL"
    | "ELEVATED"
    | "HIGH"
    | "unknown" => {
    const readings = patientData?.readings;
    if (!readings || readings.length === 0) return "unknown";

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

    if (hasHigh) return "HIGH";
    if (hasElevated) return "ELEVATED";
    return "NORMAL";
  };

  const patientStatus = determinePatientStatus();

  const formatDate = (date: Date) => format(new Date(date), "MMM d, yyyy");

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
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

  const getReadingClass = (
    readingData: { level: number; status: string; notes?: string | null } | null
  ) => {
    if (!readingData) return "";

    const status = readingData.status.toUpperCase();
    switch (status) {
      case "HIGH":
        return "text-red-500 font-medium";
      case "ELEVATED":
        return "text-amber-600 font-medium";
      case "NORMAL":
        return "text-green-600";
      default:
        return "";
    }
  };

  const renderReadingCell = (
    readingData: { level: number; status: string; notes?: string | null } | null
  ) => {
    if (!readingData) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center cursor-help">
              <span className={getReadingClass(readingData)}>
                {readingData.level.toFixed(2)}
              </span>
              <div className="mt-1">{getStatusBadge(readingData.status)}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              {readingData.notes || "No note on this reading"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (!patientData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Patient not found</h1>
          <Button onClick={() => router.push("/doctor/patients")}>
            Return to Patients List
          </Button>
        </div>
      </div>
    );
  }

  // Get the patient assignment ID for the recommendations modal
  const patientAssignmentId = patientData.patientAssignments[0]?.id || "";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <Header userType="doctor" />

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Sidebar userType="doctor" />

        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6 flex items-center">
              <Link href="/doctor/patients" className="mr-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Patients
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">Patient Details</h1>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Glucose Readings History</CardTitle>
                    <CardDescription>
                      All recorded readings for {patientData.name}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsRecommendationsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90"
                    disabled={!patientAssignmentId}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Set Recommendations
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {readingsByDate.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No readings available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2}>Day</TableHead>
                          <TableHead rowSpan={2}>Date</TableHead>
                          <TableHead colSpan={2} className="text-center border-b">
                            Morning
                          </TableHead>
                          <TableHead colSpan={2} className="text-center border-b">
                            Afternoon
                          </TableHead>
                          <TableHead colSpan={2} className="text-center border-b">
                            Evening
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          <TableHead className="text-center">Before Breakfast</TableHead>
                          <TableHead className="text-center">After Breakfast</TableHead>
                          <TableHead className="text-center">Before Lunch</TableHead>
                          <TableHead className="text-center">After Lunch</TableHead>
                          <TableHead className="text-center">Before Dinner</TableHead>
                          <TableHead className="text-center">After Dinner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readingsByDate.map((dayReadings) => (
                          <TableRow key={dayReadings.date}>
                            <TableCell className="font-medium">
                              {format(new Date(dayReadings.date), "EEEE")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {format(new Date(dayReadings.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.BeforeBreakfast)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.AfterBreakfast)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.BeforeLunch)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.AfterLunch)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.BeforeDinner)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderReadingCell(dayReadings.AfterDinner)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>
                    {patientData.name} - {patientData.age} years old
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Patient ID</p>
                      <p className="text-lg">{patientData.patientId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Date of Birth</p>
                      <p className="text-lg">{formatDate(patientData.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Term</p>
                      <p className="text-lg">{patientData.term} weeks</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Due Date</p>
                      <p className="text-lg">{formatDate(patientData.dueDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <div className="mt-1">{getStatusBadge(patientStatus)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Visit</p>
                      <p className="text-lg">
                        {lastVisit ? formatDate(lastVisit) : "No visits recorded"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Glucose Trends Chart (six-series legend matching the main chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Glucose Trends</CardTitle>
                  <CardDescription>7-day glucose readings for {patientData.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickMargin={10} tick={{ fontSize: 12 }} />
                          <YAxis
                            domain={[60, 180]}
                            tickCount={7}
                            tick={{ fontSize: 12 }}
                            label={{ value: "mg/dL", angle: -90, position: "insideLeft", fontSize: 12 }}
                          />
                          <ChartTooltip
                            formatter={(value: any) => [`${value} mg/dL`, ""]}
                            labelFormatter={(label: string) => `Date: ${label}`}
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
                            label={{ value: "Fasting Target", position: "top", fill: "red", fontSize: 12 }}
                          />
                          <ReferenceLine
                            y={140}
                            stroke="red"
                            strokeDasharray="3 3"
                            label={{ value: "Post-meal Target", position: "top", fill: "red", fontSize: 12 }}
                          />
                          <Legend />
                          {series.map((s) => (
                            <Line
                              key={s.key}
                              type="monotone"
                              dataKey={s.key}
                              stroke={s.color}
                              name={s.name}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      No glucose data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Recommendations Modal */}
      {patientAssignmentId && (
        <RecommendationsModal
          isOpen={isRecommendationsModalOpen}
          onClose={() => setIsRecommendationsModalOpen(false)}
          patientAssignmentId={patientAssignmentId}
          patientName={patientData.name}
        />
      )}
    </div>
  );
}
