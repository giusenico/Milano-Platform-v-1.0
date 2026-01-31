// Map Store - Controls map state, metrics, and timeline
// Uses Zustand for efficient, decoupled state management

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Map Store
 * 
 * Manages all map-related state including:
 * - Active metric (prezzoAcquisto, prezzoLocazione, variazione)
 * - Timeline playback state
 * - Layer visibility toggles
 * - Panel visibility
 */
export const useMapStore = create(
    devtools(
        (set, get) => ({
            // ============ State ============

            // Map metric for coloring neighborhoods
            mapMetric: 'prezzoAcquisto',

            // Layer visibility
            visibilityToggles: {
                buildings3D: true,
                neighborhoods: true,
            },

            // Timeline state
            isTimelinePanelOpen: false,
            timelineIndex: 0,
            isTimelinePlaying: false,
            timelineMetric: 'prezzoAcquisto', // 'prezzoAcquisto' | 'prezzoLocazione' | 'rendimento' | 'variazione'

            // Time series panel state
            isTimeSeriesPanelOpen: false,
            timeSeriesPanelMode: 'quartiere', // 'quartiere' | 'milano' | 'compare'

            // Category detail panel state
            isCategoryPanelOpen: false,
            activeCategoryId: null, // 'immobiliare' | 'demografia' | 'popolazione' | 'redditi' | 'indice' | 'servizi'

            // ============ Actions ============

            setMapMetric: (metric) => set({ mapMetric: metric }),

            toggleVisibility: (layer) => set((state) => ({
                visibilityToggles: {
                    ...state.visibilityToggles,
                    [layer]: !state.visibilityToggles[layer],
                },
            })),

            // Timeline actions
            openTimelinePanel: () => set({ isTimelinePanelOpen: true }),

            closeTimelinePanel: () => set({
                isTimelinePanelOpen: false,
                isTimelinePlaying: false
            }),

            setTimelineMetric: (metric) => set({ timelineMetric: metric }),

            setTimelineIndex: (index) => set({
                timelineIndex: index,
                isTimelinePlaying: false
            }),

            toggleTimelinePlayback: () => set((state) => ({
                isTimelinePlaying: !state.isTimelinePlaying
            })),

            advanceTimeline: (maxIndex) => {
                const { timelineIndex } = get()
                if (timelineIndex >= maxIndex) {
                    set({ isTimelinePlaying: false })
                } else {
                    set({ timelineIndex: timelineIndex + 1 })
                }
            },

            resetTimelineToEnd: (endIndex) => set({ timelineIndex: endIndex }),

            // Time series panel actions
            openTimeSeriesPanel: (mode = 'quartiere') => set({
                isTimeSeriesPanelOpen: true,
                timeSeriesPanelMode: mode
            }),

            closeTimeSeriesPanel: () => set({ isTimeSeriesPanelOpen: false }),

            setTimeSeriesPanelMode: (mode) => set({ timeSeriesPanelMode: mode }),

            // Category detail panel actions
            openCategoryPanel: (categoryId) => set({
                isCategoryPanelOpen: true,
                activeCategoryId: categoryId,
                // Close time series panel when opening category panel
                isTimeSeriesPanelOpen: false
            }),

            closeCategoryPanel: () => set({
                isCategoryPanelOpen: false,
                activeCategoryId: null
            }),

            toggleCategoryPanel: (categoryId) => {
                const { activeCategoryId, isCategoryPanelOpen } = get()
                if (isCategoryPanelOpen && activeCategoryId === categoryId) {
                    set({ isCategoryPanelOpen: false, activeCategoryId: null })
                } else {
                    set({ isCategoryPanelOpen: true, activeCategoryId: categoryId, isTimeSeriesPanelOpen: false })
                }
            },
        }),
        { name: 'map-store' }
    )
)

export default useMapStore
