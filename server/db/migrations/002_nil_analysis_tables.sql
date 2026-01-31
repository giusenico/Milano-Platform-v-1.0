-- ============================================================================
-- Migration: 002_nil_analysis_tables.sql
-- Description: Aggiunge tabelle per i dati dell'analisi NIL
-- Data: 2026-01-23
-- ============================================================================

-- Tabella principale per i dati di qualità della vita dei NIL
-- Dati provenienti da Api_Milano_Analisi
CREATE TABLE IF NOT EXISTS nil_qualita_vita (
    id_nil INTEGER PRIMARY KEY,
    nil TEXT NOT NULL,
    nil_norm TEXT,
    shape_area REAL,
    shape_length REAL,
    area_km2 REAL,
    
    -- Dati demografici
    id_tempo INTEGER,
    popolazione_totale INTEGER,
    pct_stranieri REAL,
    densita_abitanti_km2 REAL,
    famiglie_registrate INTEGER,
    famiglie_unipersonali INTEGER,
    
    -- Dinamiche demografiche
    nati_vivi INTEGER,
    morti INTEGER,
    immigrati INTEGER,
    emigrati INTEGER,
    saldo_naturale INTEGER,
    saldo_migratorio INTEGER,
    saldo_totale INTEGER,
    
    -- Dati immobiliari (se disponibili)
    id_tempo_imm INTEGER,
    nuovi_fabbricati_residenziali INTEGER,
    abitazioni_nuove INTEGER,
    superficie_utile_abitabile REAL,
    volume_totale REAL,
    
    -- Servizi
    id_tempo_serv INTEGER,
    numero_scuole INTEGER,
    numero_mercati INTEGER,
    indice_verde_medio REAL,
    
    -- Componenti indice qualità vita
    comp_verde REAL,
    comp_mercati REAL,
    comp_densita REAL,
    comp_dinamica REAL,
    
    -- Indice finale
    indice_qualita_vita REAL,
    
    -- Metadata
    data_aggiornamento TEXT DEFAULT (datetime('now')),
    
    UNIQUE(nil)
);

-- Tabella per i cluster dei NIL
CREATE TABLE IF NOT EXISTS nil_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nil TEXT NOT NULL,
    densita_abitanti_km2 REAL,
    pct_stranieri REAL,
    indice_verde_medio REAL,
    famiglie_unipersonali INTEGER,
    saldo_totale INTEGER,
    cluster_id INTEGER NOT NULL,
    cluster_nome TEXT,
    
    data_aggiornamento TEXT DEFAULT (datetime('now')),
    
    UNIQUE(nil)
);

-- Definizione cluster
CREATE TABLE IF NOT EXISTS cluster_definizioni (
    cluster_id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    descrizione TEXT,
    colore TEXT  -- Per visualizzazione
);

-- Inserisci definizioni cluster (basate sull'analisi)
INSERT OR REPLACE INTO cluster_definizioni (cluster_id, nome, descrizione, colore) VALUES
    (0, 'Residenziale Benestante', 'Zone residenziali con alta qualità della vita, bassa densità di stranieri, buoni servizi', '#4CAF50'),
    (1, 'Residenziale Misto', 'Zone residenziali con densità media, buona presenza di verde', '#2196F3'),
    (2, 'Urbano Denso', 'Zone ad alta densità abitativa, multiculturali, dinamiche', '#FF9800'),
    (3, 'Periferico Multiculturale', 'Zone periferiche con alta percentuale di stranieri, in evoluzione', '#9C27B0');

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_nil_qv_nil ON nil_qualita_vita(nil);
CREATE INDEX IF NOT EXISTS idx_nil_qv_iqv ON nil_qualita_vita(indice_qualita_vita);
CREATE INDEX IF NOT EXISTS idx_nil_clusters_nil ON nil_clusters(nil);
CREATE INDEX IF NOT EXISTS idx_nil_clusters_cluster ON nil_clusters(cluster_id);

-- Vista per accesso facile ai dati NIL completi
CREATE VIEW IF NOT EXISTS vw_nil_analisi_completa AS
SELECT 
    nqv.id_nil,
    nqv.nil,
    nqv.nil_norm,
    nqv.area_km2,
    nqv.popolazione_totale,
    nqv.pct_stranieri,
    nqv.densita_abitanti_km2,
    nqv.famiglie_registrate,
    nqv.famiglie_unipersonali,
    nqv.saldo_naturale,
    nqv.saldo_migratorio,
    nqv.saldo_totale,
    nqv.numero_scuole,
    nqv.numero_mercati,
    nqv.indice_verde_medio,
    nqv.comp_verde,
    nqv.comp_mercati,
    nqv.comp_densita,
    nqv.comp_dinamica,
    nqv.indice_qualita_vita,
    nc.cluster_id,
    cd.nome AS cluster_nome,
    cd.descrizione AS cluster_descrizione,
    cd.colore AS cluster_colore,
    nqv.data_aggiornamento
FROM nil_qualita_vita nqv
LEFT JOIN nil_clusters nc ON nqv.nil = nc.nil
LEFT JOIN cluster_definizioni cd ON nc.cluster_id = cd.cluster_id;

-- Vista per ranking NIL
CREATE VIEW IF NOT EXISTS vw_nil_ranking AS
SELECT 
    nil,
    indice_qualita_vita,
    RANK() OVER (ORDER BY indice_qualita_vita DESC) as ranking_iqv,
    popolazione_totale,
    RANK() OVER (ORDER BY popolazione_totale DESC) as ranking_popolazione,
    densita_abitanti_km2,
    indice_verde_medio,
    RANK() OVER (ORDER BY indice_verde_medio DESC) as ranking_verde,
    saldo_totale,
    CASE 
        WHEN saldo_totale > 0 THEN 'Crescita'
        WHEN saldo_totale < 0 THEN 'Declino'
        ELSE 'Stabile'
    END as trend_demografico
FROM nil_qualita_vita
WHERE indice_qualita_vita IS NOT NULL
ORDER BY indice_qualita_vita DESC;

-- Vista per statistiche aggregate per cluster
CREATE VIEW IF NOT EXISTS vw_cluster_stats AS
SELECT 
    cd.cluster_id,
    cd.nome as cluster_nome,
    cd.descrizione,
    cd.colore,
    COUNT(*) as num_nil,
    ROUND(AVG(nqv.popolazione_totale), 0) as pop_media,
    ROUND(AVG(nqv.densita_abitanti_km2), 0) as densita_media,
    ROUND(AVG(nqv.pct_stranieri), 1) as pct_stranieri_media,
    ROUND(AVG(nqv.indice_verde_medio), 2) as verde_medio,
    ROUND(AVG(nqv.indice_qualita_vita), 2) as iqv_medio,
    ROUND(SUM(nqv.saldo_totale), 0) as saldo_totale_cluster
FROM cluster_definizioni cd
LEFT JOIN nil_clusters nc ON cd.cluster_id = nc.cluster_id
LEFT JOIN nil_qualita_vita nqv ON nc.nil = nqv.nil
GROUP BY cd.cluster_id, cd.nome, cd.descrizione, cd.colore;
