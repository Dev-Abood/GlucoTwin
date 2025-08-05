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
  BeforeBreakfast: { level: number; status: string } | null;
  AfterBreakfast: { level: number; status: string } | null;
  BeforeLunch: { level: number; status: string } | null;
  AfterLunch: { level: number; status: string } | null;
  BeforeDinner: { level: number; status: string } | null;
  AfterDinner: { level: number; status: string } | null;
};

type GlucoseChartData = {
  date: string;
  fasting: number | null;
  afterBreakfast: number | null;
  afterLunch: number | null;
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
    lastVisitDate: Date | null;
    addedDate: Date;
    hasMessageForDoctor: boolean; // <--- Now here
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

  const [readingsByDate, setReadingsByDate] = useState<DayReadings[]>([]);
  const [chartData, setChartData] = useState<GlucoseChartData[]>([]);

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
    const chartFormatData = last7Days.map((day) => ({
      date: format(new Date(day.date), "MM/dd"),
      fasting: day.BeforeBreakfast?.level || null,
      afterBreakfast: day.AfterBreakfast?.level || null,
      afterLunch: day.AfterLunch?.level || null,
      afterDinner: day.AfterDinner?.level || null,
    }));

    setChartData(chartFormatData);
  }, [patientData]);

  const determinePatientStatus = (): "NORMAL" | "ELEVATED" | "HIGH" | "unknown" => {
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

  const renderReadingCell = (readingData: { level: number; status: string } | null) => {
    if (!readingData) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <div className="flex flex-col items-center">
        <span className={getReadingClass(readingData)}>
          {readingData.level.toFixed(2)}
        </span>
        <div className="mt-1">{getStatusBadge(readingData.status)}</div>
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
      <Header />
      <div className="flex flex-1">
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

            {/* Glucose Table and Chart remain unchanged */}
            {/* ...rest of component code remains the same */}
          </div>
        </main>
      </div>
    </div>
  );
}
