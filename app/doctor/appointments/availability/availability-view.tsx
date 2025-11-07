// app/doctor/appointments/availability/availability-view.tsx
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  ArrowLeft,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { DayOfWeek } from "@prisma/client";
import {
  getDoctorAvailabilitySchedule,
  setRecurringAvailability,
  blockSpecificDate,
  removeSpecificDateBlock,
} from "../actions";

interface RecurringAvailability {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface SpecificDateBlock {
  id: string;
  specificDate: Date;
  notes: string | null;
}

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const daysOfWeek: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const dayLabels: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export default function AvailabilityManagementView() {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Weekly schedule
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    daysOfWeek.map((day) => ({
      dayOfWeek: day,
      isAvailable: false,
      startTime: "09:00",
      endTime: "17:00",
    }))
  );

  // Specific date blocks (vacations, holidays)
  const [specificDateBlocks, setSpecificDateBlocks] = useState<
    SpecificDateBlock[]
  >([]);
  const [selectedDateToBlock, setSelectedDateToBlock] = useState<Date>();
  const [blockNotes, setBlockNotes] = useState("");
  const [isBlockingDate, setIsBlockingDate] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    setIsLoading(true);
    try {
      const result = await getDoctorAvailabilitySchedule();
      if (result.success && result.data) {
        // Map recurring availability to weekly schedule
        const schedule = daysOfWeek.map((day) => {
          const existing = result.data.recurringAvailability.find(
            (a: RecurringAvailability) => a.dayOfWeek === day
          );
          return existing
            ? {
                dayOfWeek: day,
                isAvailable: existing.isAvailable,
                startTime: existing.startTime,
                endTime: existing.endTime,
              }
            : {
                dayOfWeek: day,
                isAvailable: false,
                startTime: "09:00",
                endTime: "17:00",
              };
        });

        setWeeklySchedule(schedule);
        setSpecificDateBlocks(result.data.specificDateBlocks);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (dayOfWeek: DayOfWeek, isAvailable: boolean) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, isAvailable } : day
      )
    );
    setHasChanges(true);
  };

  const handleTimeChange = (
    dayOfWeek: DayOfWeek,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
    setHasChanges(true);
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      // Save each day's availability
      const promises = weeklySchedule.map((day) =>
        setRecurringAvailability({
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        toast({
          title: "Success",
          description: "Availability schedule updated successfully",
        });
        setHasChanges(false);
        await loadAvailability();
      } else {
        toast({
          title: "Error",
          description: "Some changes failed to save",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockDate = async () => {
    if (!selectedDateToBlock) return;

    setIsBlockingDate(true);
    try {
      const result = await blockSpecificDate({
        specificDate: selectedDateToBlock,
        notes: blockNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Date blocked successfully",
        });
        setSelectedDateToBlock(undefined);
        setBlockNotes("");
        await loadAvailability();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to block date",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block date",
        variant: "destructive",
      });
    } finally {
      setIsBlockingDate(false);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      const result = await removeSpecificDateBlock(blockId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Date block removed",
        });
        await loadAvailability();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove block",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove block",
        variant: "destructive",
      });
    }
  };

  const handleQuickSetup = (preset: "weekdays" | "weekend" | "full") => {
    let updates: DaySchedule[];

    switch (preset) {
      case "weekdays":
        updates = weeklySchedule.map((day) => ({
          ...day,
          isAvailable: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
          ].includes(day.dayOfWeek),
          startTime: "09:00",
          endTime: "17:00",
        }));
        break;
      case "weekend":
        updates = weeklySchedule.map((day) => ({
          ...day,
          isAvailable: ["SATURDAY", "SUNDAY"].includes(day.dayOfWeek),
          startTime: "10:00",
          endTime: "14:00",
        }));
        break;
      case "full":
        updates = weeklySchedule.map((day) => ({
          ...day,
          isAvailable: true,
          startTime: "08:00",
          endTime: "18:00",
        }));
        break;
      default:
        return;
    }

    setWeeklySchedule(updates);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="doctor" />
        <div className="flex flex-1">
          <Sidebar userType="doctor" />
          <main className="flex-1 overflow-auto">
            <div className="container max-w-4xl py-6">
              <Skeleton className="h-10 w-[300px] mb-6" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(7)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
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
      <Header userType="doctor" />
      <div className="flex flex-1">
        <Sidebar userType="doctor" />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6">
            {/* Header */}
            <div className="mb-6">
              <Link
                href="/doctor/appointments"
                className="inline-flex items-center text-sm font-medium mb-4 hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Appointments
              </Link>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Manage Availability</h1>
                  <p className="text-muted-foreground mt-1">
                    Set your weekly schedule and block specific dates
                  </p>
                </div>
                {hasChanges && (
                  <Button onClick={handleSaveSchedule} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-pulse" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Setup */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Setup</CardTitle>
                <CardDescription>
                  Apply common availability patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleQuickSetup("weekdays")}
                  >
                    Weekdays (Mon-Fri, 9AM-5PM)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickSetup("weekend")}
                  >
                    Weekends (Sat-Sun, 10AM-2PM)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickSetup("full")}
                  >
                    Full Week (Mon-Sun, 8AM-6PM)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>
                  Set your regular weekly availability. Patients can only book
                  during these times.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeklySchedule.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border"
                    >
                      {/* Day Toggle */}
                      <div className="flex items-center space-x-2 min-w-[140px]">
                        <Switch
                          checked={day.isAvailable}
                          onCheckedChange={(checked) =>
                            handleDayToggle(day.dayOfWeek, checked)
                          }
                          id={`switch-${day.dayOfWeek}`}
                        />
                        <Label
                          htmlFor={`switch-${day.dayOfWeek}`}
                          className="font-medium cursor-pointer"
                        >
                          {dayLabels[day.dayOfWeek]}
                        </Label>
                      </div>

                      {/* Time Inputs */}
                      {day.isAvailable ? (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2 flex-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={day.startTime}
                              onChange={(e) =>
                                handleTimeChange(
                                  day.dayOfWeek,
                                  "startTime",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                            />
                          </div>
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              handleTimeChange(
                                day.dayOfWeek,
                                "endTime",
                                e.target.value
                              )
                            }
                            className="flex-1"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground flex-1">
                          Not available
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Important Notes
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                        <li>
                          Appointments are 50 minutes long with 10-minute breaks
                        </li>
                        <li>
                          Patients can book 2 hours to 3 months in advance
                        </li>
                        <li>
                          Remember to save your changes before leaving this page
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block Specific Dates */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Block Specific Dates</CardTitle>
                    <CardDescription>
                      Mark days when you're unavailable (vacations, holidays,
                      conferences)
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Block Date
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Block a Date</DialogTitle>
                        <DialogDescription>
                          Select a date to mark as unavailable
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex justify-center">
                          <Calendar
                            mode="single"
                            selected={selectedDateToBlock}
                            onSelect={setSelectedDateToBlock}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder="e.g., On vacation, Conference, Personal day"
                            value={blockNotes}
                            onChange={(e) => setBlockNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleBlockDate}
                          disabled={!selectedDateToBlock || isBlockingDate}
                        >
                          {isBlockingDate ? "Blocking..." : "Block Date"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {specificDateBlocks.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No dates blocked. Click "Block Date" to add one.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {specificDateBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {new Date(block.specificDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                            {block.notes && (
                              <p className="text-sm text-muted-foreground">
                                {block.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success Message */}
            {!hasChanges && !isLoading && (
              <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your availability schedule is up to date. Patients can now
                    book appointments during your available times.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}