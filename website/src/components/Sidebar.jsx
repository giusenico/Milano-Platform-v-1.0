import { useState, useCallback, useEffect } from 'react'
import { Clock, Scale } from 'lucide-react'
import ComparePanel from './ComparePanel'
import QuartiereDetailPanel from './QuartiereDetailPanel'
import MilanoDataViewer from './MilanoDataViewer'
import MapMetricSelector from './MapMetricSelector'

/**
 * Sidebar Component - Dynamic Island Style (Apple-inspired)
 */
const Sidebar = ({
  selectedData,
  selectedQuartiere,
  onQuartiereDeselect,
  compareList = [],
  isCompareMode,
  onToggleCompareMode,
  onRemoveFromCompare,
  onClearCompare,
  onFlyToQuartiere,
  onOpenTimeSeriesQuartiere,
  onOpenTimeSeriesCompare,
  onOpenTimelinePanel,
  onOpenCategoryDetail,
  activeCategory,
  mapMetric,
  onMapMetricChange,
  milanoStats,
  dataOverview,
  popolazioneData,
  nilAnalisiData,
  isLoadingNilAnalisi
}) => {
  const [showComparePanel, setShowComparePanel] = useState(false)
  const [isComparePanelExpanded, setIsComparePanelExpanded] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-collapse on small screens on mount
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on screens smaller than 1024px
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      } else {
        setIsCollapsed(false)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-show compare panel when items are added
  useEffect(() => {
    if (compareList.length > 0) {
      setShowComparePanel(true)
      setIsCollapsed(false) // Expand sidebar if comparing
    }
  }, [compareList.length])

  // Safe handler for compare mode toggle
  const handleCompareToggle = useCallback(() => {
    if (compareList.length > 0 || showComparePanel) {
      setShowComparePanel(prev => !prev)
    } else {
      onToggleCompareMode?.()
    }
  }, [compareList.length, showComparePanel, onToggleCompareMode])

  // Safe handler for clearing compare
  const handleClearCompare = useCallback(() => {
    setShowComparePanel(false)
    onClearCompare?.()
  }, [onClearCompare])

  // Safe handler for closing compare panel
  const handleCloseComparePanel = useCallback(() => {
    setShowComparePanel(false)
    if (isCompareMode) {
      onToggleCompareMode?.()
    }
  }, [isCompareMode, onToggleCompareMode])

  return (
    <>
      {/* Collapse Toggle Button (Visible when collapsed) */}
      <button
        onClick={() => setIsCollapsed(false)}
        className={`fixed left-4 top-4 z-50 p-3 rounded-xl 
                   bg-black/40 backdrop-blur-md border border-white/10
                   text-white hover:bg-black/60 transition-all duration-500 ease-out
                   shadow-lg hover:shadow-xl hover:scale-105 group
                   ${!isCollapsed ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100 translate-x-0'}`}
        title="Espandi Sidebar"
      >
        <div className="w-5 h-5 flex flex-col justify-center gap-1.5 group-hover:gap-2 transition-all">
          <div className="w-full h-0.5 bg-white rounded-full transition-all group-hover:bg-blue-400" />
          <div className="w-full h-0.5 bg-white rounded-full transition-all group-hover:bg-blue-400" />
          <div className="w-full h-0.5 bg-white rounded-full transition-all group-hover:bg-blue-400" />
        </div>
      </button>

      <aside
        className={`dynamic-island absolute left-4 top-4 bottom-4 
                   transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
                   rounded-3xl shadow-island overflow-hidden z-40
                   flex flex-col border border-white/10
                   glass-premium
                   ${isCollapsed ? '-translate-x-[120%] opacity-0 pointer-events-none w-0' : 'w-96 opacity-100 translate-x-0'}`}
      >
        {/* Header */}
        <header className="px-5 py-5 border-b border-white/5 flex-shrink-0 bg-black/10 backdrop-blur-md relative overflow-hidden">
          {/* Animated aurora background */}
          <div className="absolute inset-0 aurora-bg opacity-30" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full pulse-ring shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none text-gradient-animated">
                  Milano Urban Data
                </h1>
                <p className="text-[11px] text-gray-400 font-medium mt-1 animate-fade-in">
                  Quotazioni immobiliari 2025
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Timeline Button */}
              <button
                onClick={onOpenTimelinePanel}
                className="p-2.5 rounded-xl transition-all duration-300 
                        bg-gradient-to-br from-purple-500/10 to-blue-500/10 
                        text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 
                        hover:scale-110 active:scale-95
                        border border-purple-500/10 hover:border-purple-500/20
                        magnetic-btn ripple-effect hover:shadow-lg hover:shadow-purple-500/20"
                title="Timeline Prezzi Milano"
              >
                <Clock size={18} className="drop-shadow-sm transition-transform duration-300 group-hover:rotate-12" />
              </button>

              {/* Compare Mode Toggle */}
              <button
                onClick={handleCompareToggle}
                className={`p-2.5 rounded-xl transition-all duration-300 relative
                         hover:scale-105 active:scale-95 ${isCompareMode || compareList.length > 0
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                  }`}
                title="Modalità Confronto"
              >
                <Scale size={18} className="drop-shadow-sm" />
                {compareList.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 
                               rounded-full text-[10px] text-white flex items-center justify-center
                               font-bold shadow-lg shadow-blue-500/50 animate-apple-bounce">
                    {compareList.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
          <section className="p-5 border-b border-white/5">
            <MapMetricSelector value={mapMetric} onChange={onMapMetricChange} />
          </section>

          {/* Compare Panel */}
          {(showComparePanel || compareList.length > 0) && (
            <section className="p-5 border-b border-white/5 bg-white/[0.02]">
              <ComparePanel
                compareList={compareList}
                onRemoveFromCompare={onRemoveFromCompare}
                onClearCompare={handleClearCompare}
                onQuartiereClick={onFlyToQuartiere}
                onClose={handleCloseComparePanel}
                isExpanded={isComparePanelExpanded}
                onToggleExpand={() => setIsComparePanelExpanded(!isComparePanelExpanded)}
                onOpenTimeSeriesCompare={onOpenTimeSeriesCompare}
              />
            </section>
          )}

          {/* Main Content */}
          <section className="p-5">
            {selectedQuartiere ? (
              <QuartiereDetailPanel
                quartiere={selectedQuartiere}
                onClose={onQuartiereDeselect}
                onOpenTimeSeries={onOpenTimeSeriesQuartiere}
                popolazioneData={popolazioneData}
                milanoStats={milanoStats}
                nilAnalisiData={nilAnalisiData}
                isLoadingNilAnalisi={isLoadingNilAnalisi}
              />
            ) : (
              <MilanoDataViewer
                onOpenCategoryDetail={onOpenCategoryDetail}
                milanoStats={milanoStats}
                dataOverview={dataOverview}
                activeCategory={activeCategory}
              />
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="px-5 py-4 border-t border-white/5 bg-black/20 backdrop-blur-xl flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer-fast" style={{ animationDuration: '3s' }} />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-gray-600 font-medium tracking-wide uppercase animated-underline">
              Powered by SQLite & GeoJSON
            </span>
            <div className="flex items-center gap-3">
              {compareList.length > 0 && (
                <span className="text-[10px] text-blue-400 font-semibold px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/10 neon-pulse">
                  {compareList.length} selezionati
                </span>
              )}
              <span className="text-[10px] text-gray-600 font-medium float-animation" style={{ animationDuration: '4s' }}>v3.2.0</span>
            </div>
          </div>
        </footer>
      </aside>
    </>
  )
}

export default Sidebar
