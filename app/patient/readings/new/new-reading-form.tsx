// TODO:: Check this file correctly later
"use client";

import { useState } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createGlucoseReading } from "../../actions";
import ClientSideDateTime from "../../_components/client-side-date-time";
import { useRouter } from "next/navigation";

/**
 * Schema for the glucose reading form
 * Validates that:
 * - Reading type is selected from predefined options
 * - Glucose level is a number with up to 2 decimal places
 * - Notes are optional
 */
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
      // Ensures value is a valid number with max 2 decimal places
      (val) => /^\d{1,3}(\.\d{1,2})?$/.test(val),
      {
        message:
          "Enter a valid number with up to 2 decimal places (e.g., 95.75)",
      }
    )
    .transform((val) => parseFloat(parseFloat(val).toFixed(2))), // Convert to number with 2 decimal places
  notes: z.string().optional(),
});

// Type for form values derived from the schema
type FormValues = z.infer<typeof formSchema>;

/**
 * NewReadingForm Component
 * A form for patients to record new glucose readings
 */
export default function NewReadingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type options for glucose readings
  const typeOptions = [
    {
      id: "before-breakfast",
      label: "Before Breakfast",
      value: "BEFORE_BREAKFAST",
    },
    {
      id: "after-breakfast",
      label: "After Breakfast",
      value: "AFTER_BREAKFAST",
    },
    { id: "before-lunch", label: "Before Lunch", value: "BEFORE_LUNCH" },
    { id: "after-lunch", label: "After Lunch", value: "AFTER_LUNCH" },
    { id: "before-dinner", label: "Before Dinner", value: "BEFORE_DINNER" },
    { id: "after-dinner", label: "After Dinner", value: "AFTER_DINNER" },
  ];

  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      readingType: "BEFORE_BREAKFAST",
      glucoseLevel: 0,
      notes: "",
    },
  });

  /**
   * Form submission handler
   * Validates inputs and sends data to the server
   */
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      // Get current date and time in Dubai timezone
      const dubaiTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dubai",
      });
      const dubaiDate = new Date(dubaiTime);

      // Format date as YYYY-MM-DD
      const formattedDate =
        dubaiDate.getFullYear() +
        "-" +
        String(dubaiDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dubaiDate.getDate()).padStart(2, "0");

      // Format time as HH:MM
      const formattedTime =
        String(dubaiDate.getHours()).padStart(2, "0") +
        ":" +
        String(dubaiDate.getMinutes()).padStart(2, "0");

      // Prepare reading data with patient ID
      const newReading = {
        date: formattedDate,
        time: formattedTime,
        type: values.readingType,
        level: values.glucoseLevel,
        notes: values.notes || "",
      };

      // Submit to server action
      const result = await createGlucoseReading(newReading);

      if (result.success) {
        toast({
          title: "Success",
          description: "Reading saved successfully",
        });

        // Redirect to readings page
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

  return (
    <div className="container max-w-md py-10">
      {/* Back navigation link */}
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
            Enter your latest glucose measurement
          </CardDescription>
        </CardHeader>

        {/* Form with Zod validation */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Reading Type Selection */}
              <FormField
                control={form.control}
                name="readingType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>When did you take this reading?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid gap-2"
                      >
                        {typeOptions.map((option) => (
                          <Label
                            key={option.id}
                            htmlFor={option.id}
                            className="flex cursor-pointer items-center justify-between rounded-md border p-4 [&:has(:checked)]:bg-primary/10"
                          >
                            <div className="space-y-1">
                              <p>{option.label}</p>
                            </div>
                            <RadioGroupItem
                              id={option.id}
                              value={option.value}
                            />
                          </Label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Glucose Level Input */}
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
                          // Allow only numbers and up to 2 decimal places
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

              {/* Date and Time Information */}
              <div className="space-y-2">
                <Label>Date and Time</Label>
                <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/20">
                  The current date and time (<ClientSideDateTime />) will be
                  automatically recorded.
                </div>
              </div>

              {/* Notes Textarea */}
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

            {/* Submit Button */}
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
      </Card>
    </div>
  );
}
