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
import { date } from "zod";

//* Type for the patient reading
type Reading = {
  id: string;
  date: Date;
  time: string;
  type: string;
  level: number;
  notes?: string | null;
};

//* Type for the daily readings grouped format
type DayReadings = {
  date: string;
  BeforeBreakfast: number | null;
  AfterBreakfast: number | null;
  BeforeLunch: number | null;
  AfterLunch: number | null;
  BeforeDinner: number | null;
  AfterDinner: number | null;
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
}: //! Promise from the defined interface
PatientDetailsViewProps) {
  const router = useRouter(); // next.js router for navigation

  //* state saving the daily readings from the patient
  const [readingsByDate, setReadingsByDate] = useState<DayReadings[]>([]);
  //* state saving and setting the data of the patient's reading visualizations
  const [chartData, setChartData] = useState<GlucoseChartData[]>([]);
  // Preprocess readings when component mounts

  console.log(patientData?.readings.length)
  useEffect(() => {
    if (!patientData?.readings) return;

    const groupedReadings = patientData.readings.reduce(
      (acc: Record<string, DayReadings>, reading: Reading) => {
        //! format the date to string
        // const dateStr = format(new Date(reading.date), "yyyy-MM-dd");
        const dateStr = reading.date.toISOString().slice(0, 10)

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

        //! switch statement for assigning the reading level to select reading type
        switch (reading.type) {
          case "BEFORE_BREAKFAST":
            acc[dateStr].BeforeBreakfast = reading.level;
            break;
          case "AFTER_BREAKFAST":
            acc[dateStr].AfterBreakfast = reading.level;
            break;
          case "BEFORE_LUNCH":
            acc[dateStr].BeforeLunch = reading.level;
            break;
          case "AFTER_LUNCH":
            acc[dateStr].AfterLunch = reading.level;
            break;
          case "BEFORE_DINNER":
            acc[dateStr].BeforeDinner = reading.level;
            break;
          case "AFTER_DINNER":
            acc[dateStr].AfterDinner = reading.level;
            break;
          default:
            //! handle error of not having a defined reading type
            Error("Reading type not defined");
        }

        return acc;
      },
      {}
    );
    console.log("Here! Grouped:  ", groupedReadings)
    // Convert to array and sort by date (newest first)
    const sortedReadings = Object.values(groupedReadings).sort((a, b) => {
      //* Get the date difference
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    console.log("Here Sorted!:  ", sortedReadings.length)
    setReadingsByDate(sortedReadings);

    //! Create chart data for last 7 days
    const last7Days = sortedReadings.slice(0, 7).reverse();
    const chartFormatData = last7Days.map((day) => ({
      date: format(new Date(day.date), "MM/dd"),
      fasting: day.BeforeBreakfast,
      afterBreakfast: day.AfterBreakfast,
      afterLunch: day.AfterLunch,
      afterDinner: day.AfterDinner,
    }));

    setChartData(chartFormatData);
  }, [patientData]);


  // returning "high" at the first high reading found.
  const determinePatientStatus = (): "unknown" | "normal" | "elevated" | "high" => {
    const readings = patientData?.readings;
    if (!readings || readings.length === 0) {
      return "unknown";
    }

    let hasElevated = false;

    for (const r of readings) {
      const isBeforeMeal = r.type.toUpperCase().includes("BEFORE");
      const highThreshold     = isBeforeMeal ? 105 : 160;
      const elevatedThreshold = isBeforeMeal ? 95  : 140;

      if (r.level > highThreshold) {
        return "high";
      } else if (r.level > elevatedThreshold) {
        hasElevated = true;
      }
    }

    return hasElevated ? "elevated" : "normal";
  };


  const patientStatus = determinePatientStatus();

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

   // helper to apply text color based on glucose thresholds for before/after readings
   const getReadingClass = (value: number | null, slot: keyof DayReadings) => {
    if (value === null) return "";
    const isBefore = slot.startsWith("Before");
    const highThreshold = isBefore ? 105 : 160;
    const elevatedThreshold = isBefore ? 95 : 140;

    if (value > highThreshold) return "text-red-500 font-medium";
    if (value > elevatedThreshold) return "text-amber-600 font-medium";
    return "";
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
                                {dayReadings.BeforeBreakfast !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.BeforeBreakfast,
                                      "BeforeBreakfast"
                                    )}
                                  >
                                    {dayReadings.BeforeBreakfast.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {dayReadings.AfterBreakfast !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.AfterBreakfast,
                                      "AfterBreakfast"
                                    )}
                                  >
                                    {dayReadings.AfterBreakfast.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {dayReadings.BeforeLunch !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.BeforeLunch,
                                      "BeforeLunch"
                                    )}
                                  >
                                    {dayReadings.BeforeLunch.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {dayReadings.AfterLunch !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.AfterLunch,
                                      "AfterLunch"
                                    )}
                                  >
                                    {dayReadings.AfterLunch.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {dayReadings.BeforeDinner !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.BeforeDinner,
                                      "BeforeDinner"
                                    )}
                                  >
                                    {dayReadings.BeforeDinner.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {dayReadings.AfterDinner !== null ? (
                                  <span
                                    className={getReadingClass(
                                      dayReadings.AfterDinner,
                                      "AfterDinner"
                                    )}
                                  >
                                    {dayReadings.AfterDinner.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
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
                        <p
                          className={`text-lg font-medium ${
                            patientStatus === "normal"
                              ? "text-green-600"
                              : patientStatus === "elevated"
                              ? "text-amber-600"
                              : patientStatus === "high"
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {patientStatus.charAt(0).toUpperCase() +
                            patientStatus.slice(1)}
                        </p>
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
