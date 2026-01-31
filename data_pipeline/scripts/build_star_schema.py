#!/usr/bin/env python3
"""
Crea star schema (dim_nil, dim_tempo, fact_demografia, fact_immobiliare, fact_servizi)
utilizzando i dataset core caricati nel DB.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Dict, Optional

import pandas as pd


def normalize_nil(value: object) -> str:
    """
    Normalizza nome NIL per matching robusto.
    
    Gestisce:
    - Varianti di apostrofo (Unicode smart quotes vs ASCII)
    - Spazi dopo i punti (S.Vittore vs S. VITTORE)
    - Maiuscolo/minuscolo
    - Spazi multipli
    """
    if value is None:
        return ""
    text = str(value).strip().upper()
    # Sostituisci apostrofi Unicode con ASCII (U+2019, U+2018, U+0060)
    text = text.replace('\u2019', "'").replace('\u2018', "'").replace('\u0060', "'")
    # Normalizza spazi dopo i punti (es: "S.VITTORE" -> "S. VITTORE")
    text = re.sub(r'\.(\w)', r'. \1', text)
    # Rimuovi spazi multipli
    text = re.sub(r'\s+', ' ', text)
    return text


def extract_year(value: object) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            year = int(value)
            if 1800 <= year <= 2100:
                return year
        except Exception:
            return None
    text = str(value)
    for token in text.replace("/", "-").split("-"):
        token = token.strip()
        if token.isdigit() and len(token) == 4:
            year = int(token)
            if 1800 <= year <= 2100:
                return year
    digits = "".join([c for c in text if c.isdigit()])
    if len(digits) >= 4:
        year = int(digits[:4])
        if 1800 <= year <= 2100:
            return year
    return None


def build_dim_nil(conn: sqlite3.Connection) -> pd.DataFrame:
    df = pd.read_sql(
        "SELECT id_nil, nil, shape_area, shape_length, geometry FROM ds_00_base_geografica_nil_confini_pgt_2030",
        conn,
    )
    if "id_nil" not in df.columns or df["id_nil"].isna().any():
        df["id_nil"] = range(1, len(df) + 1)

    df["nil_norm"] = df["nil"].apply(normalize_nil)
    df["area_km2"] = df["shape_area"].apply(
        lambda x: float(x) / 1_000_000 if pd.notna(x) and float(x) > 0 else None
    )
    dim_nil = df[["id_nil", "nil", "nil_norm", "shape_area", "shape_length", "area_km2", "geometry"]].copy()
    dim_nil.to_sql("dim_nil", conn, if_exists="replace", index=False)
    return dim_nil


def build_dim_tempo(conn: sqlite3.Connection, datasets_core_path: Path) -> pd.DataFrame:
    years = set()
    for table, col in [
        ("ds_01_struttura_demografica_caratteristiche_demografiche_quartieri_2011_2021", "anno"),
        ("ds_01_struttura_demografica_popolazione_iscrizioni_quartiere_2004_2019", "anno_evento"),
        ("ds_01_struttura_demografica_popolazione_cancellazioni_quartiere_2004_2019", "anno_evento"),
        ("ds_01_struttura_demografica_popolazione_iscrizioni_quartiere_2020_2023", "anno_evento"),
        ("ds_01_struttura_demografica_popolazione_cancellazioni_quartiere_2020_2023", "anno_evento"),
        ("ds_03_stock_abitativo_nuovi_fabbricati_residenziali_2010_2023", "anno_ritiro"),
        ("ds_06_istruzione_famiglie_edifici_scolastici_2020_2021", "annoscolastico"),
    ]:
        try:
            df = pd.read_sql(f"SELECT {col} FROM {table}", conn)
            for value in df[col].dropna().tolist():
                year = extract_year(value)
                if year:
                    years.add(year)
        except Exception:
            continue

    if datasets_core_path.exists():
        payload = json.loads(datasets_core_path.read_text(encoding="utf-8"))
        for item in payload.get("datasets", []):
            year = item.get("as_of_year")
            if year:
                years.add(int(year))

    if not years:
        years.add(pd.Timestamp.now().year)

    dim_tempo = pd.DataFrame(sorted(years), columns=["anno"])
    dim_tempo["id_tempo"] = dim_tempo["anno"]
    dim_tempo["data"] = dim_tempo["anno"].apply(lambda y: f"{int(y)}-01-01")
    dim_tempo = dim_tempo[["id_tempo", "anno", "data"]]
    dim_tempo.to_sql("dim_tempo", conn, if_exists="replace", index=False)
    return dim_tempo


def build_fact_demografia(conn: sqlite3.Connection, dim_nil: pd.DataFrame) -> None:
    df = pd.read_sql(
        "SELECT * FROM ds_01_struttura_demografica_caratteristiche_demografiche_quartieri_2011_2021",
        conn,
    )
    df["nil_norm"] = df["quartiere"].apply(normalize_nil)
    df = df.merge(dim_nil[["id_nil", "nil_norm", "area_km2"]], on="nil_norm", how="left")
    df = df[df["id_nil"].notna()].copy()

    df["popolazione_totale"] = df["totale"]
    df["pct_stranieri"] = (df["stranieri"] / df["totale"] * 100).where(df["totale"] > 0)
    df["densita_abitanti_km2"] = (df["popolazione_totale"] / df["area_km2"]).where((df["area_km2"].notna()) & (df["area_km2"] > 0))

    fact = df[[
        "id_nil",
        "anno",
        "popolazione_totale",
        "pct_stranieri",
        "densita_abitanti_km2",
        "famiglie_registrate_in_anagrafe",
        "famiglie_unipersonali_registrate_in_anagrafe",
        "nati_vivi",
        "morti",
        "immigrati",
        "emigrati",
    ]].copy()
    fact.rename(columns={"anno": "id_tempo"}, inplace=True)
    fact.to_sql("fact_demografia", conn, if_exists="replace", index=False)


def build_fact_immobiliare(conn: sqlite3.Connection, dim_nil: pd.DataFrame) -> None:
    df = pd.read_sql(
        "SELECT * FROM ds_03_stock_abitativo_nuovi_fabbricati_residenziali_2010_2023",
        conn,
    )
    df["nil_norm"] = df["nil"].apply(normalize_nil)
    df["anno"] = df["anno_ritiro"].apply(extract_year)
    grouped = df.groupby(["nil_norm", "anno"], dropna=True).agg(
        nuovi_fabbricati_residenziali=("nil", "count"),
        abitazioni_nuove=("numero_abitazioni", "sum"),
        superficie_utile_abitabile=("superficie_utile_abitabile", "sum"),
        volume_totale=("volume_totale_v_p", "sum"),
    ).reset_index()

    grouped = grouped.merge(dim_nil[["id_nil", "nil_norm"]], on="nil_norm", how="left")
    grouped = grouped[grouped["id_nil"].notna() & grouped["anno"].notna()].copy()
    fact = grouped[["id_nil", "anno", "nuovi_fabbricati_residenziali", "abitazioni_nuove", "superficie_utile_abitabile", "volume_totale"]]
    fact.rename(columns={"anno": "id_tempo"}, inplace=True)
    fact.to_sql("fact_immobiliare", conn, if_exists="replace", index=False)


def build_fact_servizi(conn: sqlite3.Connection, dim_nil: pd.DataFrame) -> None:
    records = []

    # Scuole
    df_scuole = pd.read_sql("SELECT nil, annoscolastico FROM ds_06_istruzione_famiglie_edifici_scolastici_2020_2021", conn)
    df_scuole["nil_norm"] = df_scuole["nil"].apply(normalize_nil)
    df_scuole["anno"] = df_scuole["annoscolastico"].apply(extract_year)
    scuole = df_scuole.groupby(["nil_norm", "anno"], dropna=True).size().reset_index(name="numero_scuole")
    records.append(scuole)

    # Mercati coperti
    df_mc = pd.read_sql("SELECT nil FROM ds_05_servizi_essenziali_mercati_comunali_coperti", conn)
    df_mc["nil_norm"] = df_mc["nil"].apply(normalize_nil)
    df_mc["anno"] = 2024
    mc = df_mc.groupby(["nil_norm", "anno"], dropna=True).size().reset_index(name="numero_mercati_coperti")
    records.append(mc)

    # Mercati settimanali
    df_ms = pd.read_sql("SELECT nil FROM ds_05_servizi_essenziali_mercati_settimanali_scoperti", conn)
    df_ms["nil_norm"] = df_ms["nil"].apply(normalize_nil)
    df_ms["anno"] = 2024
    ms = df_ms.groupby(["nil_norm", "anno"], dropna=True).size().reset_index(name="numero_mercati_settimanali")
    records.append(ms)

    # Verde urbano
    df_verde = pd.read_sql("SELECT nil, value FROM ds_04_qualita_ambientale_indice_verde_urbano_nil_2024", conn)
    df_verde["nil_norm"] = df_verde["nil"].apply(normalize_nil)
    df_verde["anno"] = 2024
    verde = df_verde.groupby(["nil_norm", "anno"], dropna=True).agg(indice_verde_medio=("value", "mean")).reset_index()
    records.append(verde)

    # Unione
    fact = None
    for df in records:
        if fact is None:
            fact = df
        else:
            fact = fact.merge(df, on=["nil_norm", "anno"], how="outer")

    if fact is None:
        return

    fact = fact.merge(dim_nil[["id_nil", "nil_norm"]], on="nil_norm", how="left")
    fact = fact[fact["id_nil"].notna() & fact["anno"].notna()].copy()

    fact["numero_mercati"] = fact[["numero_mercati_coperti", "numero_mercati_settimanali"]].sum(axis=1, skipna=True)

    output = fact[[
        "id_nil",
        "anno",
        "numero_scuole",
        "numero_mercati",
        "indice_verde_medio",
    ]].copy()
    output.rename(columns={"anno": "id_tempo"}, inplace=True)
    output.to_sql("fact_servizi", conn, if_exists="replace", index=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Costruisce lo star schema nel DB core")
    parser.add_argument("--db", default="db/nil_core.db", help="Percorso DB (default: db/nil_core.db)")
    parser.add_argument("--config", default="config/datasets_core.json", help="Config core datasets")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    db_path = project_root / args.db
    config_path = project_root / args.config

    conn = sqlite3.connect(db_path)
    dim_nil = build_dim_nil(conn)
    build_dim_tempo(conn, config_path)
    build_fact_demografia(conn, dim_nil)
    build_fact_immobiliare(conn, dim_nil)
    build_fact_servizi(conn, dim_nil)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()
