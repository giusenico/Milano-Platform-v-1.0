import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { quartiereMapping } from '../shared/quartiereMapping.js'
import app from '../server/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'website', 'public', 'data-api')

const quartiereNilMappingPath = path.join(rootDir, 'website', 'src', 'data', 'quartiereNilMapping_expanded.json')
const nilMappingPath = path.join(rootDir, 'website', 'src', 'data', 'nilMapping.json')

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writePayload(apiPath, payload) {
  const relativePath = apiPath.replace(/^\/api/, '')
  const filePath = path.join(outputDir, `${relativePath}.json`)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function invokeGet(apiPath) {
  return new Promise((resolve, reject) => {
    const req = new Readable({
      read() {
        this.push(null)
      }
    })

    req.url = apiPath
    req.method = 'GET'
    req.headers = {}
    req.connection = { remoteAddress: '127.0.0.1' }
    req.socket = { remoteAddress: '127.0.0.1', encrypted: false }
    req.httpVersion = '1.1'
    req.httpVersionMajor = 1
    req.httpVersionMinor = 1

    const chunks = []
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        callback()
      }
    })

    res.req = req
    res.statusCode = 200
    res.headers = {}
    res.locals = {}
    res.setHeader = (key, value) => {
      res.headers[key.toLowerCase()] = value
    }
    res.getHeader = (key) => res.headers[key.toLowerCase()]
    res.getHeaders = () => ({ ...res.headers })
    res.removeHeader = (key) => {
      delete res.headers[key.toLowerCase()]
    }
    res.writeHead = (statusCode, headers = {}) => {
      res.statusCode = statusCode
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value)
      }
      return res
    }
    res.write = (chunk, encoding, callback) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
      if (callback) callback()
      return true
    }
    res.end = (chunk, encoding, callback) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
      }
      if (callback) callback()

      const body = Buffer.concat(chunks).toString('utf8')
      resolve({
        status: res.statusCode,
        body,
        headers: res.getHeaders()
      })
      return res
    }

    app.handle(req, res, reject)
  })
}

async function fetchAndWrite(apiPath, { allowStatuses = [], fallbackPayload } = {}) {
  const response = await invokeGet(apiPath)

  if (allowStatuses.includes(response.status)) {
    if (fallbackPayload !== undefined) {
      await writePayload(apiPath, fallbackPayload)
    }
    return false
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed exporting ${apiPath}: ${response.status} ${response.body}`)
  }

  const payload = JSON.parse(response.body)
  await writePayload(apiPath, payload)
  return payload
}

async function main() {
  await rm(outputDir, { recursive: true, force: true })

  const quartiereNilMapping = await readJson(quartiereNilMappingPath)
  const nilMapping = await readJson(nilMappingPath)

  const quartiereIds = new Set([
    ...Object.values(quartiereMapping),
    ...Object.keys(quartiereNilMapping)
  ])

  const nilIds = new Set(
    Object.values(nilMapping)
      .map((entry) => entry?.id)
      .filter((id) => Number.isInteger(id))
  )

  const fixedPaths = [
    '/api/quartieri',
    '/api/stats/milano',
    '/api/semesters',
    '/api/timeline',
    '/api/data-overview',
    '/api/indicatori-demografici',
    '/api/contribuenti',
    '/api/indice-prezzi-abitazioni',
    '/api/nil/ranking',
    '/api/nil/stats/overview',
    '/api/ambiente-nil',
    '/api/commercio-stats',
    '/api/cultura-stats',
    '/api/mobilita-stats',
    '/api/botteghe-storiche',
    '/api/biblioteche',
    '/api/colonnine-ricarica',
    '/api/vedovelle'
  ]

  for (const apiPath of fixedPaths) {
    await fetchAndWrite(apiPath)
  }

  await fetchAndWrite('/api/nil/clusters', { allowStatuses: [500], fallbackPayload: { clusters: [] } })

  for (const quartiereId of quartiereIds) {
    await fetchAndWrite(`/api/quartieri/${encodeURIComponent(quartiereId)}/timeseries`, { allowStatuses: [404] })
  }

  const nilDetailPaths = [
    (nilId) => `/api/popolazione-quartiere/${nilId}`,
    (nilId) => `/api/nil/${nilId}`,
    (nilId) => `/api/nil/${nilId}/istruzione`,
    (nilId) => `/api/nil/${nilId}/mobilita`,
    (nilId) => `/api/nil/${nilId}/stock-abitativo`,
    (nilId) => `/api/nil/${nilId}/investor-metrics`,
    (nilId) => `/api/nil/${nilId}/servizi-sanitari`,
    (nilId) => `/api/nil/${nilId}/servizi-sociali`,
    (nilId) => `/api/nil/${nilId}/cultura`,
    (nilId) => `/api/nil/${nilId}/commercio`,
    (nilId) => `/api/nil/${nilId}/sicurezza`
  ]

  for (const nilId of nilIds) {
    for (const toPath of nilDetailPaths) {
      await fetchAndWrite(toPath(nilId), { allowStatuses: [404, 500] })
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
