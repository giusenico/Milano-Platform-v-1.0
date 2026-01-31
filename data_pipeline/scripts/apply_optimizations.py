#!/usr/bin/env python3
"""
Script per applicare ottimizzazioni (indici/viste) al database unificato.

Usage:
    python apply_optimizations.py
    python apply_optimizations.py --backup  # Crea backup prima
    python apply_optimizations.py --test    # Solo test, non applica modifiche
    python apply_optimizations.py --db /path/to/db  # Specifica DB custom
"""

import os
import sqlite3
import time
from pathlib import Path
import argparse
from datetime import datetime
import shutil

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Paths configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PIPELINE_ROOT = Path(__file__).resolve().parent.parent

# Unified DB path (single source of truth)
DEFAULT_DB_PATH = PROJECT_ROOT / "db" / "milano_unified.db"
DB_PATH = Path(os.getenv("DB_PATH", str(DEFAULT_DB_PATH)))
if not DB_PATH.is_absolute():
    DB_PATH = PROJECT_ROOT / DB_PATH

# SQL migrations directory
MIGRATIONS_DIR = PROJECT_ROOT / "db" / "migrations"
SQL_SCRIPT = MIGRATIONS_DIR / "001_indexes.sql"

# Backup directory
BACKUP_DIR = PROJECT_ROOT / "db" / "backups"


def create_backup(db_path: Path) -> Path:
    """Crea backup del database."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"milano_unified_backup_{timestamp}.db"
    
    print(f"📦 Creazione backup...")
    shutil.copy2(db_path, backup_path)
    backup_size = backup_path.stat().st_size / (1024 * 1024)  # MB
    print(f"✅ Backup creato: {backup_path} ({backup_size:.2f} MB)")
    
    return backup_path


def test_query_performance(conn: sqlite3.Connection, query: str, description: str) -> float:
    """Testa performance di una query."""
    start = time.time()
    try:
        cursor = conn.execute(query)
        results = cursor.fetchall()
        elapsed = time.time() - start
        print(f"   {description}: {elapsed:.4f}s ({len(results)} righe)")
        return elapsed
    except sqlite3.OperationalError as e:
        elapsed = time.time() - start
        print(f"   {description}: SKIP - tabella non esistente")
        return elapsed


def get_database_stats(conn: sqlite3.Connection, db_path: Path = None) -> dict:
    """Ottieni statistiche database."""
    stats = {}
    
    # Numero tabelle
    cursor = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    stats['num_tables'] = cursor.fetchone()[0]
    
    # Numero indici (esclusi autoindex)
    cursor = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    )
    stats['num_indices'] = cursor.fetchone()[0]
    
    # Numero viste
    cursor = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='view'"
    )
    stats['num_views'] = cursor.fetchone()[0]
    
    # Dimensione database
    if db_path and db_path.exists():
        stats['db_size_mb'] = db_path.stat().st_size / (1024 * 1024)
    elif DB_PATH.exists():
        stats['db_size_mb'] = DB_PATH.stat().st_size / (1024 * 1024)
    
    return stats


def list_applied_indexes(conn: sqlite3.Connection) -> list:
    """Lista gli indici applicati."""
    cursor = conn.execute(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name"
    )
    return cursor.fetchall()


def apply_optimizations(db_path: Path, test_mode: bool = False) -> bool:
    """Applica ottimizzazioni al database.
    
    Returns:
        True se ottimizzazioni applicate con successo, False altrimenti
    """
    
    if not db_path.exists():
        print(f"❌ Database non trovato: {db_path}")
        print(f"   Assicurati che la pipeline abbia creato il database prima.")
        return False
    
    if not SQL_SCRIPT.exists():
        print(f"❌ Script SQL non trovato: {SQL_SCRIPT}")
        print(f"   Controlla che il file di migrazione esista.")
        return False
    
    # Connetti al database
    conn = sqlite3.connect(str(db_path))
    
    print("\n" + "="*70)
    print("📊 STATISTICHE DATABASE INIZIALI")
    print("="*70)
    
    stats_before = get_database_stats(conn, db_path)
    print(f"Tabelle: {stats_before['num_tables']}")
    print(f"Indici: {stats_before['num_indices']}")
    print(f"Viste: {stats_before.get('num_views', 0)}")
    print(f"Dimensione: {stats_before.get('db_size_mb', 0):.2f} MB")
    
    # Test performance PRIMA degli indici
    print("\n" + "="*70)
    print("🔍 TEST PERFORMANCE PRIMA DEGLI INDICI")
    print("="*70)
    
    test_queries = [
        (
            "SELECT * FROM dim_nil WHERE id_nil = 1",
            "Query 1: Filtra per id_nil"
        ),
        (
            "SELECT * FROM dim_nil WHERE nil LIKE 'C%'",
            "Query 2: Filtra per nil (prefix)"
        ),
        (
            "SELECT COUNT(*) FROM fact_demografia GROUP BY id_nil",
            "Query 3: Aggrega demografia per NIL"
        ),
    ]
    
    times_before = []
    for query, desc in test_queries:
        t = test_query_performance(conn, query, desc)
        times_before.append(t)
    
    if test_mode:
        print("\n⚠️  MODALITÀ TEST - Nessuna modifica applicata")
        conn.close()
        return True
    
    # Applica ottimizzazioni
    print("\n" + "="*70)
    print("⚙️  APPLICAZIONE OTTIMIZZAZIONI")
    print("="*70)
    
    with open(SQL_SCRIPT, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    # Esegui script indici completo
    try:
        conn.executescript(sql_script)
        conn.commit()
        print("✅ Indici e viste creati/aggiornati con successo")
    except Exception as e:
        print(f"⚠️  Errore creazione indici: {e}")
        conn.close()
        return False
    
    # Statistiche DOPO
    print("\n" + "="*70)
    print("📊 STATISTICHE DATABASE DOPO OTTIMIZZAZIONE")
    print("="*70)
    
    stats_after = get_database_stats(conn, db_path)
    indices_added = stats_after['num_indices'] - stats_before['num_indices']
    views_added = stats_after.get('num_views', 0) - stats_before.get('num_views', 0)
    
    print(f"Tabelle: {stats_after['num_tables']}")
    print(f"Indici: {stats_after['num_indices']} (+{indices_added})")
    print(f"Viste: {stats_after.get('num_views', 0)} (+{views_added})")
    print(f"Dimensione: {stats_after.get('db_size_mb', 0):.2f} MB")
    
    # Mostra indici applicati
    print("\n" + "="*70)
    print("📋 INDICI APPLICATI")
    print("="*70)
    
    indexes = list_applied_indexes(conn)
    for idx_name, tbl_name in indexes:
        print(f"   {idx_name} → {tbl_name}")
    
    # Test performance DOPO gli indici
    print("\n" + "="*70)
    print("🚀 TEST PERFORMANCE DOPO GLI INDICI")
    print("="*70)
    
    times_after = []
    for query, desc in test_queries:
        t = test_query_performance(conn, query, desc)
        times_after.append(t)
    
    # Report miglioramenti
    print("\n" + "="*70)
    print("📈 MIGLIORAMENTI PERFORMANCE")
    print("="*70)
    
    valid_comparisons = 0
    total_improvement = 0
    
    for i, ((query, desc), t_before, t_after) in enumerate(zip(test_queries, times_before, times_after), 1):
        if t_before > 0.0001:  # Evita divisione per numeri molto piccoli
            improvement = ((t_before - t_after) / t_before * 100)
            print(f"Query {i}:")
            print(f"   Prima:  {t_before:.4f}s")
            print(f"   Dopo:   {t_after:.4f}s")
            print(f"   Miglioramento: {improvement:+.1f}%")
            print()
            total_improvement += improvement
            valid_comparisons += 1
    
    if valid_comparisons > 0:
        avg_improvement = total_improvement / valid_comparisons
        print(f"🎯 Miglioramento medio: {avg_improvement:+.1f}%")
    
    # Registra applicazione ottimizzazioni
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1
            )
        """)
        conn.execute("""
            INSERT OR REPLACE INTO _migrations (migration_name, applied_at, success)
            VALUES (?, ?, ?)
        """, ('001_indexes', datetime.now().isoformat(), True))
        conn.commit()
    except Exception as e:
        print(f"⚠️  Errore registrazione migrazione: {e}")
    
    # Chiudi connessione
    conn.close()
    
    print("\n" + "="*70)
    print("✅ OTTIMIZZAZIONE COMPLETATA!")
    print("="*70)
    print("\nProssimi passi:")
    print(f"1. Esegui VACUUM per recuperare spazio: sqlite3 {db_path} 'VACUUM;'")
    print("2. Testa le tue query abituali")
    print("3. Monitora performance nel tempo")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="Applica ottimizzazioni al database unificato")
    parser.add_argument('--backup', action='store_true', 
                        help='Crea backup prima di applicare modifiche')
    parser.add_argument('--test', action='store_true', 
                        help='Solo test performance, non applica modifiche')
    parser.add_argument('--db', type=str, 
                        help=f'Path al database (default: {DB_PATH})')
    args = parser.parse_args()
    
    # Usa DB specificato o default
    target_db = Path(args.db) if args.db else DB_PATH
    
    print("="*70)
    print("🔧 OTTIMIZZAZIONE DATABASE UNIFICATO")
    print("="*70)
    print(f"Database: {target_db}")
    print(f"Migrations: {MIGRATIONS_DIR}")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    if not target_db.exists():
        print(f"❌ Database non trovato: {target_db}")
        print("\nSuggerimenti:")
        print("  1. Esegui prima la pipeline: make pipeline")
        print("  2. Oppure specifica un path esistente: --db /path/to/db.sqlite")
        return 1
    
    if args.backup and not args.test:
        backup_path = create_backup(target_db)
        print(f"💾 Backup disponibile per ripristino: {backup_path}")
        print()
    
    if args.test:
        print("⚠️  MODALITÀ TEST - Nessuna modifica verrà applicata\n")
    
    success = apply_optimizations(target_db, test_mode=args.test)
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
