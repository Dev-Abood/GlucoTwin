import { Notification } from './notification-types';

// Mock data for patient notifications
export const mockPatientNotifications: Notification[] = [
  {
    id: '1',
    type: 'DANGEROUS_READING',
    title: 'Dangerous Reading Alert',
    message: 'Your last reading of 522 mg/dL after breakfast is dangerously high. Please contact your doctor immediately.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isRead: false,
    isArchived: false,
    readingLevel: 522,
    readingType: 'AFTER_BREAKFAST',
    readingTime: '09:30 AM'
  },
  {
    id: '2',
    type: 'NEW_MESSAGE',
    title: 'New Message',
    message: 'You have received a new message from Dr. Sarah Johnson regarding your recent readings.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    isArchived: false,
    senderName: 'Dr. Sarah Johnson',
    senderId: 'doc-123',
    messagePreview: 'I noticed your recent glucose levels have been elevated. Let\'s schedule a follow-up...'
  },
  {
    id: '3',
    type: 'DAILY_REMINDER',
    title: 'Daily Reading Reminder',
    message: 'Please record your 6 daily glucose readings for today to help track your progress.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago (morning)
    isRead: true,
    isArchived: false
  },
  {
    id: '4',
    type: 'NEW_RECOMMENDATION',
    title: 'New Recommendation',
    message: 'Dr. Michael Chen has set a new personalized recommendation for you. Please check it out.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: true,
    isArchived: false,
    doctorName: 'Dr. Michael Chen',
    doctorId: 'doc-456'
  },
  {
    id: '5',
    type: 'NEW_MESSAGE',
    title: 'New Message',
    message: 'You have received a new message from Dr. Emily Rodriguez about your meal planning.',
    timestamp: new Date('2024-08-04T14:30:00'), // August 4th
    isRead: true,
    isArchived: true,
    senderName: 'Dr. Emily Rodriguez',
    senderId: 'doc-789',
    messagePreview: 'Great job on maintaining your morning readings! Here are some tips for lunch...'
  }
];

// Mock data for doctor notifications
export const mockDoctorNotifications: Notification[] = [
  {
    id: '6',
    type: 'PATIENT_DANGEROUS_READING',
    title: 'Patient Critical Alert',
    message: 'Maria Gonzalez (ID: PAT-001) recorded a dangerous reading of 485 mg/dL. Immediate action required.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    isRead: false,
    isArchived: false,
    patientName: 'Maria Gonzalez',
    patientId: 'PAT-001',
    readingLevel: 485,
    readingType: 'BEFORE_DINNER',
    readingTime: '06:15 PM'
  },
  {
    id: '7',
    type: 'PATIENT_MESSAGE',
    title: 'Patient Message',
    message: 'You have received a new message from patient Jennifer Smith regarding her medication.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    isRead: false,
    isArchived: false,
    senderName: 'Jennifer Smith',
    senderId: 'PAT-002',
    messagePreview: 'Hi Dr. Johnson, I wanted to ask about adjusting my insulin dosage...'
  },
  {
    id: '8',
    type: 'PATIENT_DANGEROUS_READING',
    title: 'Patient Alert',
    message: 'Robert Chen (ID: PAT-003) recorded a high reading of 320 mg/dL after lunch. Please review.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    isRead: true,
    isArchived: false,
    patientName: 'Robert Chen',
    patientId: 'PAT-003',
    readingLevel: 320,
    readingType: 'AFTER_LUNCH',
    readingTime: '01:45 PM'
  }
];
