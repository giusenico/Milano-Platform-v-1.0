#!/usr/bin/env python3
"""
Modulo utility condiviso per Api_Milano_Core.

Contiene funzioni comuni per:
- Configurazione paths
- Logging strutturato
- Caricamento config
- Validazione dati
"""

from __future__ import annotations

import json
import logging
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, TypeVar

try:
    from rich.console import Console
    from rich.logging import RichHandler
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

# ─────────────────────────────────────────────────────────────────────────────
# Costanti progetto
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
DATA_RAW_DIR = PROJECT_ROOT / "data_raw"
DATA_CLEAN_DIR = PROJECT_ROOT / "data_clean"
DB_DIR = PROJECT_ROOT / "db"
LOGS_DIR = PROJECT_ROOT / "logs"
REPORTS_DIR = PROJECT_ROOT / "reports"

DEFAULT_DB_PATH = DB_DIR / "nil_core.db"
DATASETS_CONFIG_PATH = CONFIG_DIR / "datasets_core.json"
PIPELINE_CONFIG_PATH = CONFIG_DIR / "pipeline.json"

# Column normalization hints
IDENTIFIER_HINTS = ("id", "cod", "codice", "istat", "cap", "civico")
DATE_HINTS = ("data", "date")
YEAR_HINTS = ("anno", "year")
GEOMETRY_COLUMN = "_geometry"

# Console per output colorato
console = Console() if RICH_AVAILABLE else None


# ─────────────────────────────────────────────────────────────────────────────
# Dataclasses
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CoreDataset:
    """Rappresenta un singolo dataset core."""
    category: str
    id: str
    resource_id: str
    filename: str
    format: str
    description: str
    url: str
    as_of_year: Optional[int] = None


@dataclass
class PipelineConfig:
    """Configurazione pipeline."""
    project_name: str = "Api_Milano_Core"
    data_raw_dir: str = "data_raw"
    data_clean_dir: str = "data_clean"
    db_path: str = "db/nil_core.db"
    metadata_filename: str = "metadata_download.json"
    core_config: str = "config/datasets_core.json"
    log_dir: str = "logs"
    reports_dir: str = "reports"


@dataclass
class ProcessingResult:
    """Risultato del processing di un dataset."""
    filename: str
    table_name: str
    status: str  # "success", "error", "skipped"
    rows: int = 0
    columns: int = 0
    error_message: str = ""
    processing_time_ms: float = 0.0
    warnings: List[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """Risultato validazione dati."""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

def setup_logger(
    name: str,
    log_dir: Optional[Path] = None,
    verbose: bool = False,
    use_rich: bool = True,
) -> logging.Logger:
    """
    Configura un logger con output console e file.
    
    Args:
        name: Nome del logger
        log_dir: Directory per file di log (default: LOGS_DIR)
        verbose: Se True, imposta livello DEBUG
        use_rich: Se True e disponibile, usa RichHandler per output colorato
    
    Returns:
        Logger configurato
    """
    log_dir = log_dir or LOGS_DIR
    log_dir.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger(name)
    
    # Evita duplicazione handler
    if logger.handlers:
        return logger
    
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.propagate = False
    
    # Formatter standard
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    if RICH_AVAILABLE and use_rich:
        console_handler = RichHandler(
            console=console,
            show_time=True,
            show_path=False,
            rich_tracebacks=True,
        )
        console_handler.setFormatter(logging.Formatter("%(message)s"))
    else:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
    
    console_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.addHandler(console_handler)
    
    # File handler
    log_file = log_dir / f"{name}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    
    return logger


# ─────────────────────────────────────────────────────────────────────────────
# Config loading
# ─────────────────────────────────────────────────────────────────────────────

def load_pipeline_config(config_path: Optional[Path] = None) -> PipelineConfig:
    """Carica configurazione pipeline."""
    config_path = config_path or PIPELINE_CONFIG_PATH
    
    if not config_path.exists():
        return PipelineConfig()
    
    with config_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    
    return PipelineConfig(**data)


def load_datasets_config(config_path: Optional[Path] = None) -> List[CoreDataset]:
    """Carica configurazione dataset core."""
    config_path = config_path or DATASETS_CONFIG_PATH
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file non trovato: {config_path}")
    
    with config_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    
    datasets = []
    for item in payload.get("datasets", []):
        datasets.append(CoreDataset(
            category=item["category"],
            id=item["id"],
            resource_id=item["resource_id"],
            filename=item["filename"],
            format=item.get("format", "csv"),
            description=item.get("description", ""),
            url=item["url"],
            as_of_year=item.get("as_of_year"),
        ))
    
    return datasets


# ─────────────────────────────────────────────────────────────────────────────
# String utilities
# ─────────────────────────────────────────────────────────────────────────────

def normalize_column_name(name: str) -> str:
    """
    Normalizza nome colonna per SQL/pandas.
    
    - Rimuove accenti
    - Converte in lowercase
    - Sostituisce caratteri speciali con underscore
    """
    name = unicodedata.normalize("NFKD", str(name))
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name or "col"


def normalize_nil_name(value: Any) -> str:
    """
    Normalizza nome NIL per confronti robusti.
    
    Gestisce:
    - Varianti di apostrofo (Unicode smart quotes vs ASCII)
    - Spazi dopo i punti (S.Vittore vs S. VITTORE)
    - Maiuscolo/minuscolo
    - Spazi multipli
    """
    if value is None:
        return ""
    text = str(value).strip().upper()
    # Sostituisci apostrofi Unicode con ASCII (U+2019, U+2018, U+0060)
    text = text.replace('\u2019', "'").replace('\u2018', "'").replace('\u0060', "'")
    # Normalizza spazi dopo i punti (es: "S.VITTORE" -> "S. VITTORE")
    text = re.sub(r'\.(\w)', r'. \1', text)
    # Rimuovi spazi multipli
    text = re.sub(r'\s+', ' ', text)
    return text


def sanitize_table_name(category: str, filename: str) -> str:
    """Genera nome tabella SQL da categoria e filename."""
    base = f"ds_{category}_{Path(filename).stem}"
    return normalize_column_name(base) or "dataset"


# ─────────────────────────────────────────────────────────────────────────────
# Date utilities
# ─────────────────────────────────────────────────────────────────────────────

def extract_year(value: Any) -> Optional[int]:
    """Estrae anno da un valore."""
    if value is None:
        return None
    
    if isinstance(value, (int, float)):
        try:
            year = int(value)
            if 1800 <= year <= 2100:
                return year
        except Exception:
            return None
    
    text = str(value)
    
    # Prova a estrarre da formato data
    for token in text.replace("/", "-").split("-"):
        token = token.strip()
        if token.isdigit() and len(token) == 4:
            year = int(token)
            if 1800 <= year <= 2100:
                return year
    
    # Prova a estrarre prime 4 cifre
    digits = "".join([c for c in text if c.isdigit()])
    if len(digits) >= 4:
        year = int(digits[:4])
        if 1800 <= year <= 2100:
            return year
    
    return None


def format_timestamp(dt: Optional[datetime] = None, iso: bool = True) -> str:
    """Formatta timestamp."""
    dt = dt or datetime.utcnow()
    if iso:
        return dt.isoformat() + "Z"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


# ─────────────────────────────────────────────────────────────────────────────
# Progress utilities
# ─────────────────────────────────────────────────────────────────────────────

T = TypeVar("T")


def create_progress() -> Optional[Progress]:
    """Crea progress bar se Rich è disponibile."""
    if not RICH_AVAILABLE:
        return None
    
    return Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    )


def print_success(message: str) -> None:
    """Stampa messaggio di successo."""
    if console:
        console.print(f"[green]✓[/green] {message}")
    else:
        print(f"✓ {message}")


def print_error(message: str) -> None:
    """Stampa messaggio di errore."""
    if console:
        console.print(f"[red]✗[/red] {message}")
    else:
        print(f"✗ {message}")


def print_warning(message: str) -> None:
    """Stampa messaggio di warning."""
    if console:
        console.print(f"[yellow]⚠[/yellow] {message}")
    else:
        print(f"⚠ {message}")


def print_info(message: str) -> None:
    """Stampa messaggio informativo."""
    if console:
        console.print(f"[blue]ℹ[/blue] {message}")
    else:
        print(f"ℹ {message}")


def print_header(title: str, char: str = "─") -> None:
    """Stampa header decorato."""
    width = 70
    if console:
        console.print(f"\n[bold blue]{char * width}[/bold blue]")
        console.print(f"[bold]{title}[/bold]")
        console.print(f"[bold blue]{char * width}[/bold blue]\n")
    else:
        print(f"\n{char * width}")
        print(title)
        print(f"{char * width}\n")


# ─────────────────────────────────────────────────────────────────────────────
# File utilities
# ─────────────────────────────────────────────────────────────────────────────

def ensure_directory(path: Path) -> Path:
    """Crea directory se non esiste e ritorna il path."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_file_size_kb(path: Path) -> float:
    """Ritorna dimensione file in KB."""
    if not path.exists():
        return 0.0
    return path.stat().st_size / 1024


def get_file_size_mb(path: Path) -> float:
    """Ritorna dimensione file in MB."""
    return get_file_size_kb(path) / 1024


# ─────────────────────────────────────────────────────────────────────────────
# Decoratori
# ─────────────────────────────────────────────────────────────────────────────

def log_execution_time(logger: logging.Logger):
    """Decoratore per loggare tempo di esecuzione."""
    import functools
    import time
    
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start
            logger.info(f"{func.__name__} completato in {elapsed:.2f}s")
            return result
        return wrapper
    return decorator
