"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LocationMapProps {
  initialLatitude?: number | null
  initialLongitude?: number | null
  initialAddress?: string | null
  onLocationChange: (latitude: number | null, longitude: number | null, address: string | null) => void
  isEditing: boolean
}

interface MapPosition {
  lat: number
  lng: number
}

export default function LocationMap({
  initialLatitude,
  initialLongitude,
  initialAddress,
  onLocationChange,
  isEditing,
}: LocationMapProps) {
  const [selectedPosition, setSelectedPosition] = useState<MapPosition | null>(
    initialLatitude && initialLongitude ? { lat: initialLatitude, lng: initialLongitude } : null,
  )
  const [address, setAddress] = useState<string | null>(initialAddress || null)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    if (!isEditing || !mapRef.current || isMapLoaded) return

    const initializeMap = async () => {
      if (!mapRef.current) return

      // Dynamically import Leaflet to avoid SSR issues
      const L = (await import("leaflet")).default

      // Import Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Fix default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      // Initialize map - now TypeScript knows mapRef.current is not null
      const map = L.map(mapRef.current).setView([40.7128, -74.006], 10)

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      // Set initial position if available
      if (selectedPosition) {
        map.setView([selectedPosition.lat, selectedPosition.lng], 13)
        markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng]).addTo(map)
      }

      // Handle map clicks
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng

        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current)
        }

        // Add new marker
        markerRef.current = L.marker([lat, lng]).addTo(map)

        // Update state
        const newPos = { lat, lng }
        setSelectedPosition(newPos)
        reverseGeocode(lat, lng)
        onLocationChange(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      })

      mapInstanceRef.current = map
      setIsMapLoaded(true)
    }

    initializeMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setIsMapLoaded(false)
      }
    }
  }, [isEditing, selectedPosition])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      )
      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
        onLocationChange(lat, lng, data.display_name)
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error)
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    }
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setSelectedPosition(newPos)

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newPos.lat, newPos.lng], 15)

          if (markerRef.current) {
            mapInstanceRef.current.removeLayer(markerRef.current)
          }

          const L = (await import("leaflet")).default
          markerRef.current = L.marker([newPos.lat, newPos.lng]).addTo(mapInstanceRef.current)
        }

        reverseGeocode(newPos.lat, newPos.lng)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        alert("Unable to get your current location. Please click on the map or enter coordinates manually.")
        setIsLoading(false)
      },
    )
  }

  // Clear location
  const clearLocation = () => {
    setSelectedPosition(null)
    setAddress(null)
    onLocationChange(null, null, null)

    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
  }

  // Handle manual coordinate input
  const handleCoordinateChange = async (lat: string, lng: string) => {
    const latitude = Number.parseFloat(lat)
    const longitude = Number.parseFloat(lng)

    if (!isNaN(latitude) && !isNaN(longitude)) {
      const newPos = { lat: latitude, lng: longitude }
      setSelectedPosition(newPos)

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 13)

        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current)
        }

        const L = (await import("leaflet")).default
        markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
      }

      reverseGeocode(latitude, longitude)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Location Information
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Click on the map to set your location, use GPS, or enter coordinates manually"
            : "Your registered location"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedPosition && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Current Location</span>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <MapPin className="h-3 w-3 mr-1" />
                Set
              </Badge>
            </div>
            {address && <p className="text-sm text-muted-foreground">{address}</p>}
            <p className="text-xs text-muted-foreground">
              Coordinates: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
            </p>
          </div>
        )}

        {!selectedPosition && !isEditing && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No location set</p>
          </div>
        )}

        {isEditing && (
          <>
            <div className="space-y-4">
              <div
                ref={mapRef}
                className="w-full h-64 rounded-lg border border-gray-200"
                style={{ minHeight: "256px" }}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 40.7128"
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    value={selectedPosition?.lat || ""}
                    onChange={(e) => handleCoordinateChange(e.target.value, selectedPosition?.lng.toString() || "")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., -74.0060"
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    value={selectedPosition?.lng || ""}
                    onChange={(e) => handleCoordinateChange(selectedPosition?.lat.toString() || "", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} disabled={isLoading}>
                  <MapPin className="h-4 w-4 mr-2" />
                  {isLoading ? "Getting Location..." : "Use Current Location"}
                </Button>

                {selectedPosition && (
                  <Button type="button" variant="outline" size="sm" onClick={clearLocation}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Location
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Click anywhere on the map to set your location, enter coordinates manually, or use the "Use Current
                Location" button to automatically detect your GPS position.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
