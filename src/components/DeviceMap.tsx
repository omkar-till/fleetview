import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  sub?: string
  stale?: boolean
}

/**
 * Thin Leaflet wrapper — custom div markers in the Oolio Fleet palette,
 * OpenStreetMap tiles (free, attribution required).
 */
export function DeviceMap({
  markers,
  trail,
  height = 420,
}: {
  markers: MapMarker[]
  trail?: [number, number][]
  height?: number | string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const fittedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (trail && trail.length > 1) {
      L.polyline(trail, { color: '#3E82F0', weight: 3, opacity: 0.55, dashArray: '2 6' }).addTo(layer)
    }

    for (const m of markers) {
      const icon = L.divIcon({
        className: '',
        html: `<div class="fv-marker ${m.stale ? 'stale' : ''}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      L.marker([m.lat, m.lng], { icon })
        .bindPopup(
          `<strong>${escapeHtml(m.label)}</strong>${m.sub ? `<br/><span style="color:#808080">${escapeHtml(m.sub)}</span>` : ''}`,
        )
        .addTo(layer)
    }

    if (markers.length && !fittedRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.3), { maxZoom: 15 })
      fittedRef.current = true
    }
  }, [markers, trail])

  return <div ref={containerRef} className="map-box" style={{ height }} />
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
