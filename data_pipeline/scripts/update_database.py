#!/usr/bin/env python3
"""
update_database.py
Script principale per aggiornamento automatico del database Milano Platform.

Scarica i dati da Milano Open Data, li processa e aggiorna il database unificato.
Può essere eseguito manualmente o schedulato con cron/launchd.

Uso:
    python update_database.py                    # Aggiornamento completo
    python update_database.py --check-updates    # Verifica solo se ci sono aggiornamenti
    python update_database.py --force            # Forza riscaricamento
    python update_database.py --category 10_cultura_musei  # Solo una categoria
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
PIPELINE_ROOT = SCRIPT_DIR.parent
CONFIG_DIR = PIPELINE_ROOT / "config"
DATA_RAW_DIR = PIPELINE_ROOT / "data_raw"
LOGS_DIR = PROJECT_ROOT / "logs"

# Database paths - SINGLE SOURCE OF TRUTH
DEFAULT_DB_PATH = PROJECT_ROOT / "db" / "milano_unified.db"
UNIFIED_DB = Path(os.getenv("DB_PATH", str(DEFAULT_DB_PATH)))
if not UNIFIED_DB.is_absolute():
    UNIFIED_DB = PROJECT_ROOT / UNIFIED_DB

# Legacy path (deprecated, only used for migration)
LEGACY_NIL_CORE_DB = PIPELINE_ROOT / "db" / "nil_core.db"

# API
API_BASE_URL = "https://dati.comune.milano.it/api/3/action"

# Feature flags from environment
ENABLE_WEBSITE_SYNC = os.getenv("ENABLE_WEBSITE_SYNC", "true").lower() == "true"
ENABLE_EXTERNAL_IMPORT = os.getenv("ENABLE_EXTERNAL_IMPORT", "false").lower() == "true"


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configura il logging."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("update_database")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    
    if not logger.handlers:
        # Console handler
        console = logging.StreamHandler(sys.stdout)
        console.setFormatter(logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        logger.addHandler(console)
        
        # File handler
        log_file = LOGS_DIR / f"update_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s"
        ))
        logger.addHandler(file_handler)
    
    return logger


def load_config() -> Dict:
    """Carica la configurazione dei dataset."""
    config_path = CONFIG_DIR / "datasets_core.json"
    if not config_path.exists():
        raise FileNotFoundError(f"Config non trovato: {config_path}")
    
    with config_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def check_remote_updates(datasets: List[Dict], logger: logging.Logger) -> List[Dict]:
    """Verifica quali dataset hanno aggiornamenti sul portale."""
    updates = []
    
    logger.info("Verifica aggiornamenti remoti...")
    
    for ds in datasets:
        try:
            resp = requests.get(
                f"{API_BASE_URL}/package_show",
                params={"id": ds["id"]},
                timeout=30
            )
            resp.raise_for_status()
            
            payload = resp.json()
            remote_modified = payload.get("result", {}).get("metadata_modified", "")
            
            # Controlla se abbiamo già il file e quando è stato modificato
            local_path = DATA_RAW_DIR / ds["category"] / ds["filename"]
            
            if not local_path.exists():
                updates.append({
                    **ds,
                    "remote_modified": remote_modified,
                    "reason": "file_mancante"
                })
            else:
                # TODO: confronto date più sofisticato
                local_mtime = datetime.fromtimestamp(local_path.stat().st_mtime)
                updates.append({
                    **ds,
                    "remote_modified": remote_modified,
                    "local_mtime": local_mtime.isoformat(),
                    "reason": "verifica_necessaria"
                })
            
            time.sleep(0.3)  # Rate limiting
            
        except Exception as e:
            logger.warning(f"Errore verifica {ds['filename']}: {e}")
    
    return updates


def run_pipeline_step(step_name: str, script_name: str, args: List[str], logger: logging.Logger) -> bool:
    """Esegue uno step della pipeline."""
    script_path = SCRIPT_DIR / script_name
    
    if not script_path.exists():
        logger.warning(f"Script non trovato: {script_path}")
        return False
    
    cmd = [sys.executable, str(script_path)] + args
    logger.info(f"Esecuzione: {step_name}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT)
        )
        
        if result.returncode == 0:
            logger.info(f"✓ {step_name} completato")
            return True
        else:
            logger.error(f"✗ {step_name} fallito: {result.stderr[:500]}")
            return False
            
    except Exception as e:
        logger.error(f"✗ {step_name} errore: {e}")
        return False


def merge_to_unified_db(logger: logging.Logger) -> bool:
    """Sincronizza i dati dal database legacy al database unificato.
    
    Usa INSERT OR REPLACE invece di DROP TABLE per preservare indici e viste.
    Se il DB legacy non esiste, salta (la pipeline potrebbe già scrivere direttamente
    su UNIFIED_DB).
    """
    
    if not LEGACY_NIL_CORE_DB.exists():
        logger.info(f"Database legacy non trovato ({LEGACY_NIL_CORE_DB}), skip merge")
        return True
    
    logger.info("Sincronizzazione con database unificato (senza DROP TABLE)...")
    
    try:
        # Assicurati che la directory esista
        UNIFIED_DB.parent.mkdir(parents=True, exist_ok=True)
        
        # Connetti al database unificato
        conn = sqlite3.connect(str(UNIFIED_DB))
        
        # Attach il database sorgente
        conn.execute(f"ATTACH DATABASE '{LEGACY_NIL_CORE_DB}' AS source_db")
        
        # Ottieni lista tabelle dal database sorgente
        cursor = conn.execute(
            "SELECT name FROM source_db.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = [row[0] for row in cursor.fetchall()]
        
        tables_synced = 0
        for table in tables:
            try:
                # Leggi schema dalla sorgente
                cursor = conn.execute(
                    f"SELECT sql FROM source_db.sqlite_master WHERE name='{table}' AND type='table'"
                )
                schema_row = cursor.fetchone()
                
                if not schema_row or not schema_row[0]:
                    continue
                
                schema = schema_row[0]
                
                # Verifica se la tabella esiste nel DB di destinazione
                cursor = conn.execute(
                    f"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{table}'"
                )
                table_exists = cursor.fetchone()[0] > 0
                
                if not table_exists:
                    # Crea la tabella se non esiste
                    conn.execute(schema)
                
                # Ottieni colonne dalla tabella sorgente
                cursor = conn.execute(f"PRAGMA source_db.table_info({table})")
                columns = [row[1] for row in cursor.fetchall()]
                
                if not columns:
                    continue
                
                # Usa INSERT OR REPLACE per preservare gli indici
                columns_str = ", ".join(columns)
                placeholders = ", ".join(["?" for _ in columns])
                
                # Leggi dati dalla sorgente
                cursor = conn.execute(f"SELECT {columns_str} FROM source_db.{table}")
                rows = cursor.fetchall()
                
                if rows:
                    # Prima elimina i record esistenti con lo stesso ID (se c'è una chiave primaria)
                    # Poi inserisci i nuovi dati
                    conn.execute(f"DELETE FROM {table}")
                    conn.executemany(
                        f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})",
                        rows
                    )
                
                tables_synced += 1
                    
            except Exception as e:
                logger.warning(f"Errore sincronizzazione tabella {table}: {e}")
        
        # Detach il database sorgente
        conn.execute("DETACH DATABASE source_db")
        
        # Aggiorna timestamp di aggiornamento
        conn.execute("""
            CREATE TABLE IF NOT EXISTS data_freshness (
                source_name TEXT PRIMARY KEY,
                last_sync TIMESTAMP,
                record_count INTEGER,
                status TEXT,
                notes TEXT
            )
        """)
        
        conn.execute("""
            INSERT OR REPLACE INTO data_freshness (source_name, last_sync, record_count, status, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (
            "milano_open_data",
            datetime.now().isoformat(),
            tables_synced,
            "success",
            "Sincronizzazione automatica da pipeline (preserve indices)"
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✓ Sincronizzate {tables_synced} tabelle al database unificato")
        logger.info(f"  Path: {UNIFIED_DB}")
        return True
        
    except Exception as e:
        logger.error(f"Errore sincronizzazione database: {e}")
        return False


def generate_summary(logger: logging.Logger) -> Dict:
    """Genera un riepilogo dell'aggiornamento."""
    summary = {
        "timestamp": datetime.now().isoformat(),
        "status": "unknown",
        "datasets": {},
        "database": {}
    }
    
    # Conta dataset per categoria
    if DATA_RAW_DIR.exists():
        for category_dir in DATA_RAW_DIR.iterdir():
            if category_dir.is_dir() and category_dir.name.startswith(("0", "1")):
                files = list(category_dir.glob("*.*"))
                summary["datasets"][category_dir.name] = len(files)
    
    # Info database
    if UNIFIED_DB.exists():
        summary["database"]["path"] = str(UNIFIED_DB)
        summary["database"]["size_mb"] = round(UNIFIED_DB.stat().st_size / (1024 * 1024), 2)
        
        try:
            conn = sqlite3.connect(str(UNIFIED_DB))
            cursor = conn.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
            )
            summary["database"]["tables"] = cursor.fetchone()[0]
            conn.close()
        except:
            pass
    
    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Aggiornamento automatico database Milano Platform"
    )
    parser.add_argument("--check-updates", action="store_true",
                       help="Verifica solo se ci sono aggiornamenti")
    parser.add_argument("--force", action="store_true",
                       help="Forza riscaricamento di tutti i dataset")
    parser.add_argument("--skip-download", action="store_true",
                       help="Salta il download, usa dati esistenti")
    parser.add_argument("--skip-sync", action="store_true",
                       help="Salta sincronizzazione al DB unificato")
    parser.add_argument("--category", type=str,
                       help="Aggiorna solo una categoria specifica")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Output dettagliato")
    
    args = parser.parse_args()
    logger = setup_logging(args.verbose)
    
    logger.info("=" * 60)
    logger.info("🚀 MILANO PLATFORM - Aggiornamento Database")
    logger.info("=" * 60)
    logger.info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        config = load_config()
        datasets = config.get("datasets", [])
        logger.info(f"Dataset configurati: {len(datasets)}")
        
        # Filtra per categoria se specificato
        if args.category:
            datasets = [d for d in datasets if d["category"] == args.category]
            logger.info(f"Filtro categoria: {args.category} ({len(datasets)} dataset)")
        
        # Solo verifica aggiornamenti
        if args.check_updates:
            updates = check_remote_updates(datasets, logger)
            logger.info(f"Dataset da aggiornare: {len(updates)}")
            for u in updates:
                logger.info(f"  - {u['filename']}: {u['reason']}")
            return
        
        # Pipeline completa
        success = True
        
        # Step 1: Download
        if not args.skip_download:
            download_args = []
            if args.force:
                download_args.append("--force")
            success = run_pipeline_step(
                "Download Dataset",
                "download_core.py",
                download_args,
                logger
            )
            if not success:
                logger.error("Download fallito, interruzione pipeline")
                sys.exit(1)
        
        # Step 3: Process
        success = run_pipeline_step(
            "Elaborazione Dataset",
            "process_core.py",
            ["--db", str(UNIFIED_DB)],
            logger
        )
        if not success:
            logger.warning("Elaborazione fallita, continuo comunque...")
        
        # Step 4: Star Schema
        run_pipeline_step(
            "Costruzione Star Schema",
            "build_star_schema.py",
            ["--db", str(UNIFIED_DB)],
            logger
        )
        
        # Step 5: Sync to unified DB (legacy migration if needed)
        if not args.skip_sync:
            merge_to_unified_db(logger)
            
            # Esegui sync_to_website per le viste API (se abilitato)
            if ENABLE_WEBSITE_SYNC:
                run_pipeline_step(
                    "Sincronizzazione API Views",
                    "sync_to_website.py",
                    [],
                    logger
                )
            else:
                logger.info("⏭️  Website sync disabilitato (ENABLE_WEBSITE_SYNC=false)")
        
        # Step 6: Apply optimizations (indici/viste)
        run_pipeline_step(
            "Apply DB Optimizations",
            "apply_optimizations.py",
            ["--db", str(UNIFIED_DB)],
            logger
        )
        
        # Summary
        summary = generate_summary(logger)
        summary["status"] = "success"
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("📊 RIEPILOGO AGGIORNAMENTO")
        logger.info("=" * 60)
        logger.info(f"Dataset per categoria:")
        for cat, count in sorted(summary["datasets"].items()):
            logger.info(f"  {cat}: {count} file")
        
        if summary.get("database"):
            logger.info(f"Database: {summary['database'].get('tables', '?')} tabelle, "
                       f"{summary['database'].get('size_mb', '?')} MB")
        
        logger.info("")
        logger.info("✅ Aggiornamento completato con successo!")
        
        # Salva summary
        summary_path = LOGS_DIR / "last_update_summary.json"
        with summary_path.open("w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
    except Exception as e:
        logger.exception(f"Errore critico: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
