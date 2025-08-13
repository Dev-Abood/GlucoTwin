// Notification types based on Prisma schema and requirements
export type NotificationType = 
  | 'DANGEROUS_READING'
  | 'NEW_MESSAGE'
  | 'DAILY_REMINDER'
  | 'NEW_RECOMMENDATION'
  | 'PATIENT_DANGEROUS_READING'
  | 'PATIENT_MESSAGE';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isArchived: boolean;
}

export interface DangerousReadingNotification extends BaseNotification {
  type: 'DANGEROUS_READING';
  readingLevel: number;
  readingType: 'BEFORE_BREAKFAST' | 'AFTER_BREAKFAST' | 'BEFORE_LUNCH' | 'AFTER_LUNCH' | 'BEFORE_DINNER' | 'AFTER_DINNER';
  readingTime: string;
}

export interface MessageNotification extends BaseNotification {
  type: 'NEW_MESSAGE' | 'PATIENT_MESSAGE';
  senderName: string;
  senderId: string;
  messagePreview: string;
}

export interface DailyReminderNotification extends BaseNotification {
  type: 'DAILY_REMINDER';
}

export interface RecommendationNotification extends BaseNotification {
  type: 'NEW_RECOMMENDATION';
  doctorName: string;
  doctorId: string;
}

export interface PatientDangerousReadingNotification extends BaseNotification {
  type: 'PATIENT_DANGEROUS_READING';
  patientName: string;
  patientId: string;
  readingLevel: number;
  readingType: 'BEFORE_BREAKFAST' | 'AFTER_BREAKFAST' | 'BEFORE_LUNCH' | 'AFTER_LUNCH' | 'BEFORE_DINNER' | 'AFTER_DINNER';
  readingTime: string;
}

export type Notification = 
  | DangerousReadingNotification
  | MessageNotification
  | DailyReminderNotification
  | RecommendationNotification
  | PatientDangerousReadingNotification;
