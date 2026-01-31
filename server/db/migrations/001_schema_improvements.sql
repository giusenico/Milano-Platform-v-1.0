-- Baseline DB improvements: views, indexes, and uniqueness constraints
BEGIN;

CREATE VIEW IF NOT EXISTS vw_prezzi_medi_quartiere_norm AS
SELECT
  Quartiere AS quartiere_raw,
  trim(replace(Quartiere, '''', '')) AS quartiere,
  Semestre AS semestre,
  CAST(substr(Semestre, 1, 4) AS INTEGER) AS anno,
  CAST(substr(Semestre, 6, 1) AS INTEGER) AS semestre_num,
  Prezzo_Acquisto_Medio_EUR_mq AS prezzo_acquisto,
  Prezzo_Locazione_Medio_EUR_mq AS prezzo_locazione
FROM prezzi_medi_quartiere;

CREATE VIEW IF NOT EXISTS vw_popolazione_famiglie_norm AS
SELECT
  Anno AS anno,
  NIL AS nil_label,
  trim(substr(NIL, 1, instr(NIL, '(') - 1)) AS nil_name,
  CAST(trim(substr(NIL, instr(NIL, '(') + 1, instr(NIL, ')') - instr(NIL, '(') - 1)) AS INTEGER) AS id_nil,
  Classe_eta_capofamiglia AS classe_eta_capofamiglia,
  Genere_capofamiglia AS genere_capofamiglia,
  Numero_componenti AS numero_componenti,
  Tipologia_familiare AS tipologia_familiare,
  Cittadinanza AS cittadinanza,
  Famiglie AS famiglie
FROM popolazione_famiglie_tipologia_quartiere;

CREATE VIEW IF NOT EXISTS vw_dim_nil AS
SELECT DISTINCT
  id_nil,
  nil_name,
  nil_label
FROM vw_popolazione_famiglie_norm
WHERE id_nil IS NOT NULL;

CREATE VIEW IF NOT EXISTS vw_amenities_by_nil AS
SELECT
  d.id_nil,
  d.nil_name,
  d.nil_label,
  COALESCE(pe.pubblici_esercizi, 0) AS pubblici_esercizi,
  COALESCE(isport.impianti_sportivi, 0) AS impianti_sportivi,
  COALESCE(ss.servizi_sociali, 0) AS servizi_sociali,
  COALESCE(cp.comandi_polizia, 0) AS comandi_polizia
FROM vw_dim_nil d
LEFT JOIN (
  SELECT ID_NIL AS id_nil, COUNT(*) AS pubblici_esercizi
  FROM pubblici_esercizi_in_piano_attivita_commerciali
  WHERE ID_NIL IS NOT NULL
  GROUP BY ID_NIL
) pe ON pe.id_nil = d.id_nil
LEFT JOIN (
  SELECT ID_NIL AS id_nil, COUNT(*) AS impianti_sportivi
  FROM impianti_sportivi_comunali_in_concessione
  WHERE ID_NIL IS NOT NULL
  GROUP BY ID_NIL
) isport ON isport.id_nil = d.id_nil
LEFT JOIN (
  SELECT id_nil, COUNT(*) AS servizi_sociali
  FROM servizio_sociale_professionale_territoriale
  WHERE id_nil IS NOT NULL
  GROUP BY id_nil
) ss ON ss.id_nil = d.id_nil
LEFT JOIN (
  SELECT id_nil, COUNT(*) AS comandi_polizia
  FROM comandi_decentrati_polizia_locale
  WHERE id_nil IS NOT NULL
  GROUP BY id_nil
) cp ON cp.id_nil = d.id_nil;

CREATE VIEW IF NOT EXISTS vw_quotazioni_immobiliari_clean AS
SELECT
  Area_territoriale,
  Regione,
  Prov,
  Comune_ISTAT,
  Comune_cat,
  Sez,
  Comune_amm,
  Comune_descrizione,
  Fascia,
  Zona,
  LinkZona,
  Cod_Tip,
  Descr_Tipologia,
  Stato,
  Stato_prev,
  Compr_min,
  Compr_max,
  Sup_NL_compr,
  Loc_min,
  Loc_max,
  Sup_NL_loc,
  Semestre,
  Zona_Descr,
  Prezzo_acquisto_medio,
  Prezzo_locazione_medio
FROM quotazioni_immobiliari;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prezzi_medi_quartiere
ON prezzi_medi_quartiere (Quartiere, Semestre);
CREATE INDEX IF NOT EXISTS idx_prezzi_medi_quartiere_semestre
ON prezzi_medi_quartiere (Semestre);
CREATE INDEX IF NOT EXISTS idx_prezzi_medi_quartiere_quartiere
ON prezzi_medi_quartiere (Quartiere);

CREATE UNIQUE INDEX IF NOT EXISTS uq_indicatori_demografici
ON indicatori_demografici (territorio, indicatore, anno);
CREATE INDEX IF NOT EXISTS idx_indicatori_demografici_indicatore_anno
ON indicatori_demografici (indicatore, anno);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contribuenti_categorie
ON contribuenti_categorie (territorio, indicatore, anno);
CREATE INDEX IF NOT EXISTS idx_contribuenti_categorie_indicatore_anno
ON contribuenti_categorie (indicatore, anno);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contribuenti_classi
ON contribuenti_classi (territorio, indicatore, classe_importo, anno);
CREATE INDEX IF NOT EXISTS idx_contribuenti_classi_anno_indicatore
ON contribuenti_classi (anno, indicatore);

CREATE UNIQUE INDEX IF NOT EXISTS uq_indice_prezzi_abitazioni
ON indice_prezzi_abitazioni (categoria_abitazioni, periodo);
CREATE INDEX IF NOT EXISTS idx_indice_prezzi_abitazioni_categoria_periodo
ON indice_prezzi_abitazioni (categoria_abitazioni, periodo);

CREATE UNIQUE INDEX IF NOT EXISTS uq_popolazione_famiglie
ON popolazione_famiglie_tipologia_quartiere (
  Anno,
  NIL,
  Classe_eta_capofamiglia,
  Genere_capofamiglia,
  Numero_componenti,
  Tipologia_familiare,
  Cittadinanza
);
CREATE INDEX IF NOT EXISTS idx_popolazione_famiglie_anno_nil
ON popolazione_famiglie_tipologia_quartiere (Anno, NIL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trasporto_pubblico_locale
ON trasporto_pubblico_locale (anno, linee, rete);
CREATE INDEX IF NOT EXISTS idx_trasporto_pubblico_locale_anno
ON trasporto_pubblico_locale (anno);

CREATE UNIQUE INDEX IF NOT EXISTS uq_titolo_di_studi_residenti_nil
ON titolo_di_studi_residenti_nil (id_nil, titolo_di_studio);
CREATE INDEX IF NOT EXISTS idx_titolo_di_studi_residenti_nil_id
ON titolo_di_studi_residenti_nil (id_nil);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pubblici_esercizi
ON pubblici_esercizi_in_piano_attivita_commerciali (Codice);
CREATE INDEX IF NOT EXISTS idx_pubblici_esercizi_nil
ON pubblici_esercizi_in_piano_attivita_commerciali (ID_NIL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_impianti_sportivi
ON impianti_sportivi_comunali_in_concessione (OBJECTID);
CREATE INDEX IF NOT EXISTS idx_impianti_sportivi_nil
ON impianti_sportivi_comunali_in_concessione (ID_NIL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_servizio_sociale_territoriale
ON servizio_sociale_professionale_territoriale (
  sedi_servizio_sociale_professionale_territoriale,
  indirizzo,
  civico
);
CREATE INDEX IF NOT EXISTS idx_servizio_sociale_nil
ON servizio_sociale_professionale_territoriale (id_nil);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comandi_polizia_locale
ON comandi_decentrati_polizia_locale (nome_comando);
CREATE INDEX IF NOT EXISTS idx_comandi_polizia_nil
ON comandi_decentrati_polizia_locale (id_nil);

CREATE INDEX IF NOT EXISTS idx_quotazioni_immobiliari_lookup
ON quotazioni_immobiliari (Comune_ISTAT, Zona, Cod_Tip, Semestre);

COMMIT;
