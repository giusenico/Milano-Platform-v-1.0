import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Play,
  Pause,
  Calendar,
  TrendingUp,
  TrendingDown,
  Euro,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Home,
  Percent
} from 'lucide-react'
import { formatPrice } from '../data/quartieriGeoJSON'

// Timeline metric options
const TIMELINE_METRICS = [
  { id: 'prezzoAcquisto', label: 'Acquisto', icon: Euro },
  { id: 'prezzoLocazione', label: 'Affitto', icon: Home },
  { id: 'rendimento', label: 'Yield', icon: Percent },
  { id: 'variazione', label: 'Trend', icon: TrendingUp }
]

/**
 * MapTimelineOverlay - Weather-style timeline slider overlay on top of the map
 * 
 * This component displays a floating overlay with a timeline slider that
 * allows users to scrub through historical price data, updating the map
 * colors in real-time like a weather forecast animation.
 */
const MapTimelineOverlay = ({
  isOpen,
  onClose,
  timelineData,
  isLoading = false,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  timelineMetric = 'prezzoAcquisto',
  onTimelineMetricChange
}) => {
  const semesters = useMemo(() =>
    timelineData?.semesters || [],
    [timelineData]
  )

  const currentData = useMemo(() =>
    timelineData?.timeline?.[currentIndex] || null,
    [timelineData, currentIndex]
  )

  const prevData = useMemo(() =>
    currentIndex > 0 ? timelineData?.timeline?.[currentIndex - 1] : null,
    [timelineData, currentIndex]
  )

  // Get the current metric's stats
  const getMetricValue = useCallback((data) => {
    if (!data?.stats) return null
    switch (timelineMetric) {
      case 'prezzoLocazione':
        return data.stats.prezzoMedioLocazione
      case 'rendimento':
        // Rendimento = (Affitto annuale / Prezzo acquisto) * 100
        if (data.stats.prezzoMedioLocazione && data.stats.prezzoMedioAcquisto) {
          return (data.stats.prezzoMedioLocazione * 12 / data.stats.prezzoMedioAcquisto) * 100
        }
        return null
      case 'variazione':
        // For trend, we'll use the actual semester variation if available
        return 0 // Will be calculated from previous semester
      case 'prezzoAcquisto':
      default:
        return data.stats.prezzoMedioAcquisto
    }
  }, [timelineMetric])

  // Current metric value
  const currentMetricValue = useMemo(() =>
    getMetricValue(currentData),
    [currentData, getMetricValue]
  )

  const prevMetricValue = useMemo(() =>
    getMetricValue(prevData),
    [prevData, getMetricValue]
  )

  // Calculate variation from previous semester
  const variation = useMemo(() => {
    if (!currentMetricValue || !prevMetricValue) return 0
    return ((currentMetricValue - prevMetricValue) / prevMetricValue) * 100
  }, [currentMetricValue, prevMetricValue])

  // Format the current metric display
  const formatMetricValue = useCallback((value) => {
    if (value === null || value === undefined) return 'N/D'
    switch (timelineMetric) {
      case 'prezzoLocazione':
        return `€${value.toFixed(1)}`
      case 'rendimento':
        return `${value.toFixed(2)}%`
      case 'variazione':
        return `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`
      case 'prezzoAcquisto':
      default:
        return formatPrice(value)
    }
  }, [timelineMetric, variation])

  // Get metric unit
  const getMetricUnit = useCallback(() => {
    switch (timelineMetric) {
      case 'prezzoLocazione':
        return '/mq mese'
      case 'rendimento':
        return 'annuo'
      case 'variazione':
        return 'vs prec.'
      case 'prezzoAcquisto':
      default:
        return '/mq'
    }
  }, [timelineMetric])

  // Get title for current metric
  const getMetricTitle = useCallback(() => {
    switch (timelineMetric) {
      case 'prezzoLocazione':
        return 'Timeline Affitti'
      case 'rendimento':
        return 'Timeline Yield'
      case 'variazione':
        return 'Timeline Trend'
      case 'prezzoAcquisto':
      default:
        return 'Timeline Prezzi'
    }
  }, [timelineMetric])

  const handleStepBack = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    }
  }, [currentIndex, onIndexChange])

  const handleStepForward = useCallback(() => {
    if (currentIndex < semesters.length - 1) {
      onIndexChange(currentIndex + 1)
    }
  }, [currentIndex, semesters.length, onIndexChange])

  const progress = semesters.length > 1
    ? (currentIndex / (semesters.length - 1)) * 100
    : 0

  if (!isOpen) return null

  return (
    <div className="map-timeline-overlay">
      <div className={`timeline-overlay-container ${isLoading ? 'loading' : ''} flex flex-col gap-2`}>

        {/* Top Row: Metrics and Stats */}
        <div className="flex items-center justify-between w-full gap-3 border-b border-white/5 pb-2">
          {/* Left: Metric Tabs */}
          <div className="timeline-metric-tabs">
            {TIMELINE_METRICS.map(metric => {
              const Icon = metric.icon
              return (
                <button
                  key={metric.id}
                  onClick={() => onTimelineMetricChange?.(metric.id)}
                  className={`timeline-metric-tab ${timelineMetric === metric.id ? 'active' : ''}`}
                  title={metric.label}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{metric.label}</span>
                </button>
              )
            })}
          </div>

          {/* Right: Current Stats & Close */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {currentData && (
              <div className="flex items-center gap-3 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{getMetricTitle()}</span>
                  <div className="h-3 w-px bg-white/10" />
                  <span className="text-sm font-bold text-white font-mono">
                    {formatMetricValue(currentMetricValue)}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">{getMetricUnit()}</span>
                </div>

                {variation !== 0 && timelineMetric !== 'variazione' && (
                  <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${variation >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {variation >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    <span>{variation >= 0 ? '+' : ''}{variation.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Chiudi timeline"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Row: Controls & Slider */}
        <div className="flex items-center gap-3 w-full pt-1">
          {/* Controls Group */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleStepBack}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
              title="Precedente"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={onPlayPause}
              className={`p-2.5 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center
                ${isPlaying
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-600 text-white shadow-blue-500/30'}`}
              title={isPlaying ? 'Pausa' : 'Riproduci'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentIndex === semesters.length - 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
              title="Successivo"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Slider Date Display */}
          <div className="flex items-center gap-2 min-w-[90px] justify-center bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5 flex-shrink-0">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              {semesters[currentIndex]?.replace('_', ' H') || '-'}
            </span>
          </div>

          {/* Slider Track */}
          <div className="timeline-slider-track-container">
            <div className="timeline-slider-track">
              {/* Progress Fill */}
              <div
                className="timeline-slider-fill"
                style={{ width: `${progress}%` }}
              />

              {/* Dot Markers */}
              {semesters.map((sem, idx) => {
                const dotPosition = semesters.length > 1
                  ? (idx / (semesters.length - 1)) * 100
                  : 0
                return (
                  <button
                    key={sem}
                    onClick={() => onIndexChange(idx)}
                    className={`timeline-slider-dot ${idx === currentIndex ? 'active' : ''
                      } ${idx < currentIndex ? 'passed' : ''}`}
                    style={{ left: `${dotPosition}%` }}
                    title={sem.replace('_', ' H')}
                  />
                )
              })}

              {/* Draggable Thumb */}
              <div
                className="timeline-slider-thumb"
                style={{ left: `${progress}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, semesters.length - 1)}
              value={currentIndex}
              onChange={(e) => onIndexChange(Number(e.target.value))}
              className="timeline-range-input-overlay"
            />
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <div className="timeline-loading-spinner-small" />
          </div>
        )}
      </div>

      {/* Stats legend integrated at the bottom of the container */}
      {currentData && timelineMetric === 'prezzoAcquisto' && (
        <div className="flex items-center justify-center gap-4 pt-1 border-t border-white/5 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400/80 font-medium">Min: {formatPrice(currentData.stats.prezzoMin)}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-red-400/80 font-medium">Max: {formatPrice(currentData.stats.prezzoMax)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapTimelineOverlay
