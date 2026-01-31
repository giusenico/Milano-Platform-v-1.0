#!/usr/bin/env python3
"""
Aggiorna la tabella nil_qualita_vita con i dati dallo star schema
e sincronizza l'indice qualità della vita da nil_qol_analysis.
"""

import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = PROJECT_ROOT / "db" / "milano_unified.db"


def update_nil_qualita_vita():
    """Aggiorna nil_qualita_vita dai dati dello star schema."""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Aggiorna nil_qualita_vita dai dati dello star schema
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

    cur.execute(sql)
    conn.commit()
    
    # Sincronizza i dati dell'indice qualità della vita da nil_qol_analysis
    sync_quality_of_life_index(cur)
    conn.commit()

    # Verifica NIL problematici
    nil_ids = [7, 14]  # MAGENTA - S. VITTORE, NIGUARDA
    for nil_id in nil_ids:
        result = cur.execute(
            'SELECT id_nil, nil, popolazione_totale, famiglie_registrate, indice_qualita_vita FROM nil_qualita_vita WHERE id_nil = ?',
            (nil_id,)
        ).fetchone()
        print(f"NIL {nil_id}: {result}")

    # Conta totale aggiornati
    count = cur.execute('SELECT COUNT(*) FROM nil_qualita_vita WHERE popolazione_totale IS NOT NULL').fetchone()[0]
    count_iqv = cur.execute('SELECT COUNT(*) FROM nil_qualita_vita WHERE indice_qualita_vita IS NOT NULL').fetchone()[0]
    print(f"\nNIL con dati popolazione: {count}")
    print(f"NIL con indice qualità vita: {count_iqv}")
    
    conn.close()
    print("\nAggiornamento completato!")


def sync_quality_of_life_index(cur):
    """
    Sincronizza comp_verde, comp_mercati, comp_densita, comp_dinamica 
    e indice_qualita_vita da nil_qol_analysis a nil_qualita_vita.
    """
    print("\n📊 Sincronizzazione indice qualità della vita...")
    
    # Verifica che nil_qol_analysis esista e abbia dati
    check = cur.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='nil_qol_analysis'"
    ).fetchone()[0]
    
    if check == 0:
        print("⚠️  Tabella nil_qol_analysis non trovata. Calcolo IQV saltato.")
        return
    
    # Conta record disponibili
    qol_count = cur.execute("SELECT COUNT(*) FROM nil_qol_analysis WHERE IQV IS NOT NULL").fetchone()[0]
    print(f"   Record nil_qol_analysis con IQV: {qol_count}")
    
    if qol_count == 0:
        print("⚠️  Nessun dato IQV disponibile in nil_qol_analysis.")
        return
    
    # Aggiorna nil_qualita_vita con i valori da nil_qol_analysis
    # Usa UPPER per normalizzare i nomi dei NIL
    update_sql = '''
    UPDATE nil_qualita_vita
    SET 
        comp_verde = (
            SELECT CAST(qol.comp_verde AS REAL) 
            FROM nil_qol_analysis qol 
            WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
        ),
        comp_mercati = (
            SELECT CAST(qol.comp_mercati AS REAL) 
            FROM nil_qol_analysis qol 
            WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
        ),
        comp_densita = (
            SELECT CAST(qol.comp_densita AS REAL) 
            FROM nil_qol_analysis qol 
            WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
        ),
        comp_dinamica = (
            SELECT CAST(qol.comp_dinamica AS REAL) 
            FROM nil_qol_analysis qol 
            WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
        ),
        indice_qualita_vita = (
            SELECT CAST(qol.IQV AS REAL) 
            FROM nil_qol_analysis qol 
            WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
        )
    WHERE EXISTS (
        SELECT 1 FROM nil_qol_analysis qol 
        WHERE UPPER(TRIM(qol.nil)) = UPPER(TRIM(nil_qualita_vita.nil))
    )
    '''
    
    cur.execute(update_sql)
    updated = cur.rowcount
    print(f"   ✅ Aggiornati {updated} NIL con indice qualità della vita")
    
    # Verifica risultato
    result = cur.execute('''
        SELECT COUNT(*) as total,
               COUNT(indice_qualita_vita) as with_iqv,
               ROUND(AVG(indice_qualita_vita), 2) as avg_iqv,
               ROUND(MIN(indice_qualita_vita), 2) as min_iqv,
               ROUND(MAX(indice_qualita_vita), 2) as max_iqv
        FROM nil_qualita_vita
    ''').fetchone()
    
    print(f"   📈 Statistiche IQV: media={result[2]}, min={result[3]}, max={result[4]}")
    
    # Mostra NIL che non hanno match (per debug)
    unmatched = cur.execute('''
        SELECT nil FROM nil_qualita_vita 
        WHERE indice_qualita_vita IS NULL 
        LIMIT 5
    ''').fetchall()
    
    if unmatched:
        print(f"   ⚠️  NIL senza match IQV: {[r[0] for r in unmatched]}")


if __name__ == "__main__":
    update_nil_qualita_vita()
