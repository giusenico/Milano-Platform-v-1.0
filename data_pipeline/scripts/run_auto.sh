#!/bin/bash
#
# Script di automazione pipeline Api_Milano_Core
# Può essere eseguito da cron per aggiornamenti periodici
#
# Uso:
#   ./scripts/run_auto.sh              # Esecuzione completa
#   ./scripts/run_auto.sh --skip-download  # Senza download
#

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory del progetto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
VENV_DIR="$(dirname "$PROJECT_DIR")/.venv"

# Crea directory log se non esiste
mkdir -p "$LOG_DIR"

# Timestamp per log
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/pipeline_${TIMESTAMP}.log"

# Funzione di log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Inizio
log "========================================="
log "🚀 Avvio pipeline automatica Api_Milano_Core"
log "========================================="
log "Log file: $LOG_FILE"

# Verifica virtual environment
if [ ! -d "$VENV_DIR" ]; then
    log_error "Virtual environment non trovato: $VENV_DIR"
    exit 1
fi

# Attiva virtual environment
log "Attivazione virtual environment..."
source "${VENV_DIR}/bin/activate"

# Verifica Python
PYTHON_VERSION=$(python --version 2>&1)
log "Python version: $PYTHON_VERSION"

# Cambia directory
cd "$PROJECT_DIR"
log "Directory di lavoro: $(pwd)"

# Esegui pipeline con parametri passati allo script
log "Esecuzione pipeline..."
log "Parametri: $@"

if python scripts/run_pipeline.py "$@" >> "$LOG_FILE" 2>&1; then
    log_success "Pipeline completata con successo!"
    
    # Statistiche database
    if [ -f "db/nil_core.db" ]; then
        DB_SIZE=$(ls -lh db/nil_core.db | awk '{print $5}')
        log_success "Database aggiornato (dimensione: $DB_SIZE)"
    fi
    
    # Statistiche dataset
    NUM_DATASETS=$(find data_raw -type f \( -name "*.csv" -o -name "*.geojson" \) | wc -l | tr -d ' ')
    log_success "Dataset scaricati: $NUM_DATASETS"
    
    # Report qualità
    if [ -f "reports/quality_report.html" ]; then
        log_success "Report qualità generato: reports/quality_report.html"
    fi
    
    exit 0
else
    log_error "Pipeline fallita! Controlla il log: $LOG_FILE"
    
    # Invia notifica (opzionale - decommentare se serve)
    # echo "Pipeline Api_Milano_Core fallita!" | mail -s "ERRORE Pipeline" your@email.com
    
    exit 1
fi
