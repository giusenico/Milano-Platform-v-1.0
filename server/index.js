import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import {
  quartiereMapping,
  quartiereMappingClean,
  reverseMapping,
  normalizeQuartiereName,
  slugifyQuartiereId
} from '../shared/quartiereMapping.js'
import {
  omiDescriptionToNils,
  nilToOmiDescription,
  nilWithoutOmiData,
  normalizeOmiName,
  getNilsForOmiDescription,
  hasOmiData
} from '../shared/omiToNilMapping.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Database connection - unified database with robust fallback
const dbPath = process.env.DB_PATH || path.join(__dirname, '../db/milano_unified.db')

console.log('🔍 Looking for database at:', dbPath)
console.log('📂 Current directory:', __dirname)
console.log('📁 Database exists:', fs.existsSync(dbPath))

// Database state
let db = null
let dbStatus = {
  connected: false,
  path: dbPath,
  error: null,
  lastCheck: null
}

// Initialize database connection
function initDatabase() {
  dbStatus.lastCheck = new Date().toISOString()
  
  // Check if file exists
  if (!fs.existsSync(dbPath)) {
    dbStatus.connected = false
    dbStatus.error = `Database file not found: ${dbPath}`
    console.error(`❌ ${dbStatus.error}`)
    console.error(`   Run 'make pipeline' to create the database`)
    return false
  }
  
  try {
    db = new Database(dbPath, { readonly: true })
    dbStatus.connected = true
    dbStatus.error = null
    console.log(`📊 Connected to unified database: ${dbPath}`)
    return true
  } catch (err) {
    dbStatus.connected = false
    dbStatus.error = err.message
    console.error(`❌ Failed to open database: ${err.message}`)
    return false
  }
}

// Initialize on startup
initDatabase()

// Middleware to check database availability
const requireDatabase = (req, res, next) => {
  if (!db || !dbStatus.connected) {
    return res.status(503).json({
      error: 'Database not available',
      message: dbStatus.error || 'Database connection not established',
      hint: 'Run the data pipeline to create the database: make pipeline'
    })
  }
  next()
}

// Enable CORS - allow all origins
app.use(cors())

// Fallback CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      path: dbStatus.path,
      error: dbStatus.error
    }
  }
  
  // Add freshness info if database is connected
  if (db && dbStatus.connected) {
    try {
      const freshness = db.prepare(`
        SELECT source_name, last_sync, status 
        FROM data_freshness 
        ORDER BY last_sync DESC 
        LIMIT 1
      `).get()
      
      if (freshness) {
        health.data = {
          source: freshness.source_name,
          lastSync: freshness.last_sync,
          status: freshness.status
        }
      }
    } catch (err) {
      health.data = { error: 'Could not retrieve freshness info' }
    }
  }
  
  const statusCode = dbStatus.connected ? 200 : 503
  res.status(statusCode).json(health)
})

const getQuartiereIdFromName = (dbName) => {
  const cleanName = normalizeQuartiereName(dbName)
  return (
    quartiereMapping[dbName] ||
    quartiereMappingClean[cleanName] ||
    slugifyQuartiereId(cleanName)
  )
}

const STOP_WORDS = new Set([
  'di', 'da', 'del', 'della', 'delle', 'dei', 'degli',
  'a', 'al', 'alla', 'alle', 'ai',
  'e', 'ed',
  'il', 'lo', 'la', 'l', 'le', 'i', 'gli',
  'zona', 'quartiere', 'q', 'qre',
  'porta', 'parco', 'centro', 'citta', 'stazione'
])

const normalizeSearchValue = (value = '') => {
  return String(value)
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\\s]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
}

const tokenize = (value = '') => {
  const normalized = normalizeSearchValue(value)
  if (!normalized) return []
  return normalized
    .split(' ')
    .filter(token => token.length > 2 && !STOP_WORDS.has(token))
}

const loadNilIndex = () => {
  if (!db || !dbStatus.connected) {
    console.warn('NIL index unavailable: database not connected')
    return []
  }
  
  try {
    const rows = db.prepare(`
      SELECT id_nil, nil_name, nil_label
      FROM vw_dim_nil
    `).all()
    return rows.map(row => ({
      ...row,
      normalized: normalizeSearchValue(row.nil_name),
      tokens: tokenize(row.nil_name)
    }))
  } catch (error) {
    console.warn('NIL index unavailable:', error?.message || error)
    return []
  }
}

// Initialize NIL index (will be empty if DB not connected)
let nilIndex = loadNilIndex()
let nilById = new Map(nilIndex.map(row => [row.id_nil, row]))

// Function to reload NIL index (can be called after DB becomes available)
const reloadNilIndex = () => {
  nilIndex = loadNilIndex()
  nilById = new Map(nilIndex.map(row => [row.id_nil, row]))
}

const resolveNilMatch = (input) => {
  if (!input) return null
  const raw = String(input).trim()

  // Check if input is a pure numeric ID
  if (/^\d+$/.test(raw)) {
    const id = parseInt(raw, 10)
    const direct = nilById.get(id)
    if (direct) {
      return {
        id_nil: direct.id_nil,
        nil_name: direct.nil_name,
        nil_label: direct.nil_label,
        matchType: 'id',
        confidence: 1
      }
    }
  }

  // Check if input contains a numeric ID in parentheses like "Name (123)"
  const idMatch = raw.match(/\((\d+)\)/)
  if (idMatch) {
    const id = parseInt(idMatch[1], 10)
    const direct = nilById.get(id)
    if (direct) {
      return {
        id_nil: direct.id_nil,
        nil_name: direct.nil_name,
        nil_label: direct.nil_label,
        matchType: 'id',
        confidence: 1
      }
    }
  }

  const queryTokens = tokenize(raw)
  const normalizedQuery = normalizeSearchValue(raw)

  let best = null
  for (const row of nilIndex) {
    let score = 0
    if (normalizedQuery && row.normalized === normalizedQuery) {
      score += 3
    }
    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        if (row.normalized.includes(token)) {
          score += 1
        }
      }
    }

    if (!best || score > best.score || (score === best.score && row.normalized.length < best.normalized.length)) {
      best = { ...row, score }
    }
  }

  if (!best || best.score === 0) {
    return null
  }

  const confidence = queryTokens.length > 0 ? Math.min(1, best.score / queryTokens.length) : 0.5
  return {
    id_nil: best.id_nil,
    nil_name: best.nil_name,
    nil_label: best.nil_label,
    matchType: 'fuzzy',
    confidence: parseFloat(confidence.toFixed(2))
  }
}

/**
 * GET /api/quartieri
 * Returns list of all neighborhoods with latest prices
 * Now distributes OMI zone data to all corresponding NIL areas
 */
app.get('/api/quartieri', requireDatabase, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        Quartiere,
        Prezzo_Acquisto_Medio_EUR_mq,
        Prezzo_Locazione_Medio_EUR_mq
      FROM prezzi_medi_quartiere 
      WHERE Semestre = (SELECT MAX(Semestre) FROM prezzi_medi_quartiere)
      ORDER BY Prezzo_Acquisto_Medio_EUR_mq DESC
    `)
    const rows = stmt.all()
    
    // Add previous semester for variation calculation
    const stmtPrev = db.prepare(`
      SELECT 
        Quartiere,
        Prezzo_Acquisto_Medio_EUR_mq,
        Prezzo_Locazione_Medio_EUR_mq
      FROM prezzi_medi_quartiere 
      WHERE Semestre = (
        SELECT MAX(Semestre) FROM prezzi_medi_quartiere 
        WHERE Semestre < (SELECT MAX(Semestre) FROM prezzi_medi_quartiere)
      )
    `)
    const prevRows = stmtPrev.all()
    const prevMap = new Map(prevRows.map(r => [r.Quartiere, r]))
    
    // Create a map of NIL ID -> price data
    // Distributing OMI zone data to all corresponding NIL areas
    const nilPriceMap = new Map()
    
    for (const row of rows) {
      const omiDesc = normalizeOmiName(row.Quartiere)
      const nilIds = getNilsForOmiDescription(omiDesc)
      const prev = prevMap.get(row.Quartiere)
      const variazione = prev 
        ? ((row.Prezzo_Acquisto_Medio_EUR_mq - prev.Prezzo_Acquisto_Medio_EUR_mq) / prev.Prezzo_Acquisto_Medio_EUR_mq) * 100
        : 0
      
      const priceData = {
        prezzoAcquistoMedio: Math.round(row.Prezzo_Acquisto_Medio_EUR_mq),
        prezzoLocazioneMedio: row.Prezzo_Locazione_Medio_EUR_mq,
        variazioneSemestrale: parseFloat(variazione.toFixed(2)),
        omiZone: omiDesc
      }
      
      // If we have NIL mappings, distribute to all NILs
      if (nilIds.length > 0) {
        for (const nilId of nilIds) {
          nilPriceMap.set(nilId, {
            ...priceData,
            quartiereId: nilId
          })
        }
      } else {
        // Fallback to old behavior for unmapped zones
        const cleanQuartiere = normalizeQuartiereName(row.Quartiere)
        const quartiereId = getQuartiereIdFromName(row.Quartiere)
        nilPriceMap.set(quartiereId, {
          ...priceData,
          quartiere: cleanQuartiere,
          quartiereId
        })
      }
    }
    
    // Convert to array
    const result = Array.from(nilPriceMap.values())
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching quartieri:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/quartieri/:id/timeseries
 * Returns time series data for a specific neighborhood
 * Supports both OMI zone IDs (e.g., "centro-duomo") and NIL slugs (e.g., "giambellino")
 */
app.get('/api/quartieri/:id/timeseries', (req, res) => {
  try {
    const { id } = req.params
    
    // Try to find the quartiere name from ID using reverse mapping
    let quartiereName = reverseMapping[id]
    
    // If no direct mapping, try to search in DB with flexible matching
    if (!quartiereName) {
      // Try multiple search patterns
      const searchPatterns = [
        `%${id.replace(/-/g, '%')}%`,
        `%${id.replace(/-/g, ' ').toUpperCase()}%`,
        `%${id.split('-')[0].toUpperCase()}%`
      ]
      
      for (const pattern of searchPatterns) {
        const searchStmt = db.prepare(`
          SELECT DISTINCT Quartiere FROM prezzi_medi_quartiere 
          WHERE UPPER(Quartiere) LIKE UPPER(?)
          LIMIT 1
        `)
        const searchResult = searchStmt.get(pattern)
        if (searchResult) {
          quartiereName = searchResult.Quartiere
          break
        }
      }
    }
    
    // If still not found, try to find via NIL → OMI mapping
    if (!quartiereName) {
      // Check if the id is a NIL slug
      const omiZone = nilToOmiDescription[id]
      if (omiZone && omiZone.length > 0) {
        // Get the first OMI zone that maps to this NIL
        const normalizedOmiZone = omiZone[0]
        // Find this OMI zone in quartiereMapping (need to search by normalized name)
        for (const [dbName, mappedId] of Object.entries(quartiereMapping)) {
          const cleanName = normalizeQuartiereName(dbName).toUpperCase()
          if (cleanName.includes(normalizedOmiZone.replace(/-/g, ' ').toUpperCase().slice(0, 10))) {
            quartiereName = dbName
            break
          }
        }
        // If still not found, try direct DB search with OMI zone name parts
        if (!quartiereName) {
          const omiParts = normalizedOmiZone.split('-').filter(p => p.length > 3)
          for (const part of omiParts) {
            const searchStmt = db.prepare(`
              SELECT DISTINCT Quartiere FROM prezzi_medi_quartiere 
              WHERE UPPER(Quartiere) LIKE UPPER(?)
              LIMIT 1
            `)
            const searchResult = searchStmt.get(`%${part.toUpperCase()}%`)
            if (searchResult) {
              quartiereName = searchResult.Quartiere
              break
            }
          }
        }
      }
    }
    
    if (!quartiereName) {
      return res.status(404).json({ 
        error: 'Quartiere not found', 
        id: id,
        hint: 'This NIL may not have direct OMI price data. Try using an OMI zone ID instead.'
      })
    }
    
    // quartiereName is now the raw name from DB
    const cleanName = normalizeQuartiereName(quartiereName)
    const quartiereId = getQuartiereIdFromName(quartiereName)
    
    const stmt = db.prepare(`
      SELECT 
        Quartiere,
        Semestre,
        Prezzo_Acquisto_Medio_EUR_mq,
        Prezzo_Locazione_Medio_EUR_mq
      FROM prezzi_medi_quartiere 
      WHERE Quartiere = ?
      ORDER BY Semestre ASC
    `)
    const rows = stmt.all(quartiereName)
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data found for this quartiere' })
    }
    
    const result = {
      quartiere: cleanName,
      quartiereId,
      data: rows.map(row => ({
        semestre: row.Semestre,
        anno: parseInt(row.Semestre.split('_')[0]),
        periodo: row.Semestre.split('_')[1] === '1' ? 'H1' : 'H2',
        label: row.Semestre.replace('_', ' H'),
        prezzoAcquisto: Math.round(row.Prezzo_Acquisto_Medio_EUR_mq),
        prezzoLocazione: parseFloat(row.Prezzo_Locazione_Medio_EUR_mq.toFixed(2))
      }))
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching time series:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/timeseries/compare
 * Returns time series data for multiple neighborhoods (for comparison)
 * Query param: ids=id1,id2,id3,...
 */
app.get('/api/timeseries/compare', (req, res) => {
  try {
    const { ids } = req.query
    
    if (!ids) {
      return res.status(400).json({ error: 'ids parameter is required' })
    }
    
    const quartiereIds = ids.split(',')
    const results = []
    
    for (const id of quartiereIds) {
      let quartiereName = reverseMapping[id]
      
      if (!quartiereName) {
        // Try multiple search patterns
        const searchPatterns = [
          `%${id.replace(/-/g, '%')}%`,
          `%${id.replace(/-/g, ' ').toUpperCase()}%`,
          `%${id.split('-')[0].toUpperCase()}%`
        ]
        
        for (const pattern of searchPatterns) {
          const searchStmt = db.prepare(`
            SELECT DISTINCT Quartiere FROM prezzi_medi_quartiere 
            WHERE UPPER(Quartiere) LIKE UPPER(?)
            LIMIT 1
          `)
          const searchResult = searchStmt.get(pattern)
          if (searchResult) {
            quartiereName = searchResult.Quartiere
            break
          }
        }
      }
      
      if (quartiereName) {
        const cleanName = normalizeQuartiereName(quartiereName)
        const quartiereId = getQuartiereIdFromName(quartiereName)
        
        const stmt = db.prepare(`
          SELECT 
            Quartiere,
            Semestre,
            Prezzo_Acquisto_Medio_EUR_mq,
            Prezzo_Locazione_Medio_EUR_mq
          FROM prezzi_medi_quartiere 
          WHERE Quartiere = ?
          ORDER BY Semestre ASC
        `)
        const rows = stmt.all(quartiereName)
        
        if (rows.length > 0) {
          results.push({
            quartiere: cleanName,
            quartiereId,
            data: rows.map(row => ({
              semestre: row.Semestre,
              label: row.Semestre.replace('_', ' H'),
              prezzoAcquisto: Math.round(row.Prezzo_Acquisto_Medio_EUR_mq),
              prezzoLocazione: parseFloat(row.Prezzo_Locazione_Medio_EUR_mq.toFixed(2))
            }))
          })
        }
      }
    }
    
    res.json(results)
  } catch (error) {
    console.error('Error fetching comparison data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/stats/milano
 * Returns overall Milano statistics
 */
app.get('/api/stats/milano', (req, res) => {
  try {
    const latestSemester = db.prepare(`
      SELECT MAX(Semestre) as semestre FROM prezzi_medi_quartiere
    `).get()
    
    const stats = db.prepare(`
      SELECT 
        AVG(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMedioAcquisto,
        AVG(Prezzo_Locazione_Medio_EUR_mq) as prezzoMedioLocazione,
        MAX(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMax,
        MIN(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMin,
        COUNT(DISTINCT Quartiere) as totaleQuartieri
      FROM prezzi_medi_quartiere 
      WHERE Semestre = ?
    `).get(latestSemester.semestre)

    const prevSemester = db.prepare(`
      SELECT MAX(Semestre) as semestre
      FROM prezzi_medi_quartiere
      WHERE Semestre < ?
    `).get(latestSemester.semestre)

    const prevStats = prevSemester?.semestre
      ? db.prepare(`
        SELECT 
          AVG(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMedioAcquisto
        FROM prezzi_medi_quartiere 
        WHERE Semestre = ?
      `).get(prevSemester.semestre)
      : null

    const variazioneSemestraleMedia = prevStats?.prezzoMedioAcquisto
      ? ((stats.prezzoMedioAcquisto - prevStats.prezzoMedioAcquisto) / prevStats.prezzoMedioAcquisto) * 100
      : null
    
    // Get time series for Milano average
    const timeSeries = db.prepare(`
      SELECT 
        Semestre,
        AVG(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMedioAcquisto,
        AVG(Prezzo_Locazione_Medio_EUR_mq) as prezzoMedioLocazione
      FROM prezzi_medi_quartiere 
      GROUP BY Semestre
      ORDER BY Semestre ASC
    `).all()
    
    res.json({
      semestre: latestSemester.semestre,
      prezzoMedioAcquisto: Math.round(stats.prezzoMedioAcquisto),
      prezzoMedioLocazione: parseFloat(stats.prezzoMedioLocazione.toFixed(2)),
      prezzoMax: Math.round(stats.prezzoMax),
      prezzoMin: Math.round(stats.prezzoMin),
      variazioneSemestraleMedia: variazioneSemestraleMedia !== null
        ? parseFloat(variazioneSemestraleMedia.toFixed(2))
        : null,
      totaleQuartieri: stats.totaleQuartieri,
      timeSeries: timeSeries.map(row => ({
        semestre: row.Semestre,
        label: row.Semestre.replace('_', ' H'),
        prezzoAcquisto: Math.round(row.prezzoMedioAcquisto),
        prezzoLocazione: parseFloat(row.prezzoMedioLocazione.toFixed(2))
      }))
    })
  } catch (error) {
    console.error('Error fetching Milano stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/semesters
 * Returns list of all available semesters
 */
app.get('/api/semesters', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT Semestre 
      FROM prezzi_medi_quartiere 
      ORDER BY Semestre ASC
    `)
    const rows = stmt.all()
    
    res.json(rows.map(r => ({
      value: r.Semestre,
      label: r.Semestre.replace('_', ' H')
    })))
  } catch (error) {
    console.error('Error fetching semesters:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/timeline
 * Returns all quartieri data for each semester (for timeline/weather-style visualization)
 */
app.get('/api/timeline', (req, res) => {
  try {
    // Get all semesters
    const semesters = db.prepare(`
      SELECT DISTINCT Semestre 
      FROM prezzi_medi_quartiere 
      ORDER BY Semestre ASC
    `).all().map(r => r.Semestre)
    
    // Get all data grouped by semester
    const allData = db.prepare(`
      SELECT 
        Quartiere,
        Semestre,
        Prezzo_Acquisto_Medio_EUR_mq,
        Prezzo_Locazione_Medio_EUR_mq
      FROM prezzi_medi_quartiere 
      ORDER BY Semestre ASC, Quartiere ASC
    `).all()
    
    // Group data by semester
    const bySemseter = {}
    allData.forEach(row => {
      if (!bySemseter[row.Semestre]) {
        bySemseter[row.Semestre] = {
          semestre: row.Semestre,
          label: row.Semestre.replace('_', ' H'),
          quartieri: [],
          stats: {
            prezzoMedioAcquisto: 0,
            prezzoMedioLocazione: 0,
            prezzoMax: 0,
            prezzoMin: Infinity
          }
        }
      }
      
      const cleanName = normalizeQuartiereName(row.Quartiere)
      const quartiereId = getQuartiereIdFromName(row.Quartiere)
      
      // Get NIL IDs for this OMI zone
      const nilIds = getNilsForOmiDescription(cleanName) || []
      
      const prezzoAcquisto = Math.round(row.Prezzo_Acquisto_Medio_EUR_mq)
      const prezzoLocazione = parseFloat(row.Prezzo_Locazione_Medio_EUR_mq.toFixed(2))
      
      bySemseter[row.Semestre].quartieri.push({
        quartiereId,
        quartiere: cleanName,
        nilIds,
        prezzoAcquisto,
        prezzoLocazione
      })
      
      // Update stats
      bySemseter[row.Semestre].stats.prezzoMedioAcquisto += prezzoAcquisto
      bySemseter[row.Semestre].stats.prezzoMedioLocazione += prezzoLocazione
      if (prezzoAcquisto > bySemseter[row.Semestre].stats.prezzoMax) {
        bySemseter[row.Semestre].stats.prezzoMax = prezzoAcquisto
      }
      if (prezzoAcquisto < bySemseter[row.Semestre].stats.prezzoMin) {
        bySemseter[row.Semestre].stats.prezzoMin = prezzoAcquisto
      }
    })
    
    // Calculate averages
    Object.values(bySemseter).forEach(sem => {
      const count = sem.quartieri.length
      sem.stats.prezzoMedioAcquisto = Math.round(sem.stats.prezzoMedioAcquisto / count)
      sem.stats.prezzoMedioLocazione = parseFloat((sem.stats.prezzoMedioLocazione / count).toFixed(2))
      sem.stats.totaleQuartieri = count
    })
    
    res.json({
      semesters,
      timeline: Object.values(bySemseter)
    })
  } catch (error) {
    console.error('Error fetching timeline:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/indicatori-demografici
 * Returns demographic indicators for Milano
 */
app.get('/api/indicatori-demografici', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        territorio,
        indicatore,
        anno,
        valore
      FROM indicatori_demografici
      ORDER BY indicatore, anno ASC
    `)
    const rows = stmt.all()
    
    // Group by indicator
    const byIndicator = {}
    rows.forEach(row => {
      if (!byIndicator[row.indicatore]) {
        byIndicator[row.indicatore] = {
          indicatore: row.indicatore,
          territorio: row.territorio,
          data: []
        }
      }
      byIndicator[row.indicatore].data.push({
        anno: row.anno,
        valore: row.valore
      })
    })
    
    res.json({
      indicatori: Object.values(byIndicator),
      latestYear: Math.max(...rows.map(r => r.anno))
    })
  } catch (error) {
    console.error('Error fetching indicatori demografici:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/contribuenti
 * Returns tax contributor data for Milano
 */
app.get('/api/contribuenti', (req, res) => {
  try {
    // Get categories data
    const stmtCat = db.prepare(`
      SELECT 
        territorio,
        indicatore,
        anno,
        valore
      FROM contribuenti_categorie
      ORDER BY indicatore, anno ASC
    `)
    const categorie = stmtCat.all()
    
    // Get classes data (grouped by income class)
    const stmtClass = db.prepare(`
      SELECT 
        territorio,
        indicatore,
        classe_importo,
        anno,
        valore
      FROM contribuenti_classi
      ORDER BY anno, classe_importo ASC
    `)
    const classi = stmtClass.all()
    
    // Group categories by indicator
    const byIndicator = {}
    categorie.forEach(row => {
      if (!byIndicator[row.indicatore]) {
        byIndicator[row.indicatore] = {
          indicatore: row.indicatore,
          data: []
        }
      }
      byIndicator[row.indicatore].data.push({
        anno: row.anno,
        valore: row.valore
      })
    })
    
    // Group classes by year with class breakdown
    const byYear = {}
    classi.forEach(row => {
      const key = `${row.anno}`
      if (!byYear[key]) {
        byYear[key] = {
          anno: row.anno,
          classi: []
        }
      }
      // Only add unique classes
      const exists = byYear[key].classi.find(c => c.classe === row.classe_importo && c.indicatore === row.indicatore)
      if (!exists) {
        byYear[key].classi.push({
          classe: row.classe_importo,
          indicatore: row.indicatore,
          valore: row.valore
        })
      }
    })
    
    res.json({
      categorie: Object.values(byIndicator),
      classiPerAnno: Object.values(byYear),
      latestYear: categorie.length > 0 ? Math.max(...categorie.map(r => r.anno)) : null
    })
  } catch (error) {
    console.error('Error fetching contribuenti:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/indice-prezzi-abitazioni
 * Returns housing price index data (national level)
 */
app.get('/api/indice-prezzi-abitazioni', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        categoria_abitazioni,
        anno,
        trimestre,
        periodo,
        indice,
        variazione_percentuale
      FROM indice_prezzi_abitazioni
      ORDER BY categoria_abitazioni, anno, trimestre ASC
    `)
    const rows = stmt.all()
    
    // Group by category
    const byCategory = {}
    rows.forEach(row => {
      if (!byCategory[row.categoria_abitazioni]) {
        byCategory[row.categoria_abitazioni] = {
          categoria: row.categoria_abitazioni,
          data: []
        }
      }
      byCategory[row.categoria_abitazioni].data.push({
        anno: row.anno,
        trimestre: row.trimestre,
        periodo: row.periodo,
        indice: row.indice,
        variazione: row.variazione_percentuale
      })
    })
    
    res.json({
      categorie: Object.values(byCategory)
    })
  } catch (error) {
    console.error('Error fetching indice prezzi abitazioni:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/popolazione-quartiere
 * Returns population and family data by neighborhood (NIL)
 * Query params: anno (optional), nil (optional)
 */
app.get('/api/popolazione-quartiere', (req, res) => {
  try {
    const { anno, nil } = req.query
    
    let query = `
      SELECT 
        anno,
        nil_name as nil,
        nil_label as nil_label,
        id_nil as id_nil,
        classe_eta_capofamiglia,
        genere_capofamiglia,
        numero_componenti,
        tipologia_familiare,
        cittadinanza,
        famiglie
      FROM vw_popolazione_famiglie_norm
    `
    const params = []
    const conditions = []
    let nilMatch = null
    
    if (anno) {
      conditions.push('anno = ?')
      params.push(anno)
    }
    if (nil) {
      nilMatch = resolveNilMatch(nil)
      if (nilMatch?.id_nil) {
        conditions.push('id_nil = ?')
        params.push(nilMatch.id_nil)
      } else {
        conditions.push('nil_label LIKE ?')
        params.push(`%${nil}%`)
      }
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY anno DESC, nil_label ASC'
    
    const stmt = db.prepare(query)
    const rows = stmt.all(...params)
    
    // Get aggregated stats per NIL
    let aggregateQuery = `
      SELECT 
        anno,
        nil_name as nil,
        nil_label as nil_label,
        id_nil as id_nil,
        SUM(famiglie) as totale_famiglie,
        COUNT(DISTINCT tipologia_familiare) as tipi_famiglia,
        COUNT(DISTINCT classe_eta_capofamiglia) as classi_eta
      FROM vw_popolazione_famiglie_norm
    `
    if (conditions.length > 0) {
      aggregateQuery += ' WHERE ' + conditions.join(' AND ')
    }
    aggregateQuery += ' GROUP BY anno, id_nil, nil_label, nil_name ORDER BY anno DESC, totale_famiglie DESC'
    
    const aggregateStmt = db.prepare(aggregateQuery)
    const aggregated = aggregateStmt.all(...params)
    
    // Get available years and NILs for filtering
    const years = db.prepare('SELECT DISTINCT anno FROM vw_popolazione_famiglie_norm ORDER BY anno DESC').all()
    const nils = db.prepare('SELECT DISTINCT nil_label as nil FROM vw_popolazione_famiglie_norm ORDER BY nil_label ASC').all()
    
    res.json({
      data: rows,
      aggregated,
      availableYears: years.map(y => y.anno),
      availableNils: nils.map(n => n.nil),
      total: rows.length,
      nilMatch: nilMatch ? {
        idNil: nilMatch.id_nil,
        nil: nilMatch.nil_name,
        nilLabel: nilMatch.nil_label,
        matchType: nilMatch.matchType,
        confidence: nilMatch.confidence
      } : null
    })
  } catch (error) {
    console.error('Error fetching popolazione quartiere:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/popolazione-quartiere/:nil
 * Returns detailed population data for a specific neighborhood
 */
app.get('/api/popolazione-quartiere/:nil', (req, res) => {
  try {
    const { nil } = req.params

    const nilMatch = resolveNilMatch(nil)
    if (!nilMatch?.id_nil) {
      return res.status(404).json({ error: 'NIL not found' })
    }

    // Get latest year's data for this NIL
    const latestYear = db.prepare(`
      SELECT MAX(anno) as anno
      FROM vw_popolazione_famiglie_norm
      WHERE id_nil = ?
    `).get(nilMatch.id_nil)

    // Get aggregated data for this NIL
    const aggregateStmt = db.prepare(`
      SELECT 
        anno,
        nil_name as nil,
        nil_label as nil_label,
        SUM(famiglie) as totale_famiglie
      FROM vw_popolazione_famiglie_norm
      WHERE id_nil = ?
      GROUP BY anno, id_nil, nil_label, nil_name
      ORDER BY anno ASC
    `)
    const timeSeries = aggregateStmt.all(nilMatch.id_nil)

    // Get breakdown by tipologia familiare for latest year
    const tipologiaStmt = db.prepare(`
      SELECT 
        tipologia_familiare as tipologia_familiare,
        SUM(famiglie) as totale
      FROM vw_popolazione_famiglie_norm
      WHERE id_nil = ? AND anno = ?
      GROUP BY tipologia_familiare
      ORDER BY totale DESC
    `)
    const tipologie = latestYear?.anno
      ? tipologiaStmt.all(nilMatch.id_nil, latestYear.anno)
      : []

    // Get breakdown by classe eta
    const etaStmt = db.prepare(`
      SELECT 
        classe_eta_capofamiglia as classe_eta_capofamiglia,
        SUM(famiglie) as totale
      FROM vw_popolazione_famiglie_norm
      WHERE id_nil = ? AND anno = ?
      GROUP BY classe_eta_capofamiglia
      ORDER BY totale DESC
    `)
    const classiEta = latestYear?.anno
      ? etaStmt.all(nilMatch.id_nil, latestYear.anno)
      : []

    // Get breakdown by cittadinanza
    const cittadinanzaStmt = db.prepare(`
      SELECT 
        cittadinanza as cittadinanza,
        SUM(famiglie) as totale
      FROM vw_popolazione_famiglie_norm
      WHERE id_nil = ? AND anno = ?
      GROUP BY cittadinanza
      ORDER BY totale DESC
    `)
    const cittadinanza = latestYear?.anno
      ? cittadinanzaStmt.all(nilMatch.id_nil, latestYear.anno)
      : []

    const amenities = db.prepare(`
      SELECT 
        pubblici_esercizi,
        mercati,
        farmacie,
        scuole,
        biblioteche
      FROM vw_amenities_by_nil
      WHERE id_nil = ?
    `).get(nilMatch.id_nil) || {
      pubblici_esercizi: 0,
      mercati: 0,
      farmacie: 0,
      scuole: 0,
      biblioteche: 0
    }

    if (timeSeries.length === 0) {
      return res.status(404).json({ error: 'NIL not found' })
    }

    const last = timeSeries[timeSeries.length - 1]
    const prev = timeSeries.length > 1 ? timeSeries[timeSeries.length - 2] : null
    const crescitaFamiglieYoY = prev?.totale_famiglie
      ? ((last.totale_famiglie - prev.totale_famiglie) / prev.totale_famiglie) * 100
      : null

    res.json({
      nil: nilMatch.nil_name,
      nilLabel: nilMatch.nil_label,
      idNil: nilMatch.id_nil,
      match: {
        matchType: nilMatch.matchType,
        confidence: nilMatch.confidence
      },
      latestYear: latestYear?.anno || null,
      timeSeries,
      crescitaFamiglieYoY: crescitaFamiglieYoY !== null
        ? parseFloat(crescitaFamiglieYoY.toFixed(2))
        : null,
      amenities,
      breakdown: {
        tipologie,
        classiEta,
        cittadinanza
      }
    })
  } catch (error) {
    console.error('Error fetching popolazione quartiere detail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/data-overview
 * Returns a summary of all available data for the dashboard
 */
app.get('/api/data-overview', (req, res) => {
  try {
    // Get latest price stats
    const latestSemester = db.prepare(`
      SELECT MAX(Semestre) as semestre FROM prezzi_medi_quartiere
    `).get()
    
    const priceStats = db.prepare(`
      SELECT 
        AVG(Prezzo_Acquisto_Medio_EUR_mq) as prezzoMedio,
        COUNT(DISTINCT Quartiere) as totaleQuartieri
      FROM prezzi_medi_quartiere 
      WHERE Semestre = ?
    `).get(latestSemester.semestre)
    
    // Get latest demographic year
    const demoYear = db.prepare(`
      SELECT MAX(anno) as anno FROM indicatori_demografici
    `).get()
    
    // Get some key demographic indicators
    const keyIndicators = db.prepare(`
      SELECT indicatore, valore
      FROM indicatori_demografici
      WHERE anno = ?
      LIMIT 5
    `).all(demoYear?.anno || 2023)
    
    // Get population stats
    const popYear = db.prepare(`
      SELECT MAX(Anno) as anno FROM popolazione_famiglie_tipologia_quartiere
    `).get()
    
    const popStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT NIL) as quartieri,
        SUM(Famiglie) as totaleFamiglie
      FROM popolazione_famiglie_tipologia_quartiere
      WHERE Anno = ?
    `).get(popYear?.anno || 2023)
    
    // Get contributor stats
    const contribYear = db.prepare(`
      SELECT MAX(anno) as anno FROM contribuenti_categorie
    `).get()

    const redditiRows = contribYear?.anno
      ? db.prepare(`
        SELECT indicatore, valore
        FROM contribuenti_categorie
        WHERE anno = ?
          AND indicatore IN (
            'Contribuenti',
            'Reddito imponibile (euro)',
            'Contribuenti con reddito da fabbricati',
            'Reddito da fabbricati (euro)'
          )
      `).all(contribYear.anno)
      : []
    const redditiMap = new Map(redditiRows.map(row => [row.indicatore, row.valore]))
    const contribuentiTotali = redditiMap.get('Contribuenti') || null
    const redditoImponibile = redditiMap.get('Reddito imponibile (euro)') || null
    const contribuentiFabbricati = redditiMap.get('Contribuenti con reddito da fabbricati') || null
    const redditoFabbricati = redditiMap.get('Reddito da fabbricati (euro)') || null
    const redditoMedio = redditoImponibile && contribuentiTotali
      ? redditoImponibile / contribuentiTotali
      : null
    const redditoFabbricatiMedio = redditoFabbricati && contribuentiFabbricati
      ? redditoFabbricati / contribuentiFabbricati
      : null

    const indicePrezziLatest = db.prepare(`
      SELECT anno, trimestre, indice, variazione_percentuale
      FROM indice_prezzi_abitazioni
      WHERE categoria_abitazioni = 'H1 - tutte le voci'
      ORDER BY anno DESC, trimestre DESC
      LIMIT 1
    `).get()

    const trasportoYear = db.prepare(`
      SELECT MAX(anno) as anno FROM trasporto_pubblico_locale
    `).get()
    const trasportoStats = trasportoYear?.anno
      ? db.prepare(`
        SELECT 
          SUM(COALESCE(numero_linee, 0)) as linee_totali,
          SUM(COALESCE(lunghezza_rete, 0)) as lunghezza_totale,
          SUM(CASE WHEN linee = 'Metropolitana' THEN COALESCE(numero_linee, 0) ELSE 0 END) as linee_metro,
          SUM(CASE WHEN linee = 'Metropolitana' THEN COALESCE(lunghezza_rete, 0) ELSE 0 END) as lunghezza_metro
        FROM trasporto_pubblico_locale
        WHERE anno = ?
      `).get(trasportoYear.anno)
      : null

    // Get services stats from actual tables in the database
    const mercatiCoperti = db.prepare('SELECT COUNT(*) as count FROM ds_05_servizi_essenziali_mercati_comunali_coperti').get()?.count || 0
    const mercatiScoperti = db.prepare('SELECT COUNT(*) as count FROM ds_05_servizi_essenziali_mercati_settimanali_scoperti').get()?.count || 0
    const farmacie = db.prepare('SELECT COUNT(*) as count FROM ds_08_servizi_sanitari_farmacie_milano').get()?.count || 0
    const mediciBase = db.prepare('SELECT COUNT(*) as count FROM ds_08_servizi_sanitari_medici_medicina_generale').get()?.count || 0
    const serviziSociali = db.prepare('SELECT COUNT(*) as count FROM ds_09_servizi_sociali_servizi_sociali_2014').get()?.count || 0
    
    // Get aggregated service data from fact_servizi
    const factServiziStats = db.prepare(`
      SELECT 
        SUM(COALESCE(numero_scuole, 0)) as totaleScuole,
        SUM(COALESCE(numero_mercati, 0)) as totaleMercati,
        AVG(COALESCE(indice_verde_medio, 0)) as indiceVerdeMedio
      FROM fact_servizi
      WHERE id_tempo = (SELECT MAX(id_tempo) FROM fact_servizi)
    `).get()

    // Get population statistics from nil_qualita_vita
    const nilStats = db.prepare(`
      SELECT 
        SUM(popolazione_totale) as popolazioneTotale,
        AVG(pct_stranieri) as pctStranieriMedia,
        AVG(densita_abitanti_km2) as densitaMedia,
        SUM(famiglie_registrate) as totaleFamiglieNil,
        SUM(famiglie_unipersonali) as famiglieUnipersonali,
        AVG(indice_qualita_vita) as indiceQualitaVitaMedia,
        COUNT(*) as totaleNil
      FROM nil_qualita_vita
    `).get()

    const serviziStats = {
      mercati: mercatiCoperti + mercatiScoperti,
      mercatiCoperti: mercatiCoperti,
      mercatiScoperti: mercatiScoperti,
      farmacie: farmacie,
      mediciBase: mediciBase,
      serviziSociali: serviziSociali,
      scuole: Math.round(factServiziStats?.totaleScuole || 0),
      indiceVerdeMedio: factServiziStats?.indiceVerdeMedio ? parseFloat(factServiziStats.indiceVerdeMedio.toFixed(2)) : null
    }
    
    // Nuove statistiche - commercio, cultura, mobilità
    let commercioStats = null
    let culturaStats = null
    let mobilitaStats = null
    
    try {
      const eserciziVicinato = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_esercizi_vicinato').get()?.count || 0
      const pubbliciEsercizi = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_pubblici_esercizi').get()?.count || 0
      const gdo = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_media_grande_distribuzione').get()?.count || 0
      const bottegheStoriche = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_botteghe_storiche').get()?.count || 0
      const coworking = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_coworking').get()?.count || 0
      
      commercioStats = {
        eserciziVicinato,
        pubbliciEsercizi,
        grandeDistribuzione: gdo,
        bottegheStoriche,
        coworking
      }
    } catch (e) {}
    
    try {
      const architetture = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_architetture_storiche').get()?.count || 0
      const beniCulturali = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_beni_culturali_siti').get()?.count || 0
      const biblioteche = db.prepare('SELECT COUNT(*) as count FROM ds_11_biblioteche_biblioteche_rionali').get()?.count || 0
      
      culturaStats = {
        architetture,
        beniCulturali,
        biblioteche
      }
    } catch (e) {}
    
    try {
      const colonneRicarica = db.prepare('SELECT COUNT(*) as count FROM ds_07_mobilita_trasporti_colonnine_ricarica_elettrica').get()?.count || 0
      const beniConfiscati = db.prepare('SELECT COUNT(*) as count FROM ds_14_sicurezza_beni_immobili_confiscati').get()?.count || 0
      
      mobilitaStats = {
        colonneRicarica,
        beniConfiscatiMafia: beniConfiscati
      }
    } catch (e) {}
    
    res.json({
      prezzi: {
        semestre: latestSemester.semestre,
        prezzoMedio: Math.round(priceStats?.prezzoMedio || 0),
        totaleQuartieri: priceStats?.totaleQuartieri || 0
      },
      demografia: {
        anno: demoYear?.anno,
        indicatori: keyIndicators,
        popolazioneTotale: nilStats?.popolazioneTotale || null,
        pctStranieriMedia: nilStats?.pctStranieriMedia ? parseFloat(nilStats.pctStranieriMedia.toFixed(1)) : null,
        densitaMedia: nilStats?.densitaMedia ? Math.round(nilStats.densitaMedia) : null
      },
      popolazione: {
        anno: popYear?.anno,
        quartieriConDati: nilStats?.totaleNil || popStats?.quartieri || 0,
        totaleFamiglie: nilStats?.totaleFamiglieNil || popStats?.totaleFamiglie || 0,
        famiglieUnipersonali: nilStats?.famiglieUnipersonali || null,
        popolazioneTotale: nilStats?.popolazioneTotale || null,
        indiceQualitaVitaMedia: nilStats?.indiceQualitaVitaMedia ? parseFloat(nilStats.indiceQualitaVitaMedia.toFixed(1)) : null
      },
      contribuenti: {
        anno: contribYear?.anno
      },
      redditi: {
        anno: contribYear?.anno || null,
        contribuentiTotali,
        redditoImponibile,
        redditoMedio: redditoMedio ? Math.round(redditoMedio) : null,
        contribuentiFabbricati,
        redditoFabbricati,
        redditoFabbricatiMedio: redditoFabbricatiMedio ? Math.round(redditoFabbricatiMedio) : null
      },
      indicePrezzi: indicePrezziLatest ? {
        anno: indicePrezziLatest.anno,
        trimestre: indicePrezziLatest.trimestre,
        indice: indicePrezziLatest.indice,
        variazionePercentuale: indicePrezziLatest.variazione_percentuale
      } : null,
      trasporto: trasportoYear?.anno ? {
        anno: trasportoYear.anno,
        lineeTotali: trasportoStats?.linee_totali || 0,
        lunghezzaTotale: trasportoStats?.lunghezza_totale || 0,
        lineeMetro: trasportoStats?.linee_metro || 0,
        lunghezzaMetro: trasportoStats?.lunghezza_metro || 0
      } : null,
      servizi: serviziStats,
      commercio: commercioStats,
      cultura: culturaStats,
      mobilita: mobilitaStats
    })
  } catch (error) {
    console.error('Error fetching data overview:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// NIL ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/nil/analisi
 * Returns complete NIL analysis data with quality of life index and clusters
 */
app.get('/api/nil/analisi', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM vw_nil_analisi_completa
      ORDER BY indice_qualita_vita DESC
    `)
    const rows = stmt.all()
    res.json(rows)
  } catch (error) {
    console.error('Error fetching NIL analysis:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

/**
 * GET /api/nil/ranking
 * Returns NIL ranking by quality of life index
 */
app.get('/api/nil/ranking', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 88
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC'
    
    const stmt = db.prepare(`
      SELECT * FROM vw_nil_ranking
      ORDER BY indice_qualita_vita ${order}
      LIMIT ?
    `)
    const rows = stmt.all(limit)
    res.json(rows)
  } catch (error) {
    console.error('Error fetching NIL ranking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/clusters
 * Returns cluster statistics and NIL distribution
 */
app.get('/api/nil/clusters', (req, res) => {
  try {
    // Get cluster stats
    const clusterStats = db.prepare(`
      SELECT * FROM vw_cluster_stats
      ORDER BY cluster_id
    `).all()
    
    // Get NIL per cluster
    const nilPerCluster = db.prepare(`
      SELECT 
        nc.cluster_id,
        nc.nil,
        nqv.indice_qualita_vita,
        nqv.popolazione_totale,
        nqv.pct_stranieri
      FROM nil_clusters nc
      LEFT JOIN nil_qualita_vita nqv ON nc.nil = nqv.nil
      ORDER BY nc.cluster_id, nqv.indice_qualita_vita DESC
    `).all()
    
    // Group NIL by cluster
    const nilByCluster = {}
    for (const row of nilPerCluster) {
      if (!nilByCluster[row.cluster_id]) {
        nilByCluster[row.cluster_id] = []
      }
      nilByCluster[row.cluster_id].push({
        nil: row.nil,
        iqv: row.indice_qualita_vita,
        popolazione: row.popolazione_totale,
        pctStranieri: row.pct_stranieri
      })
    }
    
    res.json({
      clusters: clusterStats.map(c => ({
        ...c,
        nil: nilByCluster[c.cluster_id] || []
      }))
    })
  } catch (error) {
    console.error('Error fetching clusters:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// NIL SPECIFIC ENDPOINTS (must come BEFORE /api/nil/:name to avoid catch-all)
// ============================================================================

/**
 * GET /api/nil/:id/servizi-sanitari
 * Dati servizi sanitari per NIL (farmacie, medici)
 */
app.get('/api/nil/:id/servizi-sanitari', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Get NIL name from id
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Count pharmacies in this NIL
    const farmacie = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_08_servizi_sanitari_farmacie_milano
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Get pharmacy list
    const farmacieList = db.prepare(`
      SELECT descrizione_farmacia, indirizzo, cap
      FROM ds_08_servizi_sanitari_farmacie_milano
      WHERE id_nil = ? OR id_nil = ?
    `).all(nilId.toString(), nilId)
    
    // Count doctors in this NIL (active only)
    const medici = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COUNT(CASE WHEN tipomedico = 'MEDICO DI MEDICINA GENERALE' THEN 1 END) as medici_base,
        COUNT(CASE WHEN tipomedico = 'PEDIATRA DI LIBERA SCELTA' THEN 1 END) as pediatri
      FROM ds_08_servizi_sanitari_medici_medicina_generale
      WHERE (id_nil = ? OR id_nil = ?) AND attivo = 1
    `).get(nilId.toString(), nilId)
    
    // Get population for ratio calculation
    const popolazione = db.prepare(`
      SELECT popolazione_totale FROM nil_qualita_vita WHERE id_nil = ?
    `).get(nilId)
    
    const pop = popolazione?.popolazione_totale || 0
    const numFarmacie = farmacie?.count || 0
    const numMedici = medici?.count || 0
    
    // Calculate ratios (inhabitants per service)
    const abitantiPerFarmacia = numFarmacie > 0 ? Math.round(pop / numFarmacie) : null
    const abitantiPerMedico = numMedici > 0 ? Math.round(pop / numMedici) : null
    
    // Score calculation (based on WHO guidelines)
    let scoreHealthcare = 0
    if (abitantiPerFarmacia) {
      if (abitantiPerFarmacia <= 3000) scoreHealthcare += 50
      else if (abitantiPerFarmacia <= 5000) scoreHealthcare += 35
      else scoreHealthcare += 20
    }
    if (abitantiPerMedico) {
      if (abitantiPerMedico <= 1000) scoreHealthcare += 50
      else if (abitantiPerMedico <= 1500) scoreHealthcare += 35
      else scoreHealthcare += 20
    }
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      farmacie: {
        totale: numFarmacie,
        lista: farmacieList.slice(0, 10)
      },
      medici: {
        totale: numMedici,
        mediciBase: medici?.medici_base || 0,
        pediatri: medici?.pediatri || 0
      },
      popolazione: pop,
      rapporti: {
        abitantiPerFarmacia,
        abitantiPerMedico
      },
      scoreHealthcare,
      qualitaServizio: scoreHealthcare >= 80 ? 'Ottimo' : scoreHealthcare >= 50 ? 'Buono' : 'Migliorabile'
    })
  } catch (error) {
    console.error('Error fetching NIL healthcare services:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/servizi-sociali
 * Dati servizi sociali per NIL
 */
app.get('/api/nil/:id/servizi-sociali', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Get services count by area
    const serviziByArea = db.prepare(`
      SELECT 
        area_attivita,
        COUNT(*) as count
      FROM ds_09_servizi_sociali_servizi_sociali_2014
      WHERE nil = ? OR nil = ? OR denominazione_nil LIKE ?
      GROUP BY area_attivita
      ORDER BY count DESC
    `).all(nilId.toString(), nilId, `%${nilInfo.nil.split(' ')[0]}%`)
    
    // Get totals by target audience
    const serviziByTarget = db.prepare(`
      SELECT 
        fascia_utenza,
        COUNT(*) as count
      FROM ds_09_servizi_sociali_servizi_sociali_2014
      WHERE nil = ? OR nil = ? OR denominazione_nil LIKE ?
      GROUP BY fascia_utenza
      ORDER BY count DESC
    `).all(nilId.toString(), nilId, `%${nilInfo.nil.split(' ')[0]}%`)
    
    const totaleServizi = serviziByArea.reduce((sum, s) => sum + s.count, 0)
    
    // Get population for ratio
    const popolazione = db.prepare(`
      SELECT popolazione_totale FROM nil_qualita_vita WHERE id_nil = ?
    `).get(nilId)
    
    const pop = popolazione?.popolazione_totale || 0
    const serviziPer1000Abitanti = pop > 0 ? parseFloat(((totaleServizi / pop) * 1000).toFixed(2)) : 0
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      totaleServizi,
      serviziPerArea: serviziByArea,
      serviziPerTarget: serviziByTarget,
      popolazione: pop,
      serviziPer1000Abitanti,
      qualitaCopertura: serviziPer1000Abitanti >= 3 ? 'Alta' : serviziPer1000Abitanti >= 1 ? 'Media' : 'Bassa'
    })
  } catch (error) {
    console.error('Error fetching NIL social services:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/cultura
 * Dati cultura per NIL (biblioteche, architetture storiche, beni culturali)
 */
app.get('/api/nil/:id/cultura', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Biblioteche rionali - uses 'nil' column not 'id_nil'
    const biblioteche = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_11_biblioteche_biblioteche_rionali
      WHERE UPPER(nil) = UPPER(?)
    `).get(nilInfo.nil)
    
    // Biblioteche/Archivi
    const archivi = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_11_biblioteche_biblioteche_archivi
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Architetture storiche
    const architetture = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_10_cultura_musei_architetture_storiche
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Beni culturali
    const beniCulturali = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_10_cultura_musei_beni_culturali_siti
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Musei
    const musei = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_10_cultura_musei_beni_patrimonio_musei
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    const totale = (biblioteche?.count || 0) + (archivi?.count || 0) + 
                   (architetture?.count || 0) + (beniCulturali?.count || 0) + (musei?.count || 0)
    
    // Score culturale
    const scoreCultura = Math.min(100, totale * 10)
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      biblioteche: biblioteche?.count || 0,
      archivi: archivi?.count || 0,
      architetture: architetture?.count || 0,
      beniCulturali: beniCulturali?.count || 0,
      musei: musei?.count || 0,
      totale,
      scoreCultura,
      livelloCultura: scoreCultura >= 50 ? 'Alto' : scoreCultura >= 20 ? 'Medio' : 'Basso'
    })
  } catch (error) {
    console.error('Error fetching NIL culture:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/commercio
 * Dati commercio per NIL (esercizi, botteghe storiche, coworking)
 */
app.get('/api/nil/:id/commercio', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Pubblici esercizi (bar, ristoranti)
    const pubbliciEsercizi = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_pubblici_esercizi
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Esercizi vicinato
    const eserciziVicinato = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_esercizi_vicinato
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Botteghe storiche
    const bottegheStoriche = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_botteghe_storiche
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Coworking
    const coworking = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_coworking
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Grande distribuzione
    const gdo = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_media_grande_distribuzione
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Edicole
    const edicole = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_13_economia_commercio_edicole
      WHERE id_nil = ? OR id_nil = ?
    `).get(nilId.toString(), nilId)
    
    // Get population for density
    const popolazione = db.prepare(`
      SELECT popolazione_totale, area_km2 FROM nil_qualita_vita WHERE id_nil = ?
    `).get(nilId)
    
    const numPubblici = pubbliciEsercizi?.count || 0
    const numVicinato = eserciziVicinato?.count || 0
    const numBotteghe = bottegheStoriche?.count || 0
    const pop = popolazione?.popolazione_totale || 0
    const area = popolazione?.area_km2 || 1
    
    const totaleCommercio = numPubblici + numVicinato + (gdo?.count || 0)
    const densitaCommerciale = area > 0 ? parseFloat((totaleCommercio / area).toFixed(1)) : 0
    const commercioPer1000Ab = pop > 0 ? parseFloat(((totaleCommercio / pop) * 1000).toFixed(1)) : 0
    
    // Score vitalità commerciale
    const scoreVitalita = Math.min(100, (numPubblici * 0.5) + (numVicinato * 0.3) + (numBotteghe * 5) + (coworking?.count || 0) * 10)
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      pubbliciEsercizi: numPubblici,
      eserciziVicinato: numVicinato,
      bottegheStoriche: numBotteghe,
      coworking: coworking?.count || 0,
      grandeDistribuzione: gdo?.count || 0,
      edicole: edicole?.count || 0,
      totaleCommercio,
      densitaCommerciale,
      commercioPer1000Ab,
      scoreVitalita: parseFloat(scoreVitalita.toFixed(1)),
      livelloVitalita: scoreVitalita >= 60 ? 'Alto' : scoreVitalita >= 30 ? 'Medio' : 'Basso'
    })
  } catch (error) {
    console.error('Error fetching NIL commerce:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/sicurezza
 * Dati sicurezza per NIL (beni confiscati)
 */
app.get('/api/nil/:id/sicurezza', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Beni confiscati - table doesn't have id_nil, so we return aggregate city data
    // Could be enhanced with municipio mapping in the future
    const totaleBeniConfiscatiCitta = db.prepare(`
      SELECT COUNT(*) as count
      FROM ds_14_sicurezza_beni_immobili_confiscati
    `).get()
    
    // Get area for density
    const area = db.prepare(`
      SELECT area_km2 FROM nil_qualita_vita WHERE id_nil = ?
    `).get(nilId)
    
    // Since we don't have NIL-level data, return a note
    res.json({
      nilId,
      nilName: nilInfo.nil,
      note: "Dati sicurezza disponibili solo a livello comunale",
      beniConfiscatiCitta: totaleBeniConfiscatiCitta?.count || 0,
      dataAvailableAtNilLevel: false
    })
  } catch (error) {
    console.error('Error fetching NIL security:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/complete-profile
 * Profilo completo NIL con tutti i dati aggregati
 */
app.get('/api/nil/:id/complete-profile', async (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Get all data in parallel-like fashion
    const qualitaVita = db.prepare(`SELECT * FROM nil_qualita_vita WHERE id_nil = ?`).get(nilId)
    const ranking = db.prepare(`SELECT * FROM vw_nil_ranking WHERE id_nil = ?`).get(nilId)
    
    // Servizi sanitari counts
    const farmacie = db.prepare(`SELECT COUNT(*) as c FROM ds_08_servizi_sanitari_farmacie_milano WHERE id_nil = ? OR id_nil = ?`).get(nilId.toString(), nilId)
    const medici = db.prepare(`SELECT COUNT(*) as c FROM ds_08_servizi_sanitari_medici_medicina_generale WHERE (id_nil = ? OR id_nil = ?) AND attivo = 1`).get(nilId.toString(), nilId)
    
    // Servizi sociali
    const serviziSociali = db.prepare(`SELECT COUNT(*) as c FROM ds_09_servizi_sociali_servizi_sociali_2014 WHERE nil = ? OR nil = ? OR denominazione_nil LIKE ?`).get(nilId.toString(), nilId, `%${nilInfo.nil.split(' ')[0]}%`)
    
    // Cultura - biblioteche_rionali uses 'nil' column not 'id_nil'
    const biblioteche = db.prepare(`SELECT COUNT(*) as c FROM ds_11_biblioteche_biblioteche_rionali WHERE UPPER(nil) = UPPER(?)`).get(nilInfo.nil)
    const architetture = db.prepare(`SELECT COUNT(*) as c FROM ds_10_cultura_musei_architetture_storiche WHERE id_nil = ? OR id_nil = ?`).get(nilId.toString(), nilId)
    
    // Commercio
    const pubbliciEsercizi = db.prepare(`SELECT COUNT(*) as c FROM ds_13_economia_commercio_pubblici_esercizi WHERE id_nil = ? OR id_nil = ?`).get(nilId.toString(), nilId)
    const bottegheStoriche = db.prepare(`SELECT COUNT(*) as c FROM ds_13_economia_commercio_botteghe_storiche WHERE id_nil = ? OR id_nil = ?`).get(nilId.toString(), nilId)
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      qualitaVita,
      ranking,
      servizi: {
        farmacie: farmacie?.c || 0,
        medici: medici?.c || 0,
        serviziSociali: serviziSociali?.c || 0,
        biblioteche: biblioteche?.c || 0,
        architetture: architetture?.c || 0,
        pubbliciEsercizi: pubbliciEsercizi?.c || 0,
        bottegheStoriche: bottegheStoriche?.c || 0
      }
    })
  } catch (error) {
    console.error('Error fetching NIL complete profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// NIL GENERIC ENDPOINT (catch-all for NIL lookup by name/id)
// ============================================================================

/**
 * GET /api/nil/:name
 * Returns detailed data for a specific NIL
 * Accepts: NIL ID (numeric), NIL name, or partial name
 */
app.get('/api/nil/:name', (req, res) => {
  try {
    const { name } = req.params
    const decodedName = decodeURIComponent(name)
    
    let row = null
    
    // 1. Try to find by numeric ID first
    const numericId = parseInt(decodedName, 10)
    if (!isNaN(numericId) && numericId > 0 && numericId <= 88) {
      const idStmt = db.prepare(`
        SELECT * FROM vw_nil_analisi_completa
        WHERE id_nil = ?
        LIMIT 1
      `)
      row = idStmt.get(numericId)
    }
    
    // 2. If not found by ID, try exact match on nil name
    if (!row) {
      const exactStmt = db.prepare(`
        SELECT * FROM vw_nil_analisi_completa
        WHERE UPPER(nil) = UPPER(?) OR UPPER(nil_norm) = UPPER(?)
        LIMIT 1
      `)
      row = exactStmt.get(decodedName, decodedName)
    }
    
    // 3. Try flexible pattern matching
    if (!row) {
      const pattern = `%${decodedName.toUpperCase()}%`
      const patternStmt = db.prepare(`
        SELECT * FROM vw_nil_analisi_completa
        WHERE UPPER(nil) LIKE ? OR UPPER(nil_norm) LIKE ?
        LIMIT 1
      `)
      row = patternStmt.get(pattern, pattern)
    }
    
    // 4. Try matching individual words (for multi-word queries)
    if (!row && decodedName.includes(' ')) {
      const words = decodedName.split(/\s+/).filter(w => w.length > 2)
      for (const word of words) {
        const wordPattern = `%${word.toUpperCase()}%`
        const wordStmt = db.prepare(`
          SELECT * FROM vw_nil_analisi_completa
          WHERE UPPER(nil) LIKE ? OR UPPER(nil_norm) LIKE ?
          LIMIT 1
        `)
        row = wordStmt.get(wordPattern, wordPattern)
        if (row) break
      }
    }
    
    if (!row) {
      return res.status(404).json({ error: 'NIL not found', searched: decodedName })
    }
    
    // Get ranking position
    const rankStmt = db.prepare(`
      SELECT ranking_iqv, ranking_verde, ranking_popolazione 
      FROM vw_nil_ranking 
      WHERE nil = ?
    `)
    const ranking = rankStmt.get(row.nil) || {}
    
    // Get cluster info from nil_clusters table
    const clusterStmt = db.prepare(`
      SELECT cluster_id, cluster_nome
      FROM nil_clusters
      WHERE nil = ?
    `)
    const clusterInfo = clusterStmt.get(row.nil)
    
    res.json({
      ...row,
      ranking,
      cluster_id: clusterInfo?.cluster_id || row.cluster_id,
      cluster_nome: clusterInfo?.cluster_nome || row.cluster_nome
    })
  } catch (error) {
    console.error('Error fetching NIL detail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/compare
 * Compare multiple NIL
 */
app.post('/api/nil/compare', (req, res) => {
  try {
    const { nilList } = req.body
    
    if (!nilList || !Array.isArray(nilList) || nilList.length === 0) {
      return res.status(400).json({ error: 'nilList array required in body' })
    }
    
    const placeholders = nilList.map(() => '?').join(', ')
    const stmt = db.prepare(`
      SELECT * FROM vw_nil_analisi_completa
      WHERE nil IN (${placeholders})
    `)
    const rows = stmt.all(...nilList)
    
    res.json(rows)
  } catch (error) {
    console.error('Error comparing NIL:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/stats/overview
 * Returns overview statistics for NIL analysis
 */
app.get('/api/nil/stats/overview', (req, res) => {
  try {
    const stats = {}
    
    // General stats
    const generalStats = db.prepare(`
      SELECT 
        COUNT(*) as total_nil,
        AVG(indice_qualita_vita) as iqv_medio,
        MIN(indice_qualita_vita) as iqv_min,
        MAX(indice_qualita_vita) as iqv_max,
        AVG(popolazione_totale) as pop_media,
        SUM(popolazione_totale) as pop_totale,
        AVG(pct_stranieri) as pct_stranieri_media,
        AVG(indice_verde_medio) as verde_medio
      FROM nil_qualita_vita
      WHERE indice_qualita_vita IS NOT NULL
    `).get()
    
    // Trend stats
    const trendStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN saldo_totale > 0 THEN 1 ELSE 0 END) as nil_crescita,
        SUM(CASE WHEN saldo_totale < 0 THEN 1 ELSE 0 END) as nil_declino,
        SUM(CASE WHEN saldo_totale = 0 THEN 1 ELSE 0 END) as nil_stabile,
        SUM(saldo_totale) as saldo_totale_milano
      FROM nil_qualita_vita
      WHERE saldo_totale IS NOT NULL
    `).get()
    
    // Top/Bottom NIL
    const topNil = db.prepare(`
      SELECT nil, indice_qualita_vita FROM nil_qualita_vita
      WHERE indice_qualita_vita IS NOT NULL
      ORDER BY indice_qualita_vita DESC LIMIT 5
    `).all()
    
    const bottomNil = db.prepare(`
      SELECT nil, indice_qualita_vita FROM nil_qualita_vita
      WHERE indice_qualita_vita IS NOT NULL
      ORDER BY indice_qualita_vita ASC LIMIT 5
    `).all()
    
    res.json({
      generale: {
        totalNil: generalStats?.total_nil || 0,
        iqvMedio: generalStats?.iqv_medio ? parseFloat(generalStats.iqv_medio.toFixed(2)) : null,
        iqvMin: generalStats?.iqv_min ? parseFloat(generalStats.iqv_min.toFixed(2)) : null,
        iqvMax: generalStats?.iqv_max ? parseFloat(generalStats.iqv_max.toFixed(2)) : null,
        popolazioneMedia: generalStats?.pop_media ? Math.round(generalStats.pop_media) : null,
        popolazioneTotale: generalStats?.pop_totale || 0,
        pctStranieriMedia: generalStats?.pct_stranieri_media ? parseFloat(generalStats.pct_stranieri_media.toFixed(2)) : null,
        verdeIndiceMedio: generalStats?.verde_medio ? parseFloat(generalStats.verde_medio.toFixed(2)) : null
      },
      trend: {
        nilInCrescita: trendStats?.nil_crescita || 0,
        nilInDeclino: trendStats?.nil_declino || 0,
        nilStabili: trendStats?.nil_stabile || 0,
        saldoTotaleMilano: trendStats?.saldo_totale_milano || 0
      },
      topNil,
      bottomNil
    })
  } catch (error) {
    console.error('Error fetching NIL stats overview:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// NUOVI ENDPOINT - Dati da Star Schema (Api_Milano_Core)
// ============================================================================

/**
 * GET /api/nil/:id/servizi
 * Servizi disponibili in un NIL (farmacie, medici, scuole, mercati)
 */
app.get('/api/nil/:id/servizi', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Prova prima con ID numerico, poi con nome
    let result = null
    
    try {
      result = db.prepare(`
        SELECT * FROM vw_api_servizi_nil WHERE id_nil = ?
      `).get(nilId)
    } catch (e) {
      // Vista non esiste, prova query diretta
    }
    
    if (!result) {
      // Fallback: query diretta su fact_servizi
      try {
        result = db.prepare(`
          SELECT 
            dn.id_nil,
            dn.nil_name,
            fs.num_scuole,
            fs.num_mercati,
            fs.indice_verde_urbano
          FROM dim_nil dn
          LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
          WHERE dn.id_nil = ?
        `).get(nilId)
      } catch (e) {
        return res.status(404).json({ error: 'NIL not found or star schema not available' })
      }
    }
    
    if (!result) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching NIL services:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/ambiente
 * Dati ambientali NIL (verde urbano, calore, rischio)
 */
app.get('/api/nil/:id/ambiente', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    let result = null
    
    try {
      result = db.prepare(`
        SELECT * FROM vw_api_ambiente_nil WHERE id_nil = ?
      `).get(nilId)
    } catch (e) {
      // Vista non esiste
    }
    
    if (!result) {
      try {
        result = db.prepare(`
          SELECT 
            dn.id_nil,
            dn.nil_name,
            fs.indice_verde_urbano as indice_verde
          FROM dim_nil dn
          LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
          WHERE dn.id_nil = ?
        `).get(nilId)
      } catch (e) {
        return res.status(404).json({ error: 'Data not available' })
      }
    }
    
    if (!result) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching NIL environment data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/mobilita
 * Dati mobilità NIL (mezzi trasporto, spostamenti)
 */
app.get('/api/nil/:id/mobilita', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Prima ottieni il nome NIL
    const nilInfo = db.prepare(`SELECT nil FROM dim_nil WHERE id_nil = ?`).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ 
        error: 'NIL not found',
        message: `NIL with id ${nilId} does not exist`
      })
    }
    
    const nilName = nilInfo.nil
    
    // Query sulla tabella mobilità con match case-insensitive
    let rows = db.prepare(`
      SELECT mezzi_di_trasporto_prevalente, valore 
      FROM ds_07_mobilita_trasporti_mezzi_trasporto_prevalente_nil_2011
      WHERE UPPER(nil) = UPPER(?)
      ORDER BY valore DESC
    `).all(nilName)
    
    // Se non trova, prova con prima parola
    if (!rows || rows.length === 0) {
      const firstWord = nilName.split(/[\s-]/)[0]
      rows = db.prepare(`
        SELECT mezzi_di_trasporto_prevalente, valore 
        FROM ds_07_mobilita_trasporti_mezzi_trasporto_prevalente_nil_2011
        WHERE UPPER(nil) LIKE UPPER(?) || '%'
        ORDER BY valore DESC
      `).all(firstWord)
    }
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: 'Mobility data not available for this NIL',
        message: `No mobility data found for ${nilName}`
      })
    }
    
    // Calcola totale e percentuali
    const totale = rows.reduce((sum, r) => sum + (r.valore || 0), 0)
    
    const mobilita = rows.map(r => ({
      mezzo: r.mezzi_di_trasporto_prevalente,
      mezzoShort: r.mezzi_di_trasporto_prevalente === 'A piedi o in bicicletta' ? 'Piedi/Bici'
        : r.mezzi_di_trasporto_prevalente === 'Mezzi pubblici' ? 'Pubblici'
        : r.mezzi_di_trasporto_prevalente === 'Auto privata' ? 'Auto'
        : r.mezzi_di_trasporto_prevalente === 'Altri mezzi' ? 'Altro'
        : r.mezzi_di_trasporto_prevalente,
      valore: r.valore,
      percentuale: totale > 0 ? parseFloat(((r.valore / totale) * 100).toFixed(1)) : 0,
      colore: r.mezzi_di_trasporto_prevalente === 'Mezzi pubblici' ? '#3b82f6'
        : r.mezzi_di_trasporto_prevalente === 'Auto privata' ? '#ef4444'
        : r.mezzi_di_trasporto_prevalente === 'A piedi o in bicicletta' ? '#22c55e'
        : '#6b7280'
    }))
    
    // Calcola mezzo prevalente e sostenibilità
    const prevalente = mobilita[0] ? mobilita[0].mezzo : null
    const pctSostenibile = (mobilita.find(m => m.mezzoShort === 'Piedi/Bici')?.percentuale || 0) +
                          (mobilita.find(m => m.mezzoShort === 'Pubblici')?.percentuale || 0)
    
    res.json({
      nilId,
      nilName,
      data: mobilita,
      totale,
      mezzo_prevalente: prevalente,
      pctSostenibile: parseFloat(pctSostenibile.toFixed(1)),
      anno: 2011
    })
  } catch (error) {
    console.error('Error fetching NIL mobility data:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

/**
 * GET /api/timeline/demografico
 * Serie storica dati demografici Milano
 */
app.get('/api/timeline/demografico', (req, res) => {
  try {
    let result = []
    
    try {
      result = db.prepare(`
        SELECT * FROM vw_api_timeline_demografico ORDER BY anno
      `).all()
    } catch (e) {
      // Vista non esiste, prova query diretta
      try {
        result = db.prepare(`
          SELECT 
            dt.anno,
            SUM(fd.popolazione_totale) as popolazione_milano,
            SUM(fd.stranieri) as stranieri_milano
          FROM fact_demografia fd
          JOIN dim_tempo dt ON fd.id_tempo = dt.id_tempo
          GROUP BY dt.anno
          ORDER BY dt.anno
        `).all()
      } catch (e2) {
        return res.json([])
      }
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching demographic timeline:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/data/freshness
 * Informazioni sulla freschezza dei dati
 */
app.get('/api/data/freshness', (req, res) => {
  try {
    let freshness = []
    
    try {
      freshness = db.prepare(`
        SELECT source_name, last_sync, record_count, status, notes
        FROM data_freshness
        ORDER BY last_sync DESC
      `).all()
    } catch (e) {
      // Tabella non esiste
    }
    
    // Aggiungi info database
    let dbInfo = {}
    try {
      const tables = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
      `).get()
      const views = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='view'
      `).get()
      dbInfo = {
        tables: tables?.count || 0,
        views: views?.count || 0
      }
    } catch (e) {}
    
    res.json({
      lastUpdate: freshness[0]?.last_sync || null,
      sources: freshness,
      database: dbInfo,
      status: freshness.length > 0 ? 'synced' : 'needs_sync'
    })
  } catch (error) {
    console.error('Error fetching data freshness:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/data/catalog
 * Catalogo dataset disponibili
 */
app.get('/api/data/catalog', (req, res) => {
  try {
    let catalog = []
    
    try {
      catalog = db.prepare(`
        SELECT * FROM dataset_catalog ORDER BY category, filename
      `).all()
    } catch (e) {
      // Tabella non esiste
    }
    
    res.json({
      count: catalog.length,
      datasets: catalog
    })
  } catch (error) {
    console.error('Error fetching data catalog:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/star-schema/nil
 * Lista NIL dallo star schema
 */
app.get('/api/star-schema/nil', (req, res) => {
  try {
    let nil = []
    
    try {
      // Prova prima con la vista compatibile
      nil = db.prepare(`
        SELECT 
          id_nil,
          nil_name,
          nil_label,
          area_km2
        FROM vw_dim_nil
        ORDER BY id_nil
      `).all()
    } catch (e) {
      // Fallback a dim_nil con nomi originali
      try {
        nil = db.prepare(`
          SELECT 
            id_nil,
            nil as nil_name,
            nil_norm as nil_label,
            area_km2
          FROM dim_nil
          ORDER BY id_nil
        `).all()
      } catch (e2) {
        return res.json([])
      }
    }
    
    res.json(nil)
  } catch (error) {
    console.error('Error fetching star schema NIL:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/star-schema/nil/:id/complete
 * Dati completi NIL dallo star schema (join di tutte le fact tables)
 */
app.get('/api/star-schema/nil/:id/complete', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Dim NIL
    const nil = db.prepare(`
      SELECT * FROM dim_nil WHERE id_nil = ?
    `).get(nilId)
    
    if (!nil) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Fact tables
    let demografia = null
    let immobiliare = null
    let servizi = null
    
    try {
      demografia = db.prepare(`
        SELECT * FROM fact_demografia WHERE id_nil = ?
      `).get(nilId)
    } catch (e) {}
    
    try {
      immobiliare = db.prepare(`
        SELECT * FROM fact_immobiliare WHERE id_nil = ?
      `).get(nilId)
    } catch (e) {}
    
    try {
      servizi = db.prepare(`
        SELECT * FROM fact_servizi WHERE id_nil = ?
      `).get(nilId)
    } catch (e) {}
    
    res.json({
      nil,
      demografia,
      immobiliare,
      servizi
    })
  } catch (error) {
    console.error('Error fetching complete NIL data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================
// NUOVI ENDPOINT - Dati Open Data Milano
// ============================================================

/**
 * GET /api/colonnine-ricarica
 * Colonnine di ricarica elettrica per veicoli
 */
app.get('/api/colonnine-ricarica', (req, res) => {
  try {
    const colonnine = db.prepare(`
      SELECT * FROM ds_07_mobilita_trasporti_colonnine_ricarica_elettrica
    `).all()
    res.json({
      totale: colonnine.length,
      data: colonnine
    })
  } catch (error) {
    console.error('Error fetching colonnine ricarica:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/botteghe-storiche
 * Botteghe storiche di Milano
 */
app.get('/api/botteghe-storiche', (req, res) => {
  try {
    const botteghe = db.prepare(`
      SELECT * FROM ds_13_economia_commercio_botteghe_storiche
    `).all()
    res.json({
      totale: botteghe.length,
      data: botteghe
    })
  } catch (error) {
    console.error('Error fetching botteghe storiche:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/scuole
 * Edifici scolastici
 */
app.get('/api/scuole', (req, res) => {
  try {
    const scuole = db.prepare(`
      SELECT * FROM ds_06_istruzione_famiglie_edifici_scolastici_2020_2021
    `).all()
    res.json({
      totale: scuole.length,
      data: scuole
    })
  } catch (error) {
    console.error('Error fetching scuole:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/pubblici-esercizi
 * Bar, ristoranti, pub - con paginazione
 */
app.get('/api/pubblici-esercizi', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000)
    const offset = parseInt(req.query.offset) || 0
    const municipio = req.query.municipio
    
    let query = 'SELECT * FROM ds_13_economia_commercio_pubblici_esercizi'
    const params = []
    
    if (municipio) {
      query += ' WHERE municipio = ?'
      params.push(municipio)
    }
    
    query += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const esercizi = db.prepare(query).all(...params)
    const totale = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_pubblici_esercizi').get()?.count || 0
    
    res.json({
      totale,
      limit,
      offset,
      data: esercizi
    })
  } catch (error) {
    console.error('Error fetching pubblici esercizi:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/beni-confiscati
 * Beni immobili confiscati alla criminalità organizzata
 */
app.get('/api/beni-confiscati', (req, res) => {
  try {
    const beni = db.prepare(`
      SELECT * FROM ds_14_sicurezza_beni_immobili_confiscati
    `).all()
    res.json({
      totale: beni.length,
      data: beni
    })
  } catch (error) {
    console.error('Error fetching beni confiscati:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/architetture-storiche
 * Architetture storiche di Milano
 */
app.get('/api/architetture-storiche', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    const offset = parseInt(req.query.offset) || 0
    
    const architetture = db.prepare(`
      SELECT * FROM ds_10_cultura_musei_architetture_storiche
      LIMIT ? OFFSET ?
    `).all(limit, offset)
    
    const totale = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_architetture_storiche').get()?.count || 0
    
    res.json({
      totale,
      limit,
      offset,
      data: architetture
    })
  } catch (error) {
    console.error('Error fetching architetture storiche:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/biblioteche
 * Biblioteche e archivi
 */
app.get('/api/biblioteche', (req, res) => {
  try {
    const biblioteche = db.prepare(`
      SELECT * FROM ds_11_biblioteche_biblioteche_rionali
    `).all()
    
    const archivi = db.prepare(`
      SELECT * FROM ds_11_biblioteche_biblioteche_archivi
    `).all()
    
    res.json({
      biblioteche: {
        totale: biblioteche.length,
        data: biblioteche
      },
      archivi: {
        totale: archivi.length,
        data: archivi
      }
    })
  } catch (error) {
    console.error('Error fetching biblioteche:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/vedovelle
 * Fontanelle pubbliche (vedovelle)
 */
app.get('/api/vedovelle', (req, res) => {
  try {
    const vedovelle = db.prepare(`
      SELECT * FROM ds_05_servizi_essenziali_vedovelle
    `).all()
    res.json({
      totale: vedovelle.length,
      data: vedovelle
    })
  } catch (error) {
    console.error('Error fetching vedovelle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/ambiente-nil
 * Dati ambientali aggregati per NIL (verde, calore, rischio)
 */
app.get('/api/ambiente-nil', (req, res) => {
  try {
    // Verde urbano
    let verde = []
    try {
      verde = db.prepare(`
        SELECT * FROM ds_04_qualita_ambientale_indice_verde_urbano_nil_2024
      `).all()
    } catch (e) {}
    
    // Esposizione calore
    let calore = []
    try {
      calore = db.prepare(`
        SELECT * FROM ds_04_qualita_ambientale_esposizione_calore_urbano_nil_2024
      `).all()
    } catch (e) {}
    
    // Rischio ondate calore
    let rischioCalore = []
    try {
      rischioCalore = db.prepare(`
        SELECT * FROM ds_04_qualita_ambientale_rischio_ondata_calore_nil_2024
      `).all()
    } catch (e) {}
    
    res.json({
      verde: { totale: verde.length, data: verde },
      calore: { totale: calore.length, data: calore },
      rischioCalore: { totale: rischioCalore.length, data: rischioCalore }
    })
  } catch (error) {
    console.error('Error fetching ambiente NIL:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/commercio-stats
 * Statistiche commercio per NIL
 */
app.get('/api/commercio-stats', (req, res) => {
  try {
    // Esercizi vicinato per municipio
    let vicinato = []
    try {
      vicinato = db.prepare(`
        SELECT municipio, COUNT(*) as count
        FROM ds_13_economia_commercio_esercizi_vicinato
        GROUP BY municipio
        ORDER BY count DESC
      `).all()
    } catch (e) {}
    
    // Pubblici esercizi per municipio
    let pubbliciPerMunicipio = []
    try {
      pubbliciPerMunicipio = db.prepare(`
        SELECT municipio, COUNT(*) as count
        FROM ds_13_economia_commercio_pubblici_esercizi
        GROUP BY municipio
        ORDER BY count DESC
      `).all()
    } catch (e) {}
    
    // Media grande distribuzione
    let gdo = []
    try {
      gdo = db.prepare(`
        SELECT municipio, COUNT(*) as count
        FROM ds_13_economia_commercio_media_grande_distribuzione
        GROUP BY municipio
        ORDER BY count DESC
      `).all()
    } catch (e) {}
    
    // Totali
    const totaleVicinato = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_esercizi_vicinato').get()?.count || 0
    const totalePubblici = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_pubblici_esercizi').get()?.count || 0
    const totaleGdo = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_media_grande_distribuzione').get()?.count || 0
    const totaleBotteghe = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_botteghe_storiche').get()?.count || 0
    const totaleCoworking = db.prepare('SELECT COUNT(*) as count FROM ds_13_economia_commercio_coworking').get()?.count || 0
    
    res.json({
      totali: {
        eserciziVicinato: totaleVicinato,
        pubbliciEsercizi: totalePubblici,
        grandeDistribuzione: totaleGdo,
        bottegheStoriche: totaleBotteghe,
        coworking: totaleCoworking
      },
      perMunicipio: {
        vicinato,
        pubblici: pubbliciPerMunicipio,
        gdo
      }
    })
  } catch (error) {
    console.error('Error fetching commercio stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/cultura-stats
 * Statistiche culturali
 */
app.get('/api/cultura-stats', (req, res) => {
  try {
    const architetture = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_architetture_storiche').get()?.count || 0
    const beniCulturali = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_beni_culturali_siti').get()?.count || 0
    const musei = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_beni_patrimonio_musei').get()?.count || 0
    const associazioni = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_associazioni_culturali').get()?.count || 0
    const centriCongressi = db.prepare('SELECT COUNT(*) as count FROM ds_10_cultura_musei_centri_congressi').get()?.count || 0
    const biblioteche = db.prepare('SELECT COUNT(*) as count FROM ds_11_biblioteche_biblioteche_rionali').get()?.count || 0
    const archivi = db.prepare('SELECT COUNT(*) as count FROM ds_11_biblioteche_biblioteche_archivi').get()?.count || 0
    
    res.json({
      architetture,
      beniCulturali,
      musei,
      associazioni,
      centriCongressi,
      biblioteche,
      archivi
    })
  } catch (error) {
    console.error('Error fetching cultura stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/mobilita-stats
 * Statistiche mobilità
 */
app.get('/api/mobilita-stats', (req, res) => {
  try {
    const colonneRicarica = db.prepare('SELECT COUNT(*) as count FROM ds_07_mobilita_trasporti_colonnine_ricarica_elettrica').get()?.count || 0
    const stazioniFerroviarie = db.prepare('SELECT COUNT(*) as count FROM ds_07_mobilita_trasporti_stazioni_ferroviarie').get()?.count || 0
    
    res.json({
      colonneRicarica,
      stazioniFerroviarie
    })
  } catch (error) {
    console.error('Error fetching mobilita stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/istruzione
 * Dati istruzione residenti NIL (titolo di studio)
 */
app.get('/api/nil/:id/istruzione', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Get NIL name from id
    const nilInfo = db.prepare(`
      SELECT nil FROM dim_nil WHERE id_nil = ?
    `).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Get education data - use UPPER for case-insensitive match or first word
    const firstWord = nilInfo.nil.split(' ')[0]
    let istruzioneRows = db.prepare(`
      SELECT titolo_di_studio, valori 
      FROM ds_06_istruzione_famiglie_titolo_studio_residenti_nil_2011
      WHERE UPPER(nil) = UPPER(?)
    `).all(nilInfo.nil)
    
    // Fallback: try matching by first word
    if (!istruzioneRows || istruzioneRows.length === 0) {
      istruzioneRows = db.prepare(`
        SELECT titolo_di_studio, valori 
        FROM ds_06_istruzione_famiglie_titolo_studio_residenti_nil_2011
        WHERE UPPER(nil) LIKE UPPER(?)
      `).all(`${firstWord}%`)
    }
    
    if (!istruzioneRows || istruzioneRows.length === 0) {
      return res.json({ nilId, nilName: nilInfo.nil, data: [], totale: 0 })
    }
    
    // Calculate percentages
    const totale = istruzioneRows.reduce((sum, r) => sum + (r.valori || 0), 0)
    const data = istruzioneRows
      .filter(r => r.titolo_di_studio !== 'Minori di 6 anni')
      .map(r => ({
        categoria: r.titolo_di_studio,
        categoriaShort: r.titolo_di_studio === 'Nessun titolo o licenza elementare' ? 'Elementare'
          : r.titolo_di_studio === 'Licenza di scuola media inferiore o di avviamento professionale' ? 'Media'
          : r.titolo_di_studio === 'Diploma di scuola secondaria superiore' ? 'Diploma'
          : r.titolo_di_studio === 'Titoli universitari o para-universitari' ? 'Laurea'
          : r.titolo_di_studio,
        valore: r.valori,
        percentuale: totale > 0 ? parseFloat(((r.valori / totale) * 100).toFixed(1)) : 0
      }))
    
    // Calculate laureati percentage (key investor metric)
    const laureati = data.find(d => d.categoriaShort === 'Laurea')
    const pctLaureati = laureati?.percentuale || 0
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      data,
      totale,
      pctLaureati,
      anno: 2011
    })
  } catch (error) {
    console.error('Error fetching NIL education data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/nil/:id/stock-abitativo
 * Dati stock abitativo NIL (composizione famiglie, abitazioni)
 */
app.get('/api/nil/:id/stock-abitativo', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Get NIL name from id
    const nilInfo = db.prepare(`
      SELECT nil FROM dim_nil WHERE id_nil = ?
    `).get(nilId)
    
    if (!nilInfo) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Build search pattern - handle different NIL name formats
    const nilSearchPattern = `%${nilInfo.nil.split(' ')[0]}%`
    
    // Get housing stock data
    const abitazioniRow = db.prepare(`
      SELECT * 
      FROM ds_03_stock_abitativo_abitazioni_occupate_nil_2011
      WHERE nil_nuclei_di_identita_locale LIKE ?
      LIMIT 1
    `).get(nilSearchPattern)
    
    // Get new buildings data - use NIL name matching
    let nuoviFabbricati = null
    try {
      nuoviFabbricati = db.prepare(`
        SELECT 
          COUNT(DISTINCT anno_ritiro) as fabbricati,
          SUM(numero_abitazioni) as abitazioni,
          SUM(superficie_utile_abitabile) as superficie,
          SUM(volume_totale_v_p) as volume
        FROM ds_03_stock_abitativo_nuovi_fabbricati_residenziali_2010_2023
        WHERE UPPER(nil) LIKE UPPER(?)
      `).get(nilSearchPattern)
    } catch (e) {
      console.error('Error fetching new buildings:', e)
    }
    
    // Parse housing composition
    let composizione = []
    if (abitazioniRow) {
      composizione = [
        { residenti: '1', valore: parseInt(abitazioniRow.numero_di_residenti_1_residente) || 0, colore: '#3b82f6' },
        { residenti: '2', valore: parseInt(abitazioniRow['2_residenti']) || 0, colore: '#8b5cf6' },
        { residenti: '3', valore: parseInt(abitazioniRow['3_residenti']) || 0, colore: '#ec4899' },
        { residenti: '4', valore: parseInt(abitazioniRow['4_residenti']) || 0, colore: '#f59e0b' },
        { residenti: '5+', valore: parseInt(abitazioniRow['5_o_piu_residenti']) || 0, colore: '#22c55e' }
      ]
    }
    
    const totaleAbitazioni = composizione.reduce((sum, c) => sum + c.valore, 0)
    composizione = composizione.map(c => ({
      ...c,
      percentuale: totaleAbitazioni > 0 ? parseFloat(((c.valore / totaleAbitazioni) * 100).toFixed(1)) : 0
    }))
    
    // Single family vs cohabiting
    const famiglieSingole = abitazioniRow?.una_sola_famiglia || 0
    const famiglieCoabitanti = abitazioniRow?.famiglie_coabitanti || 0
    
    res.json({
      nilId,
      nilName: nilInfo.nil,
      composizioneFamiglie: composizione,
      totaleAbitazioni,
      famiglieSingole,
      famiglieCoabitanti,
      nuoviEdifici: {
        fabbricati: nuoviFabbricati?.fabbricati || 0,
        abitazioni: nuoviFabbricati?.abitazioni || 0,
        superficieMq: nuoviFabbricati?.superficie || 0,
        volumeMc: nuoviFabbricati?.volume || 0,
        periodo: '2010-2023'
      },
      anno: 2011
    })
  } catch (error) {
    console.error('Error fetching NIL housing stock data:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

/**
 * GET /api/nil/:id/investor-metrics
 * Metriche aggregate per investitori
 */
app.get('/api/nil/:id/investor-metrics', (req, res) => {
  try {
    const { id } = req.params
    const nilId = parseInt(id, 10)
    
    // Get NIL basic data
    const nilData = db.prepare(`
      SELECT * FROM vw_nil_analisi_completa WHERE id_nil = ?
    `).get(nilId)
    
    if (!nilData) {
      return res.status(404).json({ error: 'NIL not found' })
    }
    
    // Get ranking
    const ranking = db.prepare(`
      SELECT * FROM vw_nil_ranking WHERE id_nil = ?
    `).get(nilId)
    
    // Get Milano averages for comparison
    const milanoAvg = db.prepare(`
      SELECT 
        AVG(popolazione_totale) as pop_media,
        AVG(densita_abitanti_km2) as densita_media,
        AVG(pct_stranieri) as stranieri_media,
        AVG(indice_verde_medio) as verde_medio,
        AVG(indice_qualita_vita) as iqv_medio,
        AVG(saldo_totale) as saldo_medio
      FROM nil_qualita_vita
      WHERE indice_qualita_vita IS NOT NULL
    `).get()
    
    // Calculate investor attractiveness score (0-100)
    // Weighing: quality of life (40%), growth trend (30%), services (20%), green (10%)
    const iqvScore = nilData.indice_qualita_vita || 0
    const trendScore = nilData.saldo_totale > 0 ? Math.min(100, 50 + nilData.saldo_totale / 10) : Math.max(0, 50 + nilData.saldo_totale / 10)
    const serviziScore = Math.min(100, ((nilData.numero_scuole || 0) * 10 + (nilData.numero_mercati || 0) * 5))
    const verdeScore = Math.min(100, (nilData.indice_verde_medio || 0) * 5)
    
    const investorScore = (iqvScore * 0.4) + (trendScore * 0.3) + (serviziScore * 0.2) + (verdeScore * 0.1)
    
    // Risk assessment
    let riskLevel = 'Medio'
    let riskColor = '#f59e0b'
    if (nilData.saldo_totale > 100 && nilData.indice_qualita_vita > 50) {
      riskLevel = 'Basso'
      riskColor = '#22c55e'
    } else if (nilData.saldo_totale < -100 || nilData.indice_qualita_vita < 30) {
      riskLevel = 'Alto'
      riskColor = '#ef4444'
    }
    
    // Growth potential
    let growthPotential = 'Moderato'
    if (nilData.nuovi_fabbricati_residenziali > 0 && nilData.saldo_totale > 50) {
      growthPotential = 'Alto'
    } else if (nilData.saldo_totale < -50) {
      growthPotential = 'Basso'
    }
    
    res.json({
      nilId,
      nil: nilData.nil,
      investorScore: parseFloat(investorScore.toFixed(1)),
      riskLevel,
      riskColor,
      growthPotential,
      ranking: {
        qualitaVita: ranking?.ranking_iqv || null,
        verde: ranking?.ranking_verde || null,
        popolazione: ranking?.ranking_popolazione || null,
        totaleNil: 88
      },
      confrontoMilano: {
        popolazione: {
          nil: nilData.popolazione_totale,
          media: Math.round(milanoAvg?.pop_media || 0),
          delta: nilData.popolazione_totale - (milanoAvg?.pop_media || 0)
        },
        densita: {
          nil: nilData.densita_abitanti_km2,
          media: milanoAvg?.densita_media || 0,
          deltaPercent: milanoAvg?.densita_media ? parseFloat((((nilData.densita_abitanti_km2 - milanoAvg.densita_media) / milanoAvg.densita_media) * 100).toFixed(1)) : 0
        },
        stranieri: {
          nil: nilData.pct_stranieri,
          media: milanoAvg?.stranieri_media || 0,
          delta: parseFloat((nilData.pct_stranieri - (milanoAvg?.stranieri_media || 0)).toFixed(1))
        },
        verde: {
          nil: nilData.indice_verde_medio,
          media: milanoAvg?.verde_medio || 0,
          deltaPercent: milanoAvg?.verde_medio ? parseFloat((((nilData.indice_verde_medio - milanoAvg.verde_medio) / milanoAvg.verde_medio) * 100).toFixed(1)) : 0
        },
        qualitaVita: {
          nil: nilData.indice_qualita_vita,
          media: milanoAvg?.iqv_medio || 0,
          deltaPercent: milanoAvg?.iqv_medio ? parseFloat((((nilData.indice_qualita_vita - milanoAvg.iqv_medio) / milanoAvg.iqv_medio) * 100).toFixed(1)) : 0
        }
      }
    })
  } catch (error) {
    console.error('Error fetching NIL investor metrics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Milano API server running on http://localhost:${PORT}`)
  console.log(`📊 Database: ${dbPath}`)
})

export default app
