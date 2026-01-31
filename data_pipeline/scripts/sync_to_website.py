#!/usr/bin/env python3
"""
sync_to_website.py
Sincronizza i dati dallo star schema alle tabelle/viste ottimizzate per l'API del website.

Questo script:
1. Legge i dati elaborati dalla pipeline (star schema)
2. Crea/aggiorna le viste e tabelle ottimizzate per le API Express
3. Importa dati aggiuntivi da file esterni (prezzi OMI, etc.) SE ABILITATO
4. Genera metadati sulla freschezza dei dati

Uso:
    python sync_to_website.py [--dry-run] [--verbose] [--force]
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
WEBSITE_DATA_DIR = PROJECT_ROOT / "website" / "src" / "data"
LOGS_DIR = PROJECT_ROOT / "logs"

# Database path from environment or default
DEFAULT_DB_PATH = PROJECT_ROOT / "db" / "milano_unified.db"
DB_PATH = Path(os.getenv("DB_PATH", str(DEFAULT_DB_PATH)))
if not DB_PATH.is_absolute():
    DB_PATH = PROJECT_ROOT / DB_PATH

# Feature flags from environment
ENABLE_EXTERNAL_IMPORT = os.getenv("ENABLE_EXTERNAL_IMPORT", "false").lower() == "true"

# External data sources (from original Website_Milano) - OPTIONAL
EXTERNAL_DATA_SOURCES = {
    "prezzi_medi": Path(os.getenv("WEBSITE_MILANO_PATH", str(PROJECT_ROOT.parent / "Website_Milano"))) / "Pulizia_Dati" / "immobiliari_milano.db",
    "api_milano_analisi": Path(os.getenv("API_MILANO_ANALISI_PATH", str(PROJECT_ROOT.parent / "Api_Milano_Analisi"))) / "output",
}


class SyncManager:
    """Gestisce la sincronizzazione dati verso il website."""
    
    def __init__(self, db_path: Path, dry_run: bool = False, verbose: bool = False):
        self.db_path = db_path
        self.dry_run = dry_run
        self.verbose = verbose
        self.conn: Optional[sqlite3.Connection] = None
        self.stats = {
            "tables_created": 0,
            "views_created": 0,
            "rows_synced": 0,
            "errors": []
        }
    
    def connect(self) -> None:
        """Connette al database."""
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database non trovato: {self.db_path}")
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        if self.verbose:
            print(f"✓ Connesso a {self.db_path}")
    
    def close(self) -> None:
        """Chiude la connessione."""
        if self.conn:
            self.conn.close()
    
    def log(self, message: str) -> None:
        """Log con timestamp."""
        if self.verbose:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        """Esegue SQL con gestione dry-run."""
        if self.dry_run and sql.strip().upper().startswith(("CREATE", "INSERT", "UPDATE", "DELETE", "DROP")):
            self.log(f"[DRY-RUN] Would execute: {sql[:100]}...")
            return self.conn.cursor()
        return self.conn.execute(sql, params)
    
    def create_api_views(self) -> None:
        """Crea le viste ottimizzate per le API."""
        self.log("Creazione viste API...")
        
        views = {
            # Vista NIL completa per API
            # Vista NIL completa per API (Dati più recenti)
            "vw_api_nil": """
                CREATE VIEW IF NOT EXISTS vw_api_nil AS
                SELECT 
                    dn.id_nil,
                    dn.nil as nil_name,
                    dn.nil_norm as nil_label,
                    dn.area_km2 as superficie_km2,
                    fd.popolazione_totale,
                    fd.pct_stranieri,
                    fd.densita_abitanti_km2,
                    fd.famiglie_registrate_in_anagrafe as famiglie_totali,
                    fi.nuovi_fabbricati_residenziali as nuovi_fabbricati,
                    fi.abitazioni_nuove,
                    fs.numero_scuole,
                    fs.numero_mercati,
                    fs.indice_verde_medio
                FROM dim_nil dn
                LEFT JOIN (
                    SELECT * FROM fact_demografia 
                    WHERE id_tempo = (SELECT MAX(id_tempo) FROM fact_demografia)
                ) fd ON dn.id_nil = fd.id_nil
                LEFT JOIN (
                    SELECT id_nil, SUM(nuovi_fabbricati_residenziali) as nuovi_fabbricati_residenziali, SUM(abitazioni_nuove) as abitazioni_nuove
                    FROM fact_immobiliare
                    GROUP BY id_nil
                ) fi ON dn.id_nil = fi.id_nil
                LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
            """,
            
            # Vista servizi per NIL
            "vw_api_servizi_nil": """
                CREATE VIEW IF NOT EXISTS vw_api_servizi_nil AS
                SELECT 
                    dn.id_nil,
                    dn.nil as nil_name,
                    COALESCE(
                        (SELECT COUNT(*) FROM ds_08_servizi_sanitari_farmacie_milano f 
                         WHERE f.NIL = dn.nil OR f.id_nil = dn.id_nil), 0
                    ) as num_farmacie,
                    COALESCE(
                        (SELECT COUNT(*) FROM ds_08_servizi_sanitari_medici_medicina_generale m 
                         WHERE m.NIL = dn.nil OR m.id_nil = dn.id_nil), 0
                    ) as num_medici_mmg,
                    COALESCE(fs.numero_scuole, 0) as num_scuole,
                    COALESCE(fs.numero_mercati, 0) as num_mercati
                FROM dim_nil dn
                LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
            """,
            
            # Vista ambiente per NIL
            "vw_api_ambiente_nil": """
                CREATE VIEW IF NOT EXISTS vw_api_ambiente_nil AS
                SELECT 
                    dn.id_nil,
                    dn.nil as nil_name,
                    fs.indice_verde_medio as indice_verde,
                    NULL as area_verde_mq,
                    ec.value as indice_calore,
                    rc.value as categoria_rischio_calore
                FROM dim_nil dn
                LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
                LEFT JOIN ds_04_qualita_ambientale_esposizione_calore_urbano_nil_2024 ec 
                    ON dn.id_nil = ec.id_nil OR dn.nil = ec.NIL
                LEFT JOIN ds_04_qualita_ambientale_rischio_ondata_calore_nil_2024 rc 
                    ON dn.id_nil = rc.id_nil OR dn.nil = rc.NIL
            """,
            
            # Vista mobilità per NIL
            "vw_api_mobilita_nil": """
                CREATE VIEW IF NOT EXISTS vw_api_mobilita_nil AS
                SELECT 
                    dn.id_nil,
                    dn.nil as nil_name,
                    mt.auto_privata_pct,
                    mt.trasporto_pubblico_pct,
                    mt.bici_pct,
                    mt.piedi_pct,
                    sl.spostamenti_lavoro,
                    sl.spostamenti_studio,
                    sl.tempo_medio_spostamento_min
                FROM dim_nil dn
                LEFT JOIN ds_07_mobilita_trasporti_mezzi_trasporto_prevalente_nil_2011 mt 
                    ON dn.id_nil = mt.id_nil OR dn.nil = mt.NIL
                LEFT JOIN ds_07_mobilita_trasporti_spostamenti_studio_lavoro_nil_2011 sl 
                    ON dn.id_nil = sl.id_nil OR dn.nil = sl.NIL
            """,
            
            # Vista timeline demografica
            "vw_api_timeline_demografico": """
                CREATE VIEW IF NOT EXISTS vw_api_timeline_demografico AS
                SELECT 
                    dt.anno,
                    SUM(fd.popolazione_totale) as popolazione_milano,
                    SUM(fd.stranieri) as stranieri_milano,
                    AVG(fd.pct_stranieri) as pct_stranieri_medio
                FROM fact_demografia fd
                JOIN dim_tempo dt ON fd.id_tempo = dt.id_tempo
                GROUP BY dt.anno
                ORDER BY dt.anno
            """,
            
            # Vista compatibilità per server esistente
            "vw_dim_nil": """
                CREATE VIEW IF NOT EXISTS vw_dim_nil AS
                SELECT 
                    id_nil,
                    nil as nil_name,
                    nil_norm as nil_label,
                    area_km2,
                    geometry
                FROM dim_nil
            """
        }
        
        for view_name, view_sql in views.items():
            try:
                # Drop e ricrea per aggiornare
                self.execute(f"DROP VIEW IF EXISTS {view_name}")
                self.execute(view_sql)
                self.stats["views_created"] += 1
                self.log(f"  ✓ Vista {view_name} creata")
            except sqlite3.Error as e:
                self.log(f"  ✗ Errore vista {view_name}: {e}")
                self.stats["errors"].append(f"{view_name}: {e}")
    
    def create_data_freshness_table(self) -> None:
        """Crea tabella metadati sulla freschezza dei dati."""
        self.log("Creazione tabella data_freshness...")
        
        self.execute("""
            CREATE TABLE IF NOT EXISTS data_freshness (
                source_name TEXT PRIMARY KEY,
                last_sync TIMESTAMP,
                record_count INTEGER,
                status TEXT,
                notes TEXT
            )
        """)
        
        # Aggiorna metadati
        now = datetime.now().isoformat()
        sources = [
            ("star_schema", "OK", "Dati elaborati dalla pipeline"),
            ("dim_nil", "OK", "88 NIL Milano"),
            ("fact_demografia", "OK", "Dati demografici"),
            ("fact_immobiliare", "OK", "Dati immobiliari"),
            ("fact_servizi", "OK", "Servizi e amenità"),
        ]
        
        for source, status, notes in sources:
            try:
                count = self.conn.execute(
                    f"SELECT COUNT(*) FROM {source}"
                ).fetchone()[0]
            except:
                count = 0
            
            self.execute("""
                INSERT OR REPLACE INTO data_freshness 
                (source_name, last_sync, record_count, status, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (source, now, count, status, notes))
        
        self.stats["tables_created"] += 1
        self.log("  ✓ Tabella data_freshness aggiornata")
    
    def import_external_prezzi(self) -> None:
        """Importa dati prezzi dal database Website_Milano originale."""
        self.log("Importazione dati prezzi esterni...")
        
        source_db = EXTERNAL_DATA_SOURCES.get("prezzi_medi")
        if not source_db or not source_db.exists():
            self.log(f"  ⚠ Database prezzi non trovato: {source_db}")
            return
        
        try:
            source_conn = sqlite3.connect(str(source_db))
            source_conn.row_factory = sqlite3.Row
            
            # Tabelle da importare
            tables_to_import = [
                "prezzi_medi_quartiere",
                "quotazioni_immobiliari",
                "indicatori_demografici",
                "indice_prezzi_abitazioni",
                "contribuenti_categorie",
                "contribuenti_classi",
                "popolazione_famiglie_tipologia_quartiere",
                "trasporto_pubblico_locale",
                "nil_qualita_vita",
                "nil_clusters",
                "cluster_definizioni",
            ]
            
            for table in tables_to_import:
                try:
                    # Verifica esistenza tabella source
                    source_conn.execute(f"SELECT 1 FROM {table} LIMIT 1")
                    
                    # Leggi schema
                    schema = source_conn.execute(
                        f"SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
                        , (table,)
                    ).fetchone()
                    
                    if schema and schema[0]:
                        # Crea tabella se non esiste
                        self.execute(f"DROP TABLE IF EXISTS {table}")
                        self.execute(schema[0])
                        
                        # Copia dati
                        rows = source_conn.execute(f"SELECT * FROM {table}").fetchall()
                        if rows:
                            cols = [desc[0] for desc in source_conn.execute(f"SELECT * FROM {table} LIMIT 1").description]
                            placeholders = ",".join(["?" for _ in cols])
                            for row in rows:
                                self.execute(
                                    f"INSERT INTO {table} VALUES ({placeholders})",
                                    tuple(row)
                                )
                            self.stats["rows_synced"] += len(rows)
                            self.log(f"  ✓ {table}: {len(rows)} righe importate")
                        
                except sqlite3.Error as e:
                    self.log(f"  ⚠ Tabella {table} non disponibile: {e}")
            
            source_conn.close()
            
        except Exception as e:
            self.log(f"  ✗ Errore importazione prezzi: {e}")
            self.stats["errors"].append(f"import_prezzi: {e}")
    
    def import_nil_analysis(self) -> None:
        """Importa dati analisi NIL da Api_Milano_Analisi."""
        self.log("Importazione analisi NIL...")
        
        output_dir = EXTERNAL_DATA_SOURCES.get("api_milano_analisi")
        if not output_dir or not output_dir.exists():
            self.log(f"  ⚠ Directory analisi non trovata: {output_dir}")
            return
        
        # Importa nil_con_indice_qualita_vita.csv se esiste
        qol_file = output_dir / "nil_con_indice_qualita_vita.csv"
        if qol_file.exists():
            try:
                import csv
                with open(qol_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                
                if rows:
                    # Crea tabella
                    self.execute("DROP TABLE IF EXISTS nil_qol_analysis")
                    cols = list(rows[0].keys())
                    col_defs = ", ".join([f'"{c}" TEXT' for c in cols])
                    self.execute(f"CREATE TABLE nil_qol_analysis ({col_defs})")
                    
                    # Inserisci dati
                    placeholders = ",".join(["?" for _ in cols])
                    for row in rows:
                        self.execute(
                            f"INSERT INTO nil_qol_analysis VALUES ({placeholders})",
                            tuple(row.values())
                        )
                    self.stats["rows_synced"] += len(rows)
                    self.log(f"  ✓ nil_qol_analysis: {len(rows)} righe importate")
                    
            except Exception as e:
                self.log(f"  ⚠ Errore importazione QoL: {e}")
    
    def create_api_indexes(self) -> None:
        """Crea indici per ottimizzare le query API."""
        self.log("Creazione indici API...")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_dim_nil_name ON dim_nil(nil)",
            "CREATE INDEX IF NOT EXISTS idx_dim_nil_norm ON dim_nil(nil_norm)",
            "CREATE INDEX IF NOT EXISTS idx_fact_demo_nil ON fact_demografia(id_nil)",
            "CREATE INDEX IF NOT EXISTS idx_fact_immo_nil ON fact_immobiliare(id_nil)",
            "CREATE INDEX IF NOT EXISTS idx_fact_serv_nil ON fact_servizi(id_nil)",
        ]
        
        # Indici per tabelle prezzi se esistono
        try:
            self.conn.execute("SELECT 1 FROM prezzi_medi_quartiere LIMIT 1")
            indexes.extend([
                "CREATE INDEX IF NOT EXISTS idx_prezzi_quartiere ON prezzi_medi_quartiere(Quartiere)",
                "CREATE INDEX IF NOT EXISTS idx_prezzi_semestre ON prezzi_medi_quartiere(Semestre)",
            ])
        except:
            pass
        
        for idx_sql in indexes:
            try:
                self.execute(idx_sql)
            except sqlite3.Error as e:
                pass  # Ignora errori indici
        
        self.log("  ✓ Indici creati")
    
    def update_nil_qualita_vita(self) -> None:
        """Aggiorna la tabella nil_qualita_vita dai dati dello star schema."""
        self.log("Aggiornamento nil_qualita_vita...")
        
        # Verifica se la tabella esiste
        try:
            self.conn.execute("SELECT 1 FROM nil_qualita_vita LIMIT 1")
        except sqlite3.Error:
            self.log("  ⚠ Tabella nil_qualita_vita non esiste, skip")
            return
        
        sql = '''
        INSERT OR REPLACE INTO nil_qualita_vita (
            id_nil, nil, nil_norm, shape_area, shape_length, area_km2,
            id_tempo, popolazione_totale, pct_stranieri, densita_abitanti_km2,
            famiglie_registrate, famiglie_unipersonali,
            nati_vivi, morti, immigrati, emigrati,
            saldo_naturale, saldo_migratorio, saldo_totale,
            id_tempo_imm, nuovi_fabbricati_residenziali, abitazioni_nuove,
            superficie_utile_abitabile, volume_totale,
            id_tempo_serv, numero_scuole, numero_mercati, indice_verde_medio
        )
        SELECT 
            dn.id_nil, dn.nil, dn.nil_norm, dn.shape_area, dn.shape_length, dn.area_km2,
            fd.id_tempo, fd.popolazione_totale, fd.pct_stranieri, fd.densita_abitanti_km2,
            fd.famiglie_registrate_in_anagrafe, fd.famiglie_unipersonali_registrate_in_anagrafe,
            fd.nati_vivi, fd.morti, fd.immigrati, fd.emigrati,
            (fd.nati_vivi - fd.morti), (fd.immigrati - fd.emigrati), 
            (fd.nati_vivi - fd.morti + fd.immigrati - fd.emigrati),
            fi.id_tempo, fi.nuovi_fabbricati_residenziali, fi.abitazioni_nuove,
            fi.superficie_utile_abitabile, fi.volume_totale,
            fs.id_tempo, fs.numero_scuole, fs.numero_mercati, fs.indice_verde_medio
        FROM dim_nil dn
        LEFT JOIN (
            SELECT * FROM fact_demografia WHERE id_tempo = (SELECT MAX(id_tempo) FROM fact_demografia)
        ) fd ON dn.id_nil = fd.id_nil
        LEFT JOIN (
            SELECT id_nil, MAX(id_tempo) as id_tempo, 
                   SUM(nuovi_fabbricati_residenziali) as nuovi_fabbricati_residenziali,
                   SUM(abitazioni_nuove) as abitazioni_nuove,
                   SUM(superficie_utile_abitabile) as superficie_utile_abitabile,
                   SUM(volume_totale) as volume_totale
            FROM fact_immobiliare GROUP BY id_nil
        ) fi ON dn.id_nil = fi.id_nil
        LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil
        '''
        
        try:
            self.execute(sql)
            count = self.conn.execute(
                'SELECT COUNT(*) FROM nil_qualita_vita WHERE popolazione_totale IS NOT NULL'
            ).fetchone()[0]
            self.log(f"  ✓ nil_qualita_vita aggiornato ({count} NIL con dati popolazione)")
        except sqlite3.Error as e:
            self.log(f"  ✗ Errore aggiornamento nil_qualita_vita: {e}")
            self.stats["errors"].append(f"nil_qualita_vita: {e}")
    
    def generate_frontend_data(self) -> None:
        """Genera file JSON per il frontend (dati statici)."""
        self.log("Generazione dati frontend...")
        
        if not WEBSITE_DATA_DIR.exists():
            WEBSITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        # NIL GeoJSON mapping
        try:
            nil_data = self.conn.execute("""
                SELECT id_nil, nil, nil_norm, area_km2
                FROM dim_nil
                ORDER BY id_nil
            """).fetchall()
            
            nil_mapping = {
                row["nil"]: {
                    "id": row["id_nil"],
                    "label": row["nil_norm"],
                    "area_km2": row["area_km2"]
                }
                for row in nil_data
            }
            
            output_file = WEBSITE_DATA_DIR / "nilMapping.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(nil_mapping, f, ensure_ascii=False, indent=2)
            self.log(f"  ✓ {output_file.name} generato")
            
        except Exception as e:
            self.log(f"  ⚠ Errore generazione nilMapping: {e}")
        
        # Data freshness info
        try:
            freshness = self.conn.execute("""
                SELECT source_name, last_sync, record_count, status
                FROM data_freshness
            """).fetchall()
            
            freshness_data = {
                "last_update": datetime.now().isoformat(),
                "sources": {
                    row["source_name"]: {
                        "last_sync": row["last_sync"],
                        "count": row["record_count"],
                        "status": row["status"]
                    }
                    for row in freshness
                }
            }
            
            output_file = WEBSITE_DATA_DIR / "dataFreshness.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(freshness_data, f, ensure_ascii=False, indent=2)
            self.log(f"  ✓ {output_file.name} generato")
            
        except Exception as e:
            self.log(f"  ⚠ Errore generazione dataFreshness: {e}")
    
    def run(self) -> Dict[str, Any]:
        """Esegue la sincronizzazione completa."""
        print("=" * 60)
        print("  SYNC TO WEBSITE - Milano Platform")
        print("=" * 60)
        print(f"Database: {self.db_path}")
        print(f"Dry run: {self.dry_run}")
        print(f"External import: {'enabled' if ENABLE_EXTERNAL_IMPORT else 'disabled'}")
        print()
        
        try:
            self.connect()
            
            # Step 1: Importa dati esterni (OPZIONALE)
            if ENABLE_EXTERNAL_IMPORT:
                self.import_external_prezzi()
                self.import_nil_analysis()
            else:
                self.log("⏭️  Import dati esterni disabilitato (ENABLE_EXTERNAL_IMPORT=false)")
            
            # Step 2: Crea viste API
            self.create_api_views()
            
            # Step 3: Aggiorna nil_qualita_vita (sempre, per mantenere sincronizzazione)
            self.update_nil_qualita_vita()
            
            # Step 4: Crea tabella freshness
            self.create_data_freshness_table()
            
            # Step 5: Crea indici
            self.create_api_indexes()
            
            # Step 6: Genera dati frontend
            self.generate_frontend_data()
            
            # Commit
            if not self.dry_run:
                self.conn.commit()
            
            print()
            print("=" * 60)
            print("  RIEPILOGO")
            print("=" * 60)
            print(f"  Viste create: {self.stats['views_created']}")
            print(f"  Tabelle create: {self.stats['tables_created']}")
            print(f"  Righe sincronizzate: {self.stats['rows_synced']}")
            if self.stats["errors"]:
                print(f"  Errori: {len(self.stats['errors'])}")
                for err in self.stats["errors"][:5]:
                    print(f"    - {err}")
            print()
            
            return self.stats
            
        finally:
            self.close()


def main():
    parser = argparse.ArgumentParser(description="Sincronizza dati per il website")
    parser.add_argument("--dry-run", action="store_true", help="Mostra operazioni senza eseguire")
    parser.add_argument("--verbose", "-v", action="store_true", help="Output dettagliato")
    parser.add_argument("--force", action="store_true", help="Forza ricreazione completa")
    parser.add_argument("--db", type=str, default=str(DB_PATH), help="Path database")
    
    args = parser.parse_args()
    
    sync = SyncManager(
        db_path=Path(args.db),
        dry_run=args.dry_run,
        verbose=args.verbose
    )
    
    stats = sync.run()
    
    # Exit code
    sys.exit(1 if stats.get("errors") else 0)


if __name__ == "__main__":
    main()
