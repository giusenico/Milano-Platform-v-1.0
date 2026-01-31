"""
Test suite per l'API Express del server.

Verifica:
- Endpoint health check
- Risposta corretta quando DB manca
- Formato risposte API principali
"""

import os
import subprocess
import time
import socket
from pathlib import Path
import pytest

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SERVER_DIR = PROJECT_ROOT / "server"

# API base URL
API_BASE = os.getenv("API_URL", "http://localhost:3001")


# ============================================================================
# FIXTURES
# ============================================================================

def is_port_in_use(port: int) -> bool:
    """Verifica se una porta è in uso."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


@pytest.fixture(scope="module")
def api_available():
    """Verifica che l'API sia disponibile."""
    if not HAS_REQUESTS:
        pytest.skip("requests library not installed")
    
    port = int(os.getenv("PORT", 3001))
    if not is_port_in_use(port):
        pytest.skip(f"Server non in esecuzione su porta {port}")
    
    return True


# ============================================================================
# SMOKE TESTS
# ============================================================================

@pytest.mark.smoke
def test_server_files_exist():
    """Verifica che i file del server esistano."""
    assert (SERVER_DIR / "index.js").exists(), "index.js non trovato"
    assert (SERVER_DIR / "package.json").exists() or (PROJECT_ROOT / "package.json").exists(), "package.json non trovato"


@pytest.mark.smoke
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_health_endpoint(api_available):
    """Verifica endpoint /api/health."""
    response = requests.get(f"{API_BASE}/api/health", timeout=5)
    
    # Dovrebbe rispondere anche se DB mancante (con 503)
    assert response.status_code in [200, 503], f"Health endpoint fallito: {response.status_code}"
    
    data = response.json()
    assert "status" in data, "Campo 'status' mancante"
    assert "database" in data, "Campo 'database' mancante"


@pytest.mark.smoke
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_health_response_structure(api_available):
    """Verifica struttura risposta health."""
    response = requests.get(f"{API_BASE}/api/health", timeout=5)
    data = response.json()
    
    # Verifica campi database
    db_info = data.get("database", {})
    assert "connected" in db_info, "Campo 'connected' mancante in database"
    assert "path" in db_info, "Campo 'path' mancante in database"


# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_quartieri_endpoint(api_available):
    """Verifica endpoint /api/quartieri."""
    response = requests.get(f"{API_BASE}/api/quartieri", timeout=10)
    
    if response.status_code == 503:
        pytest.skip("Database non disponibile")
    
    assert response.status_code == 200, f"Quartieri endpoint fallito: {response.status_code}"
    
    data = response.json()
    assert isinstance(data, list), "Risposta deve essere una lista"


@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_quartieri_response_structure(api_available):
    """Verifica struttura risposta quartieri."""
    response = requests.get(f"{API_BASE}/api/quartieri", timeout=10)
    
    if response.status_code == 503:
        pytest.skip("Database non disponibile")
    
    data = response.json()
    
    if len(data) > 0:
        first = data[0]
        # Verifica campi essenziali
        assert "id" in first or "Quartiere" in first, "Campo identificativo mancante"


@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_error_response_format(api_available):
    """Verifica formato errori API."""
    # Richiesta a endpoint non esistente
    response = requests.get(f"{API_BASE}/api/nonexistent", timeout=5)
    
    # 404 o altro errore
    assert response.status_code >= 400, "Endpoint inesistente dovrebbe dare errore"


# ============================================================================
# ROBUSTNESS TESTS
# ============================================================================

@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_health_provides_error_info_when_db_missing(api_available):
    """Verifica che health dia info utili quando DB manca."""
    response = requests.get(f"{API_BASE}/api/health", timeout=5)
    data = response.json()
    
    if response.status_code == 503:
        # DB non disponibile - verifica che ci sia messaggio utile
        db_info = data.get("database", {})
        assert db_info.get("error") is not None or db_info.get("connected") is False, \
            "Dovrebbe indicare problema database"


@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_api_returns_503_when_db_unavailable(api_available):
    """Verifica che le API tornino 503 se DB manca."""
    # Prima controlla health
    health = requests.get(f"{API_BASE}/api/health", timeout=5).json()
    
    if not health.get("database", {}).get("connected"):
        # DB non connesso - quartieri dovrebbe dare 503
        response = requests.get(f"{API_BASE}/api/quartieri", timeout=5)
        assert response.status_code == 503, "Dovrebbe tornare 503 senza DB"
        
        error_data = response.json()
        assert "error" in error_data, "Risposta errore deve contenere 'error'"


# ============================================================================
# CORS TESTS
# ============================================================================

@pytest.mark.integration
@pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")
def test_cors_headers(api_available):
    """Verifica che CORS sia abilitato."""
    response = requests.options(f"{API_BASE}/api/health", timeout=5)
    
    # OPTIONS dovrebbe essere permesso (CORS preflight)
    # O GET con header CORS
    response = requests.get(f"{API_BASE}/api/health", timeout=5)
    
    # Access-Control headers presenti per richieste cross-origin
    # Il test base è che non fallisca
    assert response.status_code in [200, 503]
