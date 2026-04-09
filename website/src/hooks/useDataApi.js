import { useState, useEffect, useCallback } from 'react'
import { buildApiUrl, isStaticApiMode } from '../lib/api'

/**
 * Hook to fetch time series data for a specific quartiere
 */
export const useQuartiereTimeSeries = (quartiereId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!quartiereId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/quartieri/${quartiereId}/timeseries`))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching time series:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [quartiereId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch Milano overall statistics
 */
export const useMilanoStats = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/stats/milano'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching Milano stats:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch comparison time series data for multiple quartieri
 */
export const useCompareTimeSeries = (quartiereIds = []) => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!quartiereIds || quartiereIds.length === 0) {
      setData([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let result

      if (isStaticApiMode) {
        const seriesResults = await Promise.all(
          quartiereIds.map(async (quartiereId) => {
            const response = await fetch(buildApiUrl(`/quartieri/${quartiereId}/timeseries`))
            if (!response.ok) {
              if (response.status === 404) return null
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
        )

        result = seriesResults.filter(Boolean)
      } else {
        const idsParam = quartiereIds.join(',')
        const response = await fetch(buildApiUrl(`/timeseries/compare?ids=${idsParam}`))
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        result = await response.json()
      }
      setData(result)
    } catch (err) {
      console.error('Error fetching comparison data:', err)
      setError(err.message)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [quartiereIds.join(',')])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch all quartieri data
 */
export const useQuartieriData = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/quartieri'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching quartieri:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch available semesters
 */
export const useSemesters = () => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/semesters'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setError(err.message)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch timeline data for weather-style visualization
 * Returns all quartieri data for each semester
 */
export const useTimelineData = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/timeline'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching timeline:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch data overview (summary of all available data)
 */
export const useDataOverview = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/data-overview'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching data overview:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch demographic indicators for Milano
 */
export const useIndicatoriDemografici = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/indicatori-demografici'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching indicatori demografici:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch contributor/tax data for Milano
 */
export const useContribuenti = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/contribuenti'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching contribuenti:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch housing price index (national level)
 */
export const useIndicePrezziAbitazioni = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/indice-prezzi-abitazioni'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching indice prezzi abitazioni:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch population data by neighborhood (NIL)
 */
export const usePopolazioneQuartiere = (nil = null) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nil && isStaticApiMode) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = nil 
        ? buildApiUrl(`/popolazione-quartiere/${encodeURIComponent(nil)}`)
        : buildApiUrl('/popolazione-quartiere')
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching popolazione quartiere:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nil])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch complete NIL analysis data
 * Returns: indice_qualita_vita, cluster, verde, servizi, popolazione, dinamica
 */
export const useNilAnalisi = (nilName = null) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilName) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${encodeURIComponent(nilName)}`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL analysis:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilName])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL ranking data
 */
export const useNilRanking = (limit = 88, order = 'desc') => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/nil/ranking'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      const sorted = [...result].sort((a, b) => {
        const delta = (a.indice_qualita_vita ?? 0) - (b.indice_qualita_vita ?? 0)
        return order === 'asc' ? delta : -delta
      })
      setData(sorted.slice(0, limit))
    } catch (err) {
      console.error('Error fetching NIL ranking:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [limit, order])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL stats overview
 */
export const useNilStatsOverview = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/nil/stats/overview'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL stats overview:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch environmental data for NIL areas
 */
export const useAmbienteNil = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/ambiente-nil'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching ambiente NIL:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch commerce statistics
 */
export const useCommercioStats = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/commercio-stats'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching commercio stats:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch culture statistics
 */
export const useCulturaStats = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/cultura-stats'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching cultura stats:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch mobility statistics
 */
export const useMobilitaStats = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/mobilita-stats'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching mobilita stats:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch botteghe storiche
 */
export const useBottegheStoriche = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/botteghe-storiche'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching botteghe storiche:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch biblioteche
 */
export const useBiblioteche = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/biblioteche'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching biblioteche:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch colonnine ricarica elettrica
 */
export const useColonnineRicarica = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/colonnine-ricarica'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching colonnine ricarica:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch vedovelle (public fountains)
 */
export const useVedovelle = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/vedovelle'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching vedovelle:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL clusters
 */
export const useNilClusters = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl('/nil/clusters'))
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL clusters:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// ============================================================================
// NIL ENRICHED DATA HOOKS (for investor analytics)
// ============================================================================

/**
 * Hook to fetch NIL education data (titoli di studio)
 * @param {number} nilId - NIL ID
 */
export const useNilIstruzione = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/istruzione`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL education data:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL mobility data (mezzi di trasporto)
 * @param {number} nilId - NIL ID
 */
export const useNilMobilita = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/mobilita`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL mobility data:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL housing stock data (stock abitativo)
 * @param {number} nilId - NIL ID
 */
export const useNilStockAbitativo = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/stock-abitativo`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL housing stock data:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL investor metrics (aggregated for investors)
 * @param {number} nilId - NIL ID
 */
export const useNilInvestorMetrics = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/investor-metrics`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL investor metrics:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL healthcare services data (pharmacies, doctors)
 * @param {number} nilId - NIL ID
 */
export const useNilServiziSanitari = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/servizi-sanitari`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL healthcare services:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL social services data
 * @param {number} nilId - NIL ID
 */
export const useNilServiziSociali = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/servizi-sociali`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL social services:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL culture data (libraries, museums, historic architecture)
 * @param {number} nilId - NIL ID
 */
export const useNilCultura = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/cultura`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL culture:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL commerce data (shops, historic shops, coworking)
 * @param {number} nilId - NIL ID
 */
export const useNilCommercio = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/commercio`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL commerce:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Hook to fetch NIL security data (seized properties)
 * @param {number} nilId - NIL ID
 */
export const useNilSicurezza = (nilId) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!nilId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl(`/nil/${nilId}/sicurezza`))
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching NIL security:', err)
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [nilId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

export default {
  useQuartiereTimeSeries,
  useMilanoStats,
  useCompareTimeSeries,
  useQuartieriData,
  useSemesters,
  useTimelineData,
  useDataOverview,
  useIndicatoriDemografici,
  useContribuenti,
  useIndicePrezziAbitazioni,
  usePopolazioneQuartiere,
  useNilAnalisi,
  useNilRanking,
  useNilStatsOverview,
  useAmbienteNil,
  useCommercioStats,
  useCulturaStats,
  useMobilitaStats,
  useBottegheStoriche,
  useBiblioteche,
  useColonnineRicarica,
  useVedovelle,
  useNilClusters,
  useNilIstruzione,
  useNilMobilita,
  useNilStockAbitativo,
  useNilInvestorMetrics,
  useNilServiziSanitari,
  useNilServiziSociali,
  useNilCultura,
  useNilCommercio,
  useNilSicurezza
}
