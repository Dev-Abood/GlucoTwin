"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import { DEFAULT_THRESHOLDS, GlucoseThresholdValues } from "./glucose-monitoring"
import { saveGlucoseThresholds } from "./glucose-threshold"

interface ThresholdSettingsDialogProps {
  currentThresholds?: GlucoseThresholdValues
}

export function ThresholdSettingsDialog({ currentThresholds = DEFAULT_THRESHOLDS }: ThresholdSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [thresholds, setThresholds] = useState<GlucoseThresholdValues>(currentThresholds)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const result = await saveGlucoseThresholds(thresholds)
      if (result.success) {
        setOpen(false)
        // Optionally refresh the page or update parent component
        window.location.reload()
      } else {
        console.error("Failed to save thresholds:", result.error)
      }
    } catch (error) {
      console.error("Failed to save thresholds:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Glucose Thresholds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Glucose Thresholds</DialogTitle>
          <DialogDescription>
            Set custom thresholds for glucose monitoring alerts. Values are in mg/dL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Hyperglycemia Thresholds</h4>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hyperBefore" className="text-right text-xs">
                Before Meal
              </Label>
              <Input
                id="hyperBefore"
                type="number"
                value={thresholds.hyperglycemiaBeforeMeal}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hyperglycemiaBeforeMeal: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hyperAfter" className="text-right text-xs">
                After Meal
              </Label>
              <Input
                id="hyperAfter"
                type="number"
                value={thresholds.hyperglycemiaAfterMeal}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hyperglycemiaAfterMeal: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hyperMajor" className="text-right text-xs">
                Major Alert
              </Label>
              <Input
                id="hyperMajor"
                type="number"
                value={thresholds.hyperglycemiaMajor}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hyperglycemiaMajor: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Hypoglycemia Thresholds</h4>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hypo" className="text-right text-xs">
                Standard
              </Label>
              <Input
                id="hypo"
                type="number"
                value={thresholds.hypoglycemia}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hypoglycemia: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hypoMajor" className="text-right text-xs">
                Major Alert
              </Label>
              <Input
                id="hypoMajor"
                type="number"
                value={thresholds.hypoglycemiaMajor}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hypoglycemiaMajor: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Frequency Settings</h4>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequent" className="text-right text-xs">
                Frequent (7 days)
              </Label>
              <Input
                id="frequent"
                type="number"
                value={thresholds.frequentThreshold}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    frequentThreshold: Number.parseInt(e.target.value) || 0,
                  }))
                }
                className="col-span-3"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults} type="button">
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}