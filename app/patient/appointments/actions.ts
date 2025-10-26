// app/patient/appointments/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { AppointmentStatus, AppointmentType, DayOfWeek } from "@prisma/client";

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Get patient's assigned doctors from the same hospital
 */
export async function getAssignedDoctors(): Promise<ActionResult<any[]>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get patient with hospital info
    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      select: { hospitalId: true },
    });

    if (!patient) {
      return { success: false, error: "Patient record not found" };
    }

    // Get doctors assigned to this patient from the same hospital
    const assignments = await prisma.patientAssignment.findMany({
      where: { patientId: userId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true,
            licenseNumber: true,
            yearsOfExperience: true,
            bio: true,
            hospitalId: true,
          },
        },
      },
    });

    const doctors = assignments
      .filter((a) => a.doctor.hospitalId === patient.hospitalId)
      .map((a) => a.doctor);

    return { success: true, data: doctors };
  } catch (error) {
    console.error("Error fetching assigned doctors:", error);
    return { success: false, error: "Failed to fetch doctors" };
  }
}

/**
 * Get doctor's availability for a specific week
 */
export async function getDoctorAvailability(
  doctorId: string,
  startDate: Date
): Promise<ActionResult<any>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Calculate end of week (7 days from start)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Get recurring availability
    const recurringAvailability = await prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        isRecurring: true,
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: startDate } },
        ],
      },
    });

    // Get specific date overrides
    const specificDateAvailability = await prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        specificDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // Get existing appointments for this doctor in the date range
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: startDate,
          lt: endDate,
        },
        status: {
          in: ["SCHEDULED", "RESCHEDULED"],
        },
      },
      select: {
        appointmentDate: true,
        duration: true,
      },
    });

    return {
      success: true,
      data: {
        recurringAvailability,
        specificDateAvailability,
        existingAppointments,
      },
    };
  } catch (error) {
    console.error("Error fetching doctor availability:", error);
    return { success: false, error: "Failed to fetch availability" };
  }
}

/**
 * Book a new appointment
 */
export async function bookAppointment(data: {
  doctorId: string;
  appointmentDate: Date;
  duration?: number;
  type: AppointmentType;
  reasonForVisit?: string;
}): Promise<ActionResult<string>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Verify patient exists and is assigned to this doctor
    const assignment = await prisma.patientAssignment.findFirst({
      where: {
        patientId: userId,
        doctorId: data.doctorId,
      },
    });

    if (!assignment) {
      return {
        success: false,
        error: "You are not assigned to this doctor",
      };
    }

    // Check if the time slot is already taken
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        appointmentDate: data.appointmentDate,
        status: {
          in: ["SCHEDULED", "RESCHEDULED"],
        },
      },
    });

    if (existingAppointment) {
      return {
        success: false,
        error: "This time slot is already booked",
      };
    }

    // Check if appointment is at least 2 hours in the future
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (data.appointmentDate < twoHoursFromNow) {
      return {
        success: false,
        error: "Appointments must be booked at least 2 hours in advance",
      };
    }

    // Check if appointment is not more than 3 months in advance
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    if (data.appointmentDate > threeMonthsFromNow) {
      return {
        success: false,
        error: "Appointments cannot be booked more than 3 months in advance",
      };
    }

    // Check maximum active appointments (3)
    const activeAppointments = await prisma.appointment.count({
      where: {
        patientId: userId,
        status: "SCHEDULED",
        appointmentDate: {
          gte: now,
        },
      },
    });

    if (activeAppointments >= 3) {
      return {
        success: false,
        error: "You cannot have more than 3 active appointments",
      };
    }

    const duration = data.duration || 50;
    const endTime = new Date(
      data.appointmentDate.getTime() + duration * 60000
    );

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: userId,
        doctorId: data.doctorId,
        appointmentDate: data.appointmentDate,
        endTime,
        duration,
        status: "SCHEDULED",
        type: data.type,
        reasonForVisit: data.reasonForVisit,
      },
    });

    // TODO: Create notification for both patient and doctor
    // await createAppointmentNotification(...)

    revalidatePath("/patient/appointments");
    return { success: true, data: appointment.id };
  } catch (error: any) {
    console.error("Error booking appointment:", error);
    
    // Check for unique constraint violation
    if (error.code === "P2002") {
      return {
        success: false,
        error: "This time slot is already booked",
      };
    }
    
    return { success: false, error: "Failed to book appointment" };
  }
}

/**
 * Get patient's appointments (upcoming and past)
 */
export async function getPatientAppointments(): Promise<
  ActionResult<{ upcoming: any[]; past: any[] }>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const now = new Date();

    const allAppointments = await prisma.appointment.findMany({
      where: { patientId: userId },
      include: {
        doctor: {
          select: {
            name: true,
            specialty: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { appointmentDate: "desc" },
    });

    const upcoming = allAppointments.filter(
      (apt) =>
        apt.appointmentDate >= now &&
        (apt.status === "SCHEDULED" || apt.status === "RESCHEDULED")
    );

    const past = allAppointments.filter(
      (apt) =>
        apt.appointmentDate < now ||
        apt.status === "COMPLETED" ||
        apt.status === "CANCELLED" ||
        apt.status === "NO_SHOW"
    );

    return { success: true, data: { upcoming, past } };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointment.patientId !== userId) {
      return {
        success: false,
        error: "You can only cancel your own appointments",
      };
    }

    // Check if appointment is at least 4 hours away
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    if (appointment.appointmentDate < fourHoursFromNow) {
      return {
        success: false,
        error: "Appointments can only be cancelled at least 4 hours in advance",
      };
    }

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason || "Cancelled by patient",
      },
    });

    // TODO: Create cancellation notification for doctor
    // await createCancellationNotification(...)

    revalidatePath("/patient/appointments");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error: "Failed to cancel appointment" };
  }
}