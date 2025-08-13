"use client"

import { archiveAllNotifications, archiveNotification, getNotifications, markNotificationAsRead } from "@/actions/notification-actions"
import { showNotificationToast } from "@/components/toast-notifications"
import { useState, useEffect } from "react"


interface Notification {
  id: string
  type:
    | "DANGEROUS_READING_PATIENT"
    | "DANGEROUS_READING_DOCTOR"
    | "NEW_MESSAGE_PATIENT"
    | "NEW_MESSAGE_DOCTOR"
    | "DAILY_REMINDER"
    | "NEW_RECOMMENDATION"
  title: string
  message: string
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  isRead: boolean
  isArchived: boolean
  createdAt: Date
}

export function useNotifications(userId: string, userType: "patient" | "doctor") {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)

  const fetchNotifications = async () => {
    if (!userId) return

    try {
      const result = await getNotifications(userId, userType)

      if (result.success && result.notifications) {
        const fetchedNotifications = result.notifications

        // Convert createdAt strings to Date objects
        const processedNotifications = fetchedNotifications.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }))

        // Show toast for new notifications
        if (lastFetchTime) {
          const newNotifications = processedNotifications.filter(
            (n: Notification) => !n.isRead && !n.isArchived && n.createdAt > lastFetchTime,
          )

          newNotifications.forEach((notification: Notification) => {
            showNotificationToast({
              type: notification.type,
              title: notification.title,
              message: notification.message,
              priority: notification.priority,
            })
          })
        }

        setNotifications(processedNotifications)
        setLastFetchTime(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const result = await markNotificationAsRead(notificationId)

      if (result.success) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const archiveNotificationAction = async (notificationId: string) => {
    try {
      const result = await archiveNotification(notificationId)

      if (result.success) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isArchived: true } : n)))
      }
    } catch (error) {
      console.error("Failed to archive notification:", error)
    }
  }

  const archiveAll = async () => {
    try {
      const result = await archiveAllNotifications(userId, userType)

      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isArchived: true })))
      }
    } catch (error) {
      console.error("Failed to archive all notifications:", error)
    }
  }

  // Listen for new notifications
  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    return () => clearInterval(interval)
  }, [userId, userType])

  return {
    notifications,
    loading,
    markAsRead,
    archiveNotification: archiveNotificationAction,
    archiveAll,
    refetch: fetchNotifications,
  }
}
