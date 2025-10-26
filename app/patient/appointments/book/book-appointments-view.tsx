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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Loader2 } from "lucide-react";
import Link from "next/link";

import { useToast } from "@/hooks/use-toast";
import { AppointmentType, DayOfWeek } from "@prisma/client";
import { getAssignedDoctors, getDoctorAvailability, bookAppointment } from "../actions";

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const appointmentTypes: { value: AppointmentType; label: string; description: string }[] = [
  {
    value: "CONSULTATION",
    label: "Consultation",
    description: "Regular checkup and consultation",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    description: "Follow-up from previous visit",
  },
  {
    value: "EMERGENCY",
    label: "Emergency",
    description: "Urgent medical attention needed",
  },
  {
    value: "LAB_REVIEW",
    label: "Lab Review",
    description: "Review lab results with doctor",
  },
  {
    value: "INITIAL",
    label: "Initial Visit",
    description: "First appointment with this doctor",
  },
];

export default function BookAppointmentView() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  
  // Doctor selection
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  // Date and time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Appointment details
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("CONSULTATION");
  const [reasonForVisit, setReasonForVisit] = useState("");

  // Load assigned doctors on mount
  useEffect(() => {
    loadDoctors();
  }, []);

  // Load available slots when date is selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const result = await getAssignedDoctors();
      if (result.success && result.data) {
        setDoctors(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load doctors",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    setLoadingSlots(true);
    try {
      // Get start of selected day
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const result = await getDoctorAvailability(selectedDoctor.id, startOfDay);
      
      if (result.success && result.data) {
        const slots = generateTimeSlots(
          selectedDate,
          result.data.recurringAvailability,
          result.data.specificDateAvailability,
          result.data.existingAppointments
        );
        setAvailableSlots(slots);
      } else {
        toast({
          title: "Error",
          description: "Failed to load availability",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const generateTimeSlots = (
    date: Date,
    recurringAvailability: any[],
    specificDateAvailability: any[],
    existingAppointments: any[]
  ): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dayOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][
      date.getDay()
    ] as DayOfWeek;

    // Check if there's specific date availability (overrides recurring)
    const specificAvail = specificDateAvailability.find((a) => {
      const specificDate = new Date(a.specificDate);
      return (
        specificDate.toDateString() === date.toDateString() &&
        !a.isAvailable
      );
    });

    // If specifically blocked, return empty slots
    if (specificAvail) {
      return [];
    }

    // Find recurring availability for this day
    const dayAvailability = recurringAvailability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isAvailable
    );

    if (!dayAvailability) {
      return [];
    }

    // Parse start and end times
    const [startHour, startMin] = dayAvailability.startTime.split(":").map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(":").map(Number);

    // Generate 50-minute slots from 7:00 AM onwards
    let currentHour = Math.max(7, startHour);
    let currentMin = currentHour === startHour ? startMin : 0;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      
      // Create date object for this slot
      const slotDate = new Date(date);
      slotDate.setHours(currentHour, currentMin, 0, 0);

      // Check if slot is in the past
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const isPast = slotDate < twoHoursFromNow;

      // Check if slot is already booked
      const isBooked = existingAppointments.some((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate.getTime() === slotDate.getTime();
      });

      slots.push({
        time: timeStr,
        available: !isPast && !isBooked,
      });

      // Move to next hour (50 min slot + 10 min buffer = 1 hour)
      currentHour += 1;
    }

    return slots;
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select a doctor, date, and time",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const result = await bookAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate,
        type: appointmentType,
        reasonForVisit: reasonForVisit || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Appointment booked successfully",
        });
        router.push("/patient/appointments");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to book appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="patient" />
        <div className="flex flex-1">
          <Sidebar userType="patient" />
          <main className="flex-1 overflow-auto">
            <div className="container max-w-4xl py-6">
              <Skeleton className="h-10 w-[300px] mb-6" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="patient" />
      <div className="flex flex-1">
        <Sidebar userType="patient" />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6">
            <div className="mb-6">
              <Link
                href="/patient/appointments"
                className="inline-flex items-center text-sm font-medium mb-4 hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Appointments
              </Link>
              <h1 className="text-3xl font-bold">Book New Appointment</h1>
              <p className="text-muted-foreground mt-1">
                Select a doctor and choose an available time slot
              </p>
            </div>

            {/* Progress indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`h-1 w-12 ${
                        step > s ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Doctor</CardTitle>
                  <CardDescription>
                    Choose from your assigned healthcare providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {doctors.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No doctors assigned to you yet. Please contact your hospital.
                      </p>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedDoctor?.id}
                      onValueChange={(value) => {
                        const doctor = doctors.find((d) => d.id === value);
                        setSelectedDoctor(doctor || null);
                      }}
                      className="space-y-3"
                    >
                      {doctors.map((doctor) => (
                        <Label
                          key={doctor.id}
                          htmlFor={doctor.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent [&:has(:checked)]:bg-accent"
                        >
                          <RadioGroupItem value={doctor.id} id={doctor.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{doctor.name}</p>
                              {doctor.specialty && (
                                <Badge variant="secondary">{doctor.specialty}</Badge>
                              )}
                            </div>
                            {doctor.yearsOfExperience && (
                              <p className="text-sm text-muted-foreground">
                                {doctor.yearsOfExperience} years of experience
                              </p>
                            )}
                            {doctor.bio && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {doctor.bio}
                              </p>
                            )}
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedDoctor}
                    >
                      Next: Select Date
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Select Date */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Date</CardTitle>
                  <CardDescription>
                    Choose a date for your appointment with Dr. {selectedDoctor?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const threeMonthsFromNow = new Date();
                        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                        return date < today || date > threeMonthsFromNow;
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!selectedDate}
                    >
                      Next: Select Time
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Select Time */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Time</CardTitle>
                  <CardDescription>
                    Available time slots for {selectedDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No available slots for this date. Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          className={`${
                            !slot.available
                              ? "bg-red-100 text-red-900 hover:bg-red-100 cursor-not-allowed dark:bg-red-950 dark:text-red-100"
                              : ""
                          }`}
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded border bg-background" />
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-950" />
                        <span>Unavailable</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(4)}
                      disabled={!selectedTime}
                    >
                      Next: Appointment Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Appointment Details */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Details</CardTitle>
                  <CardDescription>
                    Provide additional information about your appointment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h3 className="font-medium mb-3">Appointment Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Doctor:</span>
                        <span>{selectedDoctor?.name}</span>
                        {selectedDoctor?.specialty && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedDoctor.specialty}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>
                          {selectedDate?.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{selectedTime} (50 minutes)</span>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Type */}
                  <div className="space-y-3">
                    <Label>Appointment Type</Label>
                    <RadioGroup
                      value={appointmentType}
                      onValueChange={(value) => setAppointmentType(value as AppointmentType)}
                      className="space-y-2"
                    >
                      {appointmentTypes.map((type) => (
                        <Label
                          key={type.value}
                          htmlFor={type.value}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent [&:has(:checked)]:bg-accent"
                        >
                          <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Reason for Visit */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Visit (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please describe your symptoms or reason for this appointment..."
                      value={reasonForVisit}
                      onChange={(e) => setReasonForVisit(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps your doctor prepare for your appointment
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleBookAppointment}
                      disabled={isBooking}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        "Confirm Booking"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}