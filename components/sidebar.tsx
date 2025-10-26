//TODO: design a neat collapsible sidebar with collapsible groupings

"use client" // Client components

import type React from "react"

import Link from "next/link"
import { useState } from "react"

// UI Components
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Icons
import { Home, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Activity, Users, Calendar } from "lucide-react"

interface SidebarProps {
  userType: "patient" | "doctor"
}

export default function Sidebar({ userType }: SidebarProps){
  //* collapse state tracker, set default to true if you want it to be automatically collapsed
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // decided if groupings are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    navigation: true,
    appointments: true,
    communication: true,
  })

  // toggle for when click on grouping chevron
  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({
      ...prev, // extended to the previous groups
      [groupTitle.toLowerCase()]: !prev[groupTitle.toLowerCase()],
      // adding the group title to be the new one without the already expanded groups
    }))
  }


  // Defining the type of the navigation items to be displayed in the sidebar
  const NavItem = ({ href, label, icon: Icon, isCollapsed }: { 
    href: string; // to where it navigates you
    label: string; // text label of the item
    icon: React.ComponentType<{ className?: string }>; // its icon 
    isCollapsed: boolean // tracking if collapsed
  }) => {
    const content = (
      // fixed structure of content on these added nav items

      // button of item
      <Button
        variant="ghost"
        className={`w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground ${
          isCollapsed ? "justify-center px-2" : "justify-start"
        }`}
        asChild
      >
      {/* link to set in item and collapsing track */}
        <Link href={href}>
          <Icon className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"}`} />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </Link>
      </Button>
    )

    if(isCollapsed){ // Simple return for the content display in case of collapse 
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  }

  return (
    <aside
      className={`
      relative border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 
      transition-all duration-300 ease-in-out
      ${isCollapsed ? "w-16" : "w-68"}
      hidden md:flex md:flex-col
    `}
    >
      <div className="flex h-14 items-center border-b px-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="truncate">{userType === "patient" ? "Patient Portal" : "Healthcare Provider Portal"}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`h-8 w-8 p-0 ${isCollapsed ? "mx-auto" : "ml-auto"}`}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-4">
          {/* Navigation Group */}
          <div className="space-y-2">
            {!isCollapsed && (
              <Button
                variant="ghost"
                onClick={() => toggleGroup("Navigation")}
                className="h-8 w-full justify-between px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="uppercase tracking-wider">Navigation</span>
                {expandedGroups.navigation ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}

            {(isCollapsed || expandedGroups.navigation) && (
              <div className="space-y-1">
                <NavItem 
                  href={`/${userType}/dashboard`}
                  label="Dashboard"
                  icon={Home}
                  isCollapsed={isCollapsed}
                />
                {userType === "patient" ? (
                  <NavItem 
                    href={`/${userType}/readings`}
                    label="My Readings"
                    icon={Activity}
                    isCollapsed={isCollapsed}
                  />
                ) : (
                  <NavItem 
                    href={`/${userType}/patients`}
                    label="Patients"
                    icon={Users}
                    isCollapsed={isCollapsed}
                  />
                )}
              </div>
            )}

            {!isCollapsed && <Separator className="my-2" />}
          </div>

          {/* Appointments Group */}
          <div className="space-y-2">
            {!isCollapsed && (
              <Button
                variant="ghost"
                onClick={() => toggleGroup("Appointments")}
                className="h-8 w-full justify-between px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="uppercase tracking-wider">Appointments</span>
                {expandedGroups.appointments ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}

            {(isCollapsed || expandedGroups.appointments) && (
              <div className="space-y-1">
                <NavItem 
                  href={`/${userType}/appointments`}
                  label={userType === "patient" ? "My Appointments" : "Appointments"}
                  icon={Calendar}
                  isCollapsed={isCollapsed}
                />
              </div>
            )}

            {!isCollapsed && <Separator className="my-2" />}
          </div>

          {/* Communication Group */}
          <div className="space-y-2">
            {!isCollapsed && (
              <Button
                variant="ghost"
                onClick={() => toggleGroup("Communication")}
                className="h-8 w-full justify-between px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="uppercase tracking-wider">Communication</span>
                {expandedGroups.communication ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}

            {(isCollapsed || expandedGroups.communication) && (
              <div className="space-y-1">
                <NavItem 
                  href={`/${userType}/messages`}
                  label="Messages"
                  icon={MessageSquare}
                  isCollapsed={isCollapsed}
                />
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="border-t p-3">
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isCollapsed ? "justify-center" : ""}`}>
          <div className={"h-2 w-2 rounded-full bg-green-500 "} />
          {!isCollapsed && <span className="capitalize font-medium">{userType} Logged in</span>}
        </div>
      </div>
    </aside>
  )
}