// Selection Store - Manages quartiere selection and compare mode
// Uses Zustand for efficient, decoupled state management

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Selection Store
 * 
 * Manages all selection-related state including:
 * - Selected quartiere (single selection)
 * - Compare list (multiple selection, max 4)
 * - Compare mode toggle
 * - Active time series quartiere
 */
export const useSelectionStore = create(
    devtools(
        (set, get) => ({
            // ============ State ============

            // Currently selected quartiere (shown in detail panel)
            selectedQuartiere: null,

            // Quartieri being compared (max 4)
            compareList: [],

            // Whether compare mode is active
            isCompareMode: false,

            // Quartiere for time series panel (can differ from selected)
            activeTimeSeriesQuartiere: null,

            // Additional selected data (e.g., buildings, POIs)
            selectedData: null,

            // ============ Actions ============

            /**
             * Select a single quartiere
             * Clears other selected data and exits compare selection
             */
            selectQuartiere: (quartiere) => set({
                selectedQuartiere: quartiere,
                selectedData: null,
            }),

            /**
             * Deselect the current quartiere
             */
            deselectQuartiere: () => set({
                selectedQuartiere: null
            }),

            /**
             * Update selected quartiere with fresh data (after API refresh)
             */
            updateSelectedQuartiere: (updatedQuartiere) => set((state) => {
                if (!state.selectedQuartiere) return state
                if (state.selectedQuartiere.id !== updatedQuartiere.id) return state
                return { selectedQuartiere: updatedQuartiere }
            }),

            /**
             * Handle quartiere click - supports both single and compare mode
             */
            handleQuartiereClick: (quartiere, isCtrlClick = false) => {
                const { isCompareMode, compareList } = get()

                if (isCtrlClick || isCompareMode) {
                    // Add/remove from compare list
                    const exists = compareList.find(q => q.id === quartiere.id)

                    if (exists) {
                        // Remove from compare list
                        set({
                            compareList: compareList.filter(q => q.id !== quartiere.id)
                        })
                    } else {
                        // Add to compare list (max 4)
                        const newList = compareList.length >= 4
                            ? [...compareList.slice(1), quartiere]
                            : [...compareList, quartiere]

                        set({
                            compareList: newList,
                            isCompareMode: isCtrlClick ? true : get().isCompareMode,
                        })
                    }
                } else {
                    // Single selection
                    set({
                        selectedQuartiere: quartiere,
                        selectedData: null,
                    })
                }
            },

            /**
             * Add to compare list
             */
            addToCompare: (quartiere) => set((state) => {
                const exists = state.compareList.find(q => q.id === quartiere.id)
                if (exists) return state

                const newList = state.compareList.length >= 4
                    ? [...state.compareList.slice(1), quartiere]
                    : [...state.compareList, quartiere]

                return { compareList: newList }
            }),

            /**
             * Remove from compare list by ID
             */
            removeFromCompare: (quartiereId) => set((state) => ({
                compareList: state.compareList.filter(q => q.id !== quartiereId)
            })),

            /**
             * Clear all compared quartieri
             */
            clearCompare: () => set({
                compareList: [],
                isCompareMode: false
            }),

            /**
             * Toggle compare mode on/off
             */
            toggleCompareMode: () => set((state) => {
                if (state.isCompareMode) {
                    // Exiting compare mode - clear list
                    return { isCompareMode: false, compareList: [] }
                }
                return { isCompareMode: true }
            }),

            /**
             * Update compare list with fresh data
             */
            updateCompareList: (updatedQuartieri) => set((state) => {
                if (state.compareList.length === 0) return state

                const updatedList = state.compareList.map(q =>
                    updatedQuartieri.find(u => u.id === q.id) || q
                )

                return { compareList: updatedList }
            }),

            /**
             * Set quartiere for time series panel
             */
            setActiveTimeSeriesQuartiere: (quartiere) => set({
                activeTimeSeriesQuartiere: quartiere
            }),

            /**
             * Set selected data (buildings, POIs, etc.)
             */
            setSelectedData: (data) => set({ selectedData: data }),
        }),
        { name: 'selection-store' }
    )
)

export default useSelectionStore
