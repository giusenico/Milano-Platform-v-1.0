"""
Fixtures condivisi per i test Milano Platform.
"""

import os
import sqlite3
from pathlib import Path
import pytest

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("DB_PATH", str(PROJECT_ROOT / "db" / "milano_unified.db")))


@pytest.fixture(scope="session")
def project_root():
    """Path alla root del progetto."""
    return PROJECT_ROOT


@pytest.fixture(scope="session")
def db_path():
    """Path al database unificato."""
    return DB_PATH


@pytest.fixture(scope="session")
def db_exists():
    """Verifica se il database esiste."""
    return DB_PATH.exists()
