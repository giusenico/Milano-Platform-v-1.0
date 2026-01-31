import { useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import MapComponent from './components/MapComponent'
import { SkeletonPanel } from './components/ui/Skeleton'
import { useMapStore, useSelectionStore } from './stores'
import {
  useQuartiereTimeSeries,
  useMilanoStats,
  useCompareTimeSeries,
  useTimelineData,
  useDataOverview,
  usePopolazioneQuartiere,
  useQuartieriData,
  useIndicatoriDemografici,
  useContribuenti,
  useIndicePrezziAbitazioni,
  useNilAnalisi,
  useAmbienteNil,
  useCommercioStats,
  useCulturaStats,
  useMobilitaStats,
  useBiblioteche
} from './hooks/useDataApi'
import { quartieriData, getPriceCategory } from './data/quartieriData'
import { getMapMetricConfig } from './data/mapMetrics'
import { resolveQuartiereNil } from './data/quartiereNilMapping'

// Lazy loaded components for better initial load performance
const TimeSeriesPanel = lazy(() => import('./components/TimeSeriesPanel'))
const MapTimelineOverlay = lazy(() => import('./components/MapTimelineOverlay'))
const CategoryDetailPanel = lazy(() => import('./components/CategoryDetailPanel'))

/**
 * Main Application Component
 * 
 * Layout: Split view with floating "Dynamic Island" sidebar
 * and full-screen Mapbox map centered on Milan, Italy.
 * 
 * Architecture:
 * - State management: Zustand stores (useMapStore, useSelectionStore)
 * - Data fetching: Custom hooks with API client
 * - Components: MapComponent, Sidebar, TimeSeriesPanel, MapTimelineOverlay
 * - Performance: Lazy loading for heavy panels
 */
function App() {
  // ============ Zustand Stores ============
  const {
    mapMetric,
    setMapMetric,
    visibilityToggles,
    isTimelinePanelOpen,
    timelineIndex,
    isTimelinePlaying,
    timelineMetric,
    setTimelineMetric,
    isTimeSeriesPanelOpen,
    timeSeriesPanelMode,
    isCategoryPanelOpen,
    activeCategoryId,
    openTimelinePanel,
    closeTimelinePanel,
    setTimelineIndex,
    toggleTimelinePlayback,
    advanceTimeline,
    resetTimelineToEnd,
    openTimeSeriesPanel,
    closeTimeSeriesPanel,
    openCategoryPanel,
    closeCategoryPanel,
    toggleCategoryPanel,
  } = useMapStore()

  const {
    selectedQuartiere,
    compareList,
    isCompareMode,
    activeTimeSeriesQuartiere,
    handleQuartiereClick,
    deselectQuartiere,
    removeFromCompare,
    clearCompare,
    toggleCompareMode,
    selectQuartiere,
    setActiveTimeSeriesQuartiere,
    setSelectedData,
    updateSelectedQuartiere,
    updateCompareList,
  } = useSelectionStore()

  // ============ Data Fetching ============
  const {
    data: quartiereTimeSeries,
    isLoading: isLoadingQuartiere
  } = useQuartiereTimeSeries(activeTimeSeriesQuartiere?.id)

  const {
    data: milanoStats,
    isLoading: isLoadingMilano
  } = useMilanoStats()

  const compareIds = useMemo(() => compareList.map(q => q.id), [compareList])
  const {
    data: compareTimeSeries,
    isLoading: isLoadingCompare
  } = useCompareTimeSeries(compareIds)

  const { data: timelineData, isLoading: isLoadingTimeline } = useTimelineData()
  const { data: quartieriApi } = useQuartieriData()
  const { data: dataOverview } = useDataOverview()
  const { data: indicatoriDemografici, isLoading: isLoadingIndicatori } = useIndicatoriDemografici()
  const { data: contribuentiData, isLoading: isLoadingContribuenti } = useContribuenti()
  const { data: indicePrezziData, isLoading: isLoadingIndicePrezzi } = useIndicePrezziAbitazioni()
  
  // New data hooks for additional categories
  const { data: ambienteData, isLoading: isLoadingAmbiente } = useAmbienteNil()
  const { data: commercioData, isLoading: isLoadingCommercio } = useCommercioStats()
  const { data: culturaData, isLoading: isLoadingCultura } = useCulturaStats()
  const { data: mobilitaData, isLoading: isLoadingMobilita } = useMobilitaStats()
  const { data: bibliotecheData } = useBiblioteche()

  // NIL-specific data
  const selectedQuartiereNil = selectedQuartiere ? resolveQuartiereNil(selectedQuartiere) : null
  const { data: popolazioneData } = usePopolazioneQuartiere(selectedQuartiereNil)
  const { data: nilAnalisiData, isLoading: isLoadingNilAnalisi } = useNilAnalisi(selectedQuartiereNil)

  // ============ Derived Data ============
  const quartieriById = useMemo(() => {
    if (!quartieriApi) return new Map()
    return new Map(quartieriApi.filter(q => q.quartiereId).map(q => [q.quartiereId, q]))
  }, [quartieriApi])

  const mapMetricConfig = useMemo(() => getMapMetricConfig(mapMetric), [mapMetric])

  const mergedQuartieriData = useMemo(() => {
    return quartieriData.map(quartiere => {
      const api = quartieriById.get(quartiere.id)
      const prezzoAcquistoMedio = api?.prezzoAcquistoMedio ?? quartiere.prezzoAcquistoMedio
      const prezzoLocazioneMedio = api?.prezzoLocazioneMedio ?? quartiere.prezzoLocazioneMedio
      const variazioneSemestrale = api?.variazioneSemestrale ?? quartiere.variazioneSemestrale
      const category = getPriceCategory(prezzoAcquistoMedio)
      const metricValue = mapMetricConfig.getValue({
        ...quartiere,
        prezzoAcquistoMedio,
        prezzoLocazioneMedio,
        variazioneSemestrale
      })

      return {
        ...quartiere,
        prezzoAcquistoMedio,
        prezzoLocazioneMedio,
        variazioneSemestrale,
        color: category.color,
        mapMetricValue: metricValue,
        mapMetricLabel: mapMetricConfig.formatLabel(metricValue),
        mapColor: mapMetricConfig.getColor(metricValue)
      }
    })
  }, [quartieriApi, quartieriById, mapMetricConfig])

  // Timeline prices for map visualization - includes the active metric
  const currentTimelinePrices = useMemo(() => {
    if (!isTimelinePanelOpen || !timelineData?.timeline?.[timelineIndex]) {
      return null
    }
    
    // Get previous semester data for trend calculations
    const prevQuartieri = timelineIndex > 0 ? timelineData.timeline[timelineIndex - 1].quartieri : null
    const prevPriceMap = {}
    if (prevQuartieri) {
      prevQuartieri.forEach(q => {
        prevPriceMap[q.quartiereId] = q.prezzoAcquisto
      })
    }
    
    return {
      quartieri: timelineData.timeline[timelineIndex].quartieri,
      prevPriceMap,
      metric: timelineMetric,
      // Add index to force re-render when timeline advances
      _index: timelineIndex
    }
  }, [isTimelinePanelOpen, timelineData, timelineIndex, timelineMetric])

  // ============ Effects ============

  // Sync selected/compared quartieri when data changes
  useEffect(() => {
    if (!mergedQuartieriData.length) return

    if (selectedQuartiere) {
      const updated = mergedQuartieriData.find(q => q.id === selectedQuartiere.id)
      if (updated && (
        updated.prezzoAcquistoMedio !== selectedQuartiere.prezzoAcquistoMedio ||
        updated.prezzoLocazioneMedio !== selectedQuartiere.prezzoLocazioneMedio ||
        updated.variazioneSemestrale !== selectedQuartiere.variazioneSemestrale
      )) {
        updateSelectedQuartiere(updated)
      }
    }

    if (compareList.length > 0) {
      updateCompareList(mergedQuartieriData)
    }
  }, [mergedQuartieriData, selectedQuartiere, compareList.length, updateSelectedQuartiere, updateCompareList])

  // Timeline auto-play
  useEffect(() => {
    if (!isTimelinePlaying || !timelineData?.semesters) return

    const interval = setInterval(() => {
      advanceTimeline(timelineData.semesters.length - 1)
    }, 1200)

    return () => clearInterval(interval)
  }, [isTimelinePlaying, timelineData, advanceTimeline])

  // Reset timeline to end when data loads
  useEffect(() => {
    if (timelineData?.semesters?.length > 0) {
      resetTimelineToEnd(timelineData.semesters.length - 1)
    }
  }, [timelineData, resetTimelineToEnd])

  // ============ Handlers ============

  const handleOpenTimeSeriesQuartiere = useCallback((quartiere) => {
    setActiveTimeSeriesQuartiere(quartiere)
    openTimeSeriesPanel('quartiere')
  }, [setActiveTimeSeriesQuartiere, openTimeSeriesPanel])

  const handleOpenTimeSeriesMilano = useCallback(() => {
    setActiveTimeSeriesQuartiere(null)
    openTimeSeriesPanel('milano')
  }, [setActiveTimeSeriesQuartiere, openTimeSeriesPanel])

  const handleOpenTimeSeriesCompare = useCallback(() => {
    openTimeSeriesPanel('compare')
  }, [openTimeSeriesPanel])

  const handleOpenCategoryDetail = useCallback((categoryId) => {
    toggleCategoryPanel(categoryId)
  }, [toggleCategoryPanel])

  const handleQuartiereDeselect = useCallback(() => {
    deselectQuartiere()
    closeTimeSeriesPanel()
  }, [deselectQuartiere, closeTimeSeriesPanel])

  const handleClearCompare = useCallback(() => {
    clearCompare()
    closeTimeSeriesPanel()
  }, [clearCompare, closeTimeSeriesPanel])

  const handleTimelinePlayPause = useCallback(() => {
    // If at end and starting to play, reset to beginning
    if (!isTimelinePlaying && timelineData?.semesters && timelineIndex >= timelineData.semesters.length - 1) {
      setTimelineIndex(0)
    }
    toggleTimelinePlayback()
  }, [isTimelinePlaying, timelineData, timelineIndex, setTimelineIndex, toggleTimelinePlayback])

  // Time series panel props based on mode
  const getTimeSeriesPanelProps = useCallback(() => {
    switch (timeSeriesPanelMode) {
      case 'quartiere':
        return {
          quartiere: activeTimeSeriesQuartiere,
          timeSeriesData: quartiereTimeSeries,
          isLoading: isLoadingQuartiere,
          compareMode: false,
          compareData: []
        }
      case 'milano':
        return {
          quartiere: null,
          timeSeriesData: milanoStats ? { data: milanoStats.timeSeries } : null,
          milanoStats: milanoStats,
          isLoading: isLoadingMilano,
          compareMode: false,
          compareData: []
        }
      case 'compare':
        return {
          quartiere: null,
          timeSeriesData: null,
          isLoading: isLoadingCompare,
          compareMode: true,
          compareData: compareTimeSeries || []
        }
      default:
        return {}
    }
  }, [timeSeriesPanelMode, activeTimeSeriesQuartiere, quartiereTimeSeries, isLoadingQuartiere, milanoStats, isLoadingMilano, isLoadingCompare, compareTimeSeries])

  // ============ Render ============
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {/* Full-screen Map */}
      <MapComponent
        quartieri={mergedQuartieriData}
        visibilityToggles={visibilityToggles}
        onFeatureSelect={setSelectedData}
        selectedQuartiere={selectedQuartiere}
        onQuartiereSelect={handleQuartiereClick}
        compareList={compareList}
        isCompareMode={isCompareMode}
        timelinePrices={currentTimelinePrices}
        mapMetricConfig={mapMetricConfig}
        mapLegend={mapMetricConfig.legend}
        mapLegendTitle={mapMetricConfig.legendTitle}
      />

      {/* Floating Sidebar */}
      <Sidebar
        selectedQuartiere={selectedQuartiere}
        onQuartiereDeselect={handleQuartiereDeselect}
        compareList={compareList}
        isCompareMode={isCompareMode}
        onToggleCompareMode={toggleCompareMode}
        onRemoveFromCompare={removeFromCompare}
        onClearCompare={handleClearCompare}
        onFlyToQuartiere={selectQuartiere}
        onOpenTimeSeriesQuartiere={handleOpenTimeSeriesQuartiere}
        onOpenTimeSeriesCompare={handleOpenTimeSeriesCompare}
        onOpenTimelinePanel={openTimelinePanel}
        onOpenCategoryDetail={handleOpenCategoryDetail}
        activeCategory={activeCategoryId}
        mapMetric={mapMetric}
        onMapMetricChange={setMapMetric}
        milanoStats={milanoStats}
        dataOverview={dataOverview}
        popolazioneData={popolazioneData}
        nilAnalisiData={nilAnalisiData}
        isLoadingNilAnalisi={isLoadingNilAnalisi}
      />

      {/* Time Series Panel - Lazy Loaded */}
      <Suspense fallback={isTimeSeriesPanelOpen ? <div className="fixed right-4 top-4 bottom-4 w-[420px] z-30"><SkeletonPanel height="100%" /></div> : null}>
        <TimeSeriesPanel
          isOpen={isTimeSeriesPanelOpen}
          onClose={closeTimeSeriesPanel}
          {...getTimeSeriesPanelProps()}
        />
      </Suspense>

      {/* Category Detail Panel - Lazy Loaded */}
      <Suspense fallback={isCategoryPanelOpen ? <div className="fixed right-4 top-4 bottom-4 w-[420px] z-30"><SkeletonPanel height="100%" /></div> : null}>
        <CategoryDetailPanel
          isOpen={isCategoryPanelOpen}
          onClose={closeCategoryPanel}
          activeCategory={activeCategoryId}
          milanoStats={milanoStats}
          dataOverview={dataOverview}
          indicatoriDemografici={indicatoriDemografici}
          contribuentiData={contribuentiData}
          indicePrezziData={indicePrezziData}
          ambienteData={ambienteData}
          commercioData={commercioData}
          culturaData={culturaData}
          bibliotecheData={bibliotecheData}
          mobilitaData={mobilitaData}
          isLoadingIndicatori={isLoadingIndicatori}
          isLoadingContribuenti={isLoadingContribuenti}
          isLoadingIndicePrezzi={isLoadingIndicePrezzi}
          isLoadingAmbiente={isLoadingAmbiente}
          isLoadingCommercio={isLoadingCommercio}
          isLoadingCultura={isLoadingCultura}
          isLoadingMobilita={isLoadingMobilita}
          onOpenTimeSeries={handleOpenTimeSeriesMilano}
        />
      </Suspense>

      {/* Map Timeline Overlay - Lazy Loaded */}
      <Suspense fallback={null}>
        <MapTimelineOverlay
          isOpen={isTimelinePanelOpen}
          onClose={closeTimelinePanel}
          timelineData={timelineData}
          isLoading={isLoadingTimeline}
          currentIndex={timelineIndex}
          onIndexChange={setTimelineIndex}
          isPlaying={isTimelinePlaying}
          onPlayPause={handleTimelinePlayPause}
          timelineMetric={timelineMetric}
          onTimelineMetricChange={setTimelineMetric}
        />
      </Suspense>
    </div>
  )
}

export default App
