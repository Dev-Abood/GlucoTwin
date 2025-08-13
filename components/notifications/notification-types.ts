// notification-types.ts
import type { Prisma } from "@prisma/client";

// Keep this union in sync with your Prisma enum values
export type NotificationType =
  | "DANGEROUS_READING"
  | "NEW_MESSAGE"
  | "NEW_RECOMMENDATION"
  | "DAILY_REMINDER";

// UI-facing type for the panel
export type UINotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  // Match Prisma's Json? exactly to avoid "unknown" assignment errors
  metadata?: Prisma.JsonValue;
  isRead: boolean;
  isArchived: boolean;
  timestamp: Date; // panel uses Date
};
