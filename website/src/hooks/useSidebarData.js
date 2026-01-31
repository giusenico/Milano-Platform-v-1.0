/**
 * useSidebarData - Composite hook for Sidebar data requirements
 * 
 * Aggregates all data fetching hooks needed by the Sidebar component.
 * This eliminates prop drilling from App.jsx and centralizes data management.
 */
import { useMemo } from 'react'
import {
    useMilanoStats,
    useDataOverview,
    useIndicatoriDemografici,
    useContribuenti,
    useIndicePrezziAbitazioni,
    usePopolazioneQuartiere,
    useNilAnalisi
} from './useDataApi'
import { resolveQuartiereNil } from '../data/quartiereNilMapping'

/**
 * Hook that provides all data needed by Sidebar
 * @param {Object} selectedQuartiere - Currently selected quartiere (for NIL-specific data)
 * @returns {Object} All sidebar data and loading states
 */
export const useSidebarData = (selectedQuartiere = null) => {
    // Resolve NIL name for the selected quartiere
    const nilName = useMemo(() => {
        return selectedQuartiere ? resolveQuartiereNil(selectedQuartiere) : null
    }, [selectedQuartiere])

    // Fetch all required data
    const milanoStats = useMilanoStats()
    const dataOverview = useDataOverview()
    const indicatoriDemografici = useIndicatoriDemografici()
    const contribuenti = useContribuenti()
    const indicePrezzi = useIndicePrezziAbitazioni()
    const popolazione = usePopolazioneQuartiere(nilName)
    const nilAnalisi = useNilAnalisi(nilName)

    // Aggregate loading states
    const isLoading = useMemo(() => ({
        milano: milanoStats.isLoading,
        overview: dataOverview.isLoading,
        indicatori: indicatoriDemografici.isLoading,
        contribuenti: contribuenti.isLoading,
        prezzi: indicePrezzi.isLoading,
        popolazione: popolazione.isLoading,
        nil: nilAnalisi.isLoading
    }), [
        milanoStats.isLoading,
        dataOverview.isLoading,
        indicatoriDemografici.isLoading,
        contribuenti.isLoading,
        indicePrezzi.isLoading,
        popolazione.isLoading,
        nilAnalisi.isLoading
    ])

    // Aggregate errors
    const errors = useMemo(() => ({
        milano: milanoStats.error,
        overview: dataOverview.error,
        indicatori: indicatoriDemografici.error,
        contribuenti: contribuenti.error,
        prezzi: indicePrezzi.error,
        popolazione: popolazione.error,
        nil: nilAnalisi.error
    }), [
        milanoStats.error,
        dataOverview.error,
        indicatoriDemografici.error,
        contribuenti.error,
        indicePrezzi.error,
        popolazione.error,
        nilAnalisi.error
    ])

    // Check if any data is loading
    const isAnyLoading = Object.values(isLoading).some(Boolean)

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(Boolean)

    return {
        // Data
        milanoStats: milanoStats.data,
        dataOverview: dataOverview.data,
        indicatoriDemografici: indicatoriDemografici.data,
        contribuentiData: contribuenti.data,
        indicePrezziData: indicePrezzi.data,
        popolazioneData: popolazione.data,
        nilAnalisiData: nilAnalisi.data,

        // Individual loading states
        isLoadingIndicatori: indicatoriDemografici.isLoading,
        isLoadingContribuenti: contribuenti.isLoading,
        isLoadingIndicePrezzi: indicePrezzi.isLoading,
        isLoadingNilAnalisi: nilAnalisi.isLoading,

        // Aggregated states
        isLoading,
        isAnyLoading,
        errors,
        hasErrors,

        // Refetch functions
        refetch: {
            milano: milanoStats.refetch,
            overview: dataOverview.refetch,
            indicatori: indicatoriDemografici.refetch,
            contribuenti: contribuenti.refetch,
            prezzi: indicePrezzi.refetch,
            popolazione: popolazione.refetch,
            nil: nilAnalisi.refetch
        }
    }
}

export default useSidebarData
