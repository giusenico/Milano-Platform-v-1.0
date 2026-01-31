import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { Home } from 'lucide-react'
import { quartieriData, priceLegend, getPriceCategory } from '../data/quartieriData'
import { generateQuartieriGeoJSON, generateQuartieriPointsGeoJSON, formatPrice, formatVariation } from '../data/quartieriGeoJSON'
import { getMapMetricConfig } from '../data/mapMetrics'
import { nilPolygons } from '../data/nilPolygons'

/**
 * MapComponent - Interactive 3D Map of Milan with Neighborhood Price Visualization
 * 
 * Features:
 * - Centered on Milan, Italy (45.4642, 9.1900)
 * - High zoom levels with 3D building footprints
 * - 3D perspective with pitch and bearing
 * - Interactive neighborhood selection with price-based coloring
 * - Popup information on hover/click
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN || ''

// Milan coordinates
const MILAN_CENTER = {
  lng: 9.14,
  lat: 45.445
}

// Initial map configuration for 3D view
const INITIAL_VIEW = {
  center: [MILAN_CENTER.lng, MILAN_CENTER.lat],
  zoom: 11.3,
  pitch: 45,
  bearing: -17.6,
  minZoom: 9.5,
  maxZoom: 22
}

const MapComponent = ({
  quartieri = quartieriData,
  visibilityToggles,
  onFeatureSelect,
  selectedQuartiere,
  onQuartiereSelect,
  compareList = [],
  isCompareMode,
  timelinePrices = null,
  mapMetricConfig,
  mapLegend = priceLegend,
  mapLegendTitle = 'Prezzi al mq'
}) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const popup = useRef(null)
  const hoveredQuartiereRef = useRef(null)
  const mapMetricConfigRef = useRef(mapMetricConfig)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [mapError, setMapError] = useState(null)

  useEffect(() => {
    mapMetricConfigRef.current = mapMetricConfig
  }, [mapMetricConfig])

  // Reset map to default view
  const resetToDefaultView = useCallback(() => {
    if (map.current) {
      map.current.flyTo({
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        pitch: INITIAL_VIEW.pitch,
        bearing: INITIAL_VIEW.bearing,
        duration: 1500
      })
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (map.current) return

    if (!mapboxgl.accessToken) {
      setMapError('Missing Mapbox token. Set VITE_MAPBOX_TOKEN in your .env file.')
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      ...INITIAL_VIEW,
      antialias: true
    })

    // Create popup instance
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'quartiere-popup'
    })

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true
      }),
      'bottom-right'
    )

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }),
      'bottom-right'
    )

    map.current.on('load', () => {
      setMapLoaded(true)

      // Get label layer for proper ordering
      const layers = map.current.getStyle().layers
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
      )?.id

      // Add 3D buildings layer
      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#1a1a2e',
              50, '#16213e',
              100, '#1b3a5f',
              200, '#2563eb'
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0,
              12.5, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0,
              12.5, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.7
          }
        },
        labelLayerId
      )

      // Add neighborhoods GeoJSON source
      map.current.addSource('quartieri', {
        type: 'geojson',
        data: generateQuartieriGeoJSON(quartieri),
        promoteId: 'id'
      })

      // Add neighborhoods points source
      map.current.addSource('quartieri-points', {
        type: 'geojson',
        data: generateQuartieriPointsGeoJSON(quartieri)
      })

      // Add neighborhood fill layer (colored by price)
      map.current.addLayer({
        id: 'quartieri-fill',
        type: 'fill',
        source: 'quartieri',
        paint: {
          'fill-color': ['get', 'mapColor'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.85,
            ['boolean', ['feature-state', 'compared'], false],
            0.75,
            ['boolean', ['feature-state', 'hover'], false],
            0.7,
            0.5
          ]
        }
      }, '3d-buildings')

      // Add neighborhood outline layer
      map.current.addLayer({
        id: 'quartieri-outline',
        type: 'line',
        source: 'quartieri',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            ['boolean', ['feature-state', 'compared'], false],
            '#60a5fa',
            ['boolean', ['feature-state', 'hover'], false],
            '#ffffff',
            ['get', 'mapColor']
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            4,
            ['boolean', ['feature-state', 'compared'], false],
            3,
            ['boolean', ['feature-state', 'hover'], false],
            2,
            1
          ],
          'line-opacity': 0.9
        }
      })

      // Add animated highlight layer for selected NIL (marker/pen effect)
      map.current.addLayer({
        id: 'quartieri-highlight',
        type: 'line',
        source: 'quartieri',
        paint: {
          'line-color': '#fbbf24',  // Amber/gold color like a highlighter
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            6,
            0
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.9,
            0
          ],
          'line-blur': 2,
          'line-dasharray': [2, 1]
        }
      })

      // Add second highlight layer for glow effect
      map.current.addLayer({
        id: 'quartieri-highlight-glow',
        type: 'line',
        source: 'quartieri',
        paint: {
          'line-color': '#fbbf24',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            12,
            0
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.3,
            0
          ],
          'line-blur': 8
        }
      })

      // Add neighborhood labels
      map.current.addLayer({
        id: 'quartieri-labels',
        type: 'symbol',
        source: 'quartieri-points',
        layout: {
          'text-field': ['get', 'shortName'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 8,
            12, 10,
            14, 12,
            16, 14
          ],
          'text-anchor': 'center',
          'text-offset': [0, 0],
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.8)',
          'text-halo-width': 1.5,
          'text-halo-blur': 0.5
        },
        minzoom: 11
      })

      // Add price badge layer
      map.current.addLayer({
        id: 'quartieri-price',
        type: 'symbol',
        source: 'quartieri-points',
        layout: {
          'text-field': ['get', 'mapMetricLabel'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 9,
          'text-anchor': 'top',
          'text-offset': [0, 0.8],
          'text-allow-overlap': false
        },
        paint: {
          'text-color': ['get', 'mapColor'],
          'text-halo-color': 'rgba(0, 0, 0, 0.9)',
          'text-halo-width': 1
        },
        minzoom: 13
      })

      // Set ambient light
      map.current.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.4
      })

      // Mouse events for neighborhoods
      map.current.on('mousemove', 'quartieri-fill', (e) => {
        if (e.features.length > 0) {
          map.current.getCanvas().style.cursor = 'pointer'

          const feature = e.features[0]
          const props = feature.properties
          const featureId = props.id

          // Update hover state
          if (hoveredQuartiereRef.current !== null && hoveredQuartiereRef.current !== featureId) {
            map.current.setFeatureState(
              { source: 'quartieri', id: hoveredQuartiereRef.current },
              { hover: false }
            )
          }

          hoveredQuartiereRef.current = featureId
          map.current.setFeatureState(
            { source: 'quartieri', id: featureId },
            { hover: true }
          )

          // Get price category
          const category = getPriceCategory(props.prezzoAcquistoMedio)
          const variazione = parseFloat(props.variazioneSemestrale) || 0
          const variationColor = variazione >= 0 ? '#22c55e' : '#ef4444'
          const variationSign = variazione >= 0 ? '+' : ''
          const prezzoLocazione = parseFloat(props.prezzoLocazioneMedio) || 0

          // Show popup
          const html = `
            <div class="quartiere-popup-content">
              <div class="popup-header" style="border-left: 4px solid ${props.mapColor || props.color || '#3b82f6'}">
                <h3>${props.shortName || props.name || 'Quartiere'}</h3>
                <span class="popup-zone">${props.zone || ''} ${props.zone && props.fascia ? '•' : ''} ${props.fascia ? 'Fascia ' + props.fascia : ''}</span>
              </div>
              <div class="popup-stats">
                <div class="popup-stat">
                  <span class="stat-label">Acquisto</span>
                  <span class="stat-value" style="color: ${props.color || '#3b82f6'}">${formatPrice(props.prezzoAcquistoMedio)}/mq</span>
                </div>
                <div class="popup-stat">
                  <span class="stat-label">Affitto</span>
                  <span class="stat-value">€${prezzoLocazione.toFixed(1)}/mq</span>
                </div>
                <div class="popup-stat">
                  <span class="stat-label">Trend</span>
                  <span class="stat-value" style="color: ${variationColor}">${variationSign}${variazione.toFixed(1)}%</span>
                </div>
              </div>
              <div class="popup-category" style="background: ${category.color}20; color: ${category.color}">
                €${category.range}/mq
              </div>
              <div class="popup-footer">
                <span class="popup-hint">Click per dettagli</span>
                <span class="popup-hint-compare">⌘+Click confronta</span>
              </div>
            </div>
          `

          popup.current
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map.current)
        }
      })

      map.current.on('mouseleave', 'quartieri-fill', () => {
        map.current.getCanvas().style.cursor = ''

        if (hoveredQuartiereRef.current !== null) {
          map.current.setFeatureState(
            { source: 'quartieri', id: hoveredQuartiereRef.current },
            { hover: false }
          )
        }
        hoveredQuartiereRef.current = null
        popup.current.remove()
      })

      // Click handler for neighborhoods
      map.current.on('click', 'quartieri-fill', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0]
          const quartiereId = feature.properties.id

          // Find full quartiere data
          const quartiereData = quartieri.find(q => q.id === quartiereId)

          if (quartiereData && onQuartiereSelect) {
            // Check if Ctrl/Cmd key is pressed for compare mode
            const isCtrlClick = e.originalEvent.ctrlKey || e.originalEvent.metaKey
            onQuartiereSelect(quartiereData, isCtrlClick)
          }

          // Also update the general feature select
          if (onFeatureSelect && !e.originalEvent.ctrlKey && !e.originalEvent.metaKey) {
            onFeatureSelect({
              type: 'Quartiere',
              name: quartiereData.name,
              zone: quartiereData.zone,
              fascia: quartiereData.fascia,
              prezzoAcquisto: `${formatPrice(quartiereData.prezzoAcquistoMedio)}/mq`,
              prezzoLocazione: `€${quartiereData.prezzoLocazioneMedio.toFixed(2)}/mq/mese`,
              variazione: formatVariation(quartiereData.variazioneSemestrale)
            })
          }
        }
      })

      // Click on 3D buildings
      map.current.on('click', '3d-buildings', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const properties = feature.properties || {}

          if (onFeatureSelect) {
            onFeatureSelect({
              type: 'Building',
              height: properties.height ? `${properties.height}m` : 'N/A',
              floors: properties.height ? Math.round(properties.height / 3) : 'N/A',
              area: 'Milan, Italy',
              status: 'Active'
            })
          }
        }
      })

      map.current.on('mouseenter', '3d-buildings', () => {
        if (!hoveredQuartiereRef.current) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })

      map.current.on('mouseleave', '3d-buildings', () => {
        if (!hoveredQuartiereRef.current) {
          map.current.getCanvas().style.cursor = ''
        }
      })
    })

    return () => {
      if (popup.current) popup.current.remove()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [onFeatureSelect, onQuartiereSelect])

  // Handle selected quartiere changes with enhanced zoom animation and polygon highlight
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear previous selection
    quartieri.forEach(q => {
      map.current.setFeatureState(
        { source: 'quartieri', id: q.id },
        { selected: false }
      )
    })

    // Set new selection
    if (selectedQuartiere) {
      map.current.setFeatureState(
        { source: 'quartieri', id: selectedQuartiere.id },
        { selected: true }
      )

      // Get polygon bounds for the selected NIL
      const polygonCoords = nilPolygons[selectedQuartiere.id]
      
      if (polygonCoords && polygonCoords.length > 0) {
        // Calculate bounds from polygon coordinates
        const bounds = new mapboxgl.LngLatBounds()
        polygonCoords.forEach(coord => {
          bounds.extend(coord)
        })

        setIsZooming(true)

        // Fit to polygon bounds with padding to show full NIL
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          pitch: 50,
          bearing: map.current.getBearing(),
          duration: 1200,
          essential: true,
          maxZoom: 14.5  // Don't zoom in too much
        })

        // Start border highlight animation
        let animationFrame = 0
        const animateHighlight = () => {
          if (!map.current || !map.current.getLayer('quartieri-highlight')) return
          
          // Pulsing effect for the highlight
          const opacity = 0.6 + Math.sin(animationFrame * 0.08) * 0.3
          const width = 5 + Math.sin(animationFrame * 0.06) * 2
          
          map.current.setPaintProperty('quartieri-highlight', 'line-opacity', [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            opacity,
            0
          ])
          map.current.setPaintProperty('quartieri-highlight', 'line-width', [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            width,
            0
          ])
          
          animationFrame++
          if (animationFrame < 100) {
            requestAnimationFrame(animateHighlight)
          }
        }
        requestAnimationFrame(animateHighlight)

        setTimeout(() => setIsZooming(false), 1200)
      } else {
        // Fallback to center-based animation if no polygon
        setIsZooming(true)
        map.current.flyTo({
          center: selectedQuartiere.coordinates,
          zoom: 14,
          pitch: 50,
          bearing: map.current.getBearing(),
          duration: 1200,
          essential: true,
          easing: (t) => 1 - Math.pow(1 - t, 3)
        })
        setTimeout(() => setIsZooming(false), 1200)
      }
    } else {
      // Animate back to default view when quartiere is deselected
      setIsZooming(true)
      map.current.flyTo({
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        pitch: INITIAL_VIEW.pitch,
        bearing: INITIAL_VIEW.bearing,
        duration: 1500,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3) // Cubic ease out
      })
      setTimeout(() => setIsZooming(false), 1500)
    }
  }, [selectedQuartiere, mapLoaded])

  // Handle compare list changes - highlight compared quartieri
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Update compare states
    quartieri.forEach(q => {
      const isInCompareList = compareList.some(cq => cq.id === q.id)
      map.current.setFeatureState(
        { source: 'quartieri', id: q.id },
        { compared: isInCompareList }
      )
    })

    // If compare mode with multiple items, fit bounds to show all
    if (compareList.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds()
      compareList.forEach(q => {
        bounds.extend(q.coordinates)
      })

      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 400, right: 100 },
        pitch: 45,
        duration: 1000
      })
    }
  }, [compareList, mapLoaded])

  // Reset to initial view when exiting compare mode
  useEffect(() => {
    if (!isCompareMode && compareList.length === 0 && mapLoaded) {
      resetToDefaultView()
    }
  }, [isCompareMode, compareList.length, mapLoaded, resetToDefaultView])

  // Handle timeline price changes - update map colors dynamically
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Only proceed if we have timeline data to apply
    const hasTimelineData = timelinePrices && timelinePrices.quartieri && timelinePrices.quartieri.length > 0
    
    if (hasTimelineData) {
      const { quartieri: timelineQuartieri, metric, prevPriceMap = {} } = timelinePrices
      const metricConfig = getMapMetricConfig(metric)
      
      // Create a new GeoJSON with updated colors based on timeline prices
      const source = map.current.getSource('quartieri')
      if (source) {
        // Build a map of NIL ID -> data for quick lookup
        // Each OMI zone can map to multiple NIL IDs
        const dataMap = {}
        timelineQuartieri.forEach(q => {
          const prevPrice = prevPriceMap[q.quartiereId]
          const variazione = prevPrice 
            ? ((q.prezzoAcquisto - prevPrice) / prevPrice) * 100 
            : 0
          
          const timelineData = {
            prezzoAcquisto: q.prezzoAcquisto,
            prezzoLocazione: q.prezzoLocazione,
            variazione
          }
          
          // Map to all NIL IDs in this OMI zone
          if (q.nilIds && q.nilIds.length > 0) {
            q.nilIds.forEach(nilId => {
              dataMap[nilId] = timelineData
            })
          }
          // Also keep the quartiereId as fallback
          dataMap[q.quartiereId] = timelineData
        })

        // Get current GeoJSON data and update colors
        const currentData = generateQuartieriGeoJSON(quartieri)
        const updatedFeatures = currentData.features.map(feature => {
          const quartiereId = feature.properties.id
          const timelineQuartiereData = dataMap[quartiereId]

          if (timelineQuartiereData) {
            // Calculate metric value based on selected metric
            let metricValue
            let metricLabel
            let color
            
            const qData = {
              prezzoAcquistoMedio: timelineQuartiereData.prezzoAcquisto,
              prezzoLocazioneMedio: timelineQuartiereData.prezzoLocazione,
              variazioneSemestrale: timelineQuartiereData.variazione
            }
            
            metricValue = metricConfig.getValue(qData)
            metricLabel = metricConfig.formatLabel(metricValue)
            color = metricConfig.getColor(metricValue)

            return {
              ...feature,
              properties: {
                ...feature.properties,
                mapColor: color,
                mapMetricValue: metricValue,
                mapMetricLabel: metricLabel,
                prezzoAcquistoMedio: timelineQuartiereData.prezzoAcquisto,
                prezzoLocazioneMedio: timelineQuartiereData.prezzoLocazione
              }
            }
          }
          return feature
        })

        // Update the source data
        source.setData({
          ...currentData,
          features: updatedFeatures
        })

        // Also update the points source for labels
        const pointsSource = map.current.getSource('quartieri-points')
        if (pointsSource) {
          const pointsData = generateQuartieriPointsGeoJSON(quartieri)
          const updatedPoints = {
            ...pointsData,
            features: pointsData.features.map(feature => {
              const quartiereId = feature.properties.id
              const timelineQuartiereData = dataMap[quartiereId]

              if (timelineQuartiereData) {
                const qData = {
                  prezzoAcquistoMedio: timelineQuartiereData.prezzoAcquisto,
                  prezzoLocazioneMedio: timelineQuartiereData.prezzoLocazione,
                  variazioneSemestrale: timelineQuartiereData.variazione
                }
                
                const metricValue = metricConfig.getValue(qData)
                const metricLabel = metricConfig.formatLabel(metricValue)
                const color = metricConfig.getColor(metricValue)
                
                return {
                  ...feature,
                  properties: {
                    ...feature.properties,
                    mapColor: color,
                    mapMetricValue: metricValue,
                    mapMetricLabel: metricLabel,
                    prezzoAcquistoMedio: timelineQuartiereData.prezzoAcquisto,
                    prezzoLocazioneMedio: timelineQuartiereData.prezzoLocazione
                  }
                }
              }
              return feature
            })
          }
          pointsSource.setData(updatedPoints)
        }
        
        // Force a repaint to ensure colors update immediately
        map.current.triggerRepaint()
      }
    } else if (!timelinePrices) {
      // Reset to default colors when timeline is closed
      const source = map.current.getSource('quartieri')
      if (source) {
        source.setData(generateQuartieriGeoJSON(quartieri))
      }
      const pointsSource = map.current.getSource('quartieri-points')
      if (pointsSource) {
        pointsSource.setData(generateQuartieriPointsGeoJSON(quartieri))
      }
    }
  }, [timelinePrices, timelinePrices?._index, timelinePrices?.metric, mapLoaded, quartieri])

  // Refresh data when quartieri change and timeline isn't active
  useEffect(() => {
    if (!map.current || !mapLoaded || timelinePrices) return

    const source = map.current.getSource('quartieri')
    if (source) {
      source.setData(generateQuartieriGeoJSON(quartieri))
    }
    const pointsSource = map.current.getSource('quartieri-points')
    if (pointsSource) {
      pointsSource.setData(generateQuartieriPointsGeoJSON(quartieri))
    }
  }, [quartieri, mapLoaded, timelinePrices])

  // Handle visibility toggle changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Toggle 3D buildings
    if (map.current.getLayer('3d-buildings')) {
      map.current.setLayoutProperty(
        '3d-buildings',
        'visibility',
        visibilityToggles.buildings3D ? 'visible' : 'none'
      )
    }

    // Toggle neighborhoods
    const neighborhoodLayers = ['quartieri-fill', 'quartieri-outline', 'quartieri-labels', 'quartieri-price']
    neighborhoodLayers.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.setLayoutProperty(
          layerId,
          'visibility',
          visibilityToggles.neighborhoods ? 'visible' : 'none'
        )
      }
    })
  }, [visibilityToggles, mapLoaded])

  return (
    <div className="absolute inset-0">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
      />

      {mapError && (
        <div className="absolute inset-0 bg-gray-900/95 flex items-center justify-center z-30">
          <div className="max-w-md text-center p-6 rounded-2xl bg-black/60 border border-white/10">
            <p className="text-white font-semibold text-lg">Mapbox token mancante</p>
            <p className="text-gray-400 text-sm mt-2">
              Imposta <span className="font-mono">VITE_MAPBOX_TOKEN</span> nel file <span className="font-mono">.env</span> e riavvia il server.
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent 
                          rounded-full animate-spin" />
            <p className="text-white text-sm">Loading Milan map...</p>
          </div>
        </div>
      )}

      {/* Top Right Controls Container - Home Button and Legend */}
      {mapLoaded && (
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
          {/* Reset View Button */}
          <button
            onClick={resetToDefaultView}
            className="map-control-button"
            title="Ritorna alla vista iniziale"
          >
            <Home size={18} />
          </button>

          {/* Price Legend */}
          {visibilityToggles.neighborhoods && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/10
                            shadow-lg animate-fade-in">
              <h4 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider">
                {timelinePrices ? getMapMetricConfig(timelinePrices.metric).legendTitle : mapLegendTitle}
              </h4>
              <div className="space-y-2">
                {(timelinePrices ? getMapMetricConfig(timelinePrices.metric).legend : mapLegend).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-300 text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom Animation Overlay */}
      {isZooming && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="zoom-ring" />
          </div>
        </div>
      )}

      {/* Compare Mode Indicator */}
      {isCompareMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20
                        bg-blue-500/90 backdrop-blur-md px-4 py-2 rounded-full
                        text-white text-sm font-medium shadow-lg
                        flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>Modalità Confronto</span>
          <span className="text-blue-200">• Ctrl+Click per aggiungere</span>
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 
                      bg-black/60 backdrop-blur-md px-4 py-2 rounded-full
                      text-white text-xs z-10 border border-white/10">
        <span className="text-gray-400">Milano, Italia</span>
        <span className="mx-2 text-gray-600">|</span>
        <span className="font-mono">
          {MILAN_CENTER.lat.toFixed(4)}°N, {MILAN_CENTER.lng.toFixed(4)}°E
        </span>
        {selectedQuartiere && (
          <>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-blue-400">{selectedQuartiere.shortName}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default MapComponent
