/**
 * CoordinatesDisplay - Shows current location and selected quartiere info
 */
const CoordinatesDisplay = ({ selectedQuartiere }) => {
    const MILAN_CENTER = {
        lng: 9.1900,
        lat: 45.4642
    }

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 
                    bg-black/60 backdrop-blur-md px-4 py-2 rounded-full
                    text-white text-xs z-10 border border-white/10">
            <span className="text-gray-400">Milano, Italia</span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="font-mono">
                {MILAN_CENTER.lat.toFixed(4)}°N, {MILAN_CENTER.lng.toFixed(4)}°E
            </span>
            {selectedQuartiere && (
                <>
                    <span className="mx-2 text-gray-600">|</span>
                    <span className="text-blue-400">{selectedQuartiere.shortName}</span>
                </>
            )}
        </div>
    )
}

export default CoordinatesDisplay
