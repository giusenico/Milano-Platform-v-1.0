import { Home } from 'lucide-react'

/**
 * MapControls - Reset view button and other map control buttons
 * 
 * Extracted from MapComponent for modularity
 */
const MapControls = ({ onResetView }) => {
    return (
        <button
            onClick={onResetView}
            className="map-control-button"
            title="Ritorna alla vista iniziale"
        >
            <Home size={18} />
        </button>
    )
}

export default MapControls
