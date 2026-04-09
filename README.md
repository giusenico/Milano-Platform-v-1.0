# 🏙️ Milano Platform

Piattaforma unificata per dati urbani e dashboard interattiva di Milano.

## 🎯 Panoramica

Milano Platform integra:
- **Dashboard Web** interattiva con mappa 3D e visualizzazioni dati
- **Pipeline Automatica** per scaricare e processare dati da Open Data Milano
- **Database Unificato** con star schema ottimizzato per analisi
- **API REST** per accesso ai dati

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRON (giornaliero 03:00)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pipeline Automatica                                            │
│  └── Download → Pulizia → Star Schema → Sync                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database Unificato (db/milano_unified.db)                      │
│  └── dim_nil, dim_tempo, fact_*, vw_api_*                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Express + Frontend React                                   │
│  └── Dashboard interattiva con dati sempre aggiornati          │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Struttura

```
Milano_Platform/
├── website/              # Frontend React + Vite
│   ├── src/
│   │   ├── components/   # Componenti UI (Map, Sidebar, Charts)
│   │   ├── data/         # Dati statici generati
│   │   └── hooks/        # React hooks
│   ├── public/
│   └── package.json
│
├── server/               # Backend Express
│   ├── index.js          # API endpoints
│   └── db/migrations/
│
├── data_pipeline/        # Pipeline dati automatica
│   ├── config/
│   │   ├── datasets_core.json    # Elenco dataset
│   │   └── pipeline.json         # Configurazione
│   ├── scripts/
│   │   ├── download_core.py      # Download da Open Data
│   │   ├── process_core.py       # Pulizia dati
│   │   ├── build_star_schema.py  # Costruzione star schema
│   │   ├── sync_to_website.py    # Sync verso website
│   │   └── run_full_pipeline.sh  # Script automazione
│   ├── data_raw/                 # Dati grezzi
│   └── requirements.txt
│
├── db/
│   └── milano_unified.db # Database SQLite unificato
│
├── shared/               # Codice condiviso
│   └── quartiereMapping.js
│
├── logs/                 # Log pipeline
├── reports/              # Report qualità dati
├── Makefile              # Comandi unificati
└── README.md
```

## 🚀 Quick Start

### 1. Installazione

```bash
cd Milano_Platform

# Installa tutte le dipendenze
make install
```

### 2. Avvio Sviluppo

```bash
# Avvia frontend + backend
make dev

# Apri http://localhost:5173
```

### 3. Aggiornamento Dati

```bash
# Pipeline completa (download + process + sync)
make pipeline

# Solo sincronizzazione (dati già scaricati)
make sync
```

## 📊 Comandi Make

| Comando | Descrizione |
|---------|-------------|
| `make help` | Mostra tutti i comandi |
| `make install` | Installa dipendenze Python e Node |
| `make dev` | Avvia sviluppo (frontend + backend) |
| `make build` | Build produzione |
| `make pipeline` | Pipeline completa dati |
| `make download` | Solo download dataset |
| `make process` | Solo elaborazione dati |
| `make sync` | Sincronizza dati → website |
| `make db-info` | Info database |
| `make status` | Stato piattaforma |
| `make cron-install` | Installa job cron settimanale |

## 🗄️ Database Star Schema

Il database segue uno star schema per analisi ottimizzata:

### Dimensioni
- **dim_nil**: 88 NIL (Nuclei Identità Locale) di Milano
- **dim_tempo**: Anni dei dataset

### Fact Tables
- **fact_demografia**: Popolazione, stranieri, famiglie
- **fact_immobiliare**: Nuovi fabbricati, abitazioni
- **fact_servizi**: Scuole, mercati, verde urbano

### Viste API
- `vw_api_nil` - Dati completi NIL
- `vw_api_servizi_nil` - Servizi per NIL
- `vw_api_ambiente_nil` - Dati ambientali
- `vw_api_mobilita_nil` - Dati mobilità

## 🌐 API Endpoints

### Quartieri e Prezzi
- `GET /api/quartieri` - Lista quartieri con prezzi
- `GET /api/quartieri/:id/timeseries` - Serie storica prezzi
- `GET /api/stats/milano` - Statistiche generali

### NIL (Star Schema)
- `GET /api/star-schema/nil` - Lista NIL
- `GET /api/star-schema/nil/:id/complete` - Dati completi NIL
- `GET /api/nil/:id/servizi` - Servizi NIL
- `GET /api/nil/:id/ambiente` - Dati ambientali NIL
- `GET /api/nil/:id/mobilita` - Dati mobilità NIL

### Dati e Metadati
- `GET /api/data/freshness` - Freschezza dati
- `GET /api/data/catalog` - Catalogo dataset
- `GET /api/timeline/demografico` - Timeline demografica

## 🤖 Automazione

### Schedulazione Cron

```bash
# Installa job cron (lunedì 2:00 AM)
make cron-install

# Rimuovi job cron
make cron-remove

# Verifica
crontab -l
```

### Esecuzione Manuale

```bash
# Script completo con log
./data_pipeline/scripts/run_full_pipeline.sh

# Con opzioni
./data_pipeline/scripts/run_full_pipeline.sh --skip-download
./data_pipeline/scripts/run_full_pipeline.sh --only-sync
./data_pipeline/scripts/run_full_pipeline.sh --dry-run
```

## 📦 Dataset Integrati

| Categoria | Dataset |
|-----------|---------|
| Base geografica | NIL confini PGT 2030, Sezioni censimento |
| Demografia | Caratteristiche quartieri 2011-2021, Iscrizioni/Cancellazioni |
| Stock abitativo | Nuovi fabbricati residenziali 2010-2023 |
| Qualità ambientale | Verde urbano, Esposizione calore |
| Servizi | Farmacie, Medici MMG, Mercati |
| Istruzione | Edifici scolastici |
| Mobilità | Mezzi trasporto, Spostamenti |
| Prezzi | Quotazioni OMI, Indice prezzi abitazioni |

## 🔧 Configurazione

### Variabili Ambiente (.env)

```bash
# Copia esempio
cp website/.env.example website/.env

# Configura
VITE_MAPBOX_TOKEN=pk.eyJ1...
VITE_API_BASE_URL=http://localhost:3001/api
PORT=3001
DB_PATH=/path/to/db/milano_unified.db
```

## 📈 Monitoraggio

```bash
# Ultimi log
make logs

# Info database
make db-info

# Stato completo
make status

# Report qualità
open reports/data_quality_report.html
```

## 🧪 Test

```bash
npm run export:static-api
git add website/public/data-api

make test

# Test API
make test-api
```

## 📚 Origine Dati

- [Open Data Milano](https://dati.comune.milano.it/) - Dataset ufficiali Comune di Milano
- [Agenzia delle Entrate OMI](https://www.agenziaentrate.gov.it/) - Quotazioni immobiliari

## 📄 Licenza

Dati: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (Open Data Milano)
