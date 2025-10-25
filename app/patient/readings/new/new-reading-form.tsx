"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import calculateReadingStatus, {
  createGlucoseReading,
  getTodayReadingTypes,
} from "../../actions";
import ClientSideDateTime from "../../_components/client-side-date-time";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  readingType: z.enum([
    "BEFORE_BREAKFAST",
    "AFTER_BREAKFAST",
    "BEFORE_LUNCH",
    "AFTER_LUNCH",
    "BEFORE_DINNER",
    "AFTER_DINNER",
  ]),
  glucoseLevel: z
    .string()
    .refine(
      (val) => /^\d{1,3}(\.\d{1,2})?$/.test(val),
      {
        message:
          "Enter a valid number with up to 2 decimal places (e.g., 95.75)",
      }
    )
    .transform((val) => parseFloat(parseFloat(val).toFixed(2))),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type ReadingType = FormValues["readingType"];

export default function NewReadingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReadings, setIsLoadingReadings] = useState(true);
  const [existingReadings, setExistingReadings] = useState<Set<ReadingType>>(
    new Set()
  );

  const typeOptions = [
    {
      id: "before-breakfast",
      label: "Before Breakfast",
      value: "BEFORE_BREAKFAST" as ReadingType,
    },
    {
      id: "after-breakfast",
      label: "After Breakfast",
      value: "AFTER_BREAKFAST" as ReadingType,
    },
    {
      id: "before-lunch",
      label: "Before Lunch",
      value: "BEFORE_LUNCH" as ReadingType,
    },
    {
      id: "after-lunch",
      label: "After Lunch",
      value: "AFTER_LUNCH" as ReadingType,
    },
    {
      id: "before-dinner",
      label: "Before Dinner",
      value: "BEFORE_DINNER" as ReadingType,
    },
    {
      id: "after-dinner",
      label: "After Dinner",
      value: "AFTER_DINNER" as ReadingType,
    },
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      readingType: "BEFORE_BREAKFAST",
      glucoseLevel: 0,
      notes: "",
    },
  });

  // Fetch today's readings on component mount
  useEffect(() => {
    const fetchTodayReadings = async () => {
      try {
        setIsLoadingReadings(true);

        // Get today's date in Dubai timezone (YYYY-MM-DD format)
        const dubaiTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dubai",
        });
        const dubaiDate = new Date(dubaiTime);
        const todayDate =
          dubaiDate.getFullYear() +
          "-" +
          String(dubaiDate.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(dubaiDate.getDate()).padStart(2, "0");

        // Call server action to fetch today's reading types
        const result = await getTodayReadingTypes(todayDate);

        if (!result.success || !result.readings) {
          throw new Error(result.error || "Failed to fetch readings");
        }

        // Create a set of reading types that already exist
        const existingTypes = new Set<ReadingType>(result.readings);

        setExistingReadings(existingTypes);

        // Set default value to first available reading type
        const firstAvailable = typeOptions.find(
          (opt) => !existingTypes.has(opt.value)
        );
        if (firstAvailable) {
          form.setValue("readingType", firstAvailable.value);
        }
      } catch (error) {
        console.error("Error fetching today's readings:", error);
        toast({
          title: "Warning",
          description: "Could not load existing readings",
          variant: "destructive",
        });
      } finally {
        setIsLoadingReadings(false);
      }
    };

    fetchTodayReadings();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      // Check if this reading type already exists
      if (existingReadings.has(values.readingType)) {
        toast({
          title: "Reading Already Exists",
          description: "You have already recorded this reading type today.",
          variant: "destructive",
        });
        return;
      }

      const dubaiTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dubai",
      });
      const dubaiDate = new Date(dubaiTime);

      const formattedDate =
        dubaiDate.getFullYear() +
        "-" +
        String(dubaiDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dubaiDate.getDate()).padStart(2, "0");

      const formattedTime =
        String(dubaiDate.getHours()).padStart(2, "0") +
        ":" +
        String(dubaiDate.getMinutes()).padStart(2, "0");

      const status = calculateReadingStatus(
        Number(values.glucoseLevel),
        values.readingType
      );
      const newReading = {
        date: formattedDate,
        time: formattedTime,
        type: values.readingType,
        level: values.glucoseLevel,
        status,
        notes: values.notes || "",
      };

      const result = await createGlucoseReading(newReading);

      if (result.success) {
        toast({
          title: "Success",
          description: "Reading saved successfully",
        });

        router.push("/patient/readings");
      } else {
        throw new Error(result.error || "Failed to save reading");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save reading",
        variant: "destructive",
      });
      console.error("Error saving reading:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if all readings for today are complete
  const allReadingsComplete = existingReadings.size === 6;

  return (
    <div className="container max-w-md py-10">
      <div className="mb-6">
        <Link
          href="/patient/readings"
          className="inline-flex items-center text-sm font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Readings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record New Glucose Reading</CardTitle>
          <CardDescription>
            {allReadingsComplete
              ? "All readings for today have been recorded"
              : "Enter your latest glucose measurement"}
          </CardDescription>
        </CardHeader>

        {isLoadingReadings ? (
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        ) : allReadingsComplete ? (
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Great job!</p>
              <p className="text-sm text-muted-foreground mt-2">
                You've completed all 6 glucose readings for today.
              </p>
            </div>
          </CardContent>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="readingType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>When did you take this reading?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid gap-2"
                        >
                          {typeOptions.map((option) => {
                            const isRecorded = existingReadings.has(
                              option.value
                            );
                            return (
                              <Label
                                key={option.id}
                                htmlFor={option.id}
                                className={`flex cursor-pointer items-center justify-between rounded-md border p-4 transition-colors ${
                                  isRecorded
                                    ? "bg-muted/50 opacity-50 cursor-not-allowed"
                                    : "[&:has(:checked)]:bg-primary/10 hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  {isRecorded && (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  )}
                                  <div className="space-y-1">
                                    <p className={isRecorded ? "line-through" : ""}>
                                      {option.label}
                                    </p>
                                    {isRecorded && (
                                      <p className="text-xs text-muted-foreground">
                                        Already recorded today
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <RadioGroupItem
                                  id={option.id}
                                  value={option.value}
                                  disabled={isRecorded}
                                />
                              </Label>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="glucoseLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Glucose Level (mg/dL)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your reading (e.g., 95.75)"
                          type="text"
                          inputMode="decimal"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (
                              /^\d{0,3}(\.\d{0,2})?$/.test(value) ||
                              value === ""
                            ) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enter a number with up to 2 decimal places
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Date and Time</Label>
                  <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/20">
                    The current date and time (<ClientSideDateTime />) will be
                    automatically recorded.
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this reading (e.g., what you ate, activity level, how you're feeling)"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Reading"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </Card>
    </div>
  );
}