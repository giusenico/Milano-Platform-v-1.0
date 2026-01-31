import { priceLegend, getPriceCategory } from './quartieriData'
import { formatPrice } from './quartieriGeoJSON'

const formatCurrency = (value, maximumFractionDigits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value)
}

const formatPercent = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

const findLegendColor = (legend, value, fallback = '#6b7280') => {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  const match = legend.find(item => {
    const minOk = item.min === null || item.min === undefined || value >= item.min
    const maxOk = item.max === null || item.max === undefined || value <= item.max
    return minOk && maxOk
  })
  return match?.color || fallback
}

const rentLegend = [
  { min: 30, max: null, color: '#ef4444', label: '> €30/mq' },
  { min: 24, max: 30, color: '#f97316', label: '€24 - €30/mq' },
  { min: 20, max: 24, color: '#eab308', label: '€20 - €24/mq' },
  { min: 16, max: 20, color: '#84cc16', label: '€16 - €20/mq' },
  { min: 12, max: 16, color: '#22c55e', label: '€12 - €16/mq' },
  { min: 0, max: 12, color: '#3b82f6', label: '< €12/mq' }
]

const yieldLegend = [
  { min: 6, max: null, color: '#16a34a', label: '>= 6%' },
  { min: 5, max: 6, color: '#22c55e', label: '5% - 6%' },
  { min: 4, max: 5, color: '#84cc16', label: '4% - 5%' },
  { min: 3, max: 4, color: '#eab308', label: '3% - 4%' },
  { min: 2, max: 3, color: '#f97316', label: '2% - 3%' },
  { min: 0, max: 2, color: '#ef4444', label: '< 2%' }
]

const trendLegend = [
  { min: 4, max: null, color: '#16a34a', label: '>= +4%' },
  { min: 2, max: 4, color: '#22c55e', label: '+2% - +4%' },
  { min: 0, max: 2, color: '#84cc16', label: '0% - +2%' },
  { min: -2, max: 0, color: '#f59e0b', label: '-2% - 0%' },
  { min: -4, max: -2, color: '#f97316', label: '-4% - -2%' },
  { min: null, max: -4, color: '#ef4444', label: '< -4%' }
]

export const MAP_METRIC_OPTIONS = [
  { id: 'prezzoAcquisto', label: 'Prezzo', sublabel: '€/mq acquisto' },
  { id: 'prezzoLocazione', label: 'Affitto', sublabel: '€/mq mese' },
  { id: 'rendimento', label: 'Yield', sublabel: 'Rendimento lordo' },
  { id: 'variazione', label: 'Trend', sublabel: 'Var. semestrale' }
]

const METRIC_CONFIGS = {
  prezzoAcquisto: {
    id: 'prezzoAcquisto',
    label: 'Prezzo acquisto',
    legendTitle: 'Prezzo acquisto €/mq',
    legend: priceLegend,
    getValue: quartiere => quartiere?.prezzoAcquistoMedio,
    formatLabel: value => (value !== null && value !== undefined ? `${formatPrice(value)}/mq` : 'N/D'),
    formatValue: value => (value !== null && value !== undefined ? `${formatPrice(value)}/mq` : 'N/D'),
    getColor: value => getPriceCategory(value ?? 0).color
  },
  prezzoLocazione: {
    id: 'prezzoLocazione',
    label: 'Affitto medio',
    legendTitle: 'Affitto €/mq mese',
    legend: rentLegend,
    getValue: quartiere => quartiere?.prezzoLocazioneMedio,
    formatLabel: value => (value !== null && value !== undefined ? `${formatCurrency(value, 1)}/mq` : 'N/D'),
    formatValue: value => (value !== null && value !== undefined ? `${formatCurrency(value, 1)}/mq` : 'N/D'),
    getColor: value => findLegendColor(rentLegend, value)
  },
  rendimento: {
    id: 'rendimento',
    label: 'Rendimento lordo',
    legendTitle: 'Yield lordo annuo',
    legend: yieldLegend,
    getValue: quartiere => {
      const acquisto = quartiere?.prezzoAcquistoMedio
      const locazione = quartiere?.prezzoLocazioneMedio
      if (!acquisto || !locazione) return null
      return (locazione * 12 / acquisto) * 100
    },
    formatLabel: value => (value !== null && value !== undefined ? formatPercent(value, 2) : 'N/D'),
    formatValue: value => (value !== null && value !== undefined ? formatPercent(value, 2) : 'N/D'),
    getColor: value => findLegendColor(yieldLegend, value)
  },
  variazione: {
    id: 'variazione',
    label: 'Trend semestrale',
    legendTitle: 'Variazione semestrale',
    legend: trendLegend,
    getValue: quartiere => quartiere?.variazioneSemestrale,
    formatLabel: value => (value !== null && value !== undefined ? formatPercent(value, 2) : 'N/D'),
    formatValue: value => (value !== null && value !== undefined ? formatPercent(value, 2) : 'N/D'),
    getColor: value => findLegendColor(trendLegend, value)
  }
}

export const getMapMetricConfig = (metricId) => {
  return METRIC_CONFIGS[metricId] || METRIC_CONFIGS.prezzoAcquisto
}

export const getMapMetricColor = (metricId, value) => {
  const config = getMapMetricConfig(metricId)
  return config.getColor(value)
}

export const getMapMetricLabel = (metricId, value) => {
  const config = getMapMetricConfig(metricId)
  return config.formatLabel(value)
}
