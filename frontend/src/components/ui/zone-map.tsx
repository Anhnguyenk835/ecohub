"use client"

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ZoneMapProps {
  zoneName: string
  location?: string
}

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function ZoneMap({ zoneName, location }: ZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Fixed coordinates for demonstration (you can replace with actual coordinates from API)
    const defaultLat = 10.8231  // Ho Chi Minh City coordinates
    const defaultLng = 106.6297
    
    // Create map instance
    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13)
    mapInstanceRef.current = map

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add marker for the zone
    const marker = L.marker([defaultLat, defaultLng]).addTo(map)
    
    // Add popup with zone information
    const popupContent = `
      <div class="text-center">
        <h3 class="font-semibold text-gray-900 mb-1">${zoneName}</h3>
        ${location ? `<p class="text-sm text-gray-600">${location}</p>` : ''}
      </div>
    `
    marker.bindPopup(popupContent)

    // Add a circle to represent the zone area
    const zoneCircle = L.circle([defaultLat, defaultLng], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.2,
      radius: 500 // 500 meters radius
    }).addTo(map)

    // Add zone area label
    L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'zone-area-label'
    })
    .setContent(`${zoneName} Zone`)
    .setLatLng([defaultLat, defaultLng])
    .addTo(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [zoneName, location])

  return (
    <div className="w-full flex-1 min-h-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
