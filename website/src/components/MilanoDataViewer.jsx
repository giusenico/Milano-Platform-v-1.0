import {
    Sparkles,
    Building2,
    Users,
    Wallet,
    BarChart3,
    Activity,
    Heart,
    ChevronRight,
    Leaf,
    ShoppingBag,
    Landmark,
    Car,
    Droplets
} from 'lucide-react'
import DataCategoryButton from './DataCategoryButton'
import { formatPrice } from '../data/quartieriGeoJSON'

/**
 * Milano Data Viewer Component - Shows all available data for Milano
 * Now opens a detail panel on category click instead of inline expansion
 */
const MilanoDataViewer = ({
    onOpenCategoryDetail,
    milanoStats,
    dataOverview,
    activeCategory
}) => {
    const stats = milanoStats || {}
    const overview = dataOverview || {}
    const redditi = overview.redditi || {}
    const indicePrezzi = overview.indicePrezzi || {}
    const servizi = overview.servizi || {}
    const commercio = overview.commercio || {}
    const cultura = overview.cultura || {}
    const mobilita = overview.mobilita || {}
    
    const rendimentoMedio = stats.prezzoMedioAcquisto && stats.prezzoMedioLocazione
        ? (stats.prezzoMedioLocazione * 12 / stats.prezzoMedioAcquisto) * 100
        : null
    const isOverviewReady = Boolean(dataOverview)
    const showDemografia = !isOverviewReady || overview.demografia?.popolazioneTotale != null || overview.demografia?.pctStranieriMedia != null || overview.demografia?.densitaMedia != null
    const showPopolazione = !isOverviewReady || overview.popolazione?.totaleFamiglie != null || overview.popolazione?.quartieriConDati != null
    const showRedditi = !isOverviewReady || redditi.redditoMedio != null || redditi.contribuentiTotali != null
    const showIndice = !isOverviewReady || indicePrezzi?.indice != null || indicePrezzi?.variazionePercentuale != null
    const showServizi = !isOverviewReady || servizi.farmacie != null || servizi.mediciBase != null || servizi.scuole != null || servizi.mercati != null
    const showAmbiente = !isOverviewReady || servizi.indiceVerdeMedio != null
    const showCommercio = !isOverviewReady || commercio.pubbliciEsercizi != null || commercio.bottegheStoriche != null
    const showCultura = !isOverviewReady || cultura.biblioteche != null || cultura.architetture != null || cultura.beniCulturali != null
    const showMobilita = !isOverviewReady || mobilita.colonneRicarica != null

    const formatCount = (value) => {
        return value === null || value === undefined
            ? 'N/D'
            : value.toLocaleString('it-IT')
    }

    return (
        <div className="space-y-6 animate-apple-fade-in pb-6">
            {/* Enhanced Hero Header Card */}
            <div className="relative rounded-3xl p-6 overflow-hidden shadow-2xl border border-white/5"
                style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(236, 72, 153, 0.05) 100%)' }}>

                {/* Glass Effect */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

                {/* Decorative elements */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-40 bg-blue-500 mix-blend-screen" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[60px] opacity-30 bg-purple-500 mix-blend-screen" />

                <div className="relative z-10">
                    {/* Quick Stats Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:bg-black/30 transition-colors">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Prezzo Medio Acquisto</span>
                            <p className="text-xl font-bold text-white tracking-tight">{stats.prezzoMedioAcquisto ? formatPrice(stats.prezzoMedioAcquisto) : 'N/D'}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">€/mq residenziale</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:bg-black/30 transition-colors">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Affitto Medio</span>
                            <p className="text-xl font-bold text-white tracking-tight">€{stats.prezzoMedioLocazione?.toFixed(0) || 'N/D'}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">€/mq al mese</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:bg-black/30 transition-colors">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Rendimento Lordo</span>
                            <p className={`text-xl font-bold tracking-tight ${rendimentoMedio && rendimentoMedio > 0 ? 'text-green-400' : 'text-white'}`}>
                                {rendimentoMedio !== null ? `${rendimentoMedio.toFixed(1)}%` : 'N/D'}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">annuo stimato</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:bg-black/30 transition-colors">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Variazione Sem.</span>
                            <p className={`text-xl font-bold tracking-tight ${stats.variazioneSemestraleMedia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.variazioneSemestraleMedia !== undefined ? `${stats.variazioneSemestraleMedia >= 0 ? '+' : ''}${stats.variazioneSemestraleMedia}%` : 'N/D'}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">vs semestre prec.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Category Buttons - Click to open detail panel */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={12} className="text-blue-400" />
                        Categorie Dati
                    </h4>
                    <span className="text-[10px] text-gray-500">Clicca per dettagli</span>
                </div>

                {/* Mercato Immobiliare - includes Time Series */}
                <DataCategoryButton
                    icon={Building2}
                    label="Mercato Immobiliare"
                    sublabel={stats.prezzoMedioAcquisto ? `Media ${formatPrice(stats.prezzoMedioAcquisto)}/mq` : 'Prezzi e time series'}
                    color="#8b5cf6"
                    onClick={() => onOpenCategoryDetail?.('immobiliare')}
                    isActive={activeCategory === 'immobiliare'}
                    showArrow
                />

                {/* Demografia */}
                {showDemografia && (
                    <DataCategoryButton
                        icon={Users}
                        label="Demografia"
                        sublabel={overview.demografia?.popolazioneTotale 
                            ? `${(overview.demografia.popolazioneTotale / 1000000).toFixed(2)}M abitanti`
                            : 'Dati ISTAT popolazione'}
                        color="#ec4899"
                        onClick={() => onOpenCategoryDetail?.('demografia')}
                        isActive={activeCategory === 'demografia'}
                        showArrow
                    />
                )}

                {/* Popolazione e Famiglie */}
                {showPopolazione && (
                    <DataCategoryButton
                        icon={Heart}
                        label="Popolazione & Famiglie"
                        sublabel={overview.popolazione?.totaleFamiglie
                            ? `${formatCount(overview.popolazione.totaleFamiglie)} famiglie`
                            : `${overview.popolazione?.quartieriConDati || 88} NIL mappati`}
                        color="#f43f5e"
                        onClick={() => onOpenCategoryDetail?.('popolazione')}
                        isActive={activeCategory === 'popolazione'}
                        showArrow
                    />
                )}

                {/* Redditi e Contribuenti */}
                {showRedditi && (
                    <DataCategoryButton
                        icon={Wallet}
                        label="Redditi & Contribuenti"
                        sublabel={redditi.redditoMedio ? `Media €${redditi.redditoMedio.toLocaleString('it-IT')}/anno` : 'Dati fiscali MEF'}
                        color="#f59e0b"
                        onClick={() => onOpenCategoryDetail?.('redditi')}
                        isActive={activeCategory === 'redditi'}
                        showArrow
                    />
                )}

                {/* Indice Prezzi Nazionale */}
                {showIndice && (
                    <DataCategoryButton
                        icon={BarChart3}
                        label="Indice Prezzi Nazionale"
                        sublabel={indicePrezzi?.indice 
                            ? `${indicePrezzi.indice.toFixed(1)} ${indicePrezzi.variazionePercentuale >= 0 ? '↑' : '↓'}${Math.abs(indicePrezzi.variazionePercentuale).toFixed(1)}%` 
                            : 'Fonte ISTAT'}
                        color="#06b6d4"
                        onClick={() => onOpenCategoryDetail?.('indice')}
                        isActive={activeCategory === 'indice'}
                        showArrow
                    />
                )}

                {/* Servizi & Infrastrutture */}
                {showServizi && (
                    <DataCategoryButton
                        icon={Activity}
                        label="Servizi & Infrastrutture"
                        sublabel={servizi.farmacie !== undefined
                            ? `${formatCount(servizi.farmacie)} farmacie • ${formatCount(servizi.mediciBase)} medici`
                            : 'Dati servizi urbani'}
                        color="#10b981"
                        onClick={() => onOpenCategoryDetail?.('servizi')}
                        isActive={activeCategory === 'servizi'}
                        showArrow
                    />
                )}

                {/* Qualità Ambientale - NEW */}
                {showAmbiente && (
                    <DataCategoryButton
                        icon={Leaf}
                        label="Qualità Ambientale"
                        sublabel={servizi.indiceVerdeMedio 
                            ? `Indice verde ${servizi.indiceVerdeMedio.toFixed(1)} • Dati NIL`
                            : 'Verde urbano, calore, rischio'}
                        color="#22c55e"
                        onClick={() => onOpenCategoryDetail?.('ambiente')}
                        isActive={activeCategory === 'ambiente'}
                        showArrow
                    />
                )}

                {/* Commercio & Attività - NEW */}
                {showCommercio && (
                    <DataCategoryButton
                        icon={ShoppingBag}
                        label="Commercio & Attività"
                        sublabel={commercio.pubbliciEsercizi !== undefined
                            ? `${formatCount(commercio.pubbliciEsercizi)} locali • ${formatCount(commercio.bottegheStoriche)} botteghe`
                            : 'Negozi, bar, ristoranti'}
                        color="#f97316"
                        onClick={() => onOpenCategoryDetail?.('commercio')}
                        isActive={activeCategory === 'commercio'}
                        showArrow
                    />
                )}

                {/* Cultura & Patrimonio - NEW */}
                {showCultura && (
                    <DataCategoryButton
                        icon={Landmark}
                        label="Cultura & Patrimonio"
                        sublabel={cultura.biblioteche !== undefined
                            ? `${formatCount(cultura.biblioteche)} biblioteche • ${formatCount(cultura.architetture || cultura.beniCulturali)} luoghi`
                            : 'Architetture, siti culturali, biblioteche'}
                        color="#8b5cf6"
                        onClick={() => onOpenCategoryDetail?.('cultura')}
                        isActive={activeCategory === 'cultura'}
                        showArrow
                    />
                )}

                {/* Mobilità Verde - NEW */}
                {showMobilita && (
                    <DataCategoryButton
                        icon={Car}
                        label="Mobilità & Trasporti"
                        sublabel={mobilita.colonneRicarica !== undefined
                            ? `${formatCount(mobilita.colonneRicarica)} colonnine EV`
                            : 'Ricarica elettrica, stazioni'}
                        color="#0ea5e9"
                        onClick={() => onOpenCategoryDetail?.('mobilita')}
                        isActive={activeCategory === 'mobilita'}
                        showArrow
                    />
                )}
            </div>

            {/* Info note */}
            <div className="bg-blue-500/5 
                      border border-blue-500/10 rounded-2xl p-4
                      hover:bg-blue-500/10 transition-colors duration-300">
                <p className="text-xs text-blue-300/80 leading-relaxed font-medium">
                    <strong className="text-blue-200">💡 Tip:</strong> Clicca su una categoria per visualizzare i dati dettagliati, grafici e time series nel pannello laterale.
                </p>
            </div>
        </div>
    )
}

export default MilanoDataViewer
