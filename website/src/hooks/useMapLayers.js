/**
 * useMapLayers - Custom hook for managing Mapbox layers
 * 
 * Extracts layer creation, update, and state management logic from MapComponent.
 * This reduces MapComponent complexity and enables reuse.
 */
import { useEffect, useCallback, useRef } from 'react'
import { generateQuartieriGeoJSON, generateQuartieriPointsGeoJSON, formatPrice } from '../data/quartieriGeoJSON'
import { getPriceCategory } from '../data/quartieriData'

/**
 * Hook to manage map layer updates and feature states
 * @param {Object} map - Mapbox map instance ref
 * @param {boolean} mapLoaded - Whether map has finished loading
 * @param {Array} quartieri - Quartieri data array
 * @param {Object} options - Additional options
 */
export const useMapLayers = (map, mapLoaded, quartieri, options = {}) => {
    const {
        selectedQuartiere,
        compareList = [],
        timelinePrices = null,
        visibilityToggles = { buildings3D: true, neighborhoods: true }
    } = options

    const hoveredQuartiereRef = useRef(null)

    // Update source data
    const updateSourceData = useCallback(() => {
        if (!map.current || !mapLoaded) return

        const source = map.current.getSource('quartieri')
        if (source) {
            source.setData(generateQuartieriGeoJSON(quartieri))
        }

        const pointsSource = map.current.getSource('quartieri-points')
        if (pointsSource) {
            pointsSource.setData(generateQuartieriPointsGeoJSON(quartieri))
        }
    }, [map, mapLoaded, quartieri])

    // Update timeline prices on map
    const updateTimelinePrices = useCallback((prices) => {
        if (!map.current || !mapLoaded) return

        if (!prices || prices.length === 0) {
            updateSourceData()
            return
        }

        // Build price map for quick lookup
        const priceMap = {}
        prices.forEach(q => {
            priceMap[q.quartiereId] = q.prezzoAcquisto
        })

        // Update quartieri source
        const source = map.current.getSource('quartieri')
        if (source) {
            const currentData = generateQuartieriGeoJSON(quartieri)
            const updatedFeatures = currentData.features.map(feature => {
                const quartiereId = feature.properties.id
                const timelinePrice = priceMap[quartiereId]

                if (timelinePrice !== undefined) {
                    const category = getPriceCategory(timelinePrice)
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            mapColor: category.color,
                            mapMetricValue: timelinePrice,
                            mapMetricLabel: `${formatPrice(timelinePrice)}/mq`,
                            prezzoAcquistoMedio: timelinePrice
                        }
                    }
                }
                return feature
            })

            source.setData({ ...currentData, features: updatedFeatures })
        }

        // Update points source
        const pointsSource = map.current.getSource('quartieri-points')
        if (pointsSource) {
            const pointsData = generateQuartieriPointsGeoJSON(quartieri)
            const updatedPoints = {
                ...pointsData,
                features: pointsData.features.map(feature => {
                    const quartiereId = feature.properties.id
                    const timelinePrice = priceMap[quartiereId]

                    if (timelinePrice !== undefined) {
                        const category = getPriceCategory(timelinePrice)
                        return {
                            ...feature,
                            properties: {
                                ...feature.properties,
                                mapColor: category.color,
                                mapMetricValue: timelinePrice,
                                mapMetricLabel: `${formatPrice(timelinePrice)}/mq`,
                                prezzoAcquistoMedio: timelinePrice
                            }
                        }
                    }
                    return feature
                })
            }
            pointsSource.setData(updatedPoints)
        }
    }, [map, mapLoaded, quartieri, updateSourceData])

    // Set feature state for selection
    const setSelectionState = useCallback((quartiereId, isSelected) => {
        if (!map.current || !mapLoaded) return

        map.current.setFeatureState(
            { source: 'quartieri', id: quartiereId },
            { selected: isSelected }
        )
    }, [map, mapLoaded])

    // Set feature state for compare
    const setCompareState = useCallback((quartiereId, isCompared) => {
        if (!map.current || !mapLoaded) return

        map.current.setFeatureState(
            { source: 'quartieri', id: quartiereId },
            { compared: isCompared }
        )
    }, [map, mapLoaded])

    // Set hover state
    const setHoverState = useCallback((quartiereId, isHovered) => {
        if (!map.current || !mapLoaded) return

        if (hoveredQuartiereRef.current !== null && hoveredQuartiereRef.current !== quartiereId) {
            map.current.setFeatureState(
                { source: 'quartieri', id: hoveredQuartiereRef.current },
                { hover: false }
            )
        }

        hoveredQuartiereRef.current = isHovered ? quartiereId : null

        if (quartiereId) {
            map.current.setFeatureState(
                { source: 'quartieri', id: quartiereId },
                { hover: isHovered }
            )
        }
    }, [map, mapLoaded])

    // Clear hover state
    const clearHoverState = useCallback(() => {
        if (hoveredQuartiereRef.current !== null) {
            setHoverState(hoveredQuartiereRef.current, false)
        }
    }, [setHoverState])

    // Toggle layer visibility
    const setLayerVisibility = useCallback((layerId, visible) => {
        if (!map.current || !mapLoaded) return
        if (!map.current.getLayer(layerId)) return

        map.current.setLayoutProperty(
            layerId,
            'visibility',
            visible ? 'visible' : 'none'
        )
    }, [map, mapLoaded])

    // Update visibility based on toggles
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Toggle 3D buildings
        setLayerVisibility('3d-buildings', visibilityToggles.buildings3D)

        // Toggle neighborhoods
        const neighborhoodLayers = ['quartieri-fill', 'quartieri-outline', 'quartieri-labels', 'quartieri-price']
        neighborhoodLayers.forEach(layerId => {
            setLayerVisibility(layerId, visibilityToggles.neighborhoods)
        })
    }, [visibilityToggles, mapLoaded, setLayerVisibility])

    // Update selection states
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Clear all selections
        quartieri.forEach(q => setSelectionState(q.id, false))

        // Set current selection
        if (selectedQuartiere) {
            setSelectionState(selectedQuartiere.id, true)
        }
    }, [selectedQuartiere, mapLoaded, quartieri, setSelectionState])

    // Update compare states
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        quartieri.forEach(q => {
            const isInCompareList = compareList.some(cq => cq.id === q.id)
            setCompareState(q.id, isInCompareList)
        })
    }, [compareList, mapLoaded, quartieri, setCompareState])

    // Handle timeline price updates
    useEffect(() => {
        if (timelinePrices) {
            updateTimelinePrices(timelinePrices)
        } else {
            updateSourceData()
        }
    }, [timelinePrices, updateTimelinePrices, updateSourceData])

    return {
        updateSourceData,
        updateTimelinePrices,
        setSelectionState,
        setCompareState,
        setHoverState,
        clearHoverState,
        setLayerVisibility,
        hoveredQuartiereRef
    }
}

export default useMapLayers
