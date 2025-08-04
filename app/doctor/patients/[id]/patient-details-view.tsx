"use client"; //! Client component, re-renders and auth and react hooks run here, commands run on browser console.

// React hooks and other libaries
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// UI Components
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
import { ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

//* Type for the patient reading
type Reading = {
  id: string;
  date: Date;
  time: string;
  type: string;
  level: number;
  status: string;
  notes?: string | null;
};

//* Type for the daily readings grouped format with status
type DayReadings = {
  date: string;
  BeforeBreakfast: { level: number; status: string } | null;
  AfterBreakfast: { level: number; status: string } | null;
  BeforeLunch: { level: number; status: string } | null;
  AfterLunch: { level: number; status: string } | null;
  BeforeDinner: { level: number; status: string } | null;
  AfterDinner: { level: number; status: string } | null;
};

//* Type for the chart data format
type GlucoseChartData = {
  date: string;
  fasting: number | null;
  afterBreakfast: number | null;
  afterLunch: number | null;
  afterDinner: number | null;
};

//* Type for the patient data retrieved
type PatientData = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  dateOfBirth: Date;
  term: number;
  dueDate: Date;
  hasMessage: boolean;
  readings: Reading[];
  patientAssignments: Array<{
    lastVisitDate: Date | null;
    addedDate: Date;
  }>;
};

//? Update the component props, to ensure that it's type-safe
interface PatientDetailsViewProps {
  patientData: PatientData | null;
  lastVisit: Date | null;
}

export default function PatientDetailsView({
  patientData,
  lastVisit,
}: PatientDetailsViewProps) {
  const router = useRouter(); // next.js router for navigation

  //* state saving the daily readings from the patient
  const [readingsByDate, setReadingsByDate] = useState<DayReadings[]>([]);
  //* state saving and setting the data of the patient's reading visualizations
  const [chartData, setChartData] = useState<GlucoseChartData[]>([]);

  console.log(patientData?.readings.length);

  useEffect(() => {
    if (!patientData?.readings) return;

    const groupedReadings = patientData.readings.reduce(
      (acc: Record<string, DayReadings>, reading: Reading) => {
        //! format the date to string
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

        // Create reading object with level and status
        const readingData = {
          level: reading.level,
          status: reading.status,
        };

        //! switch statement for assigning the reading level and status to select reading type
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
            //! handle error of not having a defined reading type
            console.error("Reading type not defined:", reading.type);
        }

        return acc;
      },
      {}
    );

    console.log("Here! Grouped:  ", groupedReadings);
    
    // Convert to array and sort by date (newest first)
    const sortedReadings = Object.values(groupedReadings).sort((a, b) => {
      //* Get the date difference
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    console.log("Here Sorted!:  ", sortedReadings.length);
    setReadingsByDate(sortedReadings);

    //! Create chart data for last 7 days
    const last7Days = sortedReadings.slice(0, 7).reverse();
    const chartFormatData = last7Days.map((day) => ({
      date: format(new Date(day.date), "MM/dd"),
      fasting: day.BeforeBreakfast?.level || null,
      afterBreakfast: day.AfterBreakfast?.level || null,
      afterLunch: day.AfterLunch?.level || null,
      afterDinner: day.AfterDinner?.level || null,
    }));

    setChartData(chartFormatData);
  }, [patientData]);

  // Determine patient status based on reading statuses from database
  const determinePatientStatus = (): "NORMAL" | "ELEVATED" | "HIGH" | "unknown" => {
    const readings = patientData?.readings;
    if (!readings || readings.length === 0) {
      return "unknown";
    }

    // Check all readings and determine the highest priority status
    let hasHigh = false;
    let hasElevated = false;

    for (const reading of readings) {
      const status = reading.status.toUpperCase();
      
      if (status === "HIGH") {
        hasHigh = true;
        break; // HIGH is highest priority, exit early
      } else if (status === "ELEVATED") {
        hasElevated = true;
      }
    }

    // Return status based on priority: HIGH > ELEVATED > NORMAL
    if (hasHigh) {
      return "HIGH";
    } else if (hasElevated) {
      return "ELEVATED";
    } else {
      return "NORMAL";
    }
  };

  const patientStatus = determinePatientStatus();

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  // Get status badge component
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

  // Helper to apply text color and styling based on reading status from database
  const getReadingClass = (readingData: { level: number; status: string } | null) => {
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

  // Helper to render reading cell with proper styling
  const renderReadingCell = (readingData: { level: number; status: string } | null) => {
    if (!readingData) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <div className="flex flex-col items-center">
        <span className={getReadingClass(readingData)}>
          {readingData.level.toFixed(2)}
        </span>
        <div className="mt-1">
          {getStatusBadge(readingData.status)}
        </div>
      </div>
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
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <Header />

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
                <CardTitle>Glucose Readings History</CardTitle>
                <CardDescription>
                  All recorded readings for {patientData.name}
                </CardDescription>
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
                      <p className="text-lg">
                        {formatDate(patientData.dateOfBirth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Term</p>
                      <p className="text-lg">{patientData.term} weeks</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Due Date</p>
                      <p className="text-lg">
                        {formatDate(patientData.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <div className="mt-1">
                        {getStatusBadge(patientStatus)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Visit</p>
                      <p className="text-lg">
                        {lastVisit
                          ? formatDate(lastVisit)
                          : "No visits recorded"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Glucose Trends</CardTitle>
                  <CardDescription>
                    7-day glucose readings for {patientData.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[60, 180]} />
                          <Tooltip
                            formatter={(value) =>
                              value ? Number(value).toFixed(2) : "0.00"
                            }
                          />
                          <ReferenceLine
                            y={95}
                            stroke="red"
                            strokeDasharray="3 3"
                            label="Fasting Target"
                          />
                          <ReferenceLine
                            y={140}
                            stroke="red"
                            strokeDasharray="3 3"
                            label="Post-meal Target"
                          />
                          <Line
                            type="monotone"
                            dataKey="fasting"
                            stroke="#8884d8"
                            name="Fasting"
                          />
                          <Line
                            type="monotone"
                            dataKey="afterBreakfast"
                            stroke="#82ca9d"
                            name="After Breakfast"
                          />
                          <Line
                            type="monotone"
                            dataKey="afterLunch"
                            stroke="#ffc658"
                            name="After Lunch"
                          />
                          <Line
                            type="monotone"
                            dataKey="afterDinner"
                            stroke="#ff8042"
                            name="After Dinner"
                          />
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
    </div>
  );
}