#!/usr/bin/env python3
"""
Crea Master GeoJSON/CSV a partire da dim_nil + fact tables (ultimo anno disponibile).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Optional

import pandas as pd
import geopandas as gpd
from shapely.geometry import shape


def parse_geometry(value: Optional[str]):
    if value is None:
        return None
    if isinstance(value, dict):
        return shape(value)
    try:
        payload = json.loads(value)
        return shape(payload) if payload else None
    except Exception:
        return None


def latest_snapshot(df: pd.DataFrame, key: str = "id_tempo") -> pd.DataFrame:
    if df.empty:
        return df
    latest = df[key].dropna().max()
    return df[df[key] == latest].copy()


def main() -> None:
    parser = argparse.ArgumentParser(description="Costruisce master dataset geo per NIL core")
    parser.add_argument("--db", default="db/nil_core.db", help="Percorso DB (default: db/nil_core.db)")
    parser.add_argument("--output-dir", default="data_clean", help="Directory output (default: data_clean)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    db_path = project_root / args.db
    output_dir = project_root / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)

    dim_nil = pd.read_sql("SELECT * FROM dim_nil", conn)
    dim_nil["geometry"] = dim_nil["geometry"].apply(parse_geometry)
    gdf = gpd.GeoDataFrame(dim_nil, geometry="geometry", crs="EPSG:4326")

    fact_demografia = pd.read_sql("SELECT * FROM fact_demografia", conn)
    fact_immobiliare = pd.read_sql("SELECT * FROM fact_immobiliare", conn)
    fact_servizi = pd.read_sql("SELECT * FROM fact_servizi", conn)

    conn.close()

    fact_demografia = latest_snapshot(fact_demografia)
    fact_immobiliare = latest_snapshot(fact_immobiliare)
    fact_servizi = latest_snapshot(fact_servizi)

    if not fact_demografia.empty:
        gdf = gdf.merge(fact_demografia, on="id_nil", how="left", suffixes=("", "_demo"))
    if not fact_immobiliare.empty:
        gdf = gdf.merge(fact_immobiliare, on="id_nil", how="left", suffixes=("", "_imm"))
    if not fact_servizi.empty:
        gdf = gdf.merge(fact_servizi, on="id_nil", how="left", suffixes=("", "_serv"))

    geojson_path = output_dir / "master_nil_core.geojson"
    csv_path = output_dir / "master_nil_core.csv"

    try:
        gdf.to_file(geojson_path, driver="GeoJSON")
    except Exception:
        for col in gdf.columns:
            if pd.api.types.is_datetime64_any_dtype(gdf[col]):
                gdf[col] = gdf[col].astype(str)
        gdf.to_file(geojson_path, driver="GeoJSON")

    gdf.drop(columns=["geometry"], errors="ignore").to_csv(csv_path, index=False)


if __name__ == "__main__":
    main()
