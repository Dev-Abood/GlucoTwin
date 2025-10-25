"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getMessages,
  sendMessageToDoctor,
  markMessagesAsRead,
} from "./actions";
import {
  ArrowLeft,
  Send,
  Search,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

// Types
interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
}

interface Message {
  id: string;
  patientAssignmentId: string;
  senderId: string;
  senderType: "DOCTOR" | "PATIENT";
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface DoctorAssignment {
  id: string;
  lastVisitDate: Date;
  hasMessageForPatient: boolean;
  doctor: Doctor;
}

interface MessagesPageProps {
  patientData: {
    id: string;
    name: string;
  };
  doctorAssignments: DoctorAssignment[];
}

/**
 * Skeleton loader for doctor list
 */
function DoctorListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <Skeleton className="h-9 w-[90px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for chat messages
 */
function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div className="space-y-2">
            <Skeleton
              className={`h-16 ${i % 2 === 0 ? "w-[250px]" : "w-[200px]"} rounded-lg`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MessagesPage({
  patientData,
  doctorAssignments,
}: MessagesPageProps) {
  const router = useRouter();

  const [selectedAssignment, setSelectedAssignment] =
    useState<DoctorAssignment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (doctorAssignments) {
      setIsLoading(false);
    }
  }, [doctorAssignments]);

  // Filter doctors by search
  const filteredDoctors = doctorAssignments?.filter((assignment) =>
    assignment.doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // When selecting a doctor, fetch chat and mark as read
  const handleSelectDoctor = async (assignment: DoctorAssignment) => {
    setSelectedAssignment(assignment);
    setMessagesLoading(true);

    if (assignment.hasMessageForPatient) {
      await markMessagesAsRead(assignment.id);
      assignment.hasMessageForPatient = false;
    }

    const msgs = await getMessages(assignment.id);
    if (!("error" in msgs)) setMessages(msgs);
    setMessagesLoading(false);
  };

  // Send message to doctor
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAssignment) return;

    const saved = await sendMessageToDoctor(selectedAssignment.id, newMessage);
    if (!("error" in saved)) {
      setMessages((prev) => [...prev, saved]);
      setNewMessage("");
    }
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  /* Doctor Card Component */
  const DoctorCard = ({ assignment }: { assignment: DoctorAssignment }) => (
    <div
      key={assignment.id}
      className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => handleSelectDoctor(assignment)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {assignment.doctor.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">
              {assignment.doctor.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {assignment.doctor.specialty || "General"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {assignment.hasMessageForPatient && (
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          )}
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  );

  /* Chat View */
  if (selectedAssignment) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="patient" />
        <div className="flex flex-1">
          <Sidebar userType="patient" />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col h-[calc(100vh-4rem)]">
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Messages
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedAssignment.doctor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl font-semibold">
                      {selectedAssignment.doctor.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {selectedAssignment.doctor.specialty || "General"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messagesLoading ? (
                  <ChatMessagesSkeleton />
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderType === "PATIENT"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-md ${
                          message.senderType === "PATIENT"
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span
                          className={`text-xs ${
                            message.senderType === "PATIENT"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* Doctor List View */
  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="patient" />
      <div className="flex flex-1">
        <Sidebar userType="patient" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-9 w-[200px]" />
                <Skeleton className="h-10 w-full" />
                <DoctorListSkeleton />
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="text-3xl font-bold">Messages</h1>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Doctor List */}
                <div className="space-y-3">
                  {filteredDoctors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      You currently have no overseeing doctors. Please wait for an
                      assignment.
                    </div>
                  ) : (
                    filteredDoctors.map((assignment) => (
                      <DoctorCard key={assignment.id} assignment={assignment} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}