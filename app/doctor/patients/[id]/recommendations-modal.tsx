"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, Save, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createRecommendation, deleteRecommendation, getRecommendations, updateRecommendation } from "@/app/patient/dashboard/recommendation-actions"


interface Recommendation {
  id: string
  title: string
  description: string
  createdAt: Date
  updatedAt: Date
}

interface RecommendationsModalProps {
  isOpen: boolean
  onClose: () => void
  patientAssignmentId: string
  patientName: string
}

export function RecommendationsModal({ isOpen, onClose, patientAssignmentId, patientName }: RecommendationsModalProps) {
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })

  // Load recommendations when modal opens
  useEffect(() => {
    if (isOpen && patientAssignmentId) {
      loadRecommendations()
    }
  }, [isOpen, patientAssignmentId])

  const loadRecommendations = async () => {
    if (!patientAssignmentId) {
      console.error("No patient assignment ID provided")
      return
    }

    setIsLoading(true)
    try {
      console.log("Loading recommendations for:", patientAssignmentId)
      const data = await getRecommendations(patientAssignmentId)
      console.log("Loaded recommendations:", data)
      setRecommendations(data)
    } catch (error) {
      console.error("Failed to load recommendations:", error)
      toast({
        title: "Error",
        description: "Failed to load recommendations",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and description",
        variant: "destructive",
      })
      return
    }

    if (!patientAssignmentId) {
      toast({
        title: "Error",
        description: "Patient assignment ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      console.log("Creating recommendation...")
      const result = await createRecommendation({
        patientAssignmentId,
        title: formData.title.trim(),
        description: formData.description.trim(),
      })

      console.log("Create result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setFormData({ title: "", description: "" })
        setIsCreating(false)
        await loadRecommendations()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create recommendation",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to create recommendation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.title.trim() || !formData.description.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const result = await updateRecommendation({
        id: editingId,
        title: formData.title.trim(),
        description: formData.description.trim(),
      })

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setFormData({ title: "", description: "" })
        setEditingId(null)
        await loadRecommendations()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update recommendation",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to update recommendation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setIsLoading(true)
    try {
      const result = await deleteRecommendation(deleteId)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        await loadRecommendations()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete recommendation",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to delete recommendation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDeleteId(null)
    }
  }

  const startEdit = (recommendation: Recommendation) => {
    setFormData({
      title: recommendation.title,
      description: recommendation.description,
    })
    setEditingId(recommendation.id)
    setIsCreating(false)
  }

  const cancelEdit = () => {
    setFormData({ title: "", description: "" })
    setEditingId(null)
    setIsCreating(false)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" closeTop="top-2" closeRight="right-2">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="flex items-center justify-between">
              <span>Recommendations for {patientName}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(true)}
                disabled={isLoading || editingId !== null}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </DialogTitle>
            <DialogDescription>
              Manage personalized recommendations for this patient. These will be visible to the patient in their
              dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
              <div className="flex-shrink-0 mb-6">
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingId ? "Edit Recommendation" : "Create New Recommendation"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Diet Suggestions, Activity Recommendations"
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/100 characters</p>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Provide detailed recommendations for the patient..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/1000 characters</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={editingId ? handleUpdate : handleCreate}
                        disabled={isLoading || !formData.title.trim() || !formData.description.trim()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : editingId ? "Update" : "Create"}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} disabled={isLoading}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Existing Recommendations - Scrollable */}
            <div className="flex flex-col flex-1 min-h-0">
              <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
                Existing Recommendations ({recommendations.length})
              </h3>

              <div className="flex-1 overflow-y-auto pr-2">
                {isLoading && recommendations.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                  </div>
                ) : recommendations.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recommendations created yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Add New" to create your first recommendation for this patient.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 pb-4">
                    {recommendations.map((recommendation) => (
                      <Card key={recommendation.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{recommendation.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Created: {formatDate(recommendation.createdAt)}
                                {recommendation.updatedAt !== recommendation.createdAt && (
                                  <span className="ml-2">• Updated: {formatDate(recommendation.updatedAt)}</span>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(recommendation)}
                                disabled={isLoading || editingId !== null || isCreating}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(recommendation.id)}
                                disabled={isLoading}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recommendation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recommendation? This action cannot be undone and the recommendation
              will be removed from the patient's view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}