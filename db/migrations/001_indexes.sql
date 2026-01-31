-- ============================================================================
-- 001_indexes.sql
-- Indici e viste per ottimizzazione query su milano_unified.db
-- ============================================================================
-- Data creazione: 2024
-- Descrizione: Indici su colonne frequentemente interrogate per migliorare
--              performance delle query API e dashboard
-- ============================================================================

-- ============================================================================
-- INDICI DIMENSIONE NIL
-- ============================================================================

-- Indice primario su id_nil per join rapidi
CREATE INDEX IF NOT EXISTS idx_dim_nil_id_nil ON dim_nil(id_nil);
CREATE INDEX IF NOT EXISTS idx_dim_nil_nil ON dim_nil(nil);
CREATE INDEX IF NOT EXISTS idx_dim_nil_nil_norm ON dim_nil(nil_norm);

-- ============================================================================
-- INDICI DIMENSIONE TEMPO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dim_tempo_id_tempo ON dim_tempo(id_tempo);
CREATE INDEX IF NOT EXISTS idx_dim_tempo_anno ON dim_tempo(anno);
CREATE INDEX IF NOT EXISTS idx_dim_tempo_anno_data ON dim_tempo(anno, data);

-- ============================================================================
-- INDICI FACT TABLES
-- ============================================================================

-- Fact Demografia
CREATE INDEX IF NOT EXISTS idx_fact_demografia_id_nil ON fact_demografia(id_nil);
CREATE INDEX IF NOT EXISTS idx_fact_demografia_id_tempo ON fact_demografia(id_tempo);
CREATE INDEX IF NOT EXISTS idx_fact_demografia_composite ON fact_demografia(id_nil, id_tempo);

-- Fact Immobiliare
CREATE INDEX IF NOT EXISTS idx_fact_immobiliare_id_nil ON fact_immobiliare(id_nil);
CREATE INDEX IF NOT EXISTS idx_fact_immobiliare_id_tempo ON fact_immobiliare(id_tempo);
CREATE INDEX IF NOT EXISTS idx_fact_immobiliare_composite ON fact_immobiliare(id_nil, id_tempo);

-- Fact Servizi
CREATE INDEX IF NOT EXISTS idx_fact_servizi_id_nil ON fact_servizi(id_nil);

-- ============================================================================
-- INDICI DATASET GREZZI (nomi con ds_ prefix)
-- ============================================================================
-- Note: Create indexes only if tables and columns exist

-- Struttura demografica (skip - column names are encoded)
-- CREATE INDEX IF NOT EXISTS idx_demog_quartiere 
--     ON ds_01_struttura_demografica_caratteristiche_demografiche_quartieri_2011_2021(quartiere);

-- Famiglie (skip - column names are encoded) 
-- CREATE INDEX IF NOT EXISTS idx_famiglie_nil 
--     ON ds_01_struttura_demografica_famiglie_residenti_nil_1999_2024(NIL);

-- Stock abitativo (skip - column names are encoded)
-- CREATE INDEX IF NOT EXISTS idx_abitazioni_nil 
--     ON ds_03_stock_abitativo_abitazioni_occupate_nil_2011(NIL);

-- ============================================================================
-- INDICI PREZZI IMMOBILIARI
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prezzi_quartiere 
    ON prezzi_medi_quartiere(Quartiere);
CREATE INDEX IF NOT EXISTS idx_prezzi_semestre 
    ON prezzi_medi_quartiere(Semestre);
CREATE INDEX IF NOT EXISTS idx_prezzi_composite 
    ON prezzi_medi_quartiere(Quartiere, Semestre);

-- ============================================================================
-- INDICI DATA FRESHNESS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_freshness_source 
    ON data_freshness(source_name);
CREATE INDEX IF NOT EXISTS idx_freshness_sync 
    ON data_freshness(last_sync);

-- ============================================================================
-- VISTE MATERIALIZZATE (per query complesse frequenti)
-- ============================================================================

-- Vista NIL con dati più recenti
DROP VIEW IF EXISTS vw_nil_latest;
CREATE VIEW vw_nil_latest AS
SELECT 
    dn.id_nil,
    dn.nil,
    dn.nil_norm,
    dn.area_km2,
    fd.popolazione_totale,
    fd.pct_stranieri,
    fd.densita_abitanti_km2,
    dt.anno as ultimo_anno_dati
FROM dim_nil dn
LEFT JOIN (
    SELECT * FROM fact_demografia 
    WHERE id_tempo = (SELECT MAX(id_tempo) FROM fact_demografia)
) fd ON dn.id_nil = fd.id_nil
LEFT JOIN dim_tempo dt ON fd.id_tempo = dt.id_tempo;

-- Vista aggregata per API quartieri
DROP VIEW IF EXISTS vw_api_quartieri_summary;
CREATE VIEW vw_api_quartieri_summary AS
SELECT 
    dn.id_nil,
    dn.nil as nome,
    dn.nil_norm as nome_normalizzato,
    fd.popolazione_totale,
    fd.pct_stranieri,
    COALESCE(fs.numero_scuole, 0) as scuole,
    COALESCE(fs.numero_mercati, 0) as mercati,
    COALESCE(fs.indice_verde_medio, 0) as indice_verde
FROM dim_nil dn
LEFT JOIN (
    SELECT * FROM fact_demografia 
    WHERE id_tempo = (SELECT MAX(id_tempo) FROM fact_demografia)
) fd ON dn.id_nil = fd.id_nil
LEFT JOIN fact_servizi fs ON dn.id_nil = fs.id_nil;

-- Vista per compatibilità con server (vw_dim_nil)
DROP VIEW IF EXISTS vw_dim_nil;
CREATE VIEW vw_dim_nil AS
SELECT 
    id_nil,
    nil as nil_name,
    nil_norm as nil_label,
    area_km2,
    geometry
FROM dim_nil;

-- ============================================================================
-- ANALISI E VACUUM
-- ============================================================================

-- Aggiorna statistiche per query planner
ANALYZE;

-- Nota: VACUUM dovrebbe essere eseguito separatamente se necessario
-- VACUUM;
