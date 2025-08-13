"use client"

import { useState, useEffect } from "react"

interface Message {
  id: string
  senderId: string
  senderType: "doctor" | "patient"
  content: string
  timestamp: Date
  isRead: boolean
  patientId: string
}

interface UnreadMessageCount {
  [patientId: string]: number
}

export function useMessages() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCount>({})

  // This would typically fetch from your API
  const fetchUnreadCounts = async () => {
    // Mock data - replace with actual API call
    const mockUnreadCounts = {
      P22103623: 0, // Layla - no unread messages
      P22342515: 0, // Jamila - no unread messages
      P27700144: 1, // Mariam - 1 unread message (has green checkmark)
      P19877234: 0, // Mahra - no unread messages
    }
    setUnreadCounts(mockUnreadCounts)
  }

  const markAsRead = (patientId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [patientId]: 0,
    }))
  }

  const incrementUnread = (patientId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || 0) + 1,
    }))
  }

  useEffect(() => {
    fetchUnreadCounts()

    // Set up real-time updates (WebSocket, Server-Sent Events, etc.)
    // This is where you'd listen for new messages

    return () => {
      // Cleanup listeners
    }
  }, [])

  return {
    unreadCounts,
    markAsRead,
    incrementUnread,
    hasUnreadMessages: (patientId: string) => (unreadCounts[patientId] || 0) > 0,
  }
}
