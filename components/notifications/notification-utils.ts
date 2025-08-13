import { Notification } from './notification-types';

export function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return timestamp.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  }
}

export function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'DANGEROUS_READING':
    case 'PATIENT_DANGEROUS_READING':
      return '⚠️';
    case 'NEW_MESSAGE':
    case 'PATIENT_MESSAGE':
      return '💬';
    case 'DAILY_REMINDER':
      return '🔔';
    case 'NEW_RECOMMENDATION':
      return '❗';
    default:
      return '📋';
  }
}

export function getNotificationIconColor(type: Notification['type']): string {
  switch (type) {
    case 'DANGEROUS_READING':
    case 'PATIENT_DANGEROUS_READING':
      return 'bg-yellow-100 text-yellow-600';
    case 'NEW_MESSAGE':
    case 'PATIENT_MESSAGE':
      return 'bg-blue-100 text-blue-600';
    case 'DAILY_REMINDER':
      return 'bg-gray-100 text-gray-600';
    case 'NEW_RECOMMENDATION':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
