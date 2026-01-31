import { useState, useCallback, memo, useMemo, useEffect } from 'react'
import {
  X,
  Scale,
  TrendingUp,
  TrendingDown,
  Home,
  Euro,
  MapPin,
  BarChart3,
  Plus,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LineChart,
  Activity,
  Users,
  TreePine,
  Building2,
  Award,
  Target,
  Percent,
  ArrowUpDown,
  Sparkles,
  Crown,
  CheckCircle2,
  MinusCircle,
  Info
} from 'lucide-react'
import { formatPrice, formatVariation } from '../data/quartieriGeoJSON'
import { getPriceCategory } from '../data/quartieriData'
import { resolveQuartiereNil } from '../data/quartiereNilMapping'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

/**
 * Hook to fetch NIL analysis data for multiple quartieri
 */
const useCompareNilData = (compareList) => {
  const [data, setData] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!compareList || compareList.length === 0) {
      setData({})
      return
    }

    const fetchAll = async () => {
      setIsLoading(true)
      const results = {}
      
      await Promise.all(
        compareList.map(async (quartiere) => {
          const nilId = resolveQuartiereNil(quartiere)
          if (!nilId) return

          try {
            const response = await fetch(`${API_BASE_URL}/nil/${nilId}`)
            if (response.ok) {
              const nilData = await response.json()
              results[quartiere.id] = nilData
            }
          } catch (err) {
            console.error(`Error fetching NIL data for ${quartiere.id}:`, err)
          }
        })
      )
      
      setData(results)
      setIsLoading(false)
    }

    fetchAll()
  }, [compareList])

  return { data, isLoading }
}

/**
 * Format number with Italian locale
 */
const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Format percentage
 */
const formatPercent = (value, showSign = false) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Compare Badge Component
 */
const CompareBadge = memo(({ quartiere, onRemove, onClick, isActive, rank }) => {
  const handleRemove = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRemove && quartiere?.id) {
      onRemove(quartiere.id)
    }
  }, [onRemove, quartiere?.id])

  const handleClick = useCallback((e) => {
    e.preventDefault()
    if (onClick && quartiere) {
      onClick(quartiere)
    }
  }, [onClick, quartiere])

  if (!quartiere) return null

  return (
    <div
      className={`compare-badge group relative flex items-center gap-2 px-2.5 py-2 rounded-lg
                  bg-surface-card border border-white/[0.06]
                  transition-all duration-200 hover:scale-[1.02] min-w-0
                  ${isActive ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-card' : 'hover:bg-surface-elevated hover:border-white/10'}`}
    >
      {rank && (
        <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm
                        ${rank === 1 ? 'bg-amber-500 text-white' : rank === 2 ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white'}`}>
          {rank}
        </div>
      )}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/20"
        style={{ backgroundColor: quartiere.color }}
      />
      <span
        className="text-[13px] font-medium text-text-primary cursor-pointer hover:text-accent transition-colors truncate max-w-[100px]"
        onClick={handleClick}
        title={quartiere.name || quartiere.shortName}
      >
        {quartiere.shortName}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-negative-subtle rounded
                   transition-all duration-150 active:scale-90 ml-auto flex-shrink-0"
      >
        <X size={10} className="text-text-tertiary hover:text-negative" />
      </button>
    </div>
  )
})

/**
 * Metric Compare Card Component
 */
const MetricCompareCard = memo(({ 
  icon: Icon, 
  label, 
  items, 
  unit = '', 
  format = 'number',
  highlightMax = true,
  colorByValue = false,
  inverseHighlight = false
}) => {
  const values = items.map(i => parseFloat(i.value) || 0)
  const maxVal = Math.max(...values.filter(v => v > 0))
  const minVal = Math.min(...values.filter(v => v > 0))
  const maxIdx = highlightMax ? values.indexOf(maxVal) : -1
  const minIdx = highlightMax ? values.indexOf(minVal) : -1
  const bestIdx = inverseHighlight ? minIdx : maxIdx
  const worstIdx = inverseHighlight ? maxIdx : minIdx

  const formatValue = (val) => {
    if (format === 'currency') return formatPrice(val)
    if (format === 'percent') return formatPercent(val)
    if (format === 'decimal') return formatNumber(val, 2)
    return formatNumber(val)
  }

  return (
    <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="p-1 rounded-md bg-white/[0.05] flex-shrink-0">
          <Icon size={12} className="text-text-secondary" />
        </div>
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const percentage = maxVal > 0 ? (item.value / maxVal) * 100 : 0
          const isBest = idx === bestIdx && items.length > 1
          const isWorst = idx === worstIdx && items.length > 1

          return (
            <div key={item.id} className="group">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-text-tertiary truncate max-w-[80px]">{item.shortName}</span>
                  {isBest && (
                    <Crown size={9} className="text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[13px] font-semibold tabular-nums ${
                    isBest ? 'text-positive' : isWorst ? 'text-negative' : 'text-text-primary'
                  }`}>
                    {formatValue(item.value)}{unit}
                  </span>
                </div>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: colorByValue 
                      ? (isBest ? '#22c55e' : isWorst ? '#ef4444' : item.color)
                      : item.color 
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

/**
 * Comparison Table Row
 */
const CompareTableRow = ({ label, values, format = 'text', highlightBest = true, inverseHighlight = false }) => {
  const numericValues = values.map(v => {
    if (typeof v.value === 'number') return v.value
    const parsed = parseFloat(v.value)
    return isNaN(parsed) ? 0 : parsed
  })
  
  const validValues = numericValues.filter(v => v > 0)
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0
  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0
  
  const getBestIdx = () => {
    if (!highlightBest || validValues.length === 0) return -1
    const targetVal = inverseHighlight ? minVal : maxVal
    return numericValues.indexOf(targetVal)
  }
  
  const getWorstIdx = () => {
    if (!highlightBest || validValues.length < 2) return -1
    const targetVal = inverseHighlight ? maxVal : minVal
    return numericValues.indexOf(targetVal)
  }

  const formatDisplay = (val) => {
    if (val === null || val === undefined) return 'N/D'
    if (format === 'currency') return formatPrice(val)
    if (format === 'percent') return formatPercent(val, true)
    if (format === 'decimal') return typeof val === 'number' ? val.toFixed(2) : val
    if (format === 'number') return formatNumber(val)
    return val
  }

  const bestIdx = getBestIdx()
  const worstIdx = getWorstIdx()

  return (
    <div className="flex items-center py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] transition-colors -mx-1 px-1 rounded-md">
      <div className="flex-1 text-[11px] font-medium text-text-secondary min-w-0 truncate pr-2">{label}</div>
      <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
        {values.map((v, idx) => (
          <div key={idx} className="flex items-center gap-1 min-w-[70px] justify-end">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
            <span className={`text-[12px] font-semibold tabular-nums ${
              idx === bestIdx ? 'text-positive' : 
              idx === worstIdx ? 'text-negative' : 
              'text-text-primary'
            }`}>
              {formatDisplay(v.value)}
            </span>
            {idx === bestIdx && values.length > 1 && (
              <CheckCircle2 size={10} className="text-positive flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Delta Badge Component
 */
const DeltaBadge = ({ value, format = 'number', label }) => {
  if (value === null || value === undefined) return null
  
  const isPositive = value > 0
  const isNegative = value < 0
  
  const formatValue = () => {
    const absVal = Math.abs(value)
    if (format === 'percent') return `${absVal.toFixed(1)}%`
    if (format === 'currency') return formatPrice(absVal)
    return formatNumber(absVal)
  }
  
  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium
                    ${isPositive ? 'bg-positive-subtle text-positive' : 
                      isNegative ? 'bg-negative-subtle text-negative' : 
                      'bg-white/[0.05] text-text-secondary'}`}>
      {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : <MinusCircle size={10} />}
      <span>{isPositive ? '+' : isNegative ? '-' : ''}{formatValue()}</span>
      {label && <span className="text-text-tertiary ml-0.5">{label}</span>}
    </div>
  )
}

/**
 * Section Header Component
 */
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-2.5 mb-3">
    <div className="p-1.5 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex-shrink-0">
      <Icon size={14} className="text-accent" />
    </div>
    <div className="min-w-0">
      <h4 className="text-[13px] font-bold text-white truncate">{title}</h4>
      {subtitle && <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{subtitle}</p>}
    </div>
  </div>
)

/**
 * Investment Summary Card
 */
const InvestmentSummary = memo(({ compareList, nilData }) => {
  if (compareList.length < 2) return null

  const metrics = compareList.map(q => {
    const data = nilData[q.id] || {}
    const annualRent = (q.prezzoLocazioneMedio || 0) * 12
    const yieldPercent = q.prezzoAcquistoMedio > 0 ? (annualRent / q.prezzoAcquistoMedio) * 100 : 0
    
    return {
      id: q.id,
      name: q.shortName,
      color: q.color,
      prezzoAcquisto: q.prezzoAcquistoMedio || 0,
      yield: yieldPercent,
      qualitaVita: data.indice_qualita_vita || 0
    }
  })

  const bestYield = [...metrics].sort((a, b) => b.yield - a.yield)[0]
  const bestQuality = [...metrics].sort((a, b) => b.qualitaVita - a.qualitaVita)[0]
  const lowestPrice = [...metrics].sort((a, b) => a.prezzoAcquisto - b.prezzoAcquisto)[0]

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 
                    rounded-xl p-4 border border-amber-500/20 mt-3 flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-500/20 flex-shrink-0">
          <Sparkles size={14} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white">Sintesi Investimento</h4>
          <p className="text-[10px] text-text-tertiary">Analisi comparativa</p>
        </div>
      </div>

      <div className="space-y-2">
        {bestYield && bestYield.yield > 0 && (
          <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-lg p-2.5">
            <div className="p-1 rounded-md bg-positive-subtle flex-shrink-0">
              <Percent size={12} className="text-positive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-text-tertiary">Miglior rendimento</p>
              <p className="text-[13px] font-semibold text-white flex items-center gap-1.5 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: bestYield.color }} />
                <span className="truncate">{bestYield.name}</span>
                <span className="text-positive text-[11px] font-bold">{bestYield.yield.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        )}

        {bestQuality && bestQuality.qualitaVita > 0 && (
          <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-lg p-2.5">
            <div className="p-1 rounded-md bg-blue-500/20 flex-shrink-0">
              <Award size={12} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-text-tertiary">Miglior qualità vita</p>
              <p className="text-[13px] font-semibold text-white flex items-center gap-1.5 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: bestQuality.color }} />
                <span className="truncate">{bestQuality.name}</span>
                <span className="text-blue-400 text-[11px] font-bold">{bestQuality.qualitaVita.toFixed(1)}</span>
              </p>
            </div>
          </div>
        )}

        {lowestPrice && lowestPrice.prezzoAcquisto > 0 && (
          <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-lg p-2.5">
            <div className="p-1 rounded-md bg-accent/20 flex-shrink-0">
              <Target size={12} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-text-tertiary">Più accessibile</p>
              <p className="text-[13px] font-semibold text-white flex items-center gap-1.5 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: lowestPrice.color }} />
                <span className="truncate">{lowestPrice.name}</span>
                <span className="text-accent text-[11px] font-bold">{formatPrice(lowestPrice.prezzoAcquisto)}/mq</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

/**
 * Comparison Stat Row Component
 */
const ComparisonStatRow = ({ label, values, unit = '', isCurrency = false, isPercentage = false, highlightBest = true }) => {
  // Determine best value (highest for most stats, depends on context)
  const numericValues = values.map(v => parseFloat(v) || 0)
  const maxIndex = highlightBest ? numericValues.indexOf(Math.max(...numericValues)) : -1
  const minIndex = highlightBest ? numericValues.indexOf(Math.min(...numericValues)) : -1

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="text-xs text-text-secondary font-medium">{label}</div>
      <div className="flex gap-4">
        {values.map((value, index) => {
          const isMax = index === maxIndex && highlightBest
          const isMin = index === minIndex && highlightBest && values.length > 1

          let displayValue = value
          if (isCurrency) {
            displayValue = formatPrice(value)
          } else if (isPercentage) {
            displayValue = `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`
          }

          return (
            <div
              key={index}
              className={`text-xs font-semibold text-right min-w-[70px]
                          ${isMax ? 'text-positive' : ''} 
                          ${isMin ? 'text-negative' : ''}
                          ${!isMax && !isMin ? 'text-text-primary' : ''}`}
            >
              {displayValue}{unit}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Comparison Bar Chart Component
 */
const ComparisonBarChart = ({ label, items, maxValue }) => {
  return (
    <div className="space-y-2">
      <span className="text-xs text-text-secondary font-medium">{label}</span>
      {items.map((item, index) => {
        const percentage = (item.value / maxValue) * 100
        return (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
            <span className="text-xs text-text-primary font-medium w-16 text-right tabular-nums">
              {formatPrice(item.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Empty Compare State Component
 */
const EmptyCompareState = memo(({ onClose }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl 
                    flex items-center justify-center mb-4 border border-white/10">
      <Scale size={28} className="text-blue-400" />
    </div>
    <h3 className="text-white font-bold text-base mb-1.5">Confronta Quartieri</h3>
    <p className="text-text-secondary text-[13px] max-w-[280px] mb-4 leading-relaxed">
      Seleziona i quartieri dalla mappa per confrontare prezzi, demografia e qualità della vita
    </p>
    <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary bg-surface-card px-3 py-2 rounded-lg border border-white/[0.06]">
      <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded text-[10px] font-mono text-text-secondary">⌘</kbd>
      <span>+</span>
      <span className="font-medium text-text-secondary">Click</span>
      <span className="ml-0.5">per aggiungere</span>
    </div>
  </div>
))

/**
 * Compare Panel Component - Professional comparison tool for NIL quartieri
 */
const ComparePanel = ({
  compareList = [],
  onRemoveFromCompare,
  onClearCompare,
  onQuartiereClick,
  onClose,
  isExpanded,
  onToggleExpand,
  onOpenTimeSeriesCompare
}) => {
  const [activeSection, setActiveSection] = useState('prezzi')
  const { data: nilData, isLoading: isLoadingNil } = useCompareNilData(compareList)

  // Sections configuration
  const sections = useMemo(() => [
    { id: 'prezzi', label: 'Prezzi', icon: Euro },
    { id: 'demografia', label: 'Demografia', icon: Users },
    { id: 'qualita', label: 'Qualità', icon: Award },
    { id: 'trend', label: 'Trend', icon: TrendingUp }
  ], [])

  // Prepare comparison data with NIL enrichment
  const comparisonData = useMemo(() => {
    return compareList.filter(q => q).map((q, idx) => {
      const data = nilData[q.id] || {}
      const annualRent = (q.prezzoLocazioneMedio || 0) * 12
      const yieldPercent = q.prezzoAcquistoMedio > 0 ? (annualRent / q.prezzoAcquistoMedio) * 100 : 0
      
      return {
        ...q,
        nilData: data,
        yield: yieldPercent,
        rank: idx + 1
      }
    })
  }, [compareList, nilData])

  // Safe handlers with null checks
  const handleClearCompare = useCallback((e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (onClearCompare) {
      onClearCompare()
    }
  }, [onClearCompare])

  const handleClose = useCallback((e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (onClose) {
      onClose()
    }
  }, [onClose])

  const handleToggleExpand = useCallback((e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (onToggleExpand) {
      onToggleExpand()
    }
  }, [onToggleExpand])

  const handleOpenTimeSeries = useCallback((e) => {
    e?.preventDefault()
    if (onOpenTimeSeriesCompare && compareList.length >= 2) {
      onOpenTimeSeriesCompare()
    }
  }, [onOpenTimeSeriesCompare, compareList.length])

  if (!compareList || compareList.length === 0) {
    return (
      <div className="compare-panel animate-apple-fade-in rounded-2xl max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex-shrink-0">
              <Scale size={18} className="text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-base">Confronto</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 
                       hover:rotate-90 active:scale-90 flex-shrink-0"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <EmptyCompareState onClose={onClose} />
      </div>
    )
  }

  return (
    <div className={`compare-panel animate-apple-fade-in rounded-2xl flex flex-col ${isExpanded ? 'compare-panel-expanded max-h-[75vh]' : 'max-h-[200px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex-shrink-0">
            <Scale size={18} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-base truncate">Confronto Quartieri</h3>
            <p className="text-xs text-text-tertiary">{compareList.length} quartieri selezionati</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 active:scale-90"
            title={isExpanded ? 'Riduci' : 'Espandi'}
          >
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
          <button
            type="button"
            onClick={handleClearCompare}
            className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-300 active:scale-90"
            title="Svuota confronto"
          >
            <Trash2 size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 
                       hover:rotate-90 active:scale-90"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Selected Quartieri Badges */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        {comparisonData.map((quartiere, idx) => (
          <CompareBadge
            key={quartiere.id}
            quartiere={quartiere}
            onRemove={onRemoveFromCompare}
            onClick={onQuartiereClick}
            rank={compareList.length > 1 ? idx + 1 : null}
          />
        ))}
        {compareList.length < 4 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-white/10
                          hover:border-accent/30 hover:bg-accent/5 transition-all duration-200 cursor-pointer">
            <Plus size={12} className="text-text-tertiary" />
            <span className="text-[11px] text-text-tertiary font-medium">Aggiungi</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="animate-apple-slide-up space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {/* Time Series Comparison Button */}
          {compareList.length >= 2 && (
            <button
              type="button"
              onClick={handleOpenTimeSeries}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4
                         bg-gradient-to-r from-blue-500/15 to-purple-500/15
                         hover:from-blue-500/25 hover:to-purple-500/25
                         border border-blue-500/20 rounded-xl transition-all duration-300
                         group hover:scale-[1.01] active:scale-[0.99]
                         hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <LineChart size={14} className="text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-white">
                Confronta Serie Storiche
              </span>
              <Activity size={12} className="text-blue-400 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" />
            </button>
          )}

          {/* Section Tabs */}
          <div className="flex gap-0.5 p-1 bg-surface-card rounded-xl border border-white/[0.04] flex-shrink-0">
            {sections.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg 
                          text-[11px] font-semibold transition-all duration-200 min-w-0 ${activeSection === tab.id
                    ? 'bg-accent/20 text-accent shadow-sm'
                    : 'text-text-tertiary hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <tab.icon size={11} className="flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="space-y-3">
            {/* PREZZI Section */}
            {activeSection === 'prezzi' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <MetricCompareCard
                    icon={Home}
                    label="Acquisto €/mq"
                    items={comparisonData.map(q => ({
                      id: q.id,
                      shortName: q.shortName,
                      color: q.color,
                      value: q.prezzoAcquistoMedio || 0
                    }))}
                    format="currency"
                    inverseHighlight={true}
                    colorByValue={true}
                  />
                  <MetricCompareCard
                    icon={Building2}
                    label="Affitto €/mq"
                    items={comparisonData.map(q => ({
                      id: q.id,
                      shortName: q.shortName,
                      color: q.color,
                      value: q.prezzoLocazioneMedio || 0
                    }))}
                    format="decimal"
                    inverseHighlight={true}
                    colorByValue={true}
                  />
                </div>

                <MetricCompareCard
                  icon={Percent}
                  label="Rendimento Lordo Annuo"
                  items={comparisonData.map(q => ({
                    id: q.id,
                    shortName: q.shortName,
                    color: q.color,
                    value: q.yield
                  }))}
                  format="decimal"
                  unit="%"
                  colorByValue={true}
                />

                <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={12} className="text-text-secondary flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Dettaglio Prezzi</span>
                  </div>
                  <div className="space-y-1">
                    <CompareTableRow
                      label="Prezzo Acquisto"
                      values={comparisonData.map(q => ({ value: q.prezzoAcquistoMedio, color: q.color }))}
                      format="currency"
                      inverseHighlight={true}
                    />
                    <CompareTableRow
                      label="Prezzo Affitto"
                      values={comparisonData.map(q => ({ value: q.prezzoLocazioneMedio, color: q.color }))}
                      format="decimal"
                      inverseHighlight={true}
                    />
                    <CompareTableRow
                      label="Rendimento"
                      values={comparisonData.map(q => ({ value: q.yield, color: q.color }))}
                      format="decimal"
                    />
                    <CompareTableRow
                      label="Zona OMI"
                      values={comparisonData.map(q => ({ value: q.zone, color: q.color }))}
                      format="text"
                      highlightBest={false}
                    />
                    <CompareTableRow
                      label="Fascia"
                      values={comparisonData.map(q => ({ value: q.fascia, color: q.color }))}
                      format="text"
                      highlightBest={false}
                    />
                  </div>
                </div>

                {compareList.length === 2 && (
                  <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 
                                  rounded-xl p-4 border border-blue-500/20">
                    <SectionHeader
                      icon={ArrowUpDown}
                      title="Differenza"
                      subtitle="Confronto diretto tra i due quartieri"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-text-tertiary mb-1.5">Δ Prezzo Acquisto</p>
                        <DeltaBadge
                          value={(comparisonData[0]?.prezzoAcquistoMedio || 0) - (comparisonData[1]?.prezzoAcquistoMedio || 0)}
                          format="currency"
                          label="/mq"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-text-tertiary mb-1.5">Δ Prezzo Affitto</p>
                        <DeltaBadge
                          value={(comparisonData[0]?.prezzoLocazioneMedio || 0) - (comparisonData[1]?.prezzoLocazioneMedio || 0)}
                          format="decimal"
                          label="/mq"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-text-tertiary mb-1.5">Δ Rendimento</p>
                        <DeltaBadge
                          value={(comparisonData[0]?.yield || 0) - (comparisonData[1]?.yield || 0)}
                          format="percent"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-text-tertiary mb-1.5">% Differenza Prezzo</p>
                        <span className="text-base font-bold text-white">
                          {((Math.abs((comparisonData[0]?.prezzoAcquistoMedio || 0) - (comparisonData[1]?.prezzoAcquistoMedio || 0)) /
                            Math.min(comparisonData[0]?.prezzoAcquistoMedio || 1, comparisonData[1]?.prezzoAcquistoMedio || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* DEMOGRAFIA Section */}
            {activeSection === 'demografia' && (
              <>
                {isLoadingNil && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!isLoadingNil && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <MetricCompareCard
                        icon={Users}
                        label="Popolazione"
                        items={comparisonData.map(q => ({
                          id: q.id,
                          shortName: q.shortName,
                          color: q.color,
                          value: q.nilData?.popolazione_totale || 0
                        }))}
                        format="number"
                      />
                      <MetricCompareCard
                        icon={MapPin}
                        label="Densità ab/km²"
                        items={comparisonData.map(q => ({
                          id: q.id,
                          shortName: q.shortName,
                          color: q.color,
                          value: q.nilData?.densita_abitanti_km2 || 0
                        }))}
                        format="number"
                      />
                    </div>

                    <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={12} className="text-text-secondary flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Statistiche Demografiche</span>
                      </div>
                      <div className="space-y-1">
                        <CompareTableRow
                          label="Popolazione Totale"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.popolazione_totale || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="% Stranieri"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.pct_stranieri || 0, 
                            color: q.color 
                          }))}
                          format="decimal"
                        />
                        <CompareTableRow
                          label="Famiglie"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.famiglie_registrate_in_anagrafe || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="Famiglie Mono"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.famiglie_unipersonali_registrate_in_anagrafe || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="Area km²"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.area_km2 || 0, 
                            color: q.color 
                          }))}
                          format="decimal"
                          highlightBest={false}
                        />
                      </div>
                    </div>

                    <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity size={12} className="text-text-secondary flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Dinamica Demografica</span>
                      </div>
                      <div className="space-y-1">
                        <CompareTableRow
                          label="Nati"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.nati_vivi || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="Morti"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.morti || 0, 
                            color: q.color 
                          }))}
                          format="number"
                          inverseHighlight={true}
                        />
                        <CompareTableRow
                          label="Immigrati"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.immigrati || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="Emigrati"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.emigrati || 0, 
                            color: q.color 
                          }))}
                          format="number"
                          inverseHighlight={true}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* QUALITA Section */}
            {activeSection === 'qualita' && (
              <>
                {isLoadingNil && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!isLoadingNil && (
                  <>
                    <MetricCompareCard
                      icon={Award}
                      label="Indice Qualità della Vita"
                      items={comparisonData.map(q => ({
                        id: q.id,
                        shortName: q.shortName,
                        color: q.color,
                        value: q.nilData?.indice_qualita_vita || 0
                      }))}
                      format="decimal"
                      colorByValue={true}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <MetricCompareCard
                        icon={TreePine}
                        label="Indice Verde"
                        items={comparisonData.map(q => ({
                          id: q.id,
                          shortName: q.shortName,
                          color: q.color,
                          value: q.nilData?.indice_verde_medio || 0
                        }))}
                        format="decimal"
                        colorByValue={true}
                      />
                      <MetricCompareCard
                        icon={Building2}
                        label="N. Scuole"
                        items={comparisonData.map(q => ({
                          id: q.id,
                          shortName: q.shortName,
                          color: q.color,
                          value: q.nilData?.numero_scuole || 0
                        }))}
                        format="number"
                      />
                    </div>

                    <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={12} className="text-text-secondary flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Servizi & Infrastrutture</span>
                      </div>
                      <div className="space-y-1">
                        <CompareTableRow
                          label="Indice Qualità Vita"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.indice_qualita_vita || 0, 
                            color: q.color 
                          }))}
                          format="decimal"
                        />
                        <CompareTableRow
                          label="Indice Verde"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.indice_verde_medio || 0, 
                            color: q.color 
                          }))}
                          format="decimal"
                        />
                        <CompareTableRow
                          label="Scuole"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.numero_scuole || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                        <CompareTableRow
                          label="Mercati"
                          values={comparisonData.map(q => ({ 
                            value: q.nilData?.numero_mercati || 0, 
                            color: q.color 
                          }))}
                          format="number"
                        />
                      </div>
                    </div>

                    {comparisonData.some(q => q.nilData?.cluster_nome) && (
                      <div className="bg-surface-card rounded-xl p-3 border border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-3">
                          <Target size={12} className="text-text-secondary flex-shrink-0" />
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Classificazione Cluster</span>
                        </div>
                        <div className="space-y-2">
                          {comparisonData.map(q => (
                            <div key={q.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: q.color }} />
                                <span className="text-sm text-text-primary font-medium truncate">{q.shortName}</span>
                              </div>
                              <span className="text-[11px] text-text-secondary bg-white/[0.05] px-2 py-0.5 rounded-md flex-shrink-0">
                                {q.nilData?.cluster_nome || 'N/D'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* TREND Section */}
            {activeSection === 'trend' && (
              <>
                <div className="space-y-2">
                  {comparisonData.map(quartiere => {
                    const isPositive = (quartiere.variazioneSemestrale || 0) >= 0
                    const TrendIcon = isPositive ? TrendingUp : TrendingDown
                    const nilDataQ = quartiere.nilData || {}
                    const saldoNaturale = (nilDataQ.nati_vivi || 0) - (nilDataQ.morti || 0)
                    const saldoMigratorio = (nilDataQ.immigrati || 0) - (nilDataQ.emigrati || 0)

                    return (
                      <div
                        key={quartiere.id}
                        className="bg-surface-card rounded-xl p-3 border border-white/[0.04]
                                   hover:border-white/[0.08] transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full ring-2 ring-white/20 flex-shrink-0"
                              style={{ backgroundColor: quartiere.color }}
                            />
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {quartiere.shortName}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg flex-shrink-0
                                          ${isPositive ? 'bg-positive-subtle text-positive' : 'bg-negative-subtle text-negative'}`}>
                            <TrendIcon size={12} />
                            <span className="text-sm font-bold tabular-nums">
                              {isPositive ? '+' : ''}{(quartiere.variazioneSemestrale || 0).toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {!isLoadingNil && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] text-text-tertiary mb-1">Saldo Naturale</p>
                              <DeltaBadge value={saldoNaturale} format="number" />
                            </div>
                            <div>
                              <p className="text-[11px] text-text-tertiary mb-1">Saldo Migratorio</p>
                              <DeltaBadge value={saldoMigratorio} format="number" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-text-tertiary bg-surface-card rounded-lg p-2.5 border border-white/[0.04]">
                  <Info size={11} />
                  <span>Variazione semestrale vs periodo precedente</span>
                </div>
              </>
            )}
          </div>

          {/* Investment Summary */}
          {compareList.length >= 2 && (
            <InvestmentSummary compareList={compareList} nilData={nilData} />
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ComparePanel)
