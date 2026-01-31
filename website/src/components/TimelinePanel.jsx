import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Calendar,
  TrendingUp,
  TrendingDown,
  Home,
  Euro,
  MapPin,
  Activity,
  Rewind,
  FastForward
} from 'lucide-react'
import { formatPrice } from '../data/quartieriGeoJSON'
import { getPriceColor, getPriceCategory } from '../data/quartieriData'

/**
 * Timeline Slider Component
 */
const TimelineSlider = ({ 
  semesters, 
  currentIndex, 
  onChange, 
  isPlaying, 
  onPlayPause,
  onStepBack,
  onStepForward 
}) => {
  const progress = semesters.length > 1 
    ? (currentIndex / (semesters.length - 1)) * 100 
    : 0

  return (
    <div className="timeline-slider-container">
      {/* Control Buttons */}
      <div className="timeline-controls">
        <button 
          onClick={onStepBack}
          disabled={currentIndex === 0}
          className="timeline-btn"
          title="Semestre precedente"
        >
          <Rewind size={16} />
        </button>
        
        <button 
          onClick={onPlayPause}
          className="timeline-play-btn"
          title={isPlaying ? 'Pausa' : 'Riproduci'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        
        <button 
          onClick={onStepForward}
          disabled={currentIndex === semesters.length - 1}
          className="timeline-btn"
          title="Semestre successivo"
        >
          <FastForward size={16} />
        </button>
      </div>

      {/* Slider */}
      <div className="timeline-slider-wrapper">
        <div className="timeline-track">
          <div 
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          />
          {semesters.map((sem, idx) => (
            <button
              key={sem}
              onClick={() => onChange(idx)}
              className={`timeline-dot ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'passed' : ''}`}
              style={{ left: `${(idx / (semesters.length - 1)) * 100}%` }}
              title={sem.replace('_', ' H')}
            />
          ))}
        </div>
        
        <input
          type="range"
          min={0}
          max={semesters.length - 1}
          value={currentIndex}
          onChange={(e) => onChange(Number(e.target.value))}
          className="timeline-range-input"
        />
      </div>

      {/* Current Period Label */}
      <div className="timeline-label">
        <Calendar size={14} />
        <span className="timeline-period">
          {semesters[currentIndex]?.replace('_', ' H') || '-'}
        </span>
      </div>
    </div>
  )
}

/**
 * Stats Card for Timeline
 */
const TimelineStatCard = ({ label, value, subValue, trend, color, icon: Icon }) => {
  const isPositive = trend >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400'

  return (
    <div className="timeline-stat-card">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-white">{value}</span>
        {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
          <TrendIcon size={10} />
          <span className="text-[10px] font-medium">
            {isPositive ? '+' : ''}{trend.toFixed(1)}% vs prev
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Quartiere Price Card
 */
const QuartierePriceCard = ({ quartiere, prevPrice, onClick }) => {
  const priceChange = prevPrice 
    ? ((quartiere.prezzoAcquisto - prevPrice) / prevPrice) * 100 
    : 0
  const category = getPriceCategory(quartiere.prezzoAcquisto)
  const isPositive = priceChange >= 0

  return (
    <button 
      onClick={() => onClick?.(quartiere)}
      className="quartiere-price-card group"
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">
          {quartiere.quartiere.split(',')[0].replace(/'/g, '').substring(0, 25)}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">
          {formatPrice(quartiere.prezzoAcquisto)}
        </span>
        {prevPrice && (
          <span className={`text-[10px] font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * Timeline Panel Component
 * Weather-style visualization with time slider
 */
const TimelinePanel = ({ 
  isOpen, 
  onClose, 
  timelineData,
  isLoading = false,
  onQuartiereClick
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sortBy, setSortBy] = useState('price-desc') // 'price-desc', 'price-asc', 'change-desc', 'change-asc', 'name'

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

  // Create a map of previous prices for comparison
  const prevPricesMap = useMemo(() => {
    if (!prevData) return {}
    const map = {}
    prevData.quartieri?.forEach(q => {
      map[q.quartiereId] = q.prezzoAcquisto
    })
    return map
  }, [prevData])

  // Calculate variation from previous semester
  const variation = useMemo(() => {
    if (!currentData || !prevData) return 0
    return ((currentData.stats.prezzoMedioAcquisto - prevData.stats.prezzoMedioAcquisto) / 
            prevData.stats.prezzoMedioAcquisto) * 100
  }, [currentData, prevData])

  // Sort quartieri
  const sortedQuartieri = useMemo(() => {
    if (!currentData?.quartieri) return []
    
    const withChanges = currentData.quartieri.map(q => ({
      ...q,
      change: prevPricesMap[q.quartiereId] 
        ? ((q.prezzoAcquisto - prevPricesMap[q.quartiereId]) / prevPricesMap[q.quartiereId]) * 100
        : 0
    }))

    switch (sortBy) {
      case 'price-desc':
        return [...withChanges].sort((a, b) => b.prezzoAcquisto - a.prezzoAcquisto)
      case 'price-asc':
        return [...withChanges].sort((a, b) => a.prezzoAcquisto - b.prezzoAcquisto)
      case 'change-desc':
        return [...withChanges].sort((a, b) => b.change - a.change)
      case 'change-asc':
        return [...withChanges].sort((a, b) => a.change - b.change)
      case 'name':
        return [...withChanges].sort((a, b) => a.quartiere.localeCompare(b.quartiere))
      default:
        return withChanges
    }
  }, [currentData, sortBy, prevPricesMap])

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || semesters.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= semesters.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1500) // 1.5 seconds per semester

    return () => clearInterval(interval)
  }, [isPlaying, semesters.length])

  // Reset to last semester when data changes
  useEffect(() => {
    if (semesters.length > 0) {
      setCurrentIndex(semesters.length - 1)
    }
  }, [semesters.length])

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && currentIndex >= semesters.length - 1) {
      setCurrentIndex(0)
    }
    setIsPlaying(prev => !prev)
  }, [isPlaying, currentIndex, semesters.length])

  const handleStepBack = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const handleStepForward = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(prev => Math.min(semesters.length - 1, prev + 1))
  }, [semesters.length])

  if (!isOpen) return null

  return (
    <div className={`timeline-panel ${isOpen ? 'timeline-panel-open' : ''}`}>
      {/* Backdrop */}
      <div className="timeline-panel-backdrop" onClick={onClose} />
      
      {/* Panel Content */}
      <div className="timeline-panel-content">
        {/* Header */}
        <div className="timeline-panel-header">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="timeline-close-btn">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                Timeline Prezzi Milano
              </h2>
              <p className="text-xs text-gray-400">
                Visualizza l'andamento storico dei prezzi per tutti i quartieri
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="timeline-loading">
            <div className="timeline-loading-spinner" />
            <p className="text-sm text-gray-400 mt-4">Caricamento dati timeline...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && currentData && (
          <div className="timeline-panel-body">
            {/* Timeline Slider */}
            <TimelineSlider 
              semesters={semesters}
              currentIndex={currentIndex}
              onChange={setCurrentIndex}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
            />

            {/* Stats Row */}
            <div className="timeline-stats-grid">
              <TimelineStatCard 
                label="Prezzo Medio"
                value={formatPrice(currentData.stats.prezzoMedioAcquisto)}
                subValue="/mq"
                trend={variation}
                color="#3b82f6"
                icon={Euro}
              />
              <TimelineStatCard 
                label="Prezzo Max"
                value={formatPrice(currentData.stats.prezzoMax)}
                subValue="/mq"
                color="#ef4444"
                icon={TrendingUp}
              />
              <TimelineStatCard 
                label="Prezzo Min"
                value={formatPrice(currentData.stats.prezzoMin)}
                subValue="/mq"
                color="#22c55e"
                icon={TrendingDown}
              />
              <TimelineStatCard 
                label="Quartieri"
                value={currentData.stats.totaleQuartieri}
                color="#8b5cf6"
                icon={MapPin}
              />
            </div>

            {/* Sort Controls */}
            <div className="timeline-sort-controls">
              <span className="text-xs text-gray-500">Ordina per:</span>
              <div className="timeline-sort-buttons">
                <button 
                  onClick={() => setSortBy('price-desc')}
                  className={`timeline-sort-btn ${sortBy === 'price-desc' ? 'active' : ''}`}
                >
                  Prezzo ↓
                </button>
                <button 
                  onClick={() => setSortBy('price-asc')}
                  className={`timeline-sort-btn ${sortBy === 'price-asc' ? 'active' : ''}`}
                >
                  Prezzo ↑
                </button>
                <button 
                  onClick={() => setSortBy('change-desc')}
                  className={`timeline-sort-btn ${sortBy === 'change-desc' ? 'active' : ''}`}
                >
                  Variazione ↓
                </button>
                <button 
                  onClick={() => setSortBy('change-asc')}
                  className={`timeline-sort-btn ${sortBy === 'change-asc' ? 'active' : ''}`}
                >
                  Variazione ↑
                </button>
              </div>
            </div>

            {/* Quartieri Grid */}
            <div className="timeline-quartieri-grid">
              {sortedQuartieri.map(quartiere => (
                <QuartierePriceCard 
                  key={quartiere.quartiereId}
                  quartiere={quartiere}
                  prevPrice={prevPricesMap[quartiere.quartiereId]}
                  onClick={onQuartiereClick}
                />
              ))}
            </div>

            {/* Period Info */}
            <div className="timeline-period-info">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-xs text-gray-500">
                Periodo: {semesters[0]?.replace('_', ' H')} - {semesters[semesters.length - 1]?.replace('_', ' H')}
              </span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">
                {semesters.length} semestri disponibili
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelinePanel
