import { useMemo } from 'react'
import {
    X,
    Building2,
    Users,
    Wallet,
    BarChart3,
    Activity,
    Heart,
    TrendingUp,
    TrendingDown,
    Euro,
    Home,
    MapPin,
    Calendar,
    Leaf,
    ShoppingBag,
    Landmark,
    Car,
    Droplets,
    Zap,
    BookOpen,
    Store,
    Coffee,
    Thermometer,
    TreePine,
    Train,
    Building,
    ShoppingCart,
    Library,
    Palette,
    Music
} from 'lucide-react'
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import MiniTrendChart from './MiniTrendChart'
import { formatPrice } from '../data/quartieriGeoJSON'

/**
 * Custom Tooltip for Charts
 */
const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload || !payload.length) return null

    return (
        <div className="bg-black/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl">
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <div className="space-y-1">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-white font-semibold">
                            {formatter ? formatter(entry.value) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Stat Card Component
 */
const StatCard = ({ label, value, subValue, trend, color, icon: Icon }) => {
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown

    return (
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-2 mb-2">
                {Icon && (
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                        <Icon size={14} style={{ color }} />
                    </div>
                )}
                <span className="text-xs text-gray-400 font-medium">{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-xl font-bold text-white">{value}</span>
                    {subValue && <span className="text-xs text-gray-500 ml-1">{subValue}</span>}
                </div>
                {trend !== undefined && trend !== null && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md
                                    ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
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
 * Section Header
 */
const SectionHeader = ({ icon: Icon, title, color }) => (
    <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
            <Icon size={18} style={{ color }} />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
)

/**
 * Mercato Immobiliare Panel
 */
const ImmobiliarePanel = ({ milanoStats, onOpenTimeSeries }) => {
    const stats = milanoStats || {}

    const rendimentoMedio = stats.prezzoMedioAcquisto && stats.prezzoMedioLocazione
        ? (stats.prezzoMedioLocazione * 12 / stats.prezzoMedioAcquisto) * 100
        : null

    // Time series data for chart
    const timeSeriesData = useMemo(() => {
        if (!stats.timeSeries) return []
        return stats.timeSeries.slice(-12).map(item => ({
            periodo: item.label || item.semestre,
            acquisto: item.prezzoAcquisto || item.prezzoMedioAcquisto,
            locazione: item.prezzoLocazione || item.prezzoMedioLocazione
        }))
    }, [stats.timeSeries])

    return (
        <div className="space-y-6">
            <SectionHeader icon={Building2} title="Mercato Immobiliare Milano" color="#8b5cf6" />

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    label="Prezzo Medio Acquisto"
                    value={stats.prezzoMedioAcquisto ? formatPrice(stats.prezzoMedioAcquisto) : 'N/D'}
                    subValue="/mq"
                    icon={Home}
                    color="#8b5cf6"
                />
                <StatCard
                    label="Prezzo Medio Affitto"
                    value={stats.prezzoMedioLocazione ? `€${stats.prezzoMedioLocazione.toFixed(0)}` : 'N/D'}
                    subValue="/mq/mese"
                    icon={Euro}
                    color="#6366f1"
                />
                <StatCard
                    label="Prezzo Massimo"
                    value={stats.prezzoMax ? formatPrice(stats.prezzoMax) : 'N/D'}
                    subValue="/mq"
                    icon={TrendingUp}
                    color="#a855f7"
                />
                <StatCard
                    label="Prezzo Minimo"
                    value={stats.prezzoMin ? formatPrice(stats.prezzoMin) : 'N/D'}
                    subValue="/mq"
                    icon={TrendingDown}
                    color="#7c3aed"
                />
            </div>

            {/* Rendimento e Variazione */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-500/10 to-transparent rounded-xl p-4 border border-green-500/20">
                    <span className="text-xs text-gray-400 font-medium">Rendimento Lordo Annuo</span>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {rendimentoMedio !== null ? `${rendimentoMedio.toFixed(2)}%` : 'N/D'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">Stimato su affitto/acquisto</p>
                </div>
                <div className={`bg-gradient-to-br ${stats.variazioneSemestraleMedia >= 0 ? 'from-blue-500/10' : 'from-red-500/10'} to-transparent rounded-xl p-4 border ${stats.variazioneSemestraleMedia >= 0 ? 'border-blue-500/20' : 'border-red-500/20'}`}>
                    <span className="text-xs text-gray-400 font-medium">Variazione Semestrale</span>
                    <p className={`text-2xl font-bold mt-1 ${stats.variazioneSemestraleMedia >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {stats.variazioneSemestraleMedia !== undefined ? `${stats.variazioneSemestraleMedia >= 0 ? '+' : ''}${stats.variazioneSemestraleMedia}%` : 'N/D'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">vs semestre precedente</p>
                </div>
            </div>

            {/* Time Series Chart */}
            {timeSeriesData.length > 0 && (
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-white mb-4">Andamento Storico Prezzi</h4>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorAcquisto" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="periodo"
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatPrice(v)} />} />
                                <Area
                                    type="monotone"
                                    dataKey="acquisto"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#colorAcquisto)"
                                    name="Acquisto"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                <p className="text-xs text-purple-300/80 leading-relaxed">
                    <strong className="text-purple-200">📊 Fonte:</strong> Dati OMI (Osservatorio Mercato Immobiliare) aggiornati al semestre corrente. I prezzi sono riferiti al mercato residenziale.
                </p>
            </div>
        </div>
    )
}

/**
 * Demografia Panel
 */
const DemografiaPanel = ({ indicatoriDemografici, dataOverview, isLoading }) => {
    const indicatori = indicatoriDemografici?.indicatori || []
    const overview = dataOverview?.demografia || {}

    // Prepare chart data for key indicators
    const chartData = useMemo(() => {
        const preferred = [
            'Tasso di natalità (per mille abitanti)',
            'Tasso di mortalità (per mille abitanti)',
            'Saldo migratorio totale (per mille abitanti)'
        ]
        return preferred.map(name => {
            const ind = indicatori.find(i => i.indicatore === name)
            if (!ind?.data) return null
            return {
                name: name.replace(/\(per mille abitanti\)/g, '').trim(),
                data: ind.data.map(d => ({ anno: d.anno, valore: d.valore }))
            }
        }).filter(Boolean)
    }, [indicatori])

    const formatNumber = (value) => {
        if (value === null || value === undefined) return 'N/D'
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
        return value.toLocaleString('it-IT')
    }

    return (
        <div className="space-y-6">
            <SectionHeader icon={Users} title="Demografia Milano" color="#ec4899" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Population Hero Card */}
                    {overview.popolazioneTotale && (
                        <div className="bg-gradient-to-br from-pink-500/20 to-transparent rounded-xl p-5 border border-pink-500/20">
                            <span className="text-xs text-gray-400 font-medium">Popolazione Totale</span>
                            <p className="text-3xl font-bold text-white mt-1">{formatNumber(overview.popolazioneTotale)}</p>
                            <p className="text-[10px] text-gray-500 mt-1">residenti Milano • anno {overview.anno || 2021}</p>
                        </div>
                    )}

                    {/* Key Demographics */}
                    <div className="grid grid-cols-2 gap-3">
                        {overview.pctStranieriMedia && (
                            <StatCard
                                label="% Stranieri"
                                value={`${overview.pctStranieriMedia}%`}
                                icon={Users}
                                color="#ec4899"
                            />
                        )}
                        {overview.densitaMedia && (
                            <StatCard
                                label="Densità Media"
                                value={overview.densitaMedia.toLocaleString('it-IT')}
                                subValue="ab/km²"
                                icon={MapPin}
                                color="#f472b6"
                            />
                        )}
                    </div>

                    {/* Quick Stats from indicatori */}
                    {overview.indicatori?.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {overview.indicatori.slice(0, 4).map((ind, i) => (
                                <StatCard
                                    key={i}
                                    label={ind.indicatore?.replace(/\(valori percentuali\)/g, '').replace(' - al 1° gennaio', '').trim()}
                                    value={typeof ind.valore === 'number' ? `${ind.valore.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%` : ind.valore}
                                    icon={Users}
                                    color="#ec4899"
                                />
                            ))}
                        </div>
                    )}

                    {/* Time Series Charts */}
                    {chartData.map((series, idx) => (
                        <div key={idx} className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">{series.name}</h4>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={series.data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            dataKey="anno"
                                            tick={{ fill: '#6b7280', fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: '#6b7280', fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip formatter={(v) => v?.toFixed(2)} />} />
                                        <Line
                                            type="monotone"
                                            dataKey="valore"
                                            stroke="#ec4899"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}

                    {/* All Indicators List */}
                    {indicatori.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">Tutti gli Indicatori ISTAT</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {indicatori.map((ind, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-xs text-gray-400 font-medium truncate mr-2">{ind.indicatore}</span>
                                        <span className="text-xs text-white font-bold whitespace-nowrap">
                                            {ind.data?.[ind.data.length - 1]?.valore?.toLocaleString('it-IT', { maximumFractionDigits: 2 }) || 'N/D'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-4">
                        <p className="text-xs text-pink-300/80 leading-relaxed">
                            <strong className="text-pink-200">📊 Fonte:</strong> ISTAT - Indicatori demografici aggiornati al {overview.anno || 2025}
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Popolazione & Famiglie Panel
 */
const PopolazionePanel = ({ dataOverview }) => {
    const popolazione = dataOverview?.popolazione || {}
    const demografia = dataOverview?.demografia || {}

    const formatNumber = (value, suffix = '') => {
        if (value === null || value === undefined) return 'N/D'
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M${suffix}`
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K${suffix}`
        return `${value.toLocaleString('it-IT')}${suffix}`
    }

    const pctFamiglieUnipersonali = popolazione.totaleFamiglie && popolazione.famiglieUnipersonali
        ? ((popolazione.famiglieUnipersonali / popolazione.totaleFamiglie) * 100).toFixed(1)
        : null

    return (
        <div className="space-y-6">
            <SectionHeader icon={Heart} title="Popolazione & Famiglie" color="#f43f5e" />

            {/* Popolazione Totale - Hero Card */}
            <div className="bg-gradient-to-br from-rose-500/20 to-transparent rounded-xl p-5 border border-rose-500/20">
                <span className="text-xs text-gray-400 font-medium">Popolazione Totale Milano</span>
                <p className="text-3xl font-bold text-white mt-1">
                    {popolazione.popolazioneTotale ? formatNumber(popolazione.popolazioneTotale) : 'N/D'}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">residenti • dati {popolazione.anno || 2021}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    label="NIL Mappati"
                    value={popolazione.quartieriConDati || 88}
                    icon={MapPin}
                    color="#f43f5e"
                />
                <StatCard
                    label="Totale Famiglie"
                    value={formatNumber(popolazione.totaleFamiglie)}
                    icon={Heart}
                    color="#fb7185"
                />
                <StatCard
                    label="Famiglie Unipersonali"
                    value={formatNumber(popolazione.famiglieUnipersonali)}
                    subValue={pctFamiglieUnipersonali ? `(${pctFamiglieUnipersonali}%)` : ''}
                    icon={Users}
                    color="#f472b6"
                />
                <StatCard
                    label="Qualità di Vita Media"
                    value={popolazione.indiceQualitaVitaMedia ? `${popolazione.indiceQualitaVitaMedia}/100` : 'N/D'}
                    icon={Activity}
                    color="#ec4899"
                />
            </div>

            {/* Demografia quick stats */}
            {demografia.pctStranieriMedia && (
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-white mb-3">Composizione Demografica</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{demografia.pctStranieriMedia}%</p>
                            <p className="text-xs text-gray-400">Residenti Stranieri</p>
                        </div>
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{demografia.densitaMedia?.toLocaleString('it-IT') || 'N/D'}</p>
                            <p className="text-xs text-gray-400">Abitanti/km²</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                <p className="text-xs text-rose-300/80 leading-relaxed">
                    <strong className="text-rose-200">📍 NIL:</strong> I Nuclei di Identità Locale sono le 88 unità territoriali di Milano. Clicca su un quartiere nella mappa per vedere i dati specifici.
                </p>
            </div>
        </div>
    )
}

/**
 * Redditi & Contribuenti Panel
 */
const RedditiPanel = ({ contribuentiData, dataOverview, isLoading }) => {
    const redditi = dataOverview?.redditi || {}
    const categorie = contribuentiData?.categorie || []

    // Chart data
    const redditoSerie = useMemo(() => {
        const series = categorie.find(item => item.indicatore === 'Reddito imponibile (euro)')
        if (!series?.data) return []
        return series.data.map(point => ({
            anno: point.anno,
            valore: point.valore
        }))
    }, [categorie])

    const contribuentiSerie = useMemo(() => {
        const series = categorie.find(item => item.indicatore === 'Contribuenti')
        if (!series?.data) return []
        return series.data.map(point => ({
            anno: point.anno,
            valore: point.valore
        }))
    }, [categorie])

    return (
        <div className="space-y-6">
            <SectionHeader icon={Wallet} title="Redditi & Contribuenti" color="#f59e0b" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Reddito Medio"
                            value={redditi.redditoMedio ? `€${redditi.redditoMedio.toLocaleString('it-IT')}` : 'N/D'}
                            icon={Euro}
                            color="#f59e0b"
                        />
                        <StatCard
                            label="Contribuenti"
                            value={redditi.contribuentiTotali ? `${(redditi.contribuentiTotali / 1000).toFixed(0)}K` : 'N/D'}
                            icon={Users}
                            color="#fbbf24"
                        />
                    </div>

                    <StatCard
                        label="Reddito da Fabbricati Medio"
                        value={redditi.redditoFabbricatiMedio ? `€${redditi.redditoFabbricatiMedio.toLocaleString('it-IT')}` : 'N/D'}
                        icon={Building2}
                        color="#d97706"
                    />

                    {/* Reddito Imponibile Chart */}
                    {redditoSerie.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">Reddito Imponibile Totale</h4>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={redditoSerie}>
                                        <defs>
                                            <linearGradient id="colorReddito" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="anno" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1e9).toFixed(0)}B`} />
                                        <Tooltip content={<CustomTooltip formatter={(v) => `€${(v / 1e9).toFixed(2)}B`} />} />
                                        <Area type="monotone" dataKey="valore" stroke="#f59e0b" strokeWidth={2} fill="url(#colorReddito)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Contribuenti Chart */}
                    {contribuentiSerie.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">Numero Contribuenti</h4>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={contribuentiSerie}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="anno" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                        <Tooltip content={<CustomTooltip formatter={(v) => `${(v / 1000).toFixed(0)}K`} />} />
                                        <Bar dataKey="valore" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                        <p className="text-xs text-amber-300/80 leading-relaxed">
                            <strong className="text-amber-200">📑 Fonte:</strong> Ministero dell'Economia e delle Finanze (MEF) - Dati fiscali {redditi.anno || 2022}
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Indice Prezzi Nazionale Panel
 */
const IndicePrezziPanel = ({ indicePrezziData, dataOverview, isLoading }) => {
    const indicePrezzi = dataOverview?.indicePrezzi || {}
    const categorie = indicePrezziData?.categorie || []

    // Chart data
    const indiceSerie = useMemo(() => {
        const series = categorie.find(item => item.categoria === 'H1 - tutte le voci')
        if (!series?.data) return []
        return series.data.map(point => ({
            periodo: point.periodo,
            indice: point.indice
        }))
    }, [categorie])

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        return categorie.slice(0, 6).map(cat => {
            const lastData = cat.data?.[cat.data.length - 1]
            return {
                name: cat.categoria?.replace('H1 - ', '').replace('H2 - ', '') || 'N/D',
                value: lastData?.indice || 0,
                change: lastData?.variazionePercentuale || 0
            }
        })
    }, [categorie])

    const indiceVariationClass = indicePrezzi?.variazionePercentuale < 0 ? 'text-red-400' : 'text-green-400'

    return (
        <div className="space-y-6">
            <SectionHeader icon={BarChart3} title="Indice Prezzi Abitazioni" color="#06b6d4" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Indice Generale"
                            value={indicePrezzi?.indice?.toFixed(1) || 'N/D'}
                            subValue="base 2015"
                            icon={BarChart3}
                            color="#06b6d4"
                        />
                        <div className={`bg-gradient-to-br ${indicePrezzi?.variazionePercentuale >= 0 ? 'from-cyan-500/10' : 'from-red-500/10'} to-transparent rounded-xl p-4 border ${indicePrezzi?.variazionePercentuale >= 0 ? 'border-cyan-500/20' : 'border-red-500/20'}`}>
                            <span className="text-xs text-gray-400 font-medium">Variazione Trim.</span>
                            <p className={`text-2xl font-bold mt-1 ${indiceVariationClass}`}>
                                {indicePrezzi?.variazionePercentuale !== undefined ? `${indicePrezzi.variazionePercentuale >= 0 ? '+' : ''}${indicePrezzi.variazionePercentuale.toFixed(2)}%` : 'N/D'}
                            </p>
                        </div>
                    </div>

                    {/* Main Chart */}
                    {indiceSerie.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">Andamento Storico Indice</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={indiceSerie}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="periodo" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip content={<CustomTooltip formatter={(v) => v?.toFixed(1)} />} />
                                        <Line type="monotone" dataKey="indice" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Categories Breakdown */}
                    {categoryBreakdown.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3">Dettaglio per Categoria</h4>
                            <div className="space-y-2">
                                {categoryBreakdown.map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-xs text-gray-400 font-medium truncate mr-2">{cat.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-white font-bold">{cat.value.toFixed(1)}</span>
                                            <span className={`text-[10px] font-medium ${cat.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {cat.change >= 0 ? '+' : ''}{cat.change.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4">
                        <p className="text-xs text-cyan-300/80 leading-relaxed">
                            <strong className="text-cyan-200">📈 Fonte:</strong> ISTAT - Indice dei prezzi delle abitazioni {indicePrezzi?.anno ? `• ${indicePrezzi.anno} ${indicePrezzi.trimestre || ''}` : ''}
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Servizi & Infrastrutture Panel
 */
const ServiziPanel = ({ dataOverview }) => {
    const servizi = dataOverview?.servizi || {}
    const trasporto = dataOverview?.trasporto || {}

    const formatCount = (value) => value?.toLocaleString('it-IT') || 'N/D'

    return (
        <div className="space-y-6">
            <SectionHeader icon={Activity} title="Servizi & Infrastrutture" color="#10b981" />

            {/* Sanità */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Heart size={14} className="text-rose-400" />
                    Servizi Sanitari
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Farmacie" value={formatCount(servizi.farmacie)} icon={Heart} color="#f43f5e" />
                    <StatCard label="Medici di Base" value={formatCount(servizi.mediciBase)} icon={Users} color="#fb7185" />
                </div>
            </div>

            {/* Commercio e Mercati */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <MapPin size={14} className="text-amber-400" />
                    Mercati & Commercio
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Mercati Totali" value={formatCount(servizi.mercati)} icon={Activity} color="#f59e0b" />
                    <StatCard label="Mercati Coperti" value={formatCount(servizi.mercatiCoperti)} icon={Building2} color="#fbbf24" />
                </div>
                <div className="mt-3">
                    <StatCard label="Mercati Settimanali" value={formatCount(servizi.mercatiScoperti)} icon={MapPin} color="#d97706" />
                </div>
            </div>

            {/* Servizi Sociali e Verde */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard label="Servizi Sociali" value={formatCount(servizi.serviziSociali)} icon={Heart} color="#059669" />
                <StatCard 
                    label="Indice Verde Urbano" 
                    value={servizi.indiceVerdeMedio ? `${servizi.indiceVerdeMedio.toFixed(1)}` : 'N/D'} 
                    subValue="media NIL"
                    icon={Activity} 
                    color="#10b981" 
                />
            </div>

            {trasporto?.anno && (
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-semibold text-white mb-3">Trasporto Pubblico ({trasporto.anno})</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{formatCount(trasporto.lineeTotali)}</p>
                            <p className="text-xs text-gray-400">Linee Totali</p>
                        </div>
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{trasporto.lunghezzaTotale?.toFixed(0) || 'N/D'} km</p>
                            <p className="text-xs text-gray-400">Rete Totale</p>
                        </div>
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-blue-400">{formatCount(trasporto.lineeMetro)}</p>
                            <p className="text-xs text-gray-400">Linee Metro</p>
                        </div>
                        <div className="text-center bg-black/20 rounded-xl p-3">
                            <p className="text-2xl font-bold text-blue-400">{trasporto.lunghezzaMetro?.toFixed(1) || 'N/D'} km</p>
                            <p className="text-xs text-gray-400">Rete Metro</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                    <strong className="text-emerald-200">🏙️ Fonte:</strong> Open Data Comune di Milano - Servizi territoriali e infrastrutture urbane
                </p>
            </div>
        </div>
    )
}

/**
 * Ambiente Panel - NEW
 */
const AmbientePanel = ({ ambienteData, dataOverview, isLoading }) => {
    const servizi = dataOverview?.servizi || {}
    const verde = ambienteData?.verde || {}
    const calore = ambienteData?.calore || {}
    const rischioCalore = ambienteData?.rischioCalore || {}

    const formatCount = (value) => value?.toLocaleString('it-IT') || 'N/D'

    return (
        <div className="space-y-6">
            <SectionHeader icon={Leaf} title="Qualità Ambientale" color="#22c55e" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Verde Urbano Hero */}
                    <div className="bg-gradient-to-br from-green-500/20 to-transparent rounded-xl p-5 border border-green-500/20">
                        <span className="text-xs text-gray-400 font-medium">Indice Verde Urbano Medio</span>
                        <p className="text-3xl font-bold text-green-400 mt-1">
                            {servizi.indiceVerdeMedio ? servizi.indiceVerdeMedio.toFixed(1) : 'N/D'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">mq verde/abitante • media 88 NIL</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="NIL con dati Verde"
                            value={formatCount(verde.totale)}
                            icon={TreePine}
                            color="#22c55e"
                        />
                        <StatCard
                            label="NIL monitorati Calore"
                            value={formatCount(calore.totale)}
                            icon={Thermometer}
                            color="#f59e0b"
                        />
                    </div>

                    {/* Rischio Calore */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <Thermometer size={14} className="text-orange-400" />
                            Rischio Ondate di Calore
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center bg-black/20 rounded-xl p-3">
                                <p className="text-2xl font-bold text-orange-400">{formatCount(rischioCalore.totale)}</p>
                                <p className="text-xs text-gray-400">NIL mappati</p>
                            </div>
                            <div className="text-center bg-black/20 rounded-xl p-3">
                                <p className="text-2xl font-bold text-white">2024</p>
                                <p className="text-xs text-gray-400">Anno dati</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <Leaf size={14} className="text-green-400" />
                            Indicatori Ambientali
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-xs text-gray-400">Verde urbano per NIL</span>
                                <span className="text-xs text-white font-bold">Indice 2024</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-xs text-gray-400">Esposizione calore urbano</span>
                                <span className="text-xs text-white font-bold">Mappatura NIL</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-gray-400">Rischio ondate calore</span>
                                <span className="text-xs text-white font-bold">Classificazione NIL</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                        <p className="text-xs text-green-300/80 leading-relaxed">
                            <strong className="text-green-200">🌿 Fonte:</strong> Open Data Comune di Milano - Dati ambientali e qualità dell'aria 2024
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Commercio Panel - NEW
 */
const CommercioPanel = ({ commercioData, dataOverview, isLoading }) => {
    const commercio = dataOverview?.commercio || {}
    const totali = commercioData?.totali || {}
    const perMunicipio = commercioData?.perMunicipio || {}

    const formatCount = (value) => value?.toLocaleString('it-IT') || 'N/D'

    // Top 5 municipi per pubblici esercizi
    const topMunicipiPubblici = useMemo(() => {
        return (perMunicipio.pubblici || []).slice(0, 5)
    }, [perMunicipio.pubblici])

    return (
        <div className="space-y-6">
            <SectionHeader icon={ShoppingBag} title="Commercio & Attività" color="#f97316" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-orange-500/20 to-transparent rounded-xl p-4 border border-orange-500/20">
                            <span className="text-xs text-gray-400 font-medium">Pubblici Esercizi</span>
                            <p className="text-2xl font-bold text-orange-400 mt-1">
                                {formatCount(totali.pubbliciEsercizi || commercio.pubbliciEsercizi)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">bar, ristoranti, pub</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500/20 to-transparent rounded-xl p-4 border border-amber-500/20">
                            <span className="text-xs text-gray-400 font-medium">Botteghe Storiche</span>
                            <p className="text-2xl font-bold text-amber-400 mt-1">
                                {formatCount(totali.bottegheStoriche || commercio.bottegheStoriche)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">attività tradizionali</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Esercizi Vicinato"
                            value={formatCount(totali.eserciziVicinato || commercio.eserciziVicinato)}
                            icon={Store}
                            color="#f97316"
                        />
                        <StatCard
                            label="Grande Distribuzione"
                            value={formatCount(totali.grandeDistribuzione || commercio.grandeDistribuzione)}
                            icon={ShoppingCart}
                            color="#ea580c"
                        />
                        <StatCard
                            label="Coworking"
                            value={formatCount(totali.coworking || commercio.coworking)}
                            icon={Building}
                            color="#fb923c"
                        />
                        <StatCard
                            label="Attività Totali"
                            value={formatCount((totali.pubbliciEsercizi || 0) + (totali.eserciziVicinato || 0))}
                            icon={ShoppingBag}
                            color="#f59e0b"
                        />
                    </div>

                    {/* Top Municipi */}
                    {topMunicipiPubblici.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Coffee size={14} className="text-orange-400" />
                                Top Municipi per Locali
                            </h4>
                            <div className="space-y-2">
                                {topMunicipiPubblici.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-xs text-gray-400">Municipio {item.municipio}</span>
                                        <span className="text-xs text-white font-bold">{formatCount(item.count)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
                        <p className="text-xs text-orange-300/80 leading-relaxed">
                            <strong className="text-orange-200">🛍️ Fonte:</strong> Open Data Comune di Milano - Registro attività commerciali
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Cultura Panel - NEW
 */
const CulturaPanel = ({ culturaData, bibliotecheData, isLoading }) => {
    const cultura = culturaData || {}
    const biblioteche = bibliotecheData || {}

    const formatCount = (value) => value?.toLocaleString('it-IT') || 'N/D'

    return (
        <div className="space-y-6">
            <SectionHeader icon={Landmark} title="Cultura & Patrimonio" color="#8b5cf6" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-purple-500/20 to-transparent rounded-xl p-4 border border-purple-500/20">
                            <span className="text-xs text-gray-400 font-medium">Architetture Storiche</span>
                            <p className="text-2xl font-bold text-purple-400 mt-1">
                                {formatCount(cultura.architetture)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">edifici catalogati</p>
                        </div>
                        <div className="bg-gradient-to-br from-violet-500/20 to-transparent rounded-xl p-4 border border-violet-500/20">
                            <span className="text-xs text-gray-400 font-medium">Beni Culturali</span>
                            <p className="text-2xl font-bold text-violet-400 mt-1">
                                {formatCount(cultura.beniCulturali)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">siti protetti</p>
                        </div>
                    </div>

                    {/* Musei e Biblioteche */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <Library size={14} className="text-purple-400" />
                            Istituzioni Culturali
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label="Musei"
                                value={formatCount(cultura.musei)}
                                icon={Palette}
                                color="#a855f7"
                            />
                            <StatCard
                                label="Biblioteche Rionali"
                                value={formatCount(biblioteche.biblioteche?.totale || cultura.biblioteche)}
                                icon={BookOpen}
                                color="#8b5cf6"
                            />
                        </div>
                    </div>

                    {/* Altri dati culturali */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Associazioni Culturali"
                            value={formatCount(cultura.associazioni)}
                            icon={Music}
                            color="#7c3aed"
                        />
                        <StatCard
                            label="Centri Congressi"
                            value={formatCount(cultura.centriCongressi)}
                            icon={Building2}
                            color="#6d28d9"
                        />
                        <StatCard
                            label="Archivi"
                            value={formatCount(biblioteche.archivi?.totale || cultura.archivi)}
                            icon={Library}
                            color="#5b21b6"
                        />
                        <StatCard
                            label="Totale Strutture"
                            value={formatCount(
                                (cultura.musei || 0) + 
                                (cultura.biblioteche || 0) + 
                                (cultura.associazioni || 0)
                            )}
                            icon={Landmark}
                            color="#9333ea"
                        />
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                        <p className="text-xs text-purple-300/80 leading-relaxed">
                            <strong className="text-purple-200">🏛️ Fonte:</strong> Open Data Comune di Milano - Patrimonio culturale e istituzioni
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Mobilità Panel - NEW
 */
const MobilitaPanel = ({ mobilitaData, dataOverview, isLoading }) => {
    const trasporto = dataOverview?.trasporto || {}
    const mobilita = mobilitaData || {}

    const formatCount = (value) => value?.toLocaleString('it-IT') || 'N/D'

    return (
        <div className="space-y-6">
            <SectionHeader icon={Car} title="Mobilità & Trasporti" color="#0ea5e9" />

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Mobilità Elettrica Hero */}
                    <div className="bg-gradient-to-br from-sky-500/20 to-transparent rounded-xl p-5 border border-sky-500/20">
                        <span className="text-xs text-gray-400 font-medium">Colonnine Ricarica Elettrica</span>
                        <p className="text-3xl font-bold text-sky-400 mt-1">
                            {formatCount(mobilita.colonneRicarica)}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">punti di ricarica EV in città</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Stazioni Ferroviarie"
                            value={formatCount(mobilita.stazioniFerroviarie)}
                            icon={Train}
                            color="#0ea5e9"
                        />
                        <StatCard
                            label="Colonnine EV"
                            value={formatCount(mobilita.colonneRicarica)}
                            icon={Zap}
                            color="#22d3ee"
                        />
                    </div>

                    {/* Trasporto Pubblico */}
                    {trasporto?.anno && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Train size={14} className="text-sky-400" />
                                Trasporto Pubblico ({trasporto.anno})
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center bg-black/20 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-white">{formatCount(trasporto.lineeTotali)}</p>
                                    <p className="text-xs text-gray-400">Linee Totali</p>
                                </div>
                                <div className="text-center bg-black/20 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-white">{trasporto.lunghezzaTotale?.toFixed(0) || 'N/D'} km</p>
                                    <p className="text-xs text-gray-400">Rete Totale</p>
                                </div>
                                <div className="text-center bg-black/20 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-sky-400">{formatCount(trasporto.lineeMetro)}</p>
                                    <p className="text-xs text-gray-400">Linee Metro</p>
                                </div>
                                <div className="text-center bg-black/20 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-sky-400">{trasporto.lunghezzaMetro?.toFixed(1) || 'N/D'} km</p>
                                    <p className="text-xs text-gray-400">Rete Metro</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobilità Sostenibile */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <Zap size={14} className="text-green-400" />
                            Mobilità Sostenibile
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-xs text-gray-400 flex items-center gap-2">
                                    <Zap size={12} className="text-sky-400" />
                                    Punti ricarica EV
                                </span>
                                <span className="text-xs text-white font-bold">{formatCount(mobilita.colonneRicarica)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-xs text-gray-400 flex items-center gap-2">
                                    <Train size={12} className="text-sky-400" />
                                    Stazioni ferroviarie
                                </span>
                                <span className="text-xs text-white font-bold">{formatCount(mobilita.stazioniFerroviarie)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-gray-400 flex items-center gap-2">
                                    <Car size={12} className="text-sky-400" />
                                    Rete metropolitana
                                </span>
                                <span className="text-xs text-white font-bold">{trasporto.lunghezzaMetro?.toFixed(1) || 'N/D'} km</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-sky-500/5 border border-sky-500/10 rounded-xl p-4">
                        <p className="text-xs text-sky-300/80 leading-relaxed">
                            <strong className="text-sky-200">🚗 Fonte:</strong> Open Data Comune di Milano - Infrastrutture mobilità e trasporti
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Category Detail Panel - Main sliding panel component
 */
const CategoryDetailPanel = ({
    isOpen,
    onClose,
    activeCategory,
    milanoStats,
    dataOverview,
    indicatoriDemografici,
    contribuentiData,
    indicePrezziData,
    ambienteData,
    commercioData,
    culturaData,
    bibliotecheData,
    mobilitaData,
    isLoadingIndicatori,
    isLoadingContribuenti,
    isLoadingIndicePrezzi,
    isLoadingAmbiente,
    isLoadingCommercio,
    isLoadingCultura,
    isLoadingMobilita,
    onOpenTimeSeries
}) => {
    const categoryConfig = {
        immobiliare: { icon: Building2, title: 'Mercato Immobiliare', color: '#8b5cf6' },
        demografia: { icon: Users, title: 'Demografia', color: '#ec4899' },
        popolazione: { icon: Heart, title: 'Popolazione & Famiglie', color: '#f43f5e' },
        redditi: { icon: Wallet, title: 'Redditi & Contribuenti', color: '#f59e0b' },
        indice: { icon: BarChart3, title: 'Indice Prezzi', color: '#06b6d4' },
        servizi: { icon: Activity, title: 'Servizi & Infrastrutture', color: '#10b981' },
        ambiente: { icon: Leaf, title: 'Qualità Ambientale', color: '#22c55e' },
        commercio: { icon: ShoppingBag, title: 'Commercio & Attività', color: '#f97316' },
        cultura: { icon: Landmark, title: 'Cultura & Patrimonio', color: '#8b5cf6' },
        mobilita: { icon: Car, title: 'Mobilità & Trasporti', color: '#0ea5e9' }
    }

    const config = categoryConfig[activeCategory] || categoryConfig.immobiliare

    const renderContent = () => {
        switch (activeCategory) {
            case 'immobiliare':
                return <ImmobiliarePanel milanoStats={milanoStats} onOpenTimeSeries={onOpenTimeSeries} />
            case 'demografia':
                return <DemografiaPanel indicatoriDemografici={indicatoriDemografici} dataOverview={dataOverview} isLoading={isLoadingIndicatori} />
            case 'popolazione':
                return <PopolazionePanel dataOverview={dataOverview} />
            case 'redditi':
                return <RedditiPanel contribuentiData={contribuentiData} dataOverview={dataOverview} isLoading={isLoadingContribuenti} />
            case 'indice':
                return <IndicePrezziPanel indicePrezziData={indicePrezziData} dataOverview={dataOverview} isLoading={isLoadingIndicePrezzi} />
            case 'servizi':
                return <ServiziPanel dataOverview={dataOverview} />
            case 'ambiente':
                return <AmbientePanel ambienteData={ambienteData} dataOverview={dataOverview} isLoading={isLoadingAmbiente} />
            case 'commercio':
                return <CommercioPanel commercioData={commercioData} dataOverview={dataOverview} isLoading={isLoadingCommercio} />
            case 'cultura':
                return <CulturaPanel culturaData={culturaData} bibliotecheData={bibliotecheData} isLoading={isLoadingCultura} />
            case 'mobilita':
                return <MobilitaPanel mobilitaData={mobilitaData} dataOverview={dataOverview} isLoading={isLoadingMobilita} />
            default:
                return null
        }
    }

    return (
        <aside
            className={`fixed right-4 top-4 bottom-4 w-[420px] z-30
                       transform transition-all duration-500 ease-out
                       ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}`}
        >
            <div className="h-full rounded-3xl shadow-2xl border border-white/10 overflow-hidden
                           bg-black/80 backdrop-blur-xl flex flex-col">
                {/* Header */}
                <header className="px-5 py-4 border-b border-white/5 flex-shrink-0 bg-black/20 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${config.color}20, transparent)` }} />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ backgroundColor: `${config.color}20` }}>
                                <config.icon size={20} style={{ color: config.color }} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                                <p className="text-xs text-gray-400">Dati dettagliati Milano</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {renderContent()}
                </div>
            </div>
        </aside>
    )
}

export default CategoryDetailPanel
