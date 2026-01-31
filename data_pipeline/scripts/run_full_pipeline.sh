#!/bin/bash
# ============================================================================
# run_full_pipeline.sh
# Pipeline completa automatica per Milano Platform
#
# Esegue:
# 1. Download dataset da Open Data Milano
# 2. Elaborazione e pulizia dati
# 3. Creazione star schema
# 4. Sincronizzazione con database website
# 5. Generazione report qualità
#
# Uso:
#   ./run_full_pipeline.sh                    # Esecuzione completa
#   ./run_full_pipeline.sh --skip-download    # Usa dati già scaricati
#   ./run_full_pipeline.sh --only-sync        # Solo sincronizzazione
#   ./run_full_pipeline.sh --dry-run          # Mostra operazioni
# ============================================================================

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
PIPELINE_DIR="$PROJECT_ROOT/data_pipeline"
LOGS_DIR="$PROJECT_ROOT/logs"
DB_PATH="$PROJECT_ROOT/db/milano_unified.db"

# Timestamp per log
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="$LOGS_DIR/pipeline_${TIMESTAMP}.log"

# Flags
SKIP_DOWNLOAD=false
ONLY_SYNC=false
ONLY_REPORT=false
DRY_RUN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-download)
            SKIP_DOWNLOAD=true
            shift
            ;;
        --only-sync)
            ONLY_SYNC=true
            shift
            ;;
        --only-report)
            ONLY_REPORT=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opzioni]"
            echo ""
            echo "Opzioni:"
            echo "  --skip-download  Salta download, usa dati esistenti"
            echo "  --only-sync      Esegue solo sincronizzazione DB"
            echo "  --only-report    Genera solo report qualità"
            echo "  --dry-run        Mostra operazioni senza eseguire"
            echo "  --verbose, -v    Output dettagliato"
            echo "  --help, -h       Mostra questo messaggio"
            exit 0
            ;;
        *)
            echo "Opzione sconosciuta: $1"
            exit 1
            ;;
    esac
done

# Funzioni di log
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1"
    echo -e "${RED}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Crea directory logs se non esiste
mkdir -p "$LOGS_DIR"

# Header
header "MILANO PLATFORM - PIPELINE AUTOMATICA"
log "Avvio pipeline: $TIMESTAMP"
log "Log file: $LOG_FILE"
log "Database: $DB_PATH"

# Attiva virtual environment se esiste
if [ -f "$PIPELINE_DIR/.venv/bin/activate" ]; then
    source "$PIPELINE_DIR/.venv/bin/activate"
    log "Virtual environment attivato"
elif [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
    log "Virtual environment attivato"
fi

# Track timing
START_TIME=$(date +%s)

# ============================================================================
# STEP 1: DOWNLOAD
# ============================================================================
if [ "$ONLY_SYNC" = false ] && [ "$ONLY_REPORT" = false ]; then
    if [ "$SKIP_DOWNLOAD" = false ]; then
        header "STEP 1/4: DOWNLOAD DATASET"
        
        if [ "$DRY_RUN" = true ]; then
            log "[DRY-RUN] python scripts/download_core.py"
        else
            cd "$PIPELINE_DIR"
            if python3 scripts/download_core.py 2>&1 | tee -a "$LOG_FILE"; then
                success "Download completato"
            else
                error "Errore durante download"
                # Continua comunque
            fi
        fi
    else
        log "STEP 1/4: Download saltato (--skip-download)"
    fi
fi

# ============================================================================
# STEP 2: ELABORAZIONE
# ============================================================================
if [ "$ONLY_SYNC" = false ] && [ "$ONLY_REPORT" = false ]; then
    header "STEP 2/4: ELABORAZIONE DATI"
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY-RUN] python scripts/process_core.py --db $DB_PATH"
    else
        cd "$PIPELINE_DIR"
        
        # Process core
        if python3 scripts/process_core.py --db "$DB_PATH" 2>&1 | tee -a "$LOG_FILE"; then
            success "Elaborazione dati completata"
        else
            error "Errore durante elaborazione"
        fi
        
        # Build star schema
        log "Costruzione star schema..."
        if python3 scripts/build_star_schema.py --db "$DB_PATH" 2>&1 | tee -a "$LOG_FILE"; then
            success "Star schema costruito"
        else
            warning "Star schema non completato (alcuni dati potrebbero mancare)"
        fi
        
        # Build master geo (se esiste)
        if [ -f "scripts/build_master_geo.py" ]; then
            log "Costruzione master geo dataset..."
            python3 scripts/build_master_geo.py --db "$DB_PATH" 2>&1 | tee -a "$LOG_FILE" || true
        fi
    fi
fi

# ============================================================================
# STEP 3: SINCRONIZZAZIONE
# ============================================================================
if [ "$ONLY_REPORT" = false ]; then
    header "STEP 3/4: SINCRONIZZAZIONE → WEBSITE"
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY-RUN] python scripts/sync_to_website.py --verbose"
    else
        cd "$PIPELINE_DIR"
        if python3 scripts/sync_to_website.py --verbose 2>&1 | tee -a "$LOG_FILE"; then
            success "Sincronizzazione completata"
        else
            error "Errore durante sincronizzazione"
        fi
    fi
fi

# ============================================================================
# STEP 4: REPORT QUALITÀ
# ============================================================================
header "STEP 4/4: REPORT QUALITÀ"

if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] python scripts/generate_quality_report.py --db $DB_PATH"
else
    cd "$PIPELINE_DIR"
    if [ -f "scripts/generate_quality_report.py" ]; then
        if python3 scripts/generate_quality_report.py --db "$DB_PATH" 2>&1 | tee -a "$LOG_FILE"; then
            success "Report qualità generato"
        else
            warning "Report qualità non generato"
        fi
    else
        log "Script report qualità non trovato, skip"
    fi
fi

# ============================================================================
# RIEPILOGO
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
header "RIEPILOGO PIPELINE"

echo -e "${GREEN}Durata totale:${NC} ${MINUTES}m ${SECONDS}s"
echo ""

# Statistiche database
if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo -e "${GREEN}Database:${NC} $DB_PATH"
    echo -e "${GREEN}Dimensione:${NC} $DB_SIZE"
    echo ""
    
    echo -e "${YELLOW}Tabelle:${NC}"
    sqlite3 "$DB_PATH" ".tables" 2>/dev/null | head -5
    echo "..."
    echo ""
    
    echo -e "${YELLOW}Star Schema:${NC}"
    sqlite3 "$DB_PATH" "SELECT 'dim_nil: ' || COUNT(*) FROM dim_nil;" 2>/dev/null || echo "  N/A"
    sqlite3 "$DB_PATH" "SELECT 'fact_demografia: ' || COUNT(*) FROM fact_demografia;" 2>/dev/null || echo "  N/A"
    sqlite3 "$DB_PATH" "SELECT 'fact_servizi: ' || COUNT(*) FROM fact_servizi;" 2>/dev/null || echo "  N/A"
fi

echo ""
success "Pipeline completata!"
echo ""
echo -e "Log completo: ${CYAN}$LOG_FILE${NC}"
echo -e "Per avviare il sito: ${CYAN}cd $PROJECT_ROOT && make dev${NC}"
echo ""
