import { ReadingType } from "@prisma/client";

/**
 * Type definition for a single glucose reading
 */
export interface GlucoseReading {
	id: string;
	date: Date;
	time: string;
	type: ReadingType;
	level: number;
	status: string;
	notes: string | null;
}
