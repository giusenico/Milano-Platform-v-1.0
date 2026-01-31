-- Create the complete NIL analysis view
-- Combines nil_qualita_vita and nil_clusters for full data

DROP VIEW IF EXISTS vw_nil_analisi_completa;

CREATE VIEW vw_nil_analisi_completa AS
SELECT 
    nq.id_nil,
    nq.nil,
    nq.nil_norm,
    nq.area_km2,
    nq.popolazione_totale,
    nq.pct_stranieri,
    nq.densita_abitanti_km2,
    nq.famiglie_registrate,
    nq.famiglie_unipersonali,
    nq.nati_vivi,
    nq.morti,
    nq.immigrati,
    nq.emigrati,
    nq.saldo_naturale,
    nq.saldo_migratorio,
    nq.saldo_totale,
    nq.nuovi_fabbricati_residenziali,
    nq.abitazioni_nuove,
    nq.numero_scuole,
    nq.numero_mercati,
    nq.indice_verde_medio,
    nq.comp_verde,
    nq.comp_mercati,
    nq.comp_densita,
    nq.comp_dinamica,
    nq.indice_qualita_vita,
    COALESCE(nc.cluster_id, 0) as cluster_id,
    COALESCE(nc.cluster_nome, 'Non classificato') as cluster_nome,
    CASE nc.cluster_id
        WHEN 0 THEN '#3b82f6'
        WHEN 1 THEN '#22c55e'
        WHEN 2 THEN '#f59e0b'
        WHEN 3 THEN '#ef4444'
        ELSE '#6b7280'
    END as cluster_colore
FROM nil_qualita_vita nq
LEFT JOIN nil_clusters nc ON nq.nil = nc.nil;

-- Create the NIL ranking view if it doesn't exist
DROP VIEW IF EXISTS vw_nil_ranking;

CREATE VIEW vw_nil_ranking AS
SELECT 
    nil,
    id_nil,
    indice_qualita_vita,
    comp_verde,
    popolazione_totale,
    ROW_NUMBER() OVER (ORDER BY indice_qualita_vita DESC) as ranking_iqv,
    ROW_NUMBER() OVER (ORDER BY comp_verde DESC) as ranking_verde,
    ROW_NUMBER() OVER (ORDER BY popolazione_totale DESC) as ranking_popolazione
FROM nil_qualita_vita;
