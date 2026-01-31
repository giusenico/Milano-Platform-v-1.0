/**
 * Hooks - Barrel export
 * 
 * Central export point for all custom hooks.
 */

// Data fetching hooks
export {
    useQuartiereTimeSeries,
    useMilanoStats,
    useCompareTimeSeries,
    useQuartieriData,
    useSemesters,
    useTimelineData,
    useDataOverview,
    useIndicatoriDemografici,
    useContribuenti,
    useIndicePrezziAbitazioni,
    usePopolazioneQuartiere,
    useNilAnalisi,
    useNilRanking,
    useNilStatsOverview
} from './useDataApi'

// Composite hooks
export { useSidebarData } from './useSidebarData'

// Map hooks
export { useMapLayers } from './useMapLayers'
