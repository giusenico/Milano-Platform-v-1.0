const dynamicApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Production is static-first. This avoids stale Vercel env vars pointing to
// the old Railway backend and removes the CORS dependency entirely.
export const isStaticApiMode = !import.meta.env.DEV

export const buildApiUrl = (path) => {
  if (isStaticApiMode) {
    return `/data-api${path}.json`
  }

  return `${dynamicApiBaseUrl}${path}`
}
