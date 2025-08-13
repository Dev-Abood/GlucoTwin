"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ReadingStatus, ReadingType } from "@prisma/client";
import { createDangerousReadingNotificationForPatient } from "@/components/notifications/notification-actions";

// Type for result returned by the action
type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Action to delete a glucose reading by ID with ownership verification
 */
export async function deleteReading(id: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Authentication required" };
    if (!id) return { success: false, error: "Reading ID is required" };

    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!patient) return { success: false, error: "Patient record not found" };

    const reading = await prisma.reading.findUnique({
      where: { id },
      select: { patientId: true },
    });
    if (!reading) return { success: false, error: "Reading not found" };
    if (reading.patientId !== patient.id) {
      return {
        success: false,
        error: "Unauthorized - you can only delete your own readings",
      };
    }

    await prisma.reading.delete({ where: { id } });

    revalidatePath("/patient/readings");
    return { success: true }; // fixed: don't put success message in `error`
  } catch (error) {
    console.error("Error deleting reading:", error);
    return { success: false, error: "Failed to delete reading. Please try again." };
  }
}

// Schema for validating the incoming glucose reading data (WITHOUT status)
const glucoseReadingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  type: z.nativeEnum(ReadingType),
  level: z.number().positive().multipleOf(0.01),
  notes: z.string().optional().default(""),
});

// Function to calculate reading status based on level and type (returns enum)
const calculateReadingStatus = (level: number, type: ReadingType): ReadingStatus => {
  const isBeforeMeal =
    type === ReadingType.BEFORE_BREAKFAST ||
    type === ReadingType.BEFORE_LUNCH ||
    type === ReadingType.BEFORE_DINNER;

  if (isBeforeMeal) {
    if (level <= 95) return ReadingStatus.NORMAL;
    if (level <= 105) return ReadingStatus.ELEVATED;
    return ReadingStatus.HIGH;
  } else {
    if (level <= 140) return ReadingStatus.NORMAL;
    if (level <= 160) return ReadingStatus.ELEVATED;
    return ReadingStatus.HIGH;
  }
};

export default calculateReadingStatus;

// Type for glucose reading inputs derived from the schema
type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;

/**
 * Creates a new glucose reading for a patient
 */
export async function createGlucoseReading(
  data: GlucoseReadingInput
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Authentication required" };

    const validatedData = glucoseReadingSchema.parse(data);

    const status = calculateReadingStatus(
      validatedData.level,
      validatedData.type
    );

    // Create the reading first so we have the reading ID for notifications
    const newReading = await prisma.reading.create({
      data: {
        patientId: userId,
        date: new Date(validatedData.date).toISOString(),
        time: validatedData.time,
        type: validatedData.type,
        level: validatedData.level,
        status, // enum value
        notes: validatedData.notes,
      },
    });

    // Trigger dangerous-reading notification (needs the reading ID)
    if (status === ReadingStatus.HIGH || status === ReadingStatus.ELEVATED) {
      await createDangerousReadingNotificationForPatient(
        userId,               // patientId
        newReading.level,     // level
        newReading.type,      // type
        newReading.time,      // time
        newReading.id         // readingId
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating glucose reading:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

// Schema for validating the update glucose reading data (status is NOT accepted from client)
const updateGlucoseReadingSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), 
  time: z.string().regex(/^\d{2}:\d{2}$/), // same
  type: z.nativeEnum(ReadingType),
  level: z.number().positive().multipleOf(0.01),
  notes: z.string().optional().default(""),
});

// Type for update glucose reading input
type UpdateGlucoseReadingInput = z.infer<typeof updateGlucoseReadingSchema>;

/**
 * Updates an existing glucose reading for a patient
 */
export async function updateGlucoseReading(
  data: UpdateGlucoseReadingInput
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Authentication required" };

    const validatedData = updateGlucoseReadingSchema.parse(data);

    const existingReading = await prisma.reading.findUnique({
      where: { id: validatedData.id },
      select: { patientId: true },
    });
    if (!existingReading) return { success: false, error: "Reading not found" };
    if (existingReading.patientId !== userId) {
      return {
        success: false,
        error: "Unauthorized - you can only update your own readings",
      };
    }

    const computedStatus = calculateReadingStatus(
      validatedData.level,
      validatedData.type
    );

    await prisma.reading.update({
      where: { id: validatedData.id },
      data: {
        type: validatedData.type,
        level: validatedData.level,
        notes: validatedData.notes,
        status: computedStatus, // enum value
        // intentionally not updating date/time here
      },
    });

    if (
      computedStatus === ReadingStatus.HIGH ||
      computedStatus === ReadingStatus.ELEVATED
    ) {
      await createDangerousReadingNotificationForPatient(
        userId,
        validatedData.level,
        validatedData.type,
        validatedData.time,
        validatedData.id
      );
    }

    revalidatePath("/patient/readings");
    return { success: true };
  } catch (error) {
    console.error("Error updating glucose reading:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input data" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
