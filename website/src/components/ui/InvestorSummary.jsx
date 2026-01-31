/**
 * InvestorSummary - "At a glance" investor panel
 * 
 * Shows key metrics for real estate investors:
 * - Price per mq with trend
 * - Rental yield estimate
 * - Risk score based on volatility
 * - Comparison bars vs Milano average
 */
import { memo, useMemo } from 'react'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    Percent,
    Shield,
    Target,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react'
import { InfoTooltip } from './Tooltip'

/**
 * Metric descriptions for tooltips
 */
const METRIC_TOOLTIPS = {
    yield: "Rendimento lordo annuo stimato: rapporto tra affitto annuo e prezzo di acquisto al mq. Non considera tasse, spese condominiali e manutenzione.",
    risk: "Punteggio di rischio basato su: volatilità dei prezzi, livello di prezzo rispetto alla media, e trend recente. Più basso = meno rischioso.",
    trend: "Variazione percentuale del prezzo di acquisto rispetto al semestre precedente. Indica la direzione del mercato.",
    tier: "Fascia di prezzo del quartiere: Premium (€8k+), Mid-High (€5.5k+), Mid-Range (€3.5k+), Entry Level (sotto €3.5k)."
}

/**
 * Calculate investor metrics from quartiere data
 */
const calculateInvestorMetrics = (quartiere, milanoStats) => {
    if (!quartiere) return null

    const prezzoAcquisto = quartiere.prezzoAcquistoMedio
    const prezzoLocazione = quartiere.prezzoLocazioneMedio * 12 // Annualized
    const variazione = quartiere.variazioneSemestrale || 0

    // Calculate rental yield (annual rent / purchase price * 100)
    const rentalYield = prezzoAcquisto > 0
        ? (prezzoLocazione / prezzoAcquisto) * 100
        : 0

    // Risk score calculation (0-100, lower is better)
    // Based on: volatility, price level, trend direction
    let riskScore = 50 // Base

    // Volatility component (high variation = higher risk)
    const absVariation = Math.abs(variazione)
    if (absVariation > 5) riskScore += 20
    else if (absVariation > 3) riskScore += 10
    else if (absVariation < 1) riskScore -= 10

    // Price level component (very high prices = higher risk of correction)
    if (prezzoAcquisto > 10000) riskScore += 15
    else if (prezzoAcquisto > 7000) riskScore += 5
    else if (prezzoAcquisto < 3000) riskScore += 10 // Low price areas can be risky too

    // Trend component (negative trend = higher risk)
    if (variazione < -2) riskScore += 15
    else if (variazione < 0) riskScore += 5
    else if (variazione > 3) riskScore -= 10

    // Clamp to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore))

    // Risk label
    let riskLabel, riskColor
    if (riskScore <= 30) {
        riskLabel = 'Basso'
        riskColor = 'emerald'
    } else if (riskScore <= 50) {
        riskLabel = 'Moderato'
        riskColor = 'blue'
    } else if (riskScore <= 70) {
        riskLabel = 'Medio-Alto'
        riskColor = 'amber'
    } else {
        riskLabel = 'Alto'
        riskColor = 'red'
    }

    // Comparison to Milano average
    const milanoAvgPrice = milanoStats?.prezzoMedioAcquisto || 5500
    const priceVsMilano = ((prezzoAcquisto / milanoAvgPrice) - 1) * 100

    // Cluster/tier based on price
    let tier, tierColor
    if (prezzoAcquisto >= 8000) {
        tier = 'Premium'
        tierColor = 'text-purple-400'
    } else if (prezzoAcquisto >= 5500) {
        tier = 'Mid-High'
        tierColor = 'text-blue-400'
    } else if (prezzoAcquisto >= 3500) {
        tier = 'Mid-Range'
        tierColor = 'text-emerald-400'
    } else {
        tier = 'Entry Level'
        tierColor = 'text-amber-400'
    }

    return {
        prezzoAcquisto,
        prezzoLocazione: prezzoLocazione / 12, // Back to monthly
        variazione,
        rentalYield,
        riskScore,
        riskLabel,
        riskColor,
        priceVsMilano,
        milanoAvgPrice,
        tier,
        tierColor
    }
}

/**
 * Format price for display
 */
const formatPrice = (value) => {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

/**
 * InvestorSummary Component
 */
const InvestorSummary = memo(({
    quartiere,
    milanoStats,
    compact = false,
    className = ''
}) => {
    const metrics = useMemo(
        () => calculateInvestorMetrics(quartiere, milanoStats),
        [quartiere, milanoStats]
    )

    if (!metrics || !quartiere) {
        return null
    }

    const {
        prezzoAcquisto,
        variazione,
        rentalYield,
        riskScore,
        riskLabel,
        riskColor,
        priceVsMilano,
        milanoAvgPrice,
        tier,
        tierColor
    } = metrics

    const isPositiveTrend = variazione >= 0
    const TrendIcon = variazione === 0 ? Minus : (isPositiveTrend ? TrendingUp : TrendingDown)
    const trendColor = variazione === 0 ? 'text-gray-400' : (isPositiveTrend ? 'text-emerald-400' : 'text-red-400')

    // Progress bar for price comparison (50% = equal to average)
    const comparisonProgress = Math.min(Math.max(50 + priceVsMilano / 2, 5), 95)

    const riskColors = {
        emerald: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            border: 'border-emerald-500/20'
        },
        blue: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-400',
            border: 'border-blue-500/20'
        },
        amber: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            border: 'border-amber-500/20'
        },
        red: {
            bg: 'bg-red-500/10',
            text: 'text-red-400',
            border: 'border-red-500/20'
        }
    }

    const risk = riskColors[riskColor] || riskColors.blue

    if (compact) {
        return (
            <div className={`
        flex items-center justify-between p-3 rounded-xl
        bg-gradient-to-r from-white/[0.03] to-transparent
        border border-white/[0.06]
        ${className}
      `}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.05]">
                        <BarChart3 size={14} className="text-blue-400" />
                    </div>
                    <div>
                        <span className="text-white font-semibold">
                            {formatPrice(prezzoAcquisto)}/mq
                        </span>
                        <span className={`ml-2 text-sm ${trendColor}`}>
                            {variazione > 0 ? '+' : ''}{variazione.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded-md ${risk.bg} ${risk.text} text-xs font-medium`}>
                    {riskLabel}
                </div>
            </div>
        )
    }

    return (
        <div className={`
      p-4 rounded-2xl
      bg-gradient-to-br from-white/[0.05] to-white/[0.02]
      border border-white/[0.08]
      shadow-xl
      ${className}
    `}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10">
                    <BarChart3 size={18} className="text-blue-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Investor Summary</h3>
                    <p className="text-[10px] text-gray-500">{quartiere.shortName || quartiere.name}</p>
                </div>
            </div>

            {/* Main Price Metric */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-white">
                    {formatPrice(prezzoAcquisto)}/mq
                </span>
                <div className={`
          flex items-center gap-1 px-2 py-1 rounded-full
          ${isPositiveTrend ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}
          font-medium text-sm
        `}>
                    <TrendIcon size={14} />
                    <span>{variazione > 0 ? '+' : ''}{variazione.toFixed(1)}%</span>
                </div>
            </div>

            {/* Comparison Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>vs Media Milano</span>
                    <span className={priceVsMilano >= 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {priceVsMilano >= 0 ? (
                            <span className="flex items-center gap-0.5">
                                <ArrowUpRight size={10} />
                                +{priceVsMilano.toFixed(0)}%
                            </span>
                        ) : (
                            <span className="flex items-center gap-0.5">
                                <ArrowDownRight size={10} />
                                {priceVsMilano.toFixed(0)}%
                            </span>
                        )}
                    </span>
                </div>
                <div className="relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                        className={`
              h-full rounded-full transition-all duration-700
              ${priceVsMilano >= 0
                                ? 'bg-gradient-to-r from-blue-500/40 to-amber-500/60'
                                : 'bg-gradient-to-r from-emerald-500/40 to-blue-500/60'
                            }
            `}
                        style={{ width: `${comparisonProgress}%` }}
                    />
                    {/* Average marker */}
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30 -translate-x-1/2" />
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>€3k</span>
                    <span className="text-gray-500">{formatPrice(milanoAvgPrice)}</span>
                    <span>€12k</span>
                </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.05]">
                {/* Rental Yield */}
                <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 mt-0.5">
                        <Percent size={12} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Yield Stimato</span>
                            <InfoTooltip content={METRIC_TOOLTIPS.yield} position="top" size={10} />
                        </div>
                        <span className="text-sm font-semibold text-white">{rentalYield.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Risk Score */}
                <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded-lg ${risk.bg} mt-0.5`}>
                        <Shield size={12} className={risk.text} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Rischio</span>
                            <InfoTooltip content={METRIC_TOOLTIPS.risk} position="top" size={10} />
                        </div>
                        <span className={`text-sm font-semibold ${risk.text}`}>{riskLabel}</span>
                    </div>
                </div>

                {/* Trend */}
                <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded-lg ${isPositiveTrend ? 'bg-emerald-500/10' : 'bg-red-500/10'} mt-0.5`}>
                        <TrendIcon size={12} className={trendColor} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Trend</span>
                            <InfoTooltip content={METRIC_TOOLTIPS.trend} position="top" size={10} />
                        </div>
                        <span className={`text-sm font-semibold ${trendColor}`}>
                            {variazione > 1 ? 'In crescita' : variazione < -1 ? 'In calo' : 'Stabile'}
                        </span>
                    </div>
                </div>

                {/* Tier/Cluster */}
                <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 mt-0.5">
                        <Target size={12} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Fascia</span>
                            <InfoTooltip content={METRIC_TOOLTIPS.tier} position="top" size={10} />
                        </div>
                        <span className={`text-sm font-semibold ${tierColor}`}>{tier}</span>
                    </div>
                </div>
            </div>
        </div>
    )
})

InvestorSummary.displayName = 'InvestorSummary'

export default InvestorSummary
