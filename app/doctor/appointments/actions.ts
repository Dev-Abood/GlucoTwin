// app/doctor/appointments/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { AppointmentStatus, DayOfWeek } from "@prisma/client";

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Get doctor's appointments for a date range
 */
export async function getDoctorAppointments(
  startDate: Date,
  endDate: Date
): Promise<ActionResult<any[]>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: userId,
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            age: true,
            term: true,
            dueDate: true,
          },
        },
      },
      orderBy: { appointmentDate: "asc" },
    });

    return { success: true, data: appointments };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

/**
 * Get doctor's availability schedule
 */
export async function getDoctorAvailabilitySchedule(): Promise<
  ActionResult<any>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const recurringAvailability = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: userId,
        isRecurring: true,
      },
      orderBy: { dayOfWeek: "asc" },
    });

    const specificDateBlocks = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: userId,
        specificDate: { gte: new Date() },
      },
      orderBy: { specificDate: "asc" },
    });

    return {
      success: true,
      data: { recurringAvailability, specificDateBlocks },
    };
  } catch (error) {
    console.error("Error fetching availability:", error);
    return { success: false, error: "Failed to fetch availability" };
  }
}

/**
 * Set recurring weekly availability
 */
export async function setRecurringAvailability(data: {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}): Promise<ActionResult<string>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Delete existing recurring availability for this day
    await prisma.doctorAvailability.deleteMany({
      where: {
        doctorId: userId,
        dayOfWeek: data.dayOfWeek,
        isRecurring: true,
        specificDate: null,
      },
    });

    // Create new availability if isAvailable is true
    if (data.isAvailable) {
      const availability = await prisma.doctorAvailability.create({
        data: {
          doctorId: userId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          isAvailable: true,
          isRecurring: true,
        },
      });

      revalidatePath("/doctor/appointments");
      return { success: true, data: availability.id };
    }

    revalidatePath("/doctor/appointments");
    return { success: true };
  } catch (error) {
    console.error("Error setting availability:", error);
    return { success: false, error: "Failed to set availability" };
  }
}

/**
 * Block specific date (vacation, holiday, etc.)
 */
export async function blockSpecificDate(data: {
  specificDate: Date;
  notes?: string;
}): Promise<ActionResult<string>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Check if block already exists
    const existing = await prisma.doctorAvailability.findFirst({
      where: {
        doctorId: userId,
        specificDate: data.specificDate,
      },
    });

    if (existing) {
      return { success: false, error: "This date is already blocked" };
    }

    const block = await prisma.doctorAvailability.create({
      data: {
        doctorId: userId,
        dayOfWeek: "MONDAY", // Placeholder, not used for specific dates
        startTime: "00:00",
        endTime: "23:59",
        specificDate: data.specificDate,
        isAvailable: false,
        isRecurring: false,
        notes: data.notes,
      },
    });

    revalidatePath("/doctor/appointments");
    return { success: true, data: block.id };
  } catch (error) {
    console.error("Error blocking date:", error);
    return { success: false, error: "Failed to block date" };
  }
}

/**
 * Remove specific date block
 */
export async function removeSpecificDateBlock(
  blockId: string
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const block = await prisma.doctorAvailability.findUnique({
      where: { id: blockId },
    });

    if (!block || block.doctorId !== userId) {
      return { success: false, error: "Block not found" };
    }

    await prisma.doctorAvailability.delete({
      where: { id: blockId },
    });

    revalidatePath("/doctor/appointments");
    return { success: true };
  } catch (error) {
    console.error("Error removing block:", error);
    return { success: false, error: "Failed to remove block" };
  }
}

/**
 * Update appointment status (complete, no-show, etc.)
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  doctorNotes?: string
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment || appointment.doctorId !== userId) {
      return { success: false, error: "Appointment not found" };
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        doctorNotes: doctorNotes || appointment.doctorNotes,
      },
    });

    revalidatePath("/doctor/appointments");
    return { success: true };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}

/**
 * Cancel appointment (doctor side)
 */
export async function cancelAppointmentAsDoctor(
  appointmentId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment || appointment.doctorId !== userId) {
      return { success: false, error: "Appointment not found" };
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // TODO: Send notification to patient

    revalidatePath("/doctor/appointments");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error: "Failed to cancel appointment" };
  }
}

/**
 * Get appointment statistics
 */
export async function getAppointmentStats(): Promise<
  ActionResult<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    completed: number;
    cancelled: number;
  }>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth, completed, cancelled] =
      await Promise.all([
        prisma.appointment.count({
          where: {
            doctorId: userId,
            appointmentDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
          },
        }),
        prisma.appointment.count({
          where: {
            doctorId: userId,
            appointmentDate: { gte: startOfWeek },
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
          },
        }),
        prisma.appointment.count({
          where: {
            doctorId: userId,
            appointmentDate: { gte: startOfMonth },
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
          },
        }),
        prisma.appointment.count({
          where: { doctorId: userId, status: "COMPLETED" },
        }),
        prisma.appointment.count({
          where: { doctorId: userId, status: "CANCELLED" },
        }),
      ]);

    return {
      success: true,
      data: { today, thisWeek, thisMonth, completed, cancelled },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { success: false, error: "Failed to fetch statistics" };
  }
}