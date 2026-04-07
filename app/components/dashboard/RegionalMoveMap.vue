<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface MoveMapPoint {
  latitude: number
  longitude: number
  moveCount: number
}

const MAP_VIEW_PADDING = 14
const MAP_VIEW_MAX_ZOOM = 12.8

const REGIONAL_BOUNDS = {
  west: -76.9,
  east: -76.18,
  south: 37.06,
  north: 37.35,
} as const

const props = defineProps<{
  points: MoveMapPoint[]
}>()

const mapElement = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)

let map: any
let maplibreglModule: any

function pointDistance(a: MoveMapPoint, b: MoveMapPoint) {
  const deltaLongitude = a.longitude - b.longitude
  const deltaLatitude = a.latitude - b.latitude
  return Math.sqrt(deltaLongitude ** 2 + deltaLatitude ** 2)
}

function spreadNearbyPoints(points: MoveMapPoint[]) {
  const groups: MoveMapPoint[][] = []
  const proximityThreshold = 0.04

  for (const point of points) {
    const group = groups.find(existingGroup =>
      existingGroup.some(existingPoint => pointDistance(existingPoint, point) <= proximityThreshold),
    )

    if (group) {
      group.push(point)
      continue
    }

    groups.push([point])
  }

  return groups.flatMap((group) => {
    if (group.length === 1) {
      return group
    }

    const sortedGroup = group
      .slice()
      .sort((a, b) => b.moveCount - a.moveCount || a.latitude - b.latitude || a.longitude - b.longitude)

    const centerLatitude = sortedGroup.reduce((total, point) => total + point.latitude, 0) / sortedGroup.length
    const centerLongitude = sortedGroup.reduce((total, point) => total + point.longitude, 0) / sortedGroup.length
    const baseRadius = 0.0085

    return sortedGroup.map((point, index) => {
      const ring = Math.floor(index / 6)
      const ringSize = 6 * (ring + 1)
      const slot = index % ringSize
      const angle = (Math.PI * 2 * slot) / ringSize
      const radius = baseRadius * (ring + 1)

      return {
        ...point,
        longitude: centerLongitude + Math.cos(angle) * radius,
        latitude: centerLatitude + Math.sin(angle) * radius * 0.72,
      }
    })
  })
}

const visiblePoints = computed(() => {
  return props.points.filter(point =>
    point.longitude >= REGIONAL_BOUNDS.west
    && point.longitude <= REGIONAL_BOUNDS.east
    && point.latitude >= REGIONAL_BOUNDS.south
    && point.latitude <= REGIONAL_BOUNDS.north,
  )
})

const displayPoints = computed(() => spreadNearbyPoints(visiblePoints.value))

const geoJson = computed(() => ({
  type: 'FeatureCollection' as const,
  features: displayPoints.value.map(point => ({
    type: 'Feature' as const,
    properties: {
      moveCount: point.moveCount,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude] as [number, number],
    },
  })),
}))

function clampBounds(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getViewportBounds(points: MoveMapPoint[]) {
  if (!points.length) {
    return [
      [REGIONAL_BOUNDS.west, REGIONAL_BOUNDS.south],
      [REGIONAL_BOUNDS.east, REGIONAL_BOUNDS.north],
    ] as [[number, number], [number, number]]
  }

  const longitudes = points.map(point => point.longitude)
  const latitudes = points.map(point => point.latitude)

  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)

  const longitudeSpan = Math.max(maxLongitude - minLongitude, 0.08)
  const latitudeSpan = Math.max(maxLatitude - minLatitude, 0.06)

  const expandedWest = clampBounds(minLongitude - longitudeSpan * 0.32, REGIONAL_BOUNDS.west, REGIONAL_BOUNDS.east)
  const expandedEast = clampBounds(maxLongitude + longitudeSpan * 0.32, REGIONAL_BOUNDS.west, REGIONAL_BOUNDS.east)
  const expandedSouth = clampBounds(minLatitude - latitudeSpan * 0.32, REGIONAL_BOUNDS.south, REGIONAL_BOUNDS.north)
  const expandedNorth = clampBounds(maxLatitude + latitudeSpan * 0.32, REGIONAL_BOUNDS.south, REGIONAL_BOUNDS.north)

  return [
    [expandedWest, expandedSouth],
    [expandedEast, expandedNorth],
  ] as [[number, number], [number, number]]
}

async function initializeMap() {
  if (!import.meta.client || !mapElement.value || map) {
    return
  }

  maplibreglModule = await import('maplibre-gl')

  map = new maplibreglModule.Map({
    container: mapElement.value,
    style: {
      version: 8,
      sources: {
        cartoLightNoLabels: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        },
      },
      layers: [
        {
          id: 'carto-light-nolabels',
          type: 'raster',
          source: 'cartoLightNoLabels',
        },
      ],
    },
    center: [-76.5, 37.5],
    zoom: 10.7,
    attributionControl: false,
    dragPan: false,
    scrollZoom: false,
    boxZoom: false,
    dragRotate: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
    keyboard: false,
    interactive: false,
  })

  map.on('load', () => {
    map.addSource('destinations', {
      type: 'geojson',
      data: geoJson.value,
    })

    map.addLayer({
      id: 'destination-dots',
      type: 'circle',
      source: 'destinations',
      paint: {
        'circle-color': '#016fb9',
        'circle-opacity': 0.72,
        'circle-stroke-color': 'rgba(255,255,255,0.92)',
        'circle-stroke-width': 1,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'moveCount'], 1],
          1, 3,
          2, 4,
          4, 5.25,
          8, 6.5,
        ],
      },
    })

    mapReady.value = true
    updatePoints()
  })
}

function updatePoints() {
  if (!mapReady.value || !map) {
    return
  }

  const source = map.getSource('destinations')
  if (source) {
    source.setData(geoJson.value)
  }

  map.fitBounds(getViewportBounds(visiblePoints.value), {
    padding: MAP_VIEW_PADDING,
    maxZoom: MAP_VIEW_MAX_ZOOM,
    duration: 0,
  })
}

watch(() => visiblePoints.value.length, () => {
  updatePoints()
}, { flush: 'post' })

watch(() => props.points, () => {
  updatePoints()
}, { deep: true })

onMounted(async () => {
  await initializeMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = undefined
  }
})
</script>

<template>
  <div class="h-full min-h-[12rem] xl:min-h-0">
    <div class="relative h-full w-full overflow-hidden bg-white/80">
      <div
        ref="mapElement"
        class="h-full w-full"
        aria-label="Regional move destination map"
        role="img"
      />

      <div
        v-if="!visiblePoints.length"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/85 text-sm text-slate-500"
      >
        No regional destinations available yet.
      </div>

      <div class="pointer-events-none absolute bottom-2 left-2 text-[9px] uppercase tracking-[0.12em] text-slate-500/70">
        © OpenStreetMap © CARTO
      </div>
    </div>
  </div>
</template>
