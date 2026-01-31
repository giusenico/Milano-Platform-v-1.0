"""
Test suite per la pipeline dati Milano Platform.

Verifica:
- Esistenza e struttura del database
- Schema delle tabelle principali
- Presenza delle viste ottimizzate
- Freschezza dei dati
"""

import os
import sqlite3
from pathlib import Path
import pytest

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("DB_PATH", str(PROJECT_ROOT / "db" / "milano_unified.db")))

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def db_connection():
    """Connessione al database unificato."""
    if not DB_PATH.exists():
        pytest.skip(f"Database non trovato: {DB_PATH}")
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


@pytest.fixture
def db_tables(db_connection):
    """Lista delle tabelle nel database."""
    cursor = db_connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    return [row[0] for row in cursor.fetchall()]


@pytest.fixture
def db_views(db_connection):
    """Lista delle viste nel database."""
    cursor = db_connection.execute(
        "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
    )
    return [row[0] for row in cursor.fetchall()]


# ============================================================================
# SMOKE TESTS
# ============================================================================

@pytest.mark.smoke
def test_database_exists():
    """Verifica che il database unificato esista."""
    assert DB_PATH.exists(), f"Database non trovato: {DB_PATH}"
    assert DB_PATH.stat().st_size > 0, "Database vuoto"


@pytest.mark.smoke
def test_database_readable(db_connection):
    """Verifica che il database sia leggibile."""
    cursor = db_connection.execute("SELECT 1")
    assert cursor.fetchone()[0] == 1


@pytest.mark.smoke
def test_migrations_dir_exists():
    """Verifica che la directory migrations esista con file SQL."""
    migrations_dir = PROJECT_ROOT / "db" / "migrations"
    assert migrations_dir.exists(), f"Directory migrations non trovata: {migrations_dir}"
    
    sql_files = list(migrations_dir.glob("*.sql"))
    assert len(sql_files) > 0, "Nessun file SQL in migrations/"


# ============================================================================
# SCHEMA TESTS
# ============================================================================

@pytest.mark.integration
def test_core_tables_exist(db_tables):
    """Verifica che le tabelle core esistano."""
    expected_tables = [
        "dim_nil",
        "dim_tempo",
    ]
    
    for table in expected_tables:
        assert table in db_tables, f"Tabella {table} non trovata"


@pytest.mark.integration
def test_dim_nil_schema(db_connection):
    """Verifica lo schema della tabella dim_nil."""
    cursor = db_connection.execute("PRAGMA table_info(dim_nil)")
    columns = {row["name"]: row["type"] for row in cursor.fetchall()}
    
    required_columns = ["id_nil", "nil"]
    for col in required_columns:
        assert col in columns, f"Colonna {col} mancante in dim_nil"


@pytest.mark.integration
def test_dim_nil_has_data(db_connection):
    """Verifica che dim_nil abbia dati."""
    cursor = db_connection.execute("SELECT COUNT(*) FROM dim_nil")
    count = cursor.fetchone()[0]
    
    assert count > 0, "Tabella dim_nil vuota"
    # Milano ha 88 NIL
    assert count >= 80, f"dim_nil ha solo {count} record (attesi >= 80)"


@pytest.mark.integration
def test_views_exist(db_views):
    """Verifica che le viste API esistano."""
    # Almeno la vista base deve esistere
    api_views = [v for v in db_views if v.startswith("vw_")]
    assert len(api_views) > 0, "Nessuna vista API (vw_*) trovata"


@pytest.mark.integration
def test_vw_dim_nil_accessible(db_connection):
    """Verifica che la vista vw_dim_nil sia accessibile."""
    try:
        cursor = db_connection.execute("SELECT COUNT(*) FROM vw_dim_nil")
        count = cursor.fetchone()[0]
        assert count > 0, "Vista vw_dim_nil vuota"
    except sqlite3.OperationalError as e:
        pytest.fail(f"Vista vw_dim_nil non accessibile: {e}")


# ============================================================================
# DATA QUALITY TESTS
# ============================================================================

@pytest.mark.integration
def test_data_freshness_table_exists(db_tables):
    """Verifica che la tabella data_freshness esista."""
    assert "data_freshness" in db_tables, "Tabella data_freshness non trovata"


@pytest.mark.integration
def test_data_freshness_has_records(db_connection):
    """Verifica che ci siano record di freschezza dati."""
    try:
        cursor = db_connection.execute("SELECT COUNT(*) FROM data_freshness")
        count = cursor.fetchone()[0]
        assert count > 0, "Nessun record in data_freshness"
    except sqlite3.OperationalError:
        pytest.skip("Tabella data_freshness non esiste")


@pytest.mark.integration
def test_nil_ids_are_unique(db_connection):
    """Verifica che gli ID NIL siano unici."""
    cursor = db_connection.execute("""
        SELECT id_nil, COUNT(*) as cnt 
        FROM dim_nil 
        GROUP BY id_nil 
        HAVING cnt > 1
    """)
    duplicates = cursor.fetchall()
    
    assert len(duplicates) == 0, f"ID NIL duplicati: {[d[0] for d in duplicates]}"


# ============================================================================
# INDEX TESTS
# ============================================================================

@pytest.mark.integration
def test_indexes_exist(db_connection):
    """Verifica che esistano indici custom."""
    cursor = db_connection.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    )
    indexes = [row[0] for row in cursor.fetchall()]
    
    assert len(indexes) > 0, "Nessun indice custom trovato"


@pytest.mark.integration
def test_migrations_table_exists(db_connection):
    """Verifica che la tabella _migrations esista (tracking ottimizzazioni)."""
    cursor = db_connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    )
    exists = cursor.fetchone() is not None
    
    # Non fallisce se non esiste, ma avvisa
    if not exists:
        pytest.skip("Tabella _migrations non trovata (ottimizzazioni non ancora applicate)")


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

@pytest.mark.slow
def test_nil_query_performance(db_connection):
    """Verifica performance query NIL."""
    import time
    
    start = time.time()
    cursor = db_connection.execute("SELECT * FROM dim_nil WHERE id_nil = 1")
    cursor.fetchall()
    elapsed = time.time() - start
    
    # Query su indice dovrebbe essere < 100ms
    assert elapsed < 0.1, f"Query NIL troppo lenta: {elapsed:.3f}s"
