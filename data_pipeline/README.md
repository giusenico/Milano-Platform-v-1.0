# Milano Platform - Data Pipeline

Pipeline automatica per il download, elaborazione e aggiornamento dei dati da Milano Open Data.

## 🎯 Obiettivo

Rendere Milano Platform **completamente autonomo** nell'aggiornamento del database, senza dipendere da progetti esterni come Api_Milano_Core.

## 📁 Struttura

```
data_pipeline/
├── config/
│   └── datasets_core.json      # Configurazione dataset da scaricare
├── data_raw/                   # Dati grezzi scaricati
│   ├── 00_anagrafica/
│   ├── 01_abitazioni/
│   ├── ...
│   └── 14_sicurezza/
├── data_clean/                 # Dati elaborati
├── db/
│   └── nil_core.db            # Database pipeline
├── logs/                       # Log delle esecuzioni
├── reports/                    # Report qualità dati
└── scripts/
    ├── update_database.py      # 🔹 Script principale
    ├── scheduler_setup.py      # 🔹 Setup aggiornamento automatico
    ├── download_core.py        # Download da API
    ├── process_core.py         # Elaborazione dati
    ├── build_star_schema.py    # Costruzione star schema
    ├── sync_to_website.py      # Sync con database website
    └── run_pipeline.py         # Orchestratore pipeline
```

## 🚀 Quick Start

### 1. Setup Ambiente

```bash
cd /path/to/Milano_Platform
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r data_pipeline/requirements.txt
```

### 2. Esegui Aggiornamento Manuale

```bash
# Aggiornamento completo
python data_pipeline/scripts/update_database.py

# Solo verifica aggiornamenti disponibili
python data_pipeline/scripts/update_database.py --check-updates

# Forza riscaricamento
python data_pipeline/scripts/update_database.py --force

# Solo una categoria specifica
python data_pipeline/scripts/update_database.py --category 10_cultura_musei
```

### 3. Configura Aggiornamento Automatico

```bash
# Installa (macOS usa launchd, Linux usa cron)
python data_pipeline/scripts/scheduler_setup.py install

# Verifica stato
python data_pipeline/scripts/scheduler_setup.py status

# Rimuovi scheduler
python data_pipeline/scripts/scheduler_setup.py uninstall

# Esegui subito
python data_pipeline/scripts/scheduler_setup.py run-now
```

## 📊 Dataset Configurati

La pipeline scarica **48+ dataset** organizzati in **15 categorie**:

| ID | Categoria | Descrizione |
|----|-----------|-------------|
| 00 | anagrafica | Dati demografici NIL |
| 01 | abitazioni | Mercato immobiliare |
| 02 | ambiente | Verde, inquinamento |
| 03 | servizi | Farmacie, uffici pubblici |
| 04 | istruzione | Scuole, asili |
| 05 | mobilita | Strade, parcheggi, bike sharing |
| 06 | salute | Ospedali, ambulatori |
| 07 | sociale | Centri anziani, assistenza |
| 08 | urbanistica | Piani urbanistici |
| 09 | lavori_pubblici | Interventi, cantieri |
| 10 | cultura_musei | Musei, architetture storiche |
| 11 | biblioteche | Sistema bibliotecario |
| 12 | turismo | Agriturismi, punti interesse |
| 13 | economia_commercio | Botteghe storiche, mercati |
| 14 | sicurezza | Beni confiscati alla mafia |

## ⚙️ Configurazione Dataset

I dataset sono configurati in `config/datasets_core.json`:

```json
{
  "version": "2.0",
  "datasets": [
    {
      "category": "10_cultura_musei",
      "id": "ds1371-musei-civici-localizzazioni",
      "resource_id": "abc123...",
      "filename": "musei_civici.geojson",
      "format": "geojson",
      "url": "https://dati.comune.milano.it/..."
    }
  ]
}
```

### Aggiungere un Nuovo Dataset

1. Trova il dataset su [dati.comune.milano.it](https://dati.comune.milano.it)
2. Copia l'ID del dataset e del resource
3. Aggiungi l'entry in `datasets_core.json`
4. Esegui `python update_database.py --force`

## 🗄️ Database

La pipeline produce due database:

1. **nil_core.db** (`data_pipeline/db/`)
   - Database di lavoro della pipeline
   - Contiene tutte le tabelle raw e elaborate

2. **milano_unified.db** (`db/`)
   - Database unificato per il website
   - Contiene star schema ottimizzato
   - Viste API per il frontend

### Tabelle Principali

```sql
-- Dimensioni
dim_nil           -- 88 NIL di Milano
dim_tempo         -- Dimensione temporale
dim_categoria     -- Categorie servizi

-- Fatti
fact_popolazione  -- Dati demografici
fact_servizi      -- Servizi per NIL
fact_ambiente     -- Indicatori ambientali

-- Viste API
vw_api_nil        -- NIL con aggregati
vw_api_servizi    -- Servizi geolocalizzati
vw_api_ambiente   -- Dati ambientali
```

## 📅 Scheduling

L'aggiornamento automatico viene eseguito **ogni giorno alle 03:00**.

### macOS (launchd)

```bash
# Il plist viene installato in:
~/Library/LaunchAgents/com.milanoplatform.updatedb.plist

# Comandi utili
launchctl list | grep milano
launchctl unload ~/Library/LaunchAgents/com.milanoplatform.updatedb.plist
```

### Linux (cron)

```bash
# Visualizza crontab
crontab -l

# La entry sarà simile a:
# 0 3 * * * cd /path/to/Milano_Platform && python data_pipeline/scripts/update_database.py
```

## 📝 Log

I log vengono salvati in `logs/`:

- `update_YYYYMMDD.log` - Log giornaliero
- `launchd_stdout.log` - Output launchd (macOS)
- `last_update_summary.json` - Riepilogo ultimo aggiornamento

## 🔧 Troubleshooting

### Errore Download

```bash
# Verifica connettività API
curl "https://dati.comune.milano.it/api/3/action/package_list?limit=1"

# Prova download singolo
python data_pipeline/scripts/download_core.py --dataset-id ds1234
```

### Database Corrotto

```bash
# Ricrea database da zero
rm data_pipeline/db/nil_core.db
rm db/milano_unified.db
python data_pipeline/scripts/update_database.py --force
```

### Scheduler Non Funziona

```bash
# macOS: verifica
launchctl list | grep milano
cat ~/Library/LaunchAgents/com.milanoplatform.updatedb.plist

# Reinstalla
python data_pipeline/scripts/scheduler_setup.py uninstall
python data_pipeline/scripts/scheduler_setup.py install
```

## 📚 API Milano Open Data

La pipeline usa l'API CKAN di Milano Open Data:

- **Base URL**: `https://dati.comune.milano.it/api/3/action`
- **Documentazione**: [dati.comune.milano.it](https://dati.comune.milano.it)

### Endpoint Utili

```bash
# Lista dataset
GET /package_list

# Dettagli dataset
GET /package_show?id=<dataset_id>

# Ricerca
GET /package_search?q=<query>
```

## 🔄 Flusso Pipeline

```
┌────────────────────────────────────────────────────────────┐
│                    update_database.py                       │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  1. download_core.py                                       │
│     - Legge datasets_core.json                             │
│     - Scarica da Milano Open Data API                      │
│     - Salva in data_raw/<categoria>/                       │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  2. process_core.py                                        │
│     - Scopre file in data_raw/                             │
│     - Pulisce e normalizza dati                            │
│     - Carica in nil_core.db                                │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  3. build_star_schema.py                                   │
│     - Costruisce dimensioni                                │
│     - Costruisce tabelle dei fatti                         │
│     - Ottimizza per analytics                              │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  4. sync_to_website.py                                     │
│     - Crea viste API ottimizzate                           │
│     - Sincronizza con milano_unified.db                    │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                    🎉 Database Aggiornato!                 │
│                                                            │
│  - nil_core.db: database pipeline                          │
│  - milano_unified.db: database website                     │
└────────────────────────────────────────────────────────────┘
```

## 📈 Roadmap

- [ ] Notifiche email/Slack su errori
- [ ] Dashboard monitoraggio aggiornamenti
- [ ] Backup automatico pre-aggiornamento
- [ ] Validazione qualità dati più avanzata
- [ ] API interna per trigger manuale da web
