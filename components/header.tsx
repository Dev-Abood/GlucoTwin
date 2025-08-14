"use client";

// Authentication
import { useAuth } from "@clerk/nextjs";

// UI Components
import { Button } from "@/components/ui/button";

// Icons
import { User, LogOut } from 'lucide-react';
import { useRouter, usePathname } from "next/navigation";
import NotificationPanel from "./notifications/notification-panel";

interface HeaderProps {
  userType: "patient" | "doctor";
}

export default function Header({ userType }: HeaderProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleProfileVisit = async () => {
    router.push(`/${userType}/profile`);
  };

  const isDoctorRoute =
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/doctor/messages") ||
    pathname.startsWith("/doctor/dashboard") ||
    pathname.startsWith("/doctor/patients") ||
    pathname.startsWith("/doctor/patient/");

  const portalLabel = isDoctorRoute
    ? "Healthcare Provider Portal"
    : "Patient Portal";

  return (
    <header className="sticky top-0 z-10 bg-background border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">GlucoTwin</span>
          <span className="text-sm text-muted-foreground">{portalLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* <CHANGE> Replaced the non-functional Bell button with the new NotificationPanel component */}
          <NotificationPanel />
          <Button variant="ghost" size="icon" aria-label="User profile" onClick={handleProfileVisit}>
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
