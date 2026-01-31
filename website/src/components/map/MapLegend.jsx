import { useState } from 'react'
import { ChevronDown, ChevronUp, Map, Info } from 'lucide-react'

/**
 * MapLegend - Dynamic legend for map metric visualization
 * 
 * Shows color scale and labels based on active metric (price, rent, variation)
 * Automatically switches to price legend when timeline is active
 */
const MapLegend = ({
    legend,
    title = 'Prezzi al mq',
    isTimelineActive = false
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className={`
            absolute bottom-8 right-4 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-auto' : 'w-48'}
            glass-premium rounded-xl overflow-hidden border border-white/10 shadow-2xl z-40
        `}>
            {/* Header / Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Map size={14} className="text-blue-400" />
                    <span className={`text-xs font-semibold text-white uppercase tracking-wider transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'opacity-100'}`}>
                        {isTimelineActive ? 'Timeline' : 'Legenda'}
                    </span>
                </div>
                {isCollapsed ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {/* Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-64'}`}>
                <div className="p-3 pt-0">
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2.5 mt-1 border-b border-white/5 pb-1">
                        {isTimelineActive ? 'Prezzi timeline' : title}
                    </h4>
                    <div className="space-y-1.5">
                        {legend.map((item, index) => (
                            <div key={index} className="flex items-center gap-2.5">
                                <div
                                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 shadow-sm ring-1 ring-white/5"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-gray-300 text-[11px] font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MapLegend
