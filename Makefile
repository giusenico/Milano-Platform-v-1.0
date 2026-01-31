# ============================================================================
# Milano Platform - Makefile
# ============================================================================
# Comandi unificati per gestire la piattaforma dati Milano
#
# Uso:
#   make help          - Mostra tutti i comandi disponibili
#   make install       - Installa tutte le dipendenze
#   make dev           - Avvia frontend + backend in sviluppo
#   make sync          - Sincronizza dati da pipeline a website
#   make pipeline      - Esegue pipeline completa (download + process + sync)
#   make all           - Esegue tutto: install, pipeline, sync
# ============================================================================

.PHONY: help install dev build pipeline download process sync clean test logs

# Variabili
PROJECT_ROOT := $(shell pwd)
WEBSITE_DIR := $(PROJECT_ROOT)/website
SERVER_DIR := $(PROJECT_ROOT)/server
PIPELINE_DIR := $(PROJECT_ROOT)/data_pipeline
DB_PATH := $(PROJECT_ROOT)/db/milano_unified.db
PYTHON := python3
NODE := node
NPM := npm

# Colori per output
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
RED := \033[0;31m
NC := \033[0m

# ============================================================================
# HELP
# ============================================================================

help:
	@echo ""
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║         Milano Platform - Comandi Disponibili              ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)INSTALLAZIONE:$(NC)"
	@echo "  make install        Installa dipendenze Python e Node.js"
	@echo "  make install-python Installa solo dipendenze Python"
	@echo "  make install-node   Installa solo dipendenze Node.js"
	@echo ""
	@echo "$(GREEN)SVILUPPO:$(NC)"
	@echo "  make dev            Avvia frontend + backend (sviluppo)"
	@echo "  make dev-frontend   Avvia solo frontend Vite"
	@echo "  make dev-server     Avvia solo backend Express"
	@echo "  make build          Build produzione frontend"
	@echo ""
	@echo "$(GREEN)PIPELINE DATI:$(NC)"
	@echo "  make pipeline       Pipeline completa (download → process → sync)"
	@echo "  make download       Solo download dataset Open Data Milano"
	@echo "  make process        Solo elaborazione dati (pulizia + star schema)"
	@echo "  make sync           Sincronizza dati → database website"
	@echo "  make report         Genera report qualità dati"
	@echo ""
	@echo "$(GREEN)MANUTENZIONE:$(NC)"
	@echo "  make clean          Pulisce cache e file temporanei"
	@echo "  make clean-logs     Pulisce log vecchi (>30 giorni)"
	@echo "  make db-info        Mostra info database"
	@echo "  make test           Esegue test"
	@echo "  make logs           Mostra ultimi log pipeline"
	@echo ""
	@echo "$(GREEN)AUTOMAZIONE:$(NC)"
	@echo "  make cron-install   Installa job cron giornaliero (03:00)"
	@echo "  make cron-remove    Rimuove job cron"
	@echo ""

# ============================================================================
# INSTALLAZIONE
# ============================================================================

install: install-python install-node
	@echo "$(GREEN)✓ Installazione completata!$(NC)"

install-python:
	@echo "$(BLUE)→ Installazione dipendenze Python...$(NC)"
	@cd $(PIPELINE_DIR) && $(PYTHON) -m pip install -r requirements.txt --quiet
	@echo "$(GREEN)✓ Dipendenze Python installate$(NC)"

install-node:
	@echo "$(BLUE)→ Installazione dipendenze Node.js...$(NC)"
	@cd $(WEBSITE_DIR) && $(NPM) install --silent
	@echo "$(GREEN)✓ Dipendenze Node.js installate$(NC)"

# ============================================================================
# SVILUPPO
# ============================================================================

dev:
	@echo "$(BLUE)→ Avvio sviluppo (frontend + backend)...$(NC)"
	@cd $(WEBSITE_DIR) && $(NPM) run dev:full

dev-frontend:
	@echo "$(BLUE)→ Avvio frontend Vite...$(NC)"
	@cd $(WEBSITE_DIR) && $(NPM) run dev

dev-server:
	@echo "$(BLUE)→ Avvio backend Express...$(NC)"
	@cd $(WEBSITE_DIR) && $(NPM) run server

build:
	@echo "$(BLUE)→ Build produzione...$(NC)"
	@cd $(WEBSITE_DIR) && $(NPM) run build
	@echo "$(GREEN)✓ Build completato in $(WEBSITE_DIR)/dist$(NC)"

# ============================================================================
# PIPELINE DATI
# ============================================================================

pipeline: download process sync
	@echo "$(GREEN)✓ Pipeline completa eseguita!$(NC)"

download:
	@echo "$(BLUE)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  DOWNLOAD DATASET OPEN DATA MILANO     ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════╝$(NC)"
	@cd $(PIPELINE_DIR) && $(PYTHON) scripts/download_core.py
	@echo "$(GREEN)✓ Download completato$(NC)"

process:
	@echo "$(BLUE)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  ELABORAZIONE DATI                     ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════╝$(NC)"
	@cd $(PIPELINE_DIR) && $(PYTHON) scripts/process_core.py --db $(DB_PATH)
	@cd $(PIPELINE_DIR) && $(PYTHON) scripts/build_star_schema.py --db $(DB_PATH)
	@echo "$(GREEN)✓ Elaborazione completata$(NC)"

sync:
	@echo "$(BLUE)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  SYNC DATI → WEBSITE                   ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════╝$(NC)"
	@cd $(PIPELINE_DIR) && $(PYTHON) scripts/sync_to_website.py --verbose
	@echo "$(GREEN)✓ Sincronizzazione completata$(NC)"

report:
	@echo "$(BLUE)→ Generazione report qualità dati...$(NC)"
	@cd $(PIPELINE_DIR) && $(PYTHON) scripts/generate_quality_report.py --db $(DB_PATH)
	@echo "$(GREEN)✓ Report generato in $(PROJECT_ROOT)/reports/$(NC)"

# Pipeline con skip download (usa dati già scaricati)
process-only: process sync
	@echo "$(GREEN)✓ Elaborazione senza download completata$(NC)"

# ============================================================================
# DATABASE
# ============================================================================

db-info:
	@echo "$(BLUE)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  INFO DATABASE                         ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Percorso:$(NC) $(DB_PATH)"
	@echo "$(YELLOW)Dimensione:$(NC) $$(du -h $(DB_PATH) | cut -f1)"
	@echo ""
	@echo "$(YELLOW)Tabelle:$(NC)"
	@sqlite3 $(DB_PATH) ".tables" | tr ' ' '\n' | grep -v '^$$' | wc -l | xargs echo "  Totale:"
	@echo ""
	@echo "$(YELLOW)Star Schema:$(NC)"
	@sqlite3 $(DB_PATH) "SELECT 'dim_nil: ' || COUNT(*) FROM dim_nil;" 2>/dev/null || echo "  dim_nil: N/A"
	@sqlite3 $(DB_PATH) "SELECT 'dim_tempo: ' || COUNT(*) FROM dim_tempo;" 2>/dev/null || echo "  dim_tempo: N/A"
	@sqlite3 $(DB_PATH) "SELECT 'fact_demografia: ' || COUNT(*) FROM fact_demografia;" 2>/dev/null || echo "  fact_demografia: N/A"
	@echo ""

db-tables:
	@sqlite3 $(DB_PATH) ".tables"

db-schema:
	@sqlite3 $(DB_PATH) ".schema" | head -100

# ============================================================================
# MANUTENZIONE
# ============================================================================

clean:
	@echo "$(BLUE)→ Pulizia cache e file temporanei...$(NC)"
	@find $(PROJECT_ROOT) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find $(PROJECT_ROOT) -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find $(PROJECT_ROOT) -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf $(WEBSITE_DIR)/dist 2>/dev/null || true
	@echo "$(GREEN)✓ Pulizia completata$(NC)"

clean-logs:
	@echo "$(BLUE)→ Rimozione log vecchi (>30 giorni)...$(NC)"
	@find $(PROJECT_ROOT)/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Log vecchi rimossi$(NC)"

logs:
	@echo "$(BLUE)Ultimi log pipeline:$(NC)"
	@ls -lt $(PROJECT_ROOT)/logs/*.log 2>/dev/null | head -5 || echo "Nessun log trovato"
	@echo ""
	@echo "$(YELLOW)Ultimo log:$(NC)"
	@tail -30 $$(ls -t $(PROJECT_ROOT)/logs/*.log 2>/dev/null | head -1) 2>/dev/null || echo "Nessun log disponibile"

# ============================================================================
# TEST
# ============================================================================

test:
	@echo "$(BLUE)→ Esecuzione test...$(NC)"
	@cd $(PROJECT_ROOT) && $(PYTHON) -m pytest tests/ -v

test-pipeline:
	@echo "$(BLUE)→ Test pipeline...$(NC)"
	@cd $(PROJECT_ROOT) && $(PYTHON) -m pytest tests/test_pipeline.py -v

test-api:
	@echo "$(BLUE)→ Test API endpoints...$(NC)"
	@cd $(PROJECT_ROOT) && $(PYTHON) -m pytest tests/test_api.py -v

test-quick:
	@echo "$(BLUE)→ Test rapido (solo smoke tests)...$(NC)"
	@cd $(PROJECT_ROOT) && $(PYTHON) -m pytest tests/ -v -m smoke

# ============================================================================
# AUTOMAZIONE CRON
# ============================================================================

# Schedule: giornaliero alle 03:00 (Europe/Rome)
CRON_CMD := 0 3 * * * cd $(PROJECT_ROOT) && make pipeline >> $(PROJECT_ROOT)/logs/cron_$$(date +\%Y\%m\%d).log 2>&1

cron-install:
	@echo "$(BLUE)→ Installazione job cron giornaliero (03:00 AM)...$(NC)"
	@(crontab -l 2>/dev/null | grep -v "Milano_Platform"; echo "$(CRON_CMD)") | crontab -
	@echo "$(GREEN)✓ Job cron installato$(NC)"
	@echo ""
	@echo "$(YELLOW)Verifica con:$(NC) crontab -l"

cron-remove:
	@echo "$(BLUE)→ Rimozione job cron...$(NC)"
	@crontab -l 2>/dev/null | grep -v "Milano_Platform" | crontab - || true
	@echo "$(GREEN)✓ Job cron rimosso$(NC)"

# ============================================================================
# UTILITY
# ============================================================================

# Aggiornamento completo
all: install pipeline
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║  INSTALLAZIONE COMPLETA!               ║$(NC)"
	@echo "$(GREEN)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "Per avviare il sito: $(YELLOW)make dev$(NC)"
	@echo ""

# Verifica stato
status:
	@echo "$(BLUE)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  STATO PIATTAFORMA                     ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@test -f $(DB_PATH) && echo "  ✓ $(DB_PATH) esiste" || echo "  ✗ Database non trovato"
	@test -f $(DB_PATH) && echo "  Dimensione: $$(du -h $(DB_PATH) | cut -f1)"
	@echo ""
	@echo "$(YELLOW)Node modules:$(NC)"
	@test -d $(WEBSITE_DIR)/node_modules && echo "  ✓ Installati" || echo "  ✗ Non installati (esegui make install)"
	@echo ""
	@echo "$(YELLOW)Data freshness:$(NC)"
	@sqlite3 $(DB_PATH) "SELECT source_name, last_sync FROM data_freshness LIMIT 5;" 2>/dev/null || echo "  N/A"
	@echo ""
