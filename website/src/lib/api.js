const dynamicApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export const isStaticApiMode = !import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL

export const buildApiUrl = (path) => {
  if (isStaticApiMode) {
    return `/data-api${path}.json`
  }

  return `${dynamicApiBaseUrl}${path}`
}
