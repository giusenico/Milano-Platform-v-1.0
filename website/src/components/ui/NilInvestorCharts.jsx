/**
 * NilInvestorCharts - Grafici e metriche per investitori
 * 
 * Visualizzazione ricca dei dati NIL per analisi investimenti:
 * - Investor Score con gauge
 * - Istruzione dei residenti (bar chart)
 * - Mobilità sostenibile (bar chart)
 * - Composizione famiglie (bar chart)
 * - Confronto con media Milano
 */
import { memo, useMemo } from 'react'
import {
    TrendingUp,
    TrendingDown,
    GraduationCap,
    Car,
    Home,
    Target,
    Shield,
    Zap,
    Users,
    Bike,
    Bus,
    Building2,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Award,
    BarChart3,
    Leaf
} from 'lucide-react'

/**
 * Horizontal Bar Chart Component
 */
const HorizontalBarChart = ({ data, maxValue, showPercentage = true, height = 'h-5' }) => {
    const max = maxValue || Math.max(...data.map(d => d.valore || d.percentuale || 0))
    
    return (
        <div className="space-y-2.5">
            {data.map((item, index) => (
                <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 font-medium">
                            {item.categoriaShort || item.mezzoShort || item.label || item.residenti}
                        </span>
                        <span className="text-xs text-white font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {showPercentage ? `${item.percentuale?.toFixed(1) || 0}%` : item.valore?.toLocaleString('it-IT') || 0}
                        </span>
                    </div>
                    <div className={`${height} bg-white/10 rounded-full overflow-hidden relative`}>
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                            style={{
                                width: `${Math.min(100, ((item.percentuale || item.valore || 0) / (showPercentage ? 100 : max)) * 100)}%`,
                                background: `linear-gradient(90deg, ${item.colore || '#3b82f6'}90 0%, ${item.colore || '#3b82f6'} 100%)`
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                                 style={{ animationDuration: '2s' }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * Circular Gauge Component for Investor Score
 */
const InvestorGauge = ({ score, label, size = 120 }) => {
    const strokeWidth = 8
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const percentage = Math.min(100, Math.max(0, score))
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    // Color based on score
    const getColor = (score) => {
        if (score >= 70) return '#22c55e'
        if (score >= 50) return '#f59e0b'
        if (score >= 30) return '#f97316'
        return '#ef4444'
    }
    
    const color = getColor(score)
    
    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {score?.toFixed(0) || 0}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">/100</span>
                </div>
            </div>
            {label && <span className="text-xs text-gray-400 font-semibold mt-2 text-center">{label}</span>}
        </div>
    )
}

/**
 * Comparison Metric Card
 */
const ComparisonMetric = ({ label, nilValue, milanoValue, deltaPercent, icon: Icon, color = '#3b82f6', format = 'number' }) => {
    const isPositive = deltaPercent > 0
    const isNeutral = deltaPercent === 0
    
    const formatValue = (val) => {
        if (format === 'percent') return `${val?.toFixed(1) || 0}%`
        if (format === 'decimal') return val?.toFixed(1) || '0'
        return val?.toLocaleString('it-IT') || '0'
    }
    
    return (
        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                     style={{ backgroundColor: `${color}15` }}>
                    <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-white">{formatValue(nilValue)}</span>
                        <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                            isNeutral ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {isNeutral ? (
                                <Minus size={10} />
                            ) : isPositive ? (
                                <ArrowUpRight size={10} />
                            ) : (
                                <ArrowDownRight size={10} />
                            )}
                            {isNeutral ? '0' : `${isPositive ? '+' : ''}${deltaPercent?.toFixed(1) || 0}%`}
                        </div>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5">Milano: {formatValue(milanoValue)}</p>
                </div>
            </div>
        </div>
    )
}

/**
 * Risk Badge Component
 */
const RiskBadge = ({ level, color }) => {
    const Icon = level === 'Basso' ? Shield : level === 'Alto' ? Zap : Target
    
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
             style={{ 
                 backgroundColor: `${color}15`, 
                 borderColor: `${color}30` 
             }}>
            <Icon size={12} style={{ color }} />
            <span className="text-xs font-bold" style={{ color }}>
                Rischio {level}
            </span>
        </div>
    )
}

/**
 * Main Component - NIL Investor Charts
 * @param {string} mode - 'market' for market-focused data, 'demographic' for demographic data, 'all' for everything
 * @param {boolean} compact - if true, removes extra padding and background for embedded use
 */
const NilInvestorCharts = memo(({ 
    investorMetrics,
    istruzioneData,
    mobilitaData,
    stockAbitativo,
    nilData,
    isLoading = false,
    mode = 'all', // 'market' | 'demographic' | 'all'
    compact = false
}) => {
    
    // Education chart data
    const educationChartData = useMemo(() => {
        if (!istruzioneData?.data) return []
        return istruzioneData.data.map(d => ({
            ...d,
            colore: d.categoriaShort === 'Laurea' ? '#3b82f6'
                : d.categoriaShort === 'Diploma' ? '#8b5cf6'
                : d.categoriaShort === 'Media' ? '#f59e0b'
                : '#ef4444'
        }))
    }, [istruzioneData])
    
    // Mobility chart data
    const mobilityChartData = useMemo(() => {
        if (!mobilitaData?.data) return []
        return mobilitaData.data
    }, [mobilitaData])
    
    // Housing composition chart data
    const housingChartData = useMemo(() => {
        if (!stockAbitativo?.composizioneFamiglie) return []
        return stockAbitativo.composizioneFamiglie.map(d => ({
            ...d,
            label: d.residenti === '5+' ? '5+ persone' : `${d.residenti} ${d.residenti === '1' ? 'persona' : 'persone'}`
        }))
    }, [stockAbitativo])
    
    // Compact mode classes
    const cardClass = compact 
        ? "rounded-xl p-3 bg-white/[0.02] border border-white/5" 
        : "bg-surface-card rounded-2xl p-5 border border-white/5 shadow-lg"
    
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`${cardClass} animate-pulse`}>
                        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
                        <div className="h-24 bg-white/5 rounded-xl" />
                    </div>
                ))}
            </div>
        )
    }

    const showMarket = mode === 'all' || mode === 'market'
    const showDemographic = mode === 'all' || mode === 'demographic'
    
    return (
        <div className="space-y-3">
            {/* Investor Score Card - MARKET */}
            {showMarket && investorMetrics && (
                <div className={cardClass}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Target size={12} className="text-blue-400" />
                        Attrattività Investimento
                    </h4>
                    
                    <div className="flex items-center justify-between gap-4">
                        <InvestorGauge 
                            score={investorMetrics.investorScore} 
                            label="Investor Score"
                            size={compact ? 100 : 120}
                        />
                        
                        <div className="flex-1 space-y-3">
                            <RiskBadge 
                                level={investorMetrics.riskLevel} 
                                color={investorMetrics.riskColor} 
                            />
                            
                            <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Potenziale Crescita</p>
                                <p className={`text-sm font-bold ${
                                    investorMetrics.growthPotential === 'Alto' ? 'text-green-400' :
                                    investorMetrics.growthPotential === 'Basso' ? 'text-red-400' :
                                    'text-yellow-400'
                                }`}>
                                    {investorMetrics.growthPotential}
                                </p>
                            </div>
                            
                            {investorMetrics.ranking && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white/[0.02] rounded-lg text-center">
                                        <p className="text-[9px] text-gray-500 uppercase">Qualità</p>
                                        <p className="text-sm font-bold text-white">
                                            #{investorMetrics.ranking.qualitaVita}
                                            <span className="text-[10px] text-gray-500">/88</span>
                                        </p>
                                    </div>
                                    <div className="p-2 bg-white/[0.02] rounded-lg text-center">
                                        <p className="text-[9px] text-gray-500 uppercase">Verde</p>
                                        <p className="text-sm font-bold text-white">
                                            #{investorMetrics.ranking.verde}
                                            <span className="text-[10px] text-gray-500">/88</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Milano Comparison Card - DEMOGRAPHIC */}
            {showDemographic && investorMetrics?.confrontoMilano && (
                <div className={cardClass}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BarChart3 size={12} className="text-purple-400" />
                        Confronto vs Media Milano
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <ComparisonMetric
                            label="Qualità Vita"
                            nilValue={investorMetrics.confrontoMilano.qualitaVita?.nil}
                            milanoValue={investorMetrics.confrontoMilano.qualitaVita?.media}
                            deltaPercent={investorMetrics.confrontoMilano.qualitaVita?.deltaPercent}
                            icon={Award}
                            color="#f59e0b"
                            format="decimal"
                        />
                        <ComparisonMetric
                            label="Verde Urbano"
                            nilValue={investorMetrics.confrontoMilano.verde?.nil}
                            milanoValue={investorMetrics.confrontoMilano.verde?.media}
                            deltaPercent={investorMetrics.confrontoMilano.verde?.deltaPercent}
                            icon={Leaf}
                            color="#22c55e"
                            format="decimal"
                        />
                        <ComparisonMetric
                            label="Densità"
                            nilValue={investorMetrics.confrontoMilano.densita?.nil}
                            milanoValue={investorMetrics.confrontoMilano.densita?.media}
                            deltaPercent={investorMetrics.confrontoMilano.densita?.deltaPercent}
                            icon={Building2}
                            color="#a855f7"
                            format="number"
                        />
                        <ComparisonMetric
                            label="% Stranieri"
                            nilValue={investorMetrics.confrontoMilano.stranieri?.nil}
                            milanoValue={investorMetrics.confrontoMilano.stranieri?.media}
                            deltaPercent={investorMetrics.confrontoMilano.stranieri?.delta}
                            icon={Users}
                            color="#3b82f6"
                            format="percent"
                        />
                    </div>
                </div>
            )}
            
            {/* Education Chart - DEMOGRAPHIC */}
            {showDemographic && educationChartData.length > 0 && (
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <GraduationCap size={12} className="text-blue-400" />
                            Istruzione Residenti
                        </h4>
                        {istruzioneData?.pctLaureati > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <GraduationCap size={10} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-blue-400">
                                    {istruzioneData.pctLaureati.toFixed(1)}% laureati
                                </span>
                            </div>
                        )}
                    </div>
                    <HorizontalBarChart data={educationChartData} showPercentage={true} height={compact ? "h-4" : "h-5"} />
                    <p className="text-[9px] text-gray-600 mt-2 text-right">Fonte: ISTAT {istruzioneData?.anno || 2011}</p>
                </div>
            )}
            
            {/* Mobility Chart - DEMOGRAPHIC */}
            {showDemographic && mobilityChartData.length > 0 && (
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Car size={12} className="text-green-400" />
                            Mobilità Residenti
                        </h4>
                        {mobilitaData?.pctSostenibile > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                <Bike size={10} className="text-green-400" />
                                <span className="text-[10px] font-bold text-green-400">
                                    {mobilitaData.pctSostenibile.toFixed(1)}% sost.
                                </span>
                            </div>
                        )}
                    </div>
                    <HorizontalBarChart data={mobilityChartData} showPercentage={true} height={compact ? "h-4" : "h-5"} />
                    <p className="text-[9px] text-gray-600 mt-2 text-right">Fonte: ISTAT {mobilitaData?.anno || 2011}</p>
                </div>
            )}
            
            {/* Housing Stock Chart - DEMOGRAPHIC */}
            {showDemographic && housingChartData.length > 0 && (
                <div className={cardClass}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Home size={12} className="text-pink-400" />
                        Composizione Nuclei Familiari
                    </h4>
                    <HorizontalBarChart data={housingChartData} showPercentage={true} height={compact ? "h-4" : "h-5"} />
                    <p className="text-[9px] text-gray-600 mt-2 text-right">Fonte: ISTAT {stockAbitativo?.anno || 2011}</p>
                </div>
            )}

            {/* New Buildings Card - MARKET */}
            {showMarket && stockAbitativo?.nuoviEdifici?.abitazioni > 0 && (
                <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 size={14} className="text-cyan-400" />
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nuove Costruzioni {stockAbitativo.nuoviEdifici.periodo}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-center">
                            <p className="text-xl font-bold text-cyan-400">{stockAbitativo.nuoviEdifici.fabbricati}</p>
                            <p className="text-[9px] text-gray-500 uppercase">Fabbricati</p>
                        </div>
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-center">
                            <p className="text-xl font-bold text-cyan-400">{stockAbitativo.nuoviEdifici.abitazioni}</p>
                            <p className="text-[9px] text-gray-500 uppercase">Abitazioni</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})

NilInvestorCharts.displayName = 'NilInvestorCharts'

export default NilInvestorCharts
