import React from 'react'
import { Euro, Wallet, TrendingUp, Activity, BarChart3, MapPin } from 'lucide-react'
import { MAP_METRIC_OPTIONS } from '../data/mapMetrics'

const mapMetricIcons = {
    prezzoAcquisto: Euro,
    prezzoLocazione: Wallet,
    rendimento: TrendingUp,
    variazione: Activity
}

const MapMetricSelector = ({ value, onChange }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                <MapPin size={12} className="text-accent animate-pulse" />
                <span className="animated-underline">Indicatore mappa</span>
            </h4>
            <span className="text-2xs text-text-tertiary">Seleziona layer</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
            {MAP_METRIC_OPTIONS.map((option, index) => {
                const Icon = mapMetricIcons[option.id] || BarChart3
                const isActive = option.id === value
                return (
                    <button
                        key={option.id}
                        onClick={() => onChange?.(option.id)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left 
                        transition-all duration-300 stagger-item magnetic-btn shine-effect
                        border ${isActive
                                ? 'bg-surface-elevated border-white/15 neon-pulse shadow-lg shadow-accent/10'
                                : 'bg-surface-card border-white/[0.06] hover:bg-surface-elevated hover:border-white/10 hover:scale-[1.02]'
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-accent-subtle scale-110' : 'bg-white/[0.04] group-hover:scale-105'}`}>
                            <Icon size={14} className={`transition-all duration-300 ${isActive ? 'text-accent animate-pulse' : 'text-text-tertiary'}`} />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                                {option.label}
                            </p>
                            <p className="text-2xs text-text-tertiary">{option.sublabel}</p>
                        </div>
                    </button>
                )
            })}
        </div>
    </div>
)

export default MapMetricSelector
