import { useState, useMemo } from 'react'
import {
    X,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Users,
    Wallet,
    Star,
    Building2,
    Activity,
    Heart,
    Target,
    Leaf,
    ShoppingCart,
    Zap,
    Globe,
    Loader2,
    Award,
    LineChart as LineChartIcon,
    ArrowUpRight,
    GraduationCap,
    Thermometer,
    TreePine,
    Coffee,
    Home,
    Sparkles,
    Map,
    Timer,
    CircleDot,
    CheckCircle2,
    AlertCircle,
    Info,
    Crown,
    Medal,
    Shield,
    Flame,
    ChevronDown,
    LayoutGrid,
    Gauge,
    Stethoscope,
    Pill,
    BookOpen,
    Landmark,
    Store,
    Briefcase,
    Newspaper
} from 'lucide-react'
import QualityOfLifeRadar from './QualityOfLifeRadar'
import NilInvestorCharts from './ui/NilInvestorCharts'
import CollapsibleSection from './ui/CollapsibleSection'
import { getPriceCategory } from '../data/quartieriData'
import { formatPrice } from '../data/quartieriGeoJSON'
import { 
    useNilIstruzione, 
    useNilMobilita, 
    useNilStockAbitativo, 
    useNilInvestorMetrics,
    useNilServiziSanitari,
    useNilServiziSociali,
    useNilCultura,
    useNilCommercio
} from '../hooks/useDataApi'

/**
 * Progress Bar Component for metrics
 */
const ProgressBar = ({ value, max = 100, color = '#3b82f6', label, showValue = true, size = 'normal' }) => {
    const percentage = Math.min((value / max) * 100, 100)
    const height = size === 'large' ? 'h-2.5' : size === 'small' ? 'h-1' : 'h-1.5'

    return (
        <div className="space-y-1.5">
            {label && (
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">{label}</span>
                    {showValue && (
                        <span className="text-xs text-white font-semibold">{value?.toFixed(1) || 0}</span>
                    )}
                </div>
            )}
            <div className={`${height} bg-white/10 rounded-full overflow-hidden`}>
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color}88 0%, ${color} 100%)`,
                        boxShadow: `0 0 10px ${color}40`
                    }}
                />
            </div>
        </div>
    )
}

/**
 * Score Circle Component - Mini circular indicator
 */
const ScoreCircle = ({ score, maxScore = 100, size = 60, color = '#3b82f6', label }) => {
    const percentage = (score / maxScore) * 100
    const strokeWidth = 4
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
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
                        style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{score?.toFixed(0) || 0}</span>
                </div>
            </div>
            {label && <span className="text-[10px] text-gray-400 font-medium text-center">{label}</span>}
        </div>
    )
}

/**
 * Stat Pill Component - Compact horizontal stat
 */
const StatPill = ({ icon: Icon, label, value, color = '#3b82f6', trend }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors group">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon size={12} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-xs text-white font-semibold truncate">{value}</p>
        </div>
        {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </div>
        )}
    </div>
)

/**
 * Quality Badge Component - Visual quality indicator
 */
const QualityBadge = ({ level, label }) => {
    const configs = {
        excellent: { icon: Crown, color: '#f59e0b', bg: 'from-amber-500/20', label: 'Eccellente' },
        good: { icon: Medal, color: '#22c55e', bg: 'from-green-500/20', label: 'Buono' },
        average: { icon: Shield, color: '#3b82f6', bg: 'from-blue-500/20', label: 'Medio' },
        low: { icon: AlertCircle, color: '#ef4444', bg: 'from-red-500/20', label: 'Basso' }
    }
    const config = configs[level] || configs.average
    const Icon = config.icon

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.bg} to-transparent border border-white/10`}>
            <Icon size={12} style={{ color: config.color }} />
            <span className="text-xs font-semibold" style={{ color: config.color }}>{label || config.label}</span>
        </div>
    )
}

/**
 * Get quality level from score
 */
const getQualityLevel = (score, maxScore = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 75) return 'excellent'
    if (percentage >= 50) return 'good'
    if (percentage >= 25) return 'average'
    return 'low'
}

/**
 * Cluster Badge Component
 */
const ClusterBadge = ({ cluster }) => {
    if (!cluster?.cluster_nome) return null

    return (
        <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-sm"
            style={{
                backgroundColor: `${cluster.cluster_colore}15`,
                borderColor: `${cluster.cluster_colore}30`,
                color: cluster.cluster_colore || '#3b82f6'
            }}
        >
            <Target size={12} />
            <span className="text-xs font-semibold tracking-wide">{cluster.cluster_nome}</span>
        </div>
    )
}

/**
 * Quartiere Detail Panel Component with Filters (Enhanced Apple-style)
 */
const QuartiereDetailPanel = ({ quartiere, onClose, onOpenTimeSeries, popolazioneData, milanoStats, nilAnalisiData, isLoadingNilAnalisi }) => {
    const [activeTab, setActiveTab] = useState('info')
    const [showDetailedCharts, setShowDetailedCharts] = useState(false)

    if (!quartiere) return null;

    const category = getPriceCategory(quartiere.prezzoAcquistoMedio);
    const popData = popolazioneData || null
    const nilData = nilAnalisiData || null
    const amenities = popData?.amenities || null
    
    // Get NIL ID for enriched data hooks
    const nilId = nilData?.id_nil || null
    const shouldFetchInvestorData = (activeTab === 'info' && showDetailedCharts && Boolean(nilId)) || (activeTab === 'popolazione' && Boolean(nilId))
    
    // Fetch enriched NIL data for investors only when needed
    const { data: istruzioneData, isLoading: isLoadingIstruzione } = useNilIstruzione(shouldFetchInvestorData ? nilId : null)
    const { data: mobilitaData, isLoading: isLoadingMobilita } = useNilMobilita(shouldFetchInvestorData ? nilId : null)
    const { data: stockAbitativo, isLoading: isLoadingStock } = useNilStockAbitativo(shouldFetchInvestorData ? nilId : null)
    const { data: investorMetrics, isLoading: isLoadingInvestor } = useNilInvestorMetrics(shouldFetchInvestorData ? nilId : null)
    
    // Fetch new enriched data for both tabs (Vivibilità and Analisi Mercato - indicators section)
    const shouldFetchVivibilitaData = (activeTab === 'popolazione' || activeTab === 'info') && Boolean(nilId)
    const { data: serviziSanitari, isLoading: isLoadingSanitari } = useNilServiziSanitari(shouldFetchVivibilitaData ? nilId : null)
    const { data: serviziSociali, isLoading: isLoadingSociali } = useNilServiziSociali(activeTab === 'popolazione' && nilId ? nilId : null)
    const { data: culturaData, isLoading: isLoadingCultura } = useNilCultura(activeTab === 'popolazione' && nilId ? nilId : null)
    const { data: commercioData, isLoading: isLoadingCommercio } = useNilCommercio(shouldFetchVivibilitaData ? nilId : null)
    
    const isLoadingEnriched = shouldFetchInvestorData && (isLoadingIstruzione || isLoadingMobilita || isLoadingStock || isLoadingInvestor)
    const isLoadingVivibilita = shouldFetchVivibilitaData && (isLoadingSanitari || isLoadingSociali || isLoadingCultura || isLoadingCommercio)

    // metrics
    const latestFamilies = popData?.timeSeries && popData.timeSeries.length > 0
        ? popData.timeSeries[popData.timeSeries.length - 1].totale_famiglie
        : nilData?.famiglie_registrate || null
    const hasAmenities = amenities && Object.values(amenities).some(value => value > 0)
    
    // Check which sections have data
    // hasQualityData is true if we have a valid IQV score > 0 or at least one quality component
    const hasQualityData = (nilData?.indice_qualita_vita !== undefined && nilData?.indice_qualita_vita !== null && nilData?.indice_qualita_vita > 0) || 
                           (nilData?.comp_verde !== undefined && nilData?.comp_verde !== null && nilData?.comp_verde > 0) ||
                           (nilData?.comp_mercati !== undefined && nilData?.comp_mercati !== null && nilData?.comp_mercati > 0) ||
                           (nilData?.comp_densita !== undefined && nilData?.comp_densita !== null && nilData?.comp_densita > 0) ||
                           (nilData?.comp_dinamica !== undefined && nilData?.comp_dinamica !== null && nilData?.comp_dinamica > 0)
    const hasDemographicData = nilData?.popolazione_totale || nilData?.famiglie_registrate
    const hasServicesData = nilData?.numero_scuole || nilData?.numero_mercati || hasAmenities
    const hasEnvironmentData = nilData?.indice_verde_medio || nilData?.esposizione_calore || nilData?.rischio_calore
    const hasFlowsData = nilData?.saldo_naturale !== undefined || nilData?.saldo_migratorio !== undefined
    const hasDeepDiveData = istruzioneData || mobilitaData || stockAbitativo
    const hasHealthcareData = serviziSanitari && (serviziSanitari.farmacie?.totale > 0 || serviziSanitari.medici?.totale > 0)
    const hasSocialData = serviziSociali && serviziSociali.totaleServizi > 0
    const hasCultureData = culturaData && culturaData.totale > 0
    const hasCommerceData = commercioData && commercioData.totaleCommercio > 0
    
    const qualityDimensions = [
        { label: 'Verde', val: nilData?.comp_verde, icon: Leaf, color: '#22c55e' },
        { label: 'Servizi', val: nilData?.comp_mercati, icon: ShoppingCart, color: '#f59e0b' },
        { label: 'Densità', val: nilData?.comp_densita, icon: Users, color: '#a855f7' },
        { label: 'Dinamica', val: nilData?.comp_dinamica, icon: Zap, color: '#06b6d4' }
    ].filter(item => item.val !== null && item.val !== undefined)

    return (
        <div className="space-y-6 animate-apple-fade-in pb-6">
            {/* Enhanced Hero Header Card */}
            <div
                className="relative rounded-3xl p-6 overflow-hidden shadow-2xl"
                style={{
                    background: `linear-gradient(135deg, ${quartiere.color}CC 0%, ${quartiere.color}66 100%)`,
                    border: `1px solid ${quartiere.color}40`
                }}
            >
                {/* Glassmorphism Overlay */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

                {/* Decorative gradient orb */}
                <div
                    className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-40 mix-blend-screen"
                    style={{ backgroundColor: quartiere.color }}
                />

                <div className="relative z-10 flex items-center justify-between">
                    <h3 className="text-white font-bold text-3xl leading-none tracking-tight drop-shadow-sm">
                        {quartiere.shortName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md
                       transition-all duration-300 hover:rotate-90 active:scale-90
                       border border-white/20 text-white shadow-lg"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Modern Tab Navigation */}
            <div className="flex p-1.5 bg-black/20 rounded-2xl backdrop-blur-xl border border-white/5 mx-1">
                {[
                    { id: 'info', label: 'Analisi Mercato', icon: BarChart3 },
                    { id: 'popolazione', label: 'Vivibilità', icon: Award }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                       text-xs font-bold transition-all duration-300 relative ${activeTab === tab.id
                                ? 'text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute inset-0 rounded-xl bg-white/[0.1] border border-white/10 shadow-inner" />
                        )}
                        <tab.icon size={14} className={`relative z-10 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                        <span className="relative z-10 tracking-wide">{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'info' && (
                <div className="space-y-3 animate-apple-slide-up">
                    
                    {/* === SEZIONE 1: PANORAMICA PREZZI === */}
                    <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden shadow-lg">
                        {/* Header con prezzo principale */}
                        <div className="p-4 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-sm">
                                        <Building2 size={18} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Prezzo Acquisto</p>
                                        <p className="text-xl font-black text-white tracking-tight">
                                            {formatPrice(quartiere.prezzoAcquistoMedio)}<span className="text-sm text-gray-400 font-medium">/mq</span>
                                        </p>
                                    </div>
                                </div>
                                {/* Badge Trend */}
                                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                                    quartiere.variazioneSemestrale >= 0 
                                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                                        : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                    {quartiere.variazioneSemestrale >= 0 ? (
                                        <TrendingUp size={14} className="text-emerald-400" />
                                    ) : (
                                        <TrendingDown size={14} className="text-red-400" />
                                    )}
                                    <span className={`text-xs font-bold ${
                                        quartiere.variazioneSemestrale >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {quartiere.variazioneSemestrale >= 0 ? '+' : ''}{quartiere.variazioneSemestrale?.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            
                            {/* Grid metriche principali */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2.5 bg-black/20 rounded-xl text-center">
                                    <Wallet size={12} className="text-cyan-400 mx-auto mb-1" />
                                    <p className="text-xs font-bold text-white">{formatPrice(quartiere.prezzoLocazioneMedio)}/mq</p>
                                    <p className="text-[8px] text-gray-500 uppercase">Affitto/mese</p>
                                </div>
                                <div className="p-2.5 bg-black/20 rounded-xl text-center">
                                    <Activity size={12} className="text-emerald-400 mx-auto mb-1" />
                                    <p className="text-xs font-bold text-emerald-400">
                                        {quartiere.prezzoAcquistoMedio > 0 
                                            ? ((quartiere.prezzoLocazioneMedio * 12 / quartiere.prezzoAcquistoMedio) * 100).toFixed(1) 
                                            : '0'}%
                                    </p>
                                    <p className="text-[8px] text-gray-500 uppercase">Yield lordo</p>
                                </div>
                                <div className="p-2.5 bg-black/20 rounded-xl text-center">
                                    <Timer size={12} className="text-amber-400 mx-auto mb-1" />
                                    <p className="text-xs font-bold text-white">
                                        {quartiere.prezzoLocazioneMedio > 0 
                                            ? Math.round(quartiere.prezzoAcquistoMedio / (quartiere.prezzoLocazioneMedio * 12))
                                            : '-'}
                                    </p>
                                    <p className="text-[8px] text-gray-500 uppercase">Anni ROI</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Barra comparazione Milano */}
                        <div className="px-4 py-3 border-t border-white/5">
                            <div className="flex justify-between text-[9px] text-gray-500 mb-1.5">
                                <span>vs Media Milano ({formatPrice(milanoStats?.prezzoMedioAcquisto || 5500)}/mq)</span>
                                {(() => {
                                    const milanoAvg = milanoStats?.prezzoMedioAcquisto || 5500
                                    const diff = ((quartiere.prezzoAcquistoMedio / milanoAvg) - 1) * 100
                                    return (
                                        <span className={diff >= 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                            {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                                        </span>
                                    )
                                })()}
                            </div>
                            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                {(() => {
                                    const milanoAvg = milanoStats?.prezzoMedioAcquisto || 5500
                                    const diff = ((quartiere.prezzoAcquistoMedio / milanoAvg) - 1) * 100
                                    const progress = Math.min(Math.max(50 + diff / 2, 5), 95)
                                    return (
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${
                                                diff >= 0 
                                                    ? 'bg-gradient-to-r from-blue-500/50 to-amber-500/70' 
                                                    : 'bg-gradient-to-r from-emerald-500/50 to-blue-500/70'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    )
                                })()}
                                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30 -translate-x-1/2" />
                            </div>
                        </div>
                    </div>

                    {/* === SEZIONE 2: INDICATORI CHIAVE === */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Famiglie Residenti */}
                        <div className="bg-surface-card rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center">
                                    <Home size={12} className="text-pink-400" />
                                </div>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Famiglie</span>
                            </div>
                            <p className="text-lg font-bold text-white">
                                {latestFamilies ? latestFamilies.toLocaleString('it-IT') : 'N/D'}
                            </p>
                            {popData?.crescitaFamiglieYoY !== undefined && (
                                <div className={`flex items-center gap-1 text-[9px] font-medium mt-1 ${
                                    popData.crescitaFamiglieYoY >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {popData.crescitaFamiglieYoY >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                    {popData.crescitaFamiglieYoY >= 0 ? '+' : ''}{popData.crescitaFamiglieYoY.toFixed(1)}% YoY
                                </div>
                            )}
                        </div>
                        
                        {/* Rischio Investimento */}
                        {(() => {
                            const variazione = quartiere.variazioneSemestrale || 0
                            const absVariation = Math.abs(variazione)
                            let riskScore = 50
                            if (absVariation > 5) riskScore += 20
                            else if (absVariation > 3) riskScore += 10
                            else if (absVariation < 1) riskScore -= 10
                            if (quartiere.prezzoAcquistoMedio > 10000) riskScore += 15
                            else if (quartiere.prezzoAcquistoMedio > 7000) riskScore += 5
                            if (variazione < -2) riskScore += 15
                            else if (variazione < 0) riskScore += 5
                            else if (variazione > 3) riskScore -= 10
                            riskScore = Math.max(0, Math.min(100, riskScore))
                            
                            const riskLabel = riskScore <= 30 ? 'Basso' : riskScore <= 50 ? 'Moderato' : riskScore <= 70 ? 'Medio-Alto' : 'Alto'
                            const riskColor = riskScore <= 30 ? '#22c55e' : riskScore <= 50 ? '#3b82f6' : riskScore <= 70 ? '#f59e0b' : '#ef4444'
                            
                            return (
                                <div className="bg-surface-card rounded-xl p-3 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${riskColor}15` }}>
                                            <Shield size={12} style={{ color: riskColor }} />
                                        </div>
                                        <span className="text-[9px] text-gray-500 uppercase font-bold">Rischio</span>
                                    </div>
                                    <p className="text-lg font-bold" style={{ color: riskColor }}>{riskLabel}</p>
                                    <p className="text-[9px] text-gray-600 mt-0.5">Score: {riskScore}/100</p>
                                </div>
                            )
                        })()}
                    </div>

                    {/* === SEZIONE 3: CTA TREND STORICO === */}
                    <button
                        onClick={() => onOpenTimeSeries && onOpenTimeSeries(quartiere)}
                        className="w-full relative overflow-hidden group rounded-xl p-[1px]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
                        <div className="relative flex items-center gap-3 py-3 px-4 bg-[#1a1a1e] rounded-xl h-full transition-transform duration-300 group-hover:bg-[#1a1a1e]/90">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 
                              group-hover:scale-105 transition-transform duration-500
                              shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30">
                                <LineChartIcon size={16} className="text-blue-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="text-xs font-bold text-white block">Analisi Trend Storico</span>
                                <span className="text-[10px] text-gray-400 font-medium">Andamento prezzi negli anni</span>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <ArrowUpRight size={14} className="text-blue-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                        </div>
                    </button>

                    {/* === SEZIONE 4: ANALISI AVANZATA INVESTIMENTO === */}
                    {nilId && (
                        <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
                            <button
                                onClick={() => setShowDetailedCharts(!showDetailedCharts)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                        <Target size={14} className="text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-xs font-bold text-white">Analisi Avanzata</h4>
                                        <p className="text-[9px] text-gray-500">Score, potenziale e costruzioni</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${showDetailedCharts ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={12} className="text-gray-400" />
                                </div>
                            </button>
                            
                            {showDetailedCharts && (
                                <div className="px-3 pb-3 pt-1 border-t border-white/5 animate-apple-slide-up">
                                    <NilInvestorCharts
                                        investorMetrics={investorMetrics}
                                        istruzioneData={istruzioneData}
                                        mobilitaData={mobilitaData}
                                        stockAbitativo={stockAbitativo}
                                        nilData={nilData}
                                        isLoading={isLoadingEnriched}
                                        mode="market"
                                        compact={true}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* === SEZIONE 5: INDICATORI QUARTIERE PER INVESTITORI === */}
                    {nilId && (commercioData || serviziSanitari) && (
                        <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
                            <div className="p-3 border-b border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                        <Store size={14} className="text-amber-400" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-xs font-bold text-white">Indicatori Quartiere</h4>
                                        <p className="text-[9px] text-gray-500">Servizi e commercio</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 space-y-2">
                                {/* Quick stats grid */}
                                <div className="grid grid-cols-4 gap-1.5">
                                    {commercioData?.pubbliciEsercizi > 0 && (
                                        <div className="text-center p-1.5 bg-white/[0.02] rounded-lg border border-white/5">
                                            <Coffee size={12} className="text-orange-400 mx-auto mb-0.5" />
                                            <p className="text-xs font-bold text-white">{commercioData.pubbliciEsercizi}</p>
                                            <p className="text-[7px] text-gray-500 uppercase">Bar/Rist.</p>
                                        </div>
                                    )}
                                    {commercioData?.bottegheStoriche > 0 && (
                                        <div className="text-center p-1.5 bg-white/[0.02] rounded-lg border border-white/5">
                                            <Award size={12} className="text-amber-400 mx-auto mb-0.5" />
                                            <p className="text-xs font-bold text-white">{commercioData.bottegheStoriche}</p>
                                            <p className="text-[7px] text-gray-500 uppercase">Storiche</p>
                                        </div>
                                    )}
                                    {serviziSanitari?.farmacie?.totale > 0 && (
                                        <div className="text-center p-1.5 bg-white/[0.02] rounded-lg border border-white/5">
                                            <Pill size={12} className="text-rose-400 mx-auto mb-0.5" />
                                            <p className="text-xs font-bold text-white">{serviziSanitari.farmacie.totale}</p>
                                            <p className="text-[7px] text-gray-500 uppercase">Farmacie</p>
                                        </div>
                                    )}
                                    {commercioData?.coworking > 0 && (
                                        <div className="text-center p-1.5 bg-white/[0.02] rounded-lg border border-white/5">
                                            <Briefcase size={12} className="text-blue-400 mx-auto mb-0.5" />
                                            <p className="text-xs font-bold text-white">{commercioData.coworking}</p>
                                            <p className="text-[7px] text-gray-500 uppercase">Coworking</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Vitality indicator */}
                                {commercioData?.scoreVitalita > 0 && (
                                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg border border-amber-500/20">
                                        <div className="flex items-center gap-1.5">
                                            <Zap size={12} className="text-amber-400" />
                                            <span className="text-[10px] text-gray-300 font-medium">Vitalità Commerciale</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-amber-400">{commercioData.scoreVitalita}</span>
                                            <span className="text-[9px] text-gray-500">/100</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Healthcare quality for investors */}
                                {serviziSanitari?.scoreHealthcare > 0 && (
                                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-rose-500/10 to-transparent rounded-lg border border-rose-500/20">
                                        <div className="flex items-center gap-1.5">
                                            <Stethoscope size={12} className="text-rose-400" />
                                            <span className="text-[10px] text-gray-300 font-medium">Accessibilità Sanitaria</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-rose-400">{serviziSanitari.scoreHealthcare}</span>
                                            <span className="text-[9px] text-gray-500">/100</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            )}

            {activeTab === 'popolazione' && (
                <div className="space-y-3 animate-apple-slide-up">

                    {isLoadingNilAnalisi && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                                <Loader2 size={40} className="text-purple-400 animate-spin relative z-10" />
                            </div>
                            <p className="text-sm text-gray-400 mt-4 font-medium">Caricamento dati NIL...</p>
                        </div>
                    )}

                    {nilData && !isLoadingNilAnalisi && (
                        <>
                            {/* NIL Identity Mini Card */}
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-md">
                                <div 
                                    className="absolute inset-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${nilData.cluster_colore || '#3b82f6'}20 0%, #0a0a0c 80%)`
                                    }}
                                />
                                <div className="relative z-10 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ring-1 ring-white/10"
                                            style={{
                                                background: `linear-gradient(135deg, ${nilData.cluster_colore || '#3b82f6'}30 0%, ${nilData.cluster_colore || '#3b82f6'}10 100%)`,
                                            }}>
                                            <Map size={18} style={{ color: nilData.cluster_colore || '#3b82f6' }} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">NIL #{nilData.id_nil}</p>
                                            <h4 className="text-white font-bold text-sm leading-tight">{nilData.nil}</h4>
                                            {nilData.cluster_nome && (
                                                <p className="text-[9px] mt-0.5" style={{ color: nilData.cluster_colore || '#3b82f6' }}>
                                                    {nilData.cluster_nome}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {nilData.ranking?.ranking_iqv && (
                                        <div className="text-center bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10">
                                            <span className="text-[7px] text-gray-400 uppercase tracking-wider font-bold block">Rank</span>
                                            <p className="text-lg font-black text-white leading-none">
                                                #{nilData.ranking.ranking_iqv}
                                                <span className="text-[10px] text-gray-500">/88</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SEZIONE 1: Indice Qualità della Vita */}
                            <CollapsibleSection
                                icon={Star}
                                label="Indice Qualità della Vita"
                                sublabel={nilData.indice_qualita_vita && nilData.indice_qualita_vita > 0 
                                    ? `Score: ${nilData.indice_qualita_vita.toFixed(1)}/100` 
                                    : 'Valutazione complessiva'}
                                color="#f59e0b"
                                defaultOpen={true}
                                isEmpty={!hasQualityData}
                            >
                                <div className="space-y-3">
                                    {/* Main Score Display */}
                                    {nilData.indice_qualita_vita && nilData.indice_qualita_vita > 0 ? (
                                        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
                                            <ScoreCircle 
                                                score={nilData.indice_qualita_vita} 
                                                color={nilData.cluster_colore || '#f59e0b'} 
                                                size={70}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <QualityBadge level={getQualityLevel(nilData.indice_qualita_vita)} />
                                                </div>
                                                <ProgressBar
                                                    value={nilData.indice_qualita_vita}
                                                    max={100}
                                                    color={nilData.cluster_colore || '#f59e0b'}
                                                    showValue={false}
                                                    size="normal"
                                                />
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-[8px] text-gray-500">0</span>
                                                    <span className="text-[8px] text-gray-500">50</span>
                                                    <span className="text-[8px] text-gray-500">100</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-black/20 rounded-xl text-center">
                                            <p className="text-gray-400 text-xs">Dati insufficienti per il calcolo dell'indice</p>
                                        </div>
                                    )}
                                    
                                    {/* Quality Dimensions with Radar */}
                                    {qualityDimensions.length > 0 && (
                                        <>
                                            <div className="-mx-2 -mt-2">
                                                <QualityOfLifeRadar data={nilData} />
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5 -mt-4">
                                                {qualityDimensions.map((item, i) => (
                                                    <div key={i} className="text-center p-1.5 bg-white/[0.03] rounded-lg border border-white/5">
                                                        <div className="w-6 h-6 mx-auto rounded-md flex items-center justify-center mb-0.5"
                                                            style={{ backgroundColor: `${item.color}15` }}>
                                                            <item.icon size={10} style={{ color: item.color }} />
                                                        </div>
                                                        <p className="text-[8px] text-gray-500">{item.label}</p>
                                                        <p className="text-[10px] text-white font-bold">{item.val?.toFixed(0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* SEZIONE 2: Struttura Demografica */}
                            <CollapsibleSection
                                icon={Users}
                                label="Struttura Demografica"
                                sublabel={nilData.popolazione_totale ? `${nilData.popolazione_totale.toLocaleString('it-IT')} abitanti` : 'Popolazione e famiglie'}
                                color="#ec4899"
                                isEmpty={!hasDemographicData}
                            >
                                <div className="space-y-2">
                                    {/* Big Numbers */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {nilData.popolazione_totale && (
                                            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent rounded-lg p-2.5 text-center border border-blue-500/20">
                                                <Users size={14} className="text-blue-400 mx-auto mb-1" />
                                                <p className="text-lg font-black text-white">
                                                    {nilData.popolazione_totale.toLocaleString('it-IT')}
                                                </p>
                                                <p className="text-[8px] text-blue-400/80 uppercase tracking-wider font-bold">Abitanti</p>
                                            </div>
                                        )}
                                        {nilData.famiglie_registrate && (
                                            <div className="relative overflow-hidden bg-gradient-to-br from-pink-500/10 to-transparent rounded-lg p-2.5 text-center border border-pink-500/20">
                                                <Home size={14} className="text-pink-400 mx-auto mb-1" />
                                                <p className="text-lg font-black text-white">
                                                    {nilData.famiglie_registrate.toLocaleString('it-IT')}
                                                </p>
                                                <p className="text-[8px] text-pink-400/80 uppercase tracking-wider font-bold">Famiglie</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Detail Stats */}
                                    <div className="space-y-1.5">
                                        {nilData.pct_stranieri !== undefined && (
                                            <StatPill
                                                icon={Globe}
                                                label="Popolazione Straniera"
                                                value={`${nilData.pct_stranieri.toFixed(1)}%`}
                                                color="#3b82f6"
                                            />
                                        )}
                                        {nilData.densita_abitanti_km2 && (
                                            <StatPill
                                                icon={Building2}
                                                label="Densità Abitativa"
                                                value={`${nilData.densita_abitanti_km2.toLocaleString('it-IT', { maximumFractionDigits: 0 })} ab/km²`}
                                                color="#a855f7"
                                            />
                                        )}
                                        {nilData.famiglie_unipersonali && (
                                            <StatPill
                                                icon={Heart}
                                                label="Famiglie Unipersonali"
                                                value={nilData.famiglie_unipersonali.toLocaleString('it-IT')}
                                                color="#f43f5e"
                                            />
                                        )}
                                        {nilData.area_km2 && (
                                            <StatPill
                                                icon={LayoutGrid}
                                                label="Superficie"
                                                value={`${nilData.area_km2.toFixed(2)} km²`}
                                                color="#06b6d4"
                                            />
                                        )}
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* SEZIONE 3: Servizi & Infrastrutture */}
                            <CollapsibleSection
                                icon={Building2}
                                label="Servizi & Infrastrutture"
                                sublabel={nilData.numero_scuole ? `${nilData.numero_scuole} scuole • ${nilData.numero_mercati || 0} mercati` : 'Scuole, mercati, servizi'}
                                color="#f59e0b"
                                isEmpty={!hasServicesData}
                            >
                                <div className="space-y-2">
                                    {/* Primary Services */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {nilData.numero_scuole !== undefined && (
                                            <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                <div className="w-7 h-7 mx-auto rounded-md flex items-center justify-center mb-1 bg-blue-500/15">
                                                    <GraduationCap size={12} className="text-blue-400" />
                                                </div>
                                                <p className="text-sm font-bold text-white">{nilData.numero_scuole}</p>
                                                <p className="text-[8px] text-gray-500 uppercase">Scuole</p>
                                            </div>
                                        )}
                                        {nilData.numero_mercati !== undefined && (
                                            <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                <div className="w-7 h-7 mx-auto rounded-md flex items-center justify-center mb-1 bg-amber-500/15">
                                                    <ShoppingCart size={12} className="text-amber-400" />
                                                </div>
                                                <p className="text-sm font-bold text-white">{nilData.numero_mercati}</p>
                                                <p className="text-[8px] text-gray-500 uppercase">Mercati</p>
                                            </div>
                                        )}
                                        {nilData.indice_verde_medio !== undefined && (
                                            <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                <div className="w-7 h-7 mx-auto rounded-md flex items-center justify-center mb-1 bg-green-500/15">
                                                    <Leaf size={12} className="text-green-400" />
                                                </div>
                                                <p className="text-sm font-bold text-white">{nilData.indice_verde_medio.toFixed(1)}</p>
                                                <p className="text-[8px] text-gray-500 uppercase">Verde mq/ab</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Amenities from popData */}
                                    {hasAmenities && (
                                        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/5">
                                            {amenities.pubblici_esercizi > 0 && (
                                                <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] rounded-md border border-white/5">
                                                    <Coffee size={10} className="text-orange-400" />
                                                    <div className="flex-1">
                                                        <p className="text-[8px] text-gray-500">Esercizi Pubblici</p>
                                                        <p className="text-[10px] text-white font-bold">{amenities.pubblici_esercizi.toLocaleString('it-IT')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {amenities.impianti_sportivi > 0 && (
                                                <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] rounded-md border border-white/5">
                                                    <Activity size={10} className="text-emerald-400" />
                                                    <div className="flex-1">
                                                        <p className="text-[8px] text-gray-500">Impianti Sportivi</p>
                                                        <p className="text-[10px] text-white font-bold">{amenities.impianti_sportivi.toLocaleString('it-IT')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {amenities.servizi_sociali > 0 && (
                                                <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] rounded-md border border-white/5">
                                                    <Heart size={10} className="text-rose-400" />
                                                    <div className="flex-1">
                                                        <p className="text-[8px] text-gray-500">Servizi Sociali</p>
                                                        <p className="text-[10px] text-white font-bold">{amenities.servizi_sociali.toLocaleString('it-IT')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {amenities.comandi_polizia > 0 && (
                                                <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] rounded-md border border-white/5">
                                                    <Shield size={10} className="text-blue-400" />
                                                    <div className="flex-1">
                                                        <p className="text-[8px] text-gray-500">Presidi Polizia</p>
                                                        <p className="text-[10px] text-white font-bold">{amenities.comandi_polizia.toLocaleString('it-IT')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* SEZIONE 4: Qualità Ambientale */}
                            <CollapsibleSection
                                icon={TreePine}
                                label="Qualità Ambientale"
                                sublabel={nilData.indice_verde_medio ? `Verde: ${nilData.indice_verde_medio.toFixed(1)} mq/ab` : 'Verde urbano e rischi'}
                                color="#22c55e"
                                isEmpty={!hasEnvironmentData}
                            >
                                <div className="space-y-2">
                                    {nilData.indice_verde_medio && (
                                        <div className="flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <Leaf size={14} className="text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Indice Verde Urbano</p>
                                                <p className="text-sm font-bold text-green-400">{nilData.indice_verde_medio.toFixed(1)} <span className="text-xs text-green-400/70">mq/ab</span></p>
                                            </div>
                                        </div>
                                    )}
                                    {(nilData.esposizione_calore || nilData.rischio_calore) && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {nilData.esposizione_calore && (
                                                <div className="p-2 bg-gradient-to-br from-orange-500/10 to-transparent rounded-lg border border-orange-500/20 text-center">
                                                    <Thermometer size={12} className="text-orange-400 mx-auto mb-1" />
                                                    <p className="text-[10px] text-orange-400 font-bold">{nilData.esposizione_calore}</p>
                                                    <p className="text-[8px] text-gray-500 uppercase">Esposizione</p>
                                                </div>
                                            )}
                                            {nilData.rischio_calore && (
                                                <div className={`p-2 rounded-lg border text-center ${
                                                    nilData.rischio_calore === 'Alto' 
                                                        ? 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20' 
                                                        : nilData.rischio_calore === 'Medio'
                                                        ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20'
                                                        : 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20'
                                                }`}>
                                                    <Flame size={12} className={`mx-auto mb-1 ${
                                                        nilData.rischio_calore === 'Alto' ? 'text-red-400' :
                                                        nilData.rischio_calore === 'Medio' ? 'text-amber-400' : 'text-green-400'
                                                    }`} />
                                                    <p className={`text-[10px] font-bold ${
                                                        nilData.rischio_calore === 'Alto' ? 'text-red-400' :
                                                        nilData.rischio_calore === 'Medio' ? 'text-amber-400' : 'text-green-400'
                                                    }`}>{nilData.rischio_calore}</p>
                                                    <p className="text-[8px] text-gray-500 uppercase">Rischio Ondate</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* SEZIONE 5: Flussi Demografici */}
                            <CollapsibleSection
                                icon={TrendingUp}
                                label="Flussi Demografici"
                                sublabel={nilData.saldo_totale !== undefined 
                                    ? `Saldo: ${nilData.saldo_totale >= 0 ? '+' : ''}${nilData.saldo_totale.toLocaleString('it-IT')}` 
                                    : 'Nascite, decessi, migrazioni'}
                                color="#06b6d4"
                                isEmpty={!hasFlowsData}
                            >
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        {nilData.saldo_naturale !== undefined && (
                                            <div className={`p-2.5 rounded-lg border text-center ${
                                                nilData.saldo_naturale >= 0 
                                                    ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20' 
                                                    : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20'
                                            }`}>
                                                <CircleDot size={10} className={nilData.saldo_naturale >= 0 ? 'text-emerald-400' : 'text-red-400'} style={{ margin: '0 auto' }} />
                                                <p className={`text-sm font-black mt-1 ${nilData.saldo_naturale >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {nilData.saldo_naturale >= 0 ? '+' : ''}{nilData.saldo_naturale?.toLocaleString('it-IT')}
                                                </p>
                                                <p className="text-[8px] text-gray-500 uppercase font-medium">Saldo Naturale</p>
                                            </div>
                                        )}
                                        {nilData.saldo_migratorio !== undefined && (
                                            <div className={`p-2.5 rounded-lg border text-center ${
                                                nilData.saldo_migratorio >= 0 
                                                    ? 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20' 
                                                    : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20'
                                            }`}>
                                                <Globe size={10} className={nilData.saldo_migratorio >= 0 ? 'text-blue-400' : 'text-red-400'} style={{ margin: '0 auto' }} />
                                                <p className={`text-sm font-black mt-1 ${nilData.saldo_migratorio >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                                    {nilData.saldo_migratorio >= 0 ? '+' : ''}{nilData.saldo_migratorio?.toLocaleString('it-IT')}
                                                </p>
                                                <p className="text-[8px] text-gray-500 uppercase font-medium">Saldo Migratorio</p>
                                            </div>
                                        )}
                                    </div>
                                    {nilData.saldo_totale !== undefined && (
                                        <div className={`p-2 rounded-lg border text-center relative overflow-hidden ${
                                            nilData.saldo_totale >= 0 
                                                ? 'bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border-cyan-500/30' 
                                                : 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-red-500/30'
                                        }`}>
                                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                                {nilData.saldo_totale >= 0 ? (
                                                    <CheckCircle2 size={10} className="text-cyan-400" />
                                                ) : (
                                                    <AlertCircle size={10} className="text-red-400" />
                                                )}
                                                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Variazione Totale</span>
                                            </div>
                                            <p className={`text-lg font-black ${nilData.saldo_totale >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                                {nilData.saldo_totale >= 0 ? '+' : ''}{nilData.saldo_totale?.toLocaleString('it-IT')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* SEZIONE 6: Statistiche ISTAT */}
                            {nilId && hasDeepDiveData && (
                                <CollapsibleSection
                                    icon={BarChart3}
                                    label="Statistiche ISTAT"
                                    sublabel="Istruzione, mobilità e composizione famiglie"
                                    color="#8b5cf6"
                                >
                                    <div className="pt-1 -mx-1 overflow-hidden">
                                        <NilInvestorCharts
                                            investorMetrics={investorMetrics}
                                            istruzioneData={istruzioneData}
                                            mobilitaData={mobilitaData}
                                            stockAbitativo={stockAbitativo}
                                            nilData={nilData}
                                            isLoading={isLoadingEnriched}
                                            mode="demographic"
                                            compact={true}
                                        />
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* SEZIONE 7: Servizi Sanitari */}
                            {nilId && (
                                <CollapsibleSection
                                    icon={Stethoscope}
                                    label="Servizi Sanitari"
                                    sublabel={serviziSanitari ? `${serviziSanitari.farmacie?.totale || 0} farmacie • ${serviziSanitari.medici?.totale || 0} medici` : 'Farmacie e medici di base'}
                                    color="#ef4444"
                                    isEmpty={!hasHealthcareData && !isLoadingSanitari}
                                >
                                    {isLoadingSanitari ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 size={16} className="text-red-400 animate-spin" />
                                        </div>
                                    ) : serviziSanitari && (
                                        <div className="space-y-2">
                                            {/* Main stats grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-2.5 bg-gradient-to-br from-rose-500/10 to-transparent rounded-lg border border-rose-500/20 text-center">
                                                    <Pill size={12} className="text-rose-400 mx-auto mb-1" />
                                                    <p className="text-lg font-black text-white">{serviziSanitari.farmacie?.totale || 0}</p>
                                                    <p className="text-[8px] text-rose-400/80 uppercase tracking-wider font-bold">Farmacie</p>
                                                </div>
                                                <div className="p-2.5 bg-gradient-to-br from-red-500/10 to-transparent rounded-lg border border-red-500/20 text-center">
                                                    <Stethoscope size={12} className="text-red-400 mx-auto mb-1" />
                                                    <p className="text-lg font-black text-white">{serviziSanitari.medici?.totale || 0}</p>
                                                    <p className="text-[8px] text-red-400/80 uppercase tracking-wider font-bold">Medici Attivi</p>
                                                </div>
                                            </div>
                                            
                                            {/* Ratios */}
                                            {serviziSanitari.rapporti && (
                                                <div className="space-y-1.5">
                                                    {serviziSanitari.rapporti.abitantiPerFarmacia && (
                                                        <StatPill
                                                            icon={Users}
                                                            label="Abitanti per Farmacia"
                                                            value={serviziSanitari.rapporti.abitantiPerFarmacia.toLocaleString('it-IT')}
                                                            color="#f43f5e"
                                                        />
                                                    )}
                                                    {serviziSanitari.rapporti.abitantiPerMedico && (
                                                        <StatPill
                                                            icon={Users}
                                                            label="Abitanti per Medico"
                                                            value={serviziSanitari.rapporti.abitantiPerMedico.toLocaleString('it-IT')}
                                                            color="#dc2626"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Quality badge */}
                                            {serviziSanitari.qualitaServizio && (
                                                <div className="flex justify-center pt-1">
                                                    <QualityBadge 
                                                        level={serviziSanitari.qualitaServizio === 'Ottimo' ? 'excellent' : serviziSanitari.qualitaServizio === 'Buono' ? 'good' : 'average'}
                                                        label={`Copertura: ${serviziSanitari.qualitaServizio}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CollapsibleSection>
                            )}

                            {/* SEZIONE 8: Servizi Sociali */}
                            {nilId && (
                                <CollapsibleSection
                                    icon={Heart}
                                    label="Servizi Sociali"
                                    sublabel={serviziSociali ? `${serviziSociali.totaleServizi} servizi disponibili` : 'Supporto e assistenza'}
                                    color="#ec4899"
                                    isEmpty={!hasSocialData && !isLoadingSociali}
                                >
                                    {isLoadingSociali ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 size={16} className="text-pink-400 animate-spin" />
                                        </div>
                                    ) : serviziSociali && serviziSociali.totaleServizi > 0 && (
                                        <div className="space-y-2">
                                            {/* Main stat */}
                                            <div className="p-3 bg-gradient-to-r from-pink-500/10 to-transparent rounded-lg border border-pink-500/20 text-center">
                                                <p className="text-2xl font-black text-white">{serviziSociali.totaleServizi}</p>
                                                <p className="text-[9px] text-pink-400/80 uppercase tracking-wider font-bold">Servizi Sociali Attivi</p>
                                                {serviziSociali.serviziPer1000Abitanti > 0 && (
                                                    <p className="text-[9px] text-gray-400 mt-1">
                                                        {serviziSociali.serviziPer1000Abitanti}/1.000 ab.
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {/* By area breakdown */}
                                            {serviziSociali.serviziPerArea && serviziSociali.serviziPerArea.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Per Area di Intervento</p>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {serviziSociali.serviziPerArea.slice(0, 4).map((area, i) => (
                                                            <div key={i} className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] rounded-md border border-white/5">
                                                                <Heart size={8} className="text-pink-400" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[8px] text-gray-500 truncate">{area.area_attivita || 'Altro'}</p>
                                                                    <p className="text-[10px] text-white font-bold">{area.count}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Quality badge */}
                                            <div className="flex justify-center pt-1">
                                                <QualityBadge 
                                                    level={serviziSociali.qualitaCopertura === 'Alta' ? 'excellent' : serviziSociali.qualitaCopertura === 'Media' ? 'good' : 'average'}
                                                    label={`Copertura: ${serviziSociali.qualitaCopertura}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleSection>
                            )}

                            {/* SEZIONE 9: Cultura & Biblioteche */}
                            {nilId && (
                                <CollapsibleSection
                                    icon={BookOpen}
                                    label="Cultura & Biblioteche"
                                    sublabel={culturaData ? `${culturaData.totale} punti culturali` : 'Biblioteche, musei, architetture'}
                                    color="#8b5cf6"
                                    isEmpty={!hasCultureData && !isLoadingCultura}
                                >
                                    {isLoadingCultura ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 size={16} className="text-purple-400 animate-spin" />
                                        </div>
                                    ) : culturaData && culturaData.totale > 0 && (
                                        <div className="space-y-2">
                                            {/* Culture grid */}
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {culturaData.biblioteche > 0 && (
                                                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                        <BookOpen size={10} className="text-purple-400 mx-auto mb-0.5" />
                                                        <p className="text-sm font-bold text-white">{culturaData.biblioteche}</p>
                                                        <p className="text-[7px] text-gray-500 uppercase">Biblioteche</p>
                                                    </div>
                                                )}
                                                {culturaData.architetture > 0 && (
                                                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                        <Landmark size={10} className="text-amber-400 mx-auto mb-0.5" />
                                                        <p className="text-sm font-bold text-white">{culturaData.architetture}</p>
                                                        <p className="text-[7px] text-gray-500 uppercase">Architetture</p>
                                                    </div>
                                                )}
                                                {culturaData.musei > 0 && (
                                                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                        <Landmark size={10} className="text-blue-400 mx-auto mb-0.5" />
                                                        <p className="text-sm font-bold text-white">{culturaData.musei}</p>
                                                        <p className="text-[7px] text-gray-500 uppercase">Musei</p>
                                                    </div>
                                                )}
                                                {culturaData.beniCulturali > 0 && (
                                                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                        <Star size={10} className="text-yellow-400 mx-auto mb-0.5" />
                                                        <p className="text-sm font-bold text-white">{culturaData.beniCulturali}</p>
                                                        <p className="text-[7px] text-gray-500 uppercase">Beni Culturali</p>
                                                    </div>
                                                )}
                                                {culturaData.archivi > 0 && (
                                                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-center">
                                                        <BookOpen size={10} className="text-indigo-400 mx-auto mb-0.5" />
                                                        <p className="text-sm font-bold text-white">{culturaData.archivi}</p>
                                                        <p className="text-[7px] text-gray-500 uppercase">Archivi</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Culture score */}
                                            <div className="flex justify-center pt-1">
                                                <QualityBadge 
                                                    level={culturaData.livelloCultura === 'Alto' ? 'excellent' : culturaData.livelloCultura === 'Medio' ? 'good' : 'average'}
                                                    label={`Patrimonio: ${culturaData.livelloCultura}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleSection>
                            )}

                            {/* SEZIONE 10: Commercio & Attività */}
                            {nilId && (
                                <CollapsibleSection
                                    icon={Store}
                                    label="Commercio & Attività"
                                    sublabel={commercioData ? `${commercioData.totaleCommercio} esercizi` : 'Negozi, bar, ristoranti'}
                                    color="#f59e0b"
                                    isEmpty={!hasCommerceData && !isLoadingCommercio}
                                >
                                    {isLoadingCommercio ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 size={16} className="text-amber-400 animate-spin" />
                                        </div>
                                    ) : commercioData && commercioData.totaleCommercio > 0 && (
                                        <div className="space-y-2">
                                            {/* Main commerce grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {commercioData.pubbliciEsercizi > 0 && (
                                                    <div className="p-2.5 bg-gradient-to-br from-orange-500/10 to-transparent rounded-lg border border-orange-500/20 text-center">
                                                        <Coffee size={12} className="text-orange-400 mx-auto mb-1" />
                                                        <p className="text-lg font-black text-white">{commercioData.pubbliciEsercizi}</p>
                                                        <p className="text-[8px] text-orange-400/80 uppercase tracking-wider font-bold">Bar & Ristoranti</p>
                                                    </div>
                                                )}
                                                {commercioData.eserciziVicinato > 0 && (
                                                    <div className="p-2.5 bg-gradient-to-br from-amber-500/10 to-transparent rounded-lg border border-amber-500/20 text-center">
                                                        <Store size={12} className="text-amber-400 mx-auto mb-1" />
                                                        <p className="text-lg font-black text-white">{commercioData.eserciziVicinato}</p>
                                                        <p className="text-[8px] text-amber-400/80 uppercase tracking-wider font-bold">Negozi Vicinato</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Secondary stats */}
                                            <div className="space-y-1.5">
                                                {commercioData.bottegheStoriche > 0 && (
                                                    <StatPill
                                                        icon={Award}
                                                        label="Botteghe Storiche"
                                                        value={commercioData.bottegheStoriche.toString()}
                                                        color="#d97706"
                                                    />
                                                )}
                                                {commercioData.coworking > 0 && (
                                                    <StatPill
                                                        icon={Briefcase}
                                                        label="Spazi Coworking"
                                                        value={commercioData.coworking.toString()}
                                                        color="#2563eb"
                                                    />
                                                )}
                                                {commercioData.edicole > 0 && (
                                                    <StatPill
                                                        icon={Newspaper}
                                                        label="Edicole"
                                                        value={commercioData.edicole.toString()}
                                                        color="#64748b"
                                                    />
                                                )}
                                                {commercioData.grandeDistribuzione > 0 && (
                                                    <StatPill
                                                        icon={ShoppingCart}
                                                        label="Supermercati/GDO"
                                                        value={commercioData.grandeDistribuzione.toString()}
                                                        color="#16a34a"
                                                    />
                                                )}
                                            </div>
                                            
                                            {/* Density info */}
                                            {commercioData.densitaCommerciale > 0 && (
                                                <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5 text-center">
                                                    <p className="text-[8px] text-gray-500 uppercase tracking-wider font-medium mb-0.5">Densità Commerciale</p>
                                                    <p className="text-base font-bold text-amber-400">{commercioData.densitaCommerciale}</p>
                                                    <p className="text-[7px] text-gray-500">esercizi per km²</p>
                                                </div>
                                            )}
                                            
                                            {/* Vitality badge */}
                                            <div className="flex justify-center pt-1">
                                                <QualityBadge 
                                                    level={commercioData.livelloVitalita === 'Alto' ? 'excellent' : commercioData.livelloVitalita === 'Medio' ? 'good' : 'average'}
                                                    label={`Vitalità: ${commercioData.livelloVitalita}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleSection>
                            )}
                        </>
                    )}

                    {!nilData && !popData && !isLoadingNilAnalisi && (
                        <div className="py-16 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                                <Info size={32} className="text-purple-400/60" />
                            </div>
                            <p className="text-gray-400 font-semibold mb-1">Nessun dato NIL disponibile</p>
                            <p className="text-[11px] text-gray-500">I dati per questo quartiere non sono ancora stati caricati</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default QuartiereDetailPanel
