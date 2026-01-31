# NIL Data Analysis Report: Available vs. Displayed Data

**Date:** January 31, 2026  
**Purpose:** Identify the gap between available NIL data in the database and data currently displayed in the UI

---

## Executive Summary

The Milano Platform has **14 data categories** with **53+ datasets** in the raw data pipeline. However, the frontend UI currently displays only a **subset** of this data, primarily focused on:
- Real estate prices (Market Analysis)
- Basic demographics
- Quality of Life indicators
- Limited services data

**Key Finding:** Approximately **60-70% of available data is NOT being displayed** in the current UI.

---

## 1. Data Categories in Database (from `data_pipeline/data_raw/`)

| Category ID | Category Name | Datasets | Rows Total | Status in UI |
|-------------|---------------|----------|------------|--------------|
| 00 | Base Geografica | 2 | 6,167 | ✅ Used (NIL polygons) |
| 01 | Struttura Demografica | 6 | ~22,000 | ⚠️ Partially used |
| 03 | Stock Abitativo | 2 | 969 | ⚠️ Partially used |
| 04 | Qualità Ambientale | 7 | ~350 | ⚠️ Partially used |
| 05 | Servizi Essenziali | 5 | ~893 | ⚠️ Partially used |
| 06 | Istruzione/Famiglie | 2 | 995 | ⚠️ Partially used |
| 07 | Mobilità/Trasporti | 4 | ~1,116 | ⚠️ Partially used |
| 08 | Servizi Sanitari | 2 | 1,386 | ❌ NOT displayed |
| 09 | Servizi Sociali | 1 | 949 | ❌ NOT displayed |
| 10 | Cultura/Musei | 5 | ~1,454 | ⚠️ Partially used |
| 11 | Biblioteche | 3 | 339 | ⚠️ Partially used |
| 12 | Turismo | 1 | 49 | ❌ NOT displayed |
| 13 | Economia/Commercio | 11 | ~63,000 | ⚠️ Partially used |
| 14 | Sicurezza | 1 | 267 | ❌ NOT displayed |

---

## 2. What Data is Currently Being USED in the UI

### 2.1 Market Analysis Tab (`Analisi Mercato`)

**Displayed Data:**
- Purchase price per m² (from OMI/prezzi_medi_quartiere)
- Rental price per m² (from OMI/prezzi_medi_quartiere)
- Semester-over-semester price variation
- Calculated yield (rental/purchase * 12)
- Risk score (calculated from price volatility)
- Number of families (from demographic data)
- Historical price trends (time series)

**API Endpoints Used:**
- `/api/quartieri` - Price data
- `/api/quartieri/:id/timeseries` - Historical trends
- `/api/stats/milano` - City averages
- `/api/nil/:id/investor-metrics` - Investment scores (on demand)
- `/api/nil/:id/stock-abitativo` - Housing stock (on demand)

### 2.2 Livability Tab (`Vivibilità`)

**Displayed Data:**
- Quality of Life Index (composite score 0-100)
- Four dimensions: Verde, Servizi, Densità, Dinamica
- Cluster classification
- Population total
- Number of families
- % foreign residents
- Population density
- Single-person households
- Area (km²)
- Number of schools
- Number of markets
- Green index (mq/inhabitant)
- Natural balance (births - deaths)
- Migratory balance (immigrations - emigrations)

**API Endpoints Used:**
- `/api/nil/:name` - Complete NIL analysis
- `/api/popolazione-quartiere/:nil` - Population details
- `/api/nil/:id/istruzione` - Education data (on demand)
- `/api/nil/:id/mobilita` - Mobility data (on demand)

### 2.3 Map Visualization

**Displayed Data:**
- NIL polygon boundaries
- Color-coded by: Price, Rent, Yield, or Trend
- Legend for each metric

**API Endpoints Used:**
- `/api/quartieri` - Price data for coloring

### 2.4 City-Level Overview (Milano panel)

**Displayed Data:**
- Average purchase price
- Average rental price
- Average yield
- Average semester variation
- Demographics summary
- Services count (pharmacies, doctors, schools, markets)
- Commerce (public establishments, historic shops)
- Culture (libraries, architecture, cultural assets)
- Mobility (EV charging stations)

**API Endpoints Used:**
- `/api/data-overview`
- `/api/stats/milano`
- Various aggregated endpoints

---

## 3. What Data is Available but NOT Being Displayed

### 3.1 Healthcare Data (08_servizi_sanitari) ❌ NOT USED

| Dataset | Description | Rows | Potential UI Use |
|---------|-------------|------|------------------|
| farmacie_milano.csv | Pharmacies with location | 422 | Map layer, NIL count |
| medici_medicina_generale.csv | General practitioners | 964 | Healthcare score per NIL |

**Available columns:**
- Pharmacy addresses, hours, NIL assignment
- Doctor offices, specialization, NIL assignment

### 3.2 Social Services (09_servizi_sociali) ❌ NOT USED

| Dataset | Description | Rows | Potential UI Use |
|---------|-------------|------|------------------|
| servizi_sociali_2014.csv | Social service organizations | 949 | Welfare accessibility score |

**Available columns:**
- Organization type, services offered
- Target demographics (elderly, families, children)
- Hours, locations, NIL assignment

### 3.3 Tourism (12_turismo) ❌ NOT USED

| Dataset | Description | Rows | Potential UI Use |
|---------|-------------|------|------------------|
| case_ferie_strutture.csv | Holiday homes, accommodations | 49 | Tourist appeal indicator |

**Available columns:**
- Accommodation type, capacity
- Number of rooms/beds per NIL

### 3.4 Security Data (14_sicurezza) ❌ NOT USED

| Dataset | Description | Rows | Potential UI Use |
|---------|-------------|------|------------------|
| beni_immobili_confiscati.csv | Properties seized from crime | 267 | Safety indicator |

**Available columns:**
- Property type, location, current use
- Assignment to social organizations

### 3.5 Partially Used Categories - Unused Datasets

#### Environmental Quality (04_qualita_ambientale)
- ❌ `alberi_monumentali.csv` - 13 monumental trees (heritage indicator)
- ❌ `cascine_storiche.csv` - 42 historic farmhouses (cultural heritage)
- ❌ `ecoisole.csv` - 10 eco-islands (waste management)
- ❌ `riciclerie.csv` - 5 recycling centers
- ⚠️ `esposizione_calore_urbano_nil_2024.geojson` - Heat exposure data (API exists, minimal UI display)
- ⚠️ `rischio_ondata_calore_nil_2024.geojson` - Heat wave risk (API exists, minimal UI display)

#### Essential Services (05_servizi_essenziali)
- ❌ `case_acqua.csv` - 52 public water dispensers
- ❌ `mercati_agricoltori.csv` - 9 farmers markets (food access)
- ❌ `vedovelle.csv` - 721 public fountains (mapped in API but not NIL-aggregated in UI)

#### Education (06_istruzione_famiglie)
- ⚠️ `edifici_scolastici_2020_2021.csv` - 560 schools (count shown, but not school types/levels)
- ⚠️ `titolo_studio_residenti_nil_2011.csv` - Education levels (shown in advanced panel only)

#### Mobility (07_mobilita_trasporti)
- ❌ `stazioni_ferroviarie.csv` - 24 train stations (transit accessibility)
- ⚠️ `colonnine_ricarica_elettrica.csv` - 483 EV chargers (shown city-wide, not per NIL)
- ⚠️ `mezzi_trasporto_prevalente_nil_2011.csv` - Transport modes (shown in advanced panel only)
- ⚠️ `spostamenti_studio_lavoro_nil_2011.csv` - Commuting patterns (shown in advanced panel only)

#### Culture & Museums (10_cultura_musei)
- ❌ `associazioni_culturali.csv` - 95 cultural associations
- ❌ `beni_patrimonio_musei.csv` - 7 museum heritage items
- ❌ `centri_congressi.csv` - 189 congress centers (business appeal)
- ⚠️ `architetture_storiche.csv` - 841 historic buildings (city-wide count only)
- ⚠️ `beni_culturali_siti.csv` - 322 cultural sites (city-wide count only)

#### Libraries (11_biblioteche)
- ⚠️ `biblioteche_archivi.csv` - 232 libraries (city-wide, not per NIL in UI)
- ❌ `biblioteche_rionali.csv` - 81 neighborhood libraries with hours, capacity, etc.
- ❌ `sistema_bibliotecario.csv` - 26 library system locations

#### Commerce (13_economia_commercio)
- ❌ `coworking.csv` - 110 coworking spaces (startup/business indicator)
- ❌ `edicole.csv` - 643 newsstands
- ❌ `esercizi_vicinato.csv` - 29,312 local shops (commercial vitality)
- ❌ `fablab.csv` - 12 FabLabs (innovation indicator)
- ❌ `grandi_strutture_vendita.csv` - 33 shopping centers
- ❌ `imprese_settore_quartiere.csv` - 22,051 business records by sector
- ❌ `locali_pubblico_spettacolo.csv` - 302 entertainment venues
- ❌ `media_grande_distribuzione.csv` - 1,027 supermarkets/stores
- ⚠️ `botteghe_storiche.csv` - 626 historic shops (city-wide count only)
- ⚠️ `pubblici_esercizi.csv` - 9,417 bars/restaurants (city-wide count only)

---

## 4. API Endpoints Implemented but Not Fully Utilized in UI

| Endpoint | Data Available | UI Usage |
|----------|----------------|----------|
| `/api/nil/:id/servizi` | Schools, markets, pharmacies, doctors per NIL | ❌ Not called |
| `/api/nil/:id/ambiente` | Heat exposure, green index, heat risk | ❌ Not called |
| `/api/colonnine-ricarica` | EV chargers with location | City aggregate only |
| `/api/botteghe-storiche` | Historic shops list | City aggregate only |
| `/api/biblioteche` | Library details | City aggregate only |
| `/api/vedovelle` | Public fountains | City aggregate only |
| `/api/architetture-storiche` | Historic buildings | City aggregate only |
| `/api/beni-confiscati` | Seized properties | ❌ Not called |
| `/api/pubblici-esercizi` | Bars/restaurants | City aggregate only |
| `/api/scuole` | School list | City aggregate only |

---

## 5. Recommended Enhancements

### High Priority (High Value, Low Effort)

1. **Healthcare Score per NIL**
   - Combine pharmacies + doctors count
   - Show in Vivibilità tab
   - Data: Already in DB, API can be added easily

2. **Commerce Vitality Score per NIL**
   - Count: bars, restaurants, shops per km²
   - Show in both Market Analysis and Vivibilità
   - Data: `pubblici_esercizi`, `esercizi_vicinato`

3. **Transit Accessibility Score**
   - EV chargers + train stations per NIL
   - Show as mobility indicator in Vivibilità
   - Data: `colonnine_ricarica`, `stazioni_ferroviarie`

### Medium Priority (Good Value)

4. **Cultural Heritage Score**
   - Historic buildings + cultural sites per NIL
   - New visual element in Vivibilità
   - Data: `architetture_storiche`, `beni_culturali_siti`

5. **Business/Startup Friendliness**
   - Coworking + FabLabs + congress centers
   - Useful for investor analysis
   - Data: `coworking`, `fablab`, `centri_congressi`

6. **Social Services Availability**
   - Count of social organizations
   - Family-friendliness indicator
   - Data: `servizi_sociali_2014`

### Lower Priority (Nice to Have)

7. **Environmental Details**
   - Monumental trees, historic farms as heritage layer
   - Recycling infrastructure

8. **Security Transparency**
   - Seized properties repurposed for social good
   - Could be positive indicator of community recovery

9. **Tourism Appeal Score**
   - Accommodations, cultural sites, entertainment venues

---

## 6. Data Freshness

Most datasets are from 2011-2024:
- **Census data (2011)**: Demographics, education, mobility patterns - OUTDATED
- **Current data (2020-2024)**: Population, prices, buildings, services - CURRENT
- **Environmental (2024)**: Heat exposure, green index - CURRENT

**Recommendation:** Flag census-based data as "historical" in UI.

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| Total data categories | 14 |
| Total datasets | 53+ |
| Datasets actively displayed in UI | ~15 |
| Datasets in API but not fully used | ~12 |
| Datasets not exposed via API | ~26 |
| **Data utilization rate** | **~28%** |

---

## Appendix: Master NIL Core Fields

The processed `master_nil_core.csv` contains these fields per NIL:

```
id_nil, nil, nil_norm, shape_area, shape_length, area_km2,
id_tempo, popolazione_totale, pct_stranieri, densita_abitanti_km2,
famiglie_registrate_in_anagrafe, famiglie_unipersonali_registrate_in_anagrafe,
nati_vivi, morti, immigrati, emigrati,
id_tempo_imm, nuovi_fabbricati_residenziali, abitazioni_nuove,
superficie_utile_abitabile, volume_totale,
id_tempo_serv, numero_scuole, numero_mercati, indice_verde_medio
```

This is the core dataset that powers the Quality of Life index in the UI.
