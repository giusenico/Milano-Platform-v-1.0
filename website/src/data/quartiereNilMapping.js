import quartiereToNilId from './quartiereNilMapping_expanded.json'
import nilData from './nilMapping.json'

/**
 * Normalizes a quartiere name for matching with NIL mapping
 * Converts to lowercase and handles special characters
 * @param {string} name - The quartiere name to normalize
 * @returns {string} Normalized name
 */
function normalizeQuartiereName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/'/g, '')
        .replace(/\./g, '')
}

/**
 * Resolves a quartiere object to its corresponding NIL ID
 * @param {Object} quartiere - Quartiere object with id, name, or nome properties
 * @returns {number|null} NIL ID or null if not found
 */
export function resolveQuartiereNil(quartiere) {
    if (!quartiere) return null

    // First try using quartiere.id directly (already in normalized format)
    if (quartiere.id && quartiereToNilId[quartiere.id]) {
        return quartiereToNilId[quartiere.id]
    }

    // Try with quartiere.name (normalize it first)
    if (quartiere.name) {
        const normalized = normalizeQuartiereName(quartiere.name)
        if (quartiereToNilId[normalized]) {
            return quartiereToNilId[normalized]
        }
    }

    // Fallback: try with quartiere.nome for backward compatibility
    if (quartiere.nome) {
        const normalized = normalizeQuartiereName(quartiere.nome)
        if (quartiereToNilId[normalized]) {
            return quartiereToNilId[normalized]
        }
    }

    return null
}

/**
 * Gets NIL data by ID
 * @param {number} nilId - NIL ID
 * @returns {Object|null} NIL data object or null
 */
export function getNilData(nilId) {
    const entry = Object.values(nilData).find(nil => nil.id === nilId)
    return entry ?? null
}

/**
 * Gets the complete NIL information for a quartiere
 * @param {Object} quartiere - Quartiere object
 * @returns {Object|null} NIL data object with id, label, and area_km2
 */
export function getQuartiereNilInfo(quartiere) {
    const nilId = resolveQuartiereNil(quartiere)
    if (!nilId) return null
    return getNilData(nilId)
}

export { quartiereToNilId, nilData }
