"use client";

// React & Next.js 
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// UI Components 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Icons 
import { Pencil, Search, Trash2 } from "lucide-react";

// Types 
import { GlucoseReading } from "@/lib/types";
import { ReadingType } from "@/prisma/types/schema";

// Utils & Hooks 
import { useToast } from "@/hooks/use-toast";
import { formatReadingType } from "../utils/patient-utils";
import { deleteReading } from "../actions";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

/**
 * Interface for PatientReadingsTable component props
 * @interface PatientReadingsTableProps
 * @property {GlucoseReading[]} patientReadings - Array of glucose readings to display and manage
 */
interface PatientReadingsTableProps {
  patientReadings: GlucoseReading[];
}

/**
 * Defines possible filter values for readings status
 */
type StatusFilter = "all" | "NORMAL" | "ELEVATED" | "HIGH";

/**
 * PatientReadingsTable Component
 *
 * Displays a comprehensive table of glucose readings with advanced filtering, search functionality,
 * and management capabilities (edit/delete). Supports filtering by reading type and status level.
 *
 * Features:
 * - Real-time search across all reading fields
 * - Type and status filtering
 * - Responsive design
 * - Loading states
 * - Confirmation dialogs for destructive actions
 *
 * @component
 * @param {PatientReadingsTableProps} props - Component props
 * @param {GlucoseReading[]} props.patientReadings - Array of glucose readings to display
 * @returns {React.JSX.Element} The rendered patient readings table component
 */
export default function PatientReadingsTable({
  patientReadings,
}: PatientReadingsTableProps): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Initialize component state when patient readings are loaded
   */
  useEffect(() => {
    if (patientReadings) {
      setIsLoading(false);
    }
  }, [patientReadings]);

  /**
   * Formats a Date object to YYYY-MM-DD string format for display and searching
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string in YYYY-MM-DD format
   */
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  /**
   * Navigates to the edit page for a specific reading
   * @param {string} id - The ID of the reading to edit
   */
  const handleEdit = (id: string) => {
    router.push(`/patient/readings/edit/${id}`);
  };

  /**
   * Handles the deletion of a glucose reading with confirmation and error handling
   * @param {string} id - The ID of the reading to delete
   * @returns {Promise<void>}
   */
  const handleDelete = async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      const result = await deleteReading(id);

      if (result.success) {
        toast({
          title: "Reading deleted",
          description: "The glucose reading has been successfully deleted.",
        });
        // Refresh the page to reflect changes
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete reading",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting reading:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the reading.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Generates a styled badge component based on reading status
   * @param {number} level - The glucose level in mg/dL
   * @param {string} type - The type of reading
   * @returns {React.JSX.Element} A Badge component with appropriate styling
   */
  const getStatusBadge = (status: string): React.JSX.Element => {
    switch (
      status 
    ) {
      case "NORMAL":
        return <Badge variant="outline">Normal</Badge>;
      case "ELEVATED":
        return <Badge variant="secondary">Elevated</Badge>;
      case "HIGH":
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  /**
   * Memoized filtered readings based on current search term and filters
   * @type {GlucoseReading[]}
   */
  /**
   * Memoized filtered readings based on current search term and filters
   * @type {GlucoseReading[]}
   */
  const filteredReadings: GlucoseReading[] = useMemo(() => {
    return patientReadings.filter((reading) => {
      // Prepare data for filtering
      const formattedDate = formatDate(reading.date);
      const displayType = formatReadingType(reading.type as ReadingType);
      const status = reading.status;

      // Convert status to display format for searching
      const displayStatus = status.toLowerCase();

      // Search term matching (case-insensitive)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        displayType.toLowerCase().includes(searchLower) ||
        reading.level.toString().includes(searchTerm) ||
        formattedDate.includes(searchTerm) ||
        reading.time.toLowerCase().includes(searchLower) ||
        displayStatus.includes(searchLower) || // Add this line for status search
        (reading.notes && reading.notes.toLowerCase().includes(searchLower));

      // Filter matching
      const matchesType = filterType === "all" || reading.type === filterType;
      const matchesStatus = filterStatus === "all" || status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [patientReadings, searchTerm, filterType, filterStatus]);

  /**
   * Memoized list of reading type options for the type filter dropdown
   * @type {Array<{value: string, label: string}>}
   */
  const typeOptions: Array<{ value: string; label: string }> = useMemo(() => {
    const types = Object.values(ReadingType);
    return types.map((type) => ({
      value: type,
      label: formatReadingType(type),
    }));
  }, []);
  return (
    <div className="flex min-h-screen flex-col">
      {/* Application Header */}
      <Header userType="patient" />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar userType="patient" />

        {/* Primary Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {/* Page Header and Action Button */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Glucose Readings</h1>
              <Link href="/patient/readings/new">
                <Button>Record New Reading</Button>
              </Link>
            </div>

            {/* Readings Table Card */}
            <Card>
              <CardHeader>
                <CardTitle className="mb-3">All Readings</CardTitle>

                {/* Search and Filter Controls */}
                <div className="flex flex-col gap-4 mt-4 sm:flex-row">
                  {/* Search Input with Icon */}
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by date (YYYY-MM-DD), time, type, level..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Type Filter Dropdown */}
                  <div className="w-full sm:w-[200px]">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="w-full sm:w-[200px]">
                    <Select
                      value={filterStatus}
                      onValueChange={(value) =>
                        setFilterStatus(value as StatusFilter)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="ELEVATED">Elevated</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Table Content */}
              <CardContent>
                {isLoading ? (
                  // Loading State
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                  </div>
                ) : (
                  // Table Container
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Level (mg/dL)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReadings.length === 0 ? (
                          // Empty State
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-4 text-muted-foreground"
                            >
                              No readings match your search criteria
                            </TableCell>
                          </TableRow>
                        ) : (
                          // Readings Rows
                          filteredReadings.map((reading: GlucoseReading) => (
                            <TableRow key={reading.id}>
                              <TableCell>{formatDate(reading.date)}</TableCell>
                              <TableCell>{reading.time}</TableCell>
                              <TableCell>
                                {formatReadingType(reading.type as ReadingType)}
                              </TableCell>
                              <TableCell>{reading.level}</TableCell>
                              <TableCell>
                                {getStatusBadge(reading.status)}
                              </TableCell>
                              <TableCell>
                                {reading.notes ? (
                                  // Tooltip for truncated notes
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help truncate block max-w-[150px]">
                                          {reading.notes}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">
                                          {reading.notes}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    No notes
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2">
                                  {/* Edit Button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(reading.id)}
                                    disabled={isDeleting}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>

                                  {/* Delete Button with Confirmation Dialog */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isDeleting}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Reading
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this
                                          reading? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel
                                          disabled={isDeleting}
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDelete(reading.id)
                                          }
                                          disabled={isDeleting}
                                        >
                                          {isDeleting
                                            ? "Deleting..."
                                            : "Delete"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
