/**
 * GeoJSON dei Quartieri di Milano
 * 
 * Questo file contiene poligoni REALI dei NIL (Nuclei Identità Locale) di Milano
 * estratti dal file GeoJSON ufficiale del Comune di Milano.
 * 
 * Fallback: se un NIL non ha poligono, genera uno deterministico basato sull'ID.
 */

import { quartieriData } from './quartieriData';
import { nilPolygons } from './nilPolygons';

// Genera il GeoJSON completo con poligoni REALI dai NIL
export const generateQuartieriGeoJSON = (quartieri = quartieriData) => {
  return {
    type: 'FeatureCollection',
    features: quartieri.map(quartiere => {
      // Usa il poligono NIL reale se esiste, altrimenti genera un fallback deterministico
      const polygonCoords = nilPolygons[quartiere.id] || generateDeterministicPolygon(quartiere.coordinates, quartiere.id);
      
      return {
        type: 'Feature',
        id: quartiere.id,
        properties: {
          id: quartiere.id,
          name: quartiere.name,
          shortName: quartiere.shortName,
          zone: quartiere.zone,
          fascia: quartiere.fascia,
          prezzoAcquistoMedio: quartiere.prezzoAcquistoMedio,
          prezzoLocazioneMedio: quartiere.prezzoLocazioneMedio,
          variazioneSemestrale: quartiere.variazioneSemestrale,
          color: quartiere.color,
          mapColor: quartiere.mapColor || quartiere.color,
          mapMetricValue: quartiere.mapMetricValue ?? null,
          mapMetricLabel: quartiere.mapMetricLabel || `${formatPrice(quartiere.prezzoAcquistoMedio)}/mq`
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords]
        }
      };
    })
  };
};

/**
 * Genera un poligono deterministico basato sul centro e sull'ID.
 * NON usa Math.random() - il risultato è sempre lo stesso per lo stesso ID.
 * Usa una funzione hash semplice per generare variazioni deterministiche.
 */
const generateDeterministicPolygon = (center, id, size = 0.012) => {
  const [lng, lat] = center;
  const points = 8;
  const coords = [];
  
  // Simple hash function for deterministic variation
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  const hash = hashCode(id || 'default');
  
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    // Deterministic variation based on hash and point index
    const variation = 1 + (((hash * (i + 1)) % 100) / 100 - 0.5) * 0.3;
    const dx = size * variation * Math.cos(angle);
    const dy = size * variation * 0.8 * Math.sin(angle); // aspect ratio
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]); // chiudi il poligono
  
  return coords;
};

// GeoJSON per i marker/punti dei quartieri
export const generateQuartieriPointsGeoJSON = (quartieri = quartieriData) => {
  return {
    type: 'FeatureCollection',
    features: quartieri.map(quartiere => ({
      type: 'Feature',
      id: quartiere.id,
      properties: {
        id: quartiere.id,
        name: quartiere.name,
        shortName: quartiere.shortName,
        zone: quartiere.zone,
        fascia: quartiere.fascia,
        prezzoAcquistoMedio: quartiere.prezzoAcquistoMedio,
        prezzoLocazioneMedio: quartiere.prezzoLocazioneMedio,
        variazioneSemestrale: quartiere.variazioneSemestrale,
        color: quartiere.color,
        mapColor: quartiere.mapColor || quartiere.color,
        mapMetricValue: quartiere.mapMetricValue ?? null,
        mapMetricLabel: quartiere.mapMetricLabel || `${formatPrice(quartiere.prezzoAcquistoMedio)}/mq`
      },
      geometry: {
        type: 'Point',
        coordinates: quartiere.coordinates
      }
    }))
  };
};

// Helper per ottenere quartiere per ID
export const getQuartiereById = (id) => {
  return quartieriData.find(q => q.id === id);
};

// Helper per formattare il prezzo
export const formatPrice = (price) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Helper per formattare la variazione
export const formatVariation = (variation) => {
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(2)}%`;
};

export default { 
  generateQuartieriGeoJSON, 
  generateQuartieriPointsGeoJSON,
  getQuartiereById,
  formatPrice,
  formatVariation
};
