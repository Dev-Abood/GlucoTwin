import { ReadingType } from "@prisma/client";

/**
 * Formats reading type for display (e.g., "BEFORE_BREAKFAST" -> "Before Breakfast")
 * @param {ReadingType} type - The reading type to format
 * @returns {string} - Formatted display string
 */
export const formatReadingType = (type: ReadingType): string => {
	return type
		.toString()
		.replace(/_/g, " ")
		.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
		);
};
