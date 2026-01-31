/**
 * QuartierePopup - Generates HTML content for map popup
 * 
 * Extracted from MapComponent to simplify popup content management
 * and enable easier styling/customization.
 */
import { formatPrice, formatVariation } from '../../data/quartieriGeoJSON'
import { getPriceCategory } from '../../data/quartieriData'

/**
 * Generate popup HTML for a quartiere feature
 * @param {Object} props - Feature properties
 * @param {Object} metricConfig - Current map metric configuration
 * @param {boolean} isTimelineActive - Whether timeline mode is active
 * @returns {string} HTML string for popup
 */
export const generatePopupHTML = (props, metricConfig, isTimelineActive = false) => {
    const category = getPriceCategory(props.prezzoAcquistoMedio)
    const variationColor = props.variazioneSemestrale >= 0 ? '#22c55e' : '#ef4444'
    const variationSign = props.variazioneSemestrale >= 0 ? '+' : ''

    const metricTitle = isTimelineActive
        ? 'Prezzo acquisto'
        : (metricConfig?.label || 'Metrica')

    const metricDisplay = isTimelineActive
        ? props.mapMetricLabel
        : (metricConfig?.formatValue
            ? metricConfig.formatValue(props.mapMetricValue)
            : props.mapMetricLabel)

    return `
    <div class="quartiere-popup-content" style="animation: popupSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <style>
        @keyframes popupSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popupStatReveal {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmerGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(94, 124, 226, 0.1); }
          50% { box-shadow: 0 0 20px rgba(94, 124, 226, 0.2); }
        }
        .popup-stat { animation: popupStatReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
        .popup-stat:nth-child(1) { animation-delay: 0.05s; }
        .popup-stat:nth-child(2) { animation-delay: 0.1s; }
        .popup-stat:nth-child(3) { animation-delay: 0.15s; }
        .popup-stat:hover { transform: translateY(-2px) scale(1.02); transition: all 0.2s ease; }
        .popup-category { animation: shimmerGlow 2s ease-in-out infinite; }
        .popup-header h3 { 
          background: linear-gradient(135deg, #fff 0%, #a8b5d6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      </style>
      <div class="popup-header" style="border-left: 3px solid ${props.mapColor || props.color}; border-image: linear-gradient(180deg, ${props.mapColor || props.color}, transparent) 1;">
        <h3>${props.shortName}</h3>
        <span class="popup-zone">Zona ${props.zone} • Fascia ${props.fascia}</span>
      </div>
      <div class="popup-stats">
        <div class="popup-stat" style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);">
          <span class="stat-label">Acquisto</span>
          <span class="stat-value" style="color: ${props.color}">${formatPrice(props.prezzoAcquistoMedio)}/mq</span>
        </div>
        <div class="popup-stat" style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);">
          <span class="stat-label">Affitto</span>
          <span class="stat-value">€${parseFloat(props.prezzoLocazioneMedio).toFixed(1)}/mq/mese</span>
        </div>
        <div class="popup-stat" style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);">
          <span class="stat-label">Trend</span>
          <span class="stat-value" style="color: ${variationColor}">${variationSign}${parseFloat(props.variazioneSemestrale).toFixed(2)}%</span>
        </div>
      </div>
      <div class="popup-stat" style="margin-top: 8px; background: linear-gradient(135deg, rgba(94,124,226,0.1) 0%, rgba(94,124,226,0.05) 100%);">
        <span class="stat-label">Mappa</span>
        <span class="stat-value" style="color: ${props.mapColor || props.color}">${metricTitle}: ${metricDisplay}</span>
      </div>
      <div class="popup-category" style="background: linear-gradient(135deg, ${category.color}20, ${category.color}10); color: ${category.color}; border: 1px solid ${category.color}30;">
        ${category.label}
      </div>
      <div class="popup-actions" style="opacity: 0.9;">
        <div class="popup-hint" style="transition: all 0.2s ease;">Click per dettagli</div>
        <div class="popup-hint-compare" style="transition: all 0.2s ease;">Ctrl+Click per confrontare</div>
      </div>
    </div>
  `
}

/**
 * React component wrapper for popup (optional, for future portal rendering)
 */
const QuartierePopup = ({ properties, metricConfig, isTimelineActive }) => {
    // This component can be used for React-based popup rendering in the future
    // For now, we export the HTML generator for Mapbox popup
    return null
}

export default QuartierePopup
