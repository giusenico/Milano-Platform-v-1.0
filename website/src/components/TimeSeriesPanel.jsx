import { useState, useCallback } from 'react'
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
  Euro,
  Home
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { formatPrice } from '../data/quartieriGeoJSON'
import { getPriceCategory } from '../data/quartieriData'

/**
 * Custom Tooltip for Charts
 */
const CustomTooltip = ({ active, payload, label, type = 'acquisto' }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <div className="tooltip-values">
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-row">
            <span
              className="tooltip-dot"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value" style={{ color: entry.color }}>
              {type === 'acquisto' ? formatPrice(entry.value) : `€${entry.value.toFixed(2)}`}
              {type === 'acquisto' ? '/mq' : '/mq/mese'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Stat Card Component - Apple-inspired clean KPI card
 */
const StatCard = ({ label, value, subValue, trend, color, icon: Icon }) => {
  const isPositive = trend >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="bg-surface-card rounded-xl p-3 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-accent-muted)' }}>
          <Icon size={14} style={{ color: 'var(--color-accent)' }} />
        </div>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xl font-semibold text-text-primary">{value}</span>
          {subValue && <span className="text-xs text-text-tertiary ml-1">{subValue}</span>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md
                          ${isPositive ? 'bg-positive-subtle text-positive' : 'bg-negative-subtle text-negative'}`}>
            <TrendIcon size={12} />
            <span className="text-xs font-medium">
              {isPositive ? '+' : ''}{trend.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Time Series Panel Component
 * Apple-style animated sliding panel for time series visualization
 */
const TimeSeriesPanel = ({
  isOpen,
  onClose,
  quartiere = null,
  milanoStats = null,
  timeSeriesData = null,
  isLoading = false,
  compareMode = false,
  compareData = []
}) => {
  const [activeChart, setActiveChart] = useState('acquisto')
  const [chartType, setChartType] = useState('area')

  // Calculate stats from time series
  const calculateStats = useCallback((data) => {
    if (!data || data.length < 2) return null

    const first = data[0]
    const last = data[data.length - 1]
    const variation = ((last.prezzoAcquisto - first.prezzoAcquisto) / first.prezzoAcquisto) * 100
    const avgPrice = data.reduce((sum, d) => sum + d.prezzoAcquisto, 0) / data.length
    const maxPrice = Math.max(...data.map(d => d.prezzoAcquisto))
    const minPrice = Math.min(...data.map(d => d.prezzoAcquisto))

    return {
      variazioneTotale: variation,
      prezzoMedio: avgPrice,
      prezzoMax: maxPrice,
      prezzoMin: minPrice,
      prezzoAttuale: last.prezzoAcquisto,
      prezzoIniziale: first.prezzoAcquisto
    }
  }, [])

  const stats = timeSeriesData?.data ? calculateStats(timeSeriesData.data) : null
  const category = quartiere ? getPriceCategory(quartiere.prezzoAcquistoMedio) : null

  // Colors for comparison charts
  const comparisonColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']

  if (!isOpen) return null

  return (
    <div className={`ts-panel ${isOpen ? 'ts-panel-open' : ''}`}>
      {/* Glass Background Effect */}
      <div className="ts-panel-backdrop" onClick={onClose} />

      {/* Main Panel */}
      <div className="ts-panel-content">
        {/* Header */}
        <div className="ts-panel-header">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="ts-close-btn"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {compareMode ? 'Confronto Time Series' :
                  quartiere ? quartiere.shortName : 'Milano - Media Città'}
              </h2>
              <p className="text-xs text-gray-400">
                {compareMode ? `${compareData.length} quartieri a confronto` :
                  quartiere ? `Zona ${quartiere.zone} • Fascia ${quartiere.fascia}` :
                    'Andamento storico prezzi immobiliari'}
              </p>
            </div>
          </div>

          {category && !compareMode && (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${category.color}20`, color: category.color }}
            >
              {category.label}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="ts-loading">
            <div className="ts-loading-spinner" />
            <p className="text-sm text-gray-400 mt-4">Caricamento dati...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="ts-panel-body">
            {/* Stats Row */}
            {stats && !compareMode && (
              <div className="ts-stats-grid">
                <StatCard
                  label="Prezzo Attuale"
                  value={formatPrice(stats.prezzoAttuale)}
                  subValue="/mq"
                  color={category?.color || '#3b82f6'}
                  icon={Home}
                />
                <StatCard
                  label="Variazione Totale"
                  value={`${stats.variazioneTotale >= 0 ? '+' : ''}${stats.variazioneTotale.toFixed(1)}%`}
                  trend={stats.variazioneTotale}
                  color={stats.variazioneTotale >= 0 ? '#22c55e' : '#ef4444'}
                  icon={Activity}
                />
                <StatCard
                  label="Prezzo Max"
                  value={formatPrice(stats.prezzoMax)}
                  subValue="/mq"
                  color="#f59e0b"
                  icon={TrendingUp}
                />
                <StatCard
                  label="Prezzo Min"
                  value={formatPrice(stats.prezzoMin)}
                  subValue="/mq"
                  color="#3b82f6"
                  icon={TrendingDown}
                />
              </div>
            )}

            {/* Chart Controls */}
            <div className="ts-chart-controls">
              <div className="ts-chart-tabs">
                <button
                  onClick={() => setActiveChart('acquisto')}
                  className={`ts-chart-tab ${activeChart === 'acquisto' ? 'active' : ''}`}
                >
                  <Euro size={14} />
                  Acquisto
                </button>
                <button
                  onClick={() => setActiveChart('locazione')}
                  className={`ts-chart-tab ${activeChart === 'locazione' ? 'active' : ''}`}
                >
                  <Calendar size={14} />
                  Locazione
                </button>
              </div>

              <div className="ts-chart-type-toggle">
                <button
                  onClick={() => setChartType('area')}
                  className={`ts-type-btn ${chartType === 'area' ? 'active' : ''}`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`ts-type-btn ${chartType === 'line' ? 'active' : ''}`}
                >
                  Line
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="ts-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                {compareMode && compareData.length > 0 ? (
                  // Comparison Chart
                  <LineChart
                    data={compareData[0]?.data || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip type={activeChart} />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
                    />
                    {compareData.map((series, index) => (
                      <Line
                        key={series.quartiereId}
                        type="monotone"
                        data={series.data}
                        dataKey={activeChart === 'acquisto' ? 'prezzoAcquisto' : 'prezzoLocazione'}
                        name={series.quartiere.split(',')[0].replace(/'/g, '')}
                        stroke={comparisonColors[index % comparisonColors.length]}
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                ) : chartType === 'area' ? (
                  // Single Quartiere Area Chart
                  <AreaChart
                    data={timeSeriesData?.data || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={category?.color || '#3b82f6'}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor={category?.color || '#3b82f6'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(value) =>
                        activeChart === 'acquisto' ? `€${(value / 1000).toFixed(0)}k` : `€${value}`
                      }
                    />
                    <Tooltip content={<CustomTooltip type={activeChart} />} />
                    <Area
                      type="monotone"
                      dataKey={activeChart === 'acquisto' ? 'prezzoAcquisto' : 'prezzoLocazione'}
                      name={activeChart === 'acquisto' ? 'Prezzo Acquisto' : 'Prezzo Locazione'}
                      stroke={category?.color || '#3b82f6'}
                      strokeWidth={2.5}
                      fill="url(#colorPrice)"
                      dot={{ r: 3, fill: category?.color || '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  // Single Quartiere Line Chart
                  <LineChart
                    data={timeSeriesData?.data || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(value) =>
                        activeChart === 'acquisto' ? `€${(value / 1000).toFixed(0)}k` : `€${value}`
                      }
                    />
                    <Tooltip content={<CustomTooltip type={activeChart} />} />
                    <Line
                      type="monotone"
                      dataKey={activeChart === 'acquisto' ? 'prezzoAcquisto' : 'prezzoLocazione'}
                      name={activeChart === 'acquisto' ? 'Prezzo Acquisto' : 'Prezzo Locazione'}
                      stroke={category?.color || '#3b82f6'}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: category?.color || '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Compare Mode Legend */}
            {compareMode && compareData.length > 0 && (
              <div className="ts-compare-legend">
                {compareData.map((series, index) => (
                  <div key={series.quartiereId} className="ts-legend-item">
                    <span
                      className="ts-legend-dot"
                      style={{ backgroundColor: comparisonColors[index % comparisonColors.length] }}
                    />
                    <span className="ts-legend-name">
                      {series.quartiere.split(',')[0].replace(/'/g, '')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Period Info */}
            {timeSeriesData?.data && (
              <div className="ts-period-info">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500">
                  Periodo: {timeSeriesData.data[0]?.label} - {timeSeriesData.data[timeSeriesData.data.length - 1]?.label}
                </span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-500">
                  {timeSeriesData.data.length} semestri
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TimeSeriesPanel
