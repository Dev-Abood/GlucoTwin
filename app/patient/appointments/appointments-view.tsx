"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Plus,
  XCircle,
  FileText,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { getPatientAppointments, cancelAppointment } from "./actions";

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
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
  doctor: {
    name: string;
    specialty: string | null;
    email: string;
    phone: string;
    hospital: Hospital;
  };
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              <Skeleton className="h-6 w-[80px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
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

export default function AppointmentsView() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const result = await getPatientAppointments();
      if (result.success && result.data) {
        setUpcoming(result.data.upcoming);
        setPast(result.data.past);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load appointments",
          variant: "destructive",
        });
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

  const handleCancelAppointment = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      const result = await cancelAppointment(appointmentId, cancelReason);
      if (result.success) {
        toast({
          title: "Success",
          description: "Appointment cancelled successfully",
        });
        setCancelReason("");
        await loadAppointments();
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
      setCancellingId(null);
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderAppointmentCard = (appointment: Appointment, isPast: boolean) => (
    <Card key={appointment.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {appointment.doctor.name}
              </CardTitle>
              <Badge className={statusColors[appointment.status]}>
                {appointment.status}
              </Badge>
            </div>
            {appointment.doctor.specialty && (
              <CardDescription>{appointment.doctor.specialty}</CardDescription>
            )}
          </div>
          <Badge variant="outline">{typeLabels[appointment.type]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hospital Information */}
        <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-start gap-2 mb-2">
            <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {appointment.doctor.hospital.name}
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span>{appointment.doctor.hospital.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Phone className="h-3 w-3" />
                  <span>{appointment.doctor.hospital.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDateTime(appointment.appointmentDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(appointment.appointmentDate)} -{" "}
              {formatTime(appointment.endTime)} ({appointment.duration} minutes)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.doctor.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.doctor.phone}</span>
          </div>
        </div>

        {appointment.reasonForVisit && (
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Reason for Visit</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.reasonForVisit}
                </p>
              </div>
            </div>
          </div>
        )}

        {appointment.doctorNotes && isPast && (
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Doctor's Notes
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {appointment.doctorNotes}
                </p>
              </div>
            </div>
          </div>
        )}

        {appointment.cancelReason && (
          <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-950">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Cancellation Reason
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {appointment.cancelReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isPast && appointment.status === "SCHEDULED" && (
          <div className="flex gap-2 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this appointment? This
                    action cannot be undone. Appointments can only be cancelled
                    at least 4 hours in advance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                  <Label htmlFor="cancel-reason">
                    Reason for cancellation (optional)
                  </Label>
                  <Textarea
                    id="cancel-reason"
                    placeholder="Please let us know why you need to cancel..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleCancelAppointment(appointment.id)}
                    disabled={cancellingId === appointment.id}
                  >
                    {cancellingId === appointment.id
                      ? "Cancelling..."
                      : "Cancel Appointment"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="patient" />
      <div className="flex flex-1">
        <Sidebar userType="patient" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">My Appointments</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your upcoming and past appointments
                </p>
              </div>
              <Button onClick={() => router.push("/patient/appointments/book")}>
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </div>

            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {isLoading ? (
                  <AppointmentsSkeleton />
                ) : upcoming.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">
                        No upcoming appointments
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Book an appointment with your doctor to get started
                      </p>
                      <Button
                        onClick={() => router.push("/patient/appointments/book")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Book Appointment
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcoming.map((apt) => renderAppointmentCard(apt, false))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {isLoading ? (
                  <AppointmentsSkeleton />
                ) : past.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">
                        No past appointments
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your appointment history will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  past.map((apt) => renderAppointmentCard(apt, true))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}