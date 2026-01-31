/**
 * CompareModeIndicator - Shows when compare mode is active
 */
const CompareModeIndicator = () => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20
                    bg-blue-500/90 backdrop-blur-md px-4 py-2 rounded-full
                    text-white text-sm font-medium shadow-lg
                    flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>Modalità Confronto</span>
            <span className="text-blue-200">• Ctrl+Click per aggiungere</span>
        </div>
    )
}

export default CompareModeIndicator
