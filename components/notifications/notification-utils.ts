// notification-utils.ts
import type { NotificationType } from "./notification-types";

/**
 * Format a timestamp into a compact "time ago" string,
 * falling back to a Month Day format for older items.
 */
export function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return timestamp.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/** Return an emoji icon for the notification type. */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "DANGEROUS_READING":
      return "⚠️";
    case "NEW_MESSAGE":
      return "💬";
    case "DAILY_REMINDER":
      return "🔔";
    case "NEW_RECOMMENDATION":
      return "❗";
    default:
      return "📋";
  }
}

/** Tailwind classes for the colored icon bubble. */
export function getNotificationIconColor(type: NotificationType): string {
  switch (type) {
    case "DANGEROUS_READING":
      return "bg-yellow-100 text-yellow-600";
    case "NEW_MESSAGE":
      return "bg-blue-100 text-blue-600";
    case "DAILY_REMINDER":
      return "bg-gray-100 text-gray-600";
    case "NEW_RECOMMENDATION":
      return "bg-orange-100 text-orange-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
