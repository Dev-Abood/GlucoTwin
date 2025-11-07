// app/doctor/appointments/appointments-view.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart3,
  Loader2,
  Phone,
  Mail,
  Baby,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  cancelAppointmentAsDoctor,
  getAppointmentStats,
} from "./actions";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  term: number;
  dueDate: Date;
}

interface Appointment {
  id: string;
  appointmentDate: Date;
  endTime: Date;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reasonForVisit: string | null;
  doctorNotes: string | null;
  cancelReason: string | null;
  patient: Patient;
}

interface Stats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  completed: number;
  cancelled: number;
}

const statusColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
  NO_SHOW: "bg-orange-500",
  RESCHEDULED: "bg-purple-500",
};

const typeLabels: Record<AppointmentType, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
  LAB_REVIEW: "Lab Review",
  INITIAL: "Initial Visit",
};

export default function DoctorAppointmentsView() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Appointment actions
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get start and end of current month
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const [appointmentsResult, statsResult] = await Promise.all([
        getDoctorAppointments(startOfMonth, endOfMonth),
        getAppointmentStats(),
      ]);

      if (appointmentsResult.success && appointmentsResult.data) {
        setAppointments(appointmentsResult.data);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    setIsUpdating(true);
    try {
      const result = await updateAppointmentStatus(
        appointmentId,
        status,
        doctorNotes || undefined
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Appointment updated successfully",
        });
        setDoctorNotes("");
        setSelectedAppointment(null);
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !cancelReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await cancelAppointmentAsDoctor(
        selectedAppointment.id,
        cancelReason
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Appointment cancelled successfully",
        });
        setCancelReason("");
        setSelectedAppointment(null);
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return (
        aptDate.getDate() === date.getDate() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const today = new Date();
  const isToday = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="doctor" />
        <div className="flex flex-1">
          <Sidebar userType="doctor" />
          <main className="flex-1 overflow-auto">
            <div className="container py-6">
              <Skeleton className="h-10 w-[300px] mb-6" />
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
              <Skeleton className="h-[600px]" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="doctor" />
      <div className="flex flex-1">
        <Sidebar userType="doctor" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Appointments</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your schedule and patient appointments
                </p>
              </div>
              <Link href="/doctor/appointments/availability">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Availability
                </Button>
              </Link>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.today}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.thisWeek}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.thisMonth}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.completed}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cancelled
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {stats.cancelled}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* View Toggle */}
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>

            {/* Calendar View */}
            {view === "calendar" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {currentDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-muted-foreground py-2"
                        >
                          {day}
                        </div>
                      )
                    )}

                    {/* Calendar days */}
                    {getDaysInMonth(currentDate).map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} />;
                      }

                      const dayAppointments = getAppointmentsForDate(date);
                      const scheduledCount = dayAppointments.filter(
                        (apt) =>
                          apt.status === "SCHEDULED" ||
                          apt.status === "RESCHEDULED"
                      ).length;

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`
                            min-h-[100px] p-2 rounded-lg border text-left
                            transition-colors hover:bg-accent
                            ${isToday(date) ? "border-primary border-2" : ""}
                            ${
                              selectedDate &&
                              selectedDate.toDateString() === date.toDateString()
                                ? "bg-accent"
                                : ""
                            }
                          `}
                        >
                          <div className="font-medium mb-1">{date.getDate()}</div>
                          {scheduledCount > 0 && (
                            <div className="space-y-1">
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0"
                              >
                                {scheduledCount}{" "}
                                {scheduledCount === 1 ? "apt" : "apts"}
                              </Badge>
                              {dayAppointments.slice(0, 2).map((apt) => (
                                <div
                                  key={apt.id}
                                  className="text-xs truncate text-muted-foreground"
                                >
                                  {formatTime(apt.appointmentDate)}
                                </div>
                              ))}
                              {dayAppointments.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayAppointments.length - 2} more
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Date Details */}
                  {selectedDate && (
                    <div className="mt-6 border-t pt-6">
                      <h3 className="font-semibold mb-4">
                        Appointments for{" "}
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>
                      {getAppointmentsForDate(selectedDate).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No appointments scheduled for this day
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {getAppointmentsForDate(selectedDate).map((apt) => (
                            <Card key={apt.id}>
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {apt.patient.name}
                                      </span>
                                      <Badge className={statusColors[apt.status]}>
                                        {apt.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(apt.appointmentDate)} (
                                        {apt.duration} min)
                                      </span>
                                      <Badge variant="outline">
                                        {typeLabels[apt.type]}
                                      </Badge>
                                    </div>
                                  </div>
                                  {(apt.status === "SCHEDULED" ||
                                    apt.status === "RESCHEDULED") && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setSelectedAppointment(apt)
                                          }
                                        >
                                          Manage
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>
                                            Manage Appointment
                                          </DialogTitle>
                                          <DialogDescription>
                                            Update the status or add notes for this
                                            appointment
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                          <div className="space-y-2">
                                            <Label>Patient Information</Label>
                                            <div className="rounded-lg border p-3 space-y-2 text-sm">
                                              <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{apt.patient.name}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <span>{apt.patient.phone}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span>{apt.patient.email}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Baby className="h-4 w-4" />
                                                <span>
                                                  {apt.patient.age} years, Week{" "}
                                                  {apt.patient.term}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {apt.reasonForVisit && (
                                            <div className="space-y-2">
                                              <Label>Reason for Visit</Label>
                                              <p className="text-sm text-muted-foreground border rounded-lg p-3">
                                                {apt.reasonForVisit}
                                              </p>
                                            </div>
                                          )}

                                          <div className="space-y-2">
                                            <Label htmlFor="notes">
                                              Doctor's Notes
                                            </Label>
                                            <Textarea
                                              id="notes"
                                              placeholder="Add notes about this appointment..."
                                              value={doctorNotes}
                                              onChange={(e) =>
                                                setDoctorNotes(e.target.value)
                                              }
                                              rows={4}
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter className="flex-col sm:flex-row gap-2">
                                          <Button
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                            onClick={() => {
                                              setSelectedAppointment(null);
                                              setDoctorNotes("");
                                            }}
                                          >
                                            Close
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            className="w-full sm:w-auto"
                                            onClick={() => {
                                              const reason = prompt(
                                                "Reason for cancellation:"
                                              );
                                              if (reason) {
                                                setCancelReason(reason);
                                                handleCancelAppointment();
                                              }
                                            }}
                                            disabled={isUpdating}
                                          >
                                            Cancel Appointment
                                          </Button>
                                          <Button
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                            onClick={() =>
                                              handleUpdateStatus(apt.id, "NO_SHOW")
                                            }
                                            disabled={isUpdating}
                                          >
                                            Mark No-Show
                                          </Button>
                                          <Button
                                            className="w-full sm:w-auto"
                                            onClick={() =>
                                              handleUpdateStatus(
                                                apt.id,
                                                "COMPLETED"
                                              )
                                            }
                                            disabled={isUpdating}
                                          >
                                            {isUpdating ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Mark Complete
                                              </>
                                            )}
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                                {apt.doctorNotes && (
                                  <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                      Notes
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                      {apt.doctorNotes}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* List View */}
            {view === "list" && (
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">
                        No appointments this month
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your schedule is clear for now
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  appointments.map((apt) => (
                    <Card key={apt.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">
                                {apt.patient.name}
                              </CardTitle>
                              <Badge className={statusColors[apt.status]}>
                                {apt.status}
                              </Badge>
                            </div>
                            <CardDescription>
                              {new Date(apt.appointmentDate).toLocaleString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{typeLabels[apt.type]}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{apt.patient.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{apt.patient.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{apt.patient.age} years old</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Baby className="h-4 w-4 text-muted-foreground" />
                              <span>Week {apt.patient.term}</span>
                            </div>
                          </div>

                          {apt.reasonForVisit && (
                            <div className="rounded-lg border p-3 bg-muted/50">
                              <p className="text-sm font-medium mb-1">
                                Reason for Visit
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {apt.reasonForVisit}
                              </p>
                            </div>
                          )}

                          {apt.doctorNotes && (
                            <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950">
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Your Notes
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {apt.doctorNotes}
                              </p>
                            </div>
                          )}

                          {(apt.status === "SCHEDULED" ||
                            apt.status === "RESCHEDULED") && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  className="w-full"
                                  onClick={() => setSelectedAppointment(apt)}
                                >
                                  Manage Appointment
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage Appointment</DialogTitle>
                                  <DialogDescription>
                                    Update the status or add notes for this
                                    appointment
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="notes">Doctor's Notes</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Add notes about this appointment..."
                                      value={doctorNotes}
                                      onChange={(e) =>
                                        setDoctorNotes(e.target.value)
                                      }
                                      rows={4}
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                      setSelectedAppointment(null);
                                      setDoctorNotes("");
                                    }}
                                  >
                                    Close
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                      handleUpdateStatus(apt.id, "NO_SHOW")
                                    }
                                    disabled={isUpdating}
                                  >
                                    Mark No-Show
                                  </Button>
                                  <Button
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                      handleUpdateStatus(apt.id, "COMPLETED")
                                    }
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Mark Complete
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}