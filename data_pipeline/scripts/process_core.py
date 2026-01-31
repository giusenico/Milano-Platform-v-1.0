#!/usr/bin/env python3
"""
Processa i dataset CORE NIL scaricati:
- catalogazione (righe/colonne)
- pulizia base (nomi colonne, spazi, numeri, date)
- caricamento in SQLite
- esportazione catalogo
"""

import argparse
import json
import logging
import re
import sqlite3
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import pandas as pd


DEFAULT_EXTENSIONS = {".csv", ".geojson", ".json"}
IDENTIFIER_HINTS = ("id", "cod", "codice", "istat", "cap", "civico")
DATE_HINTS = ("data", "date")
YEAR_HINTS = ("anno", "year")
GEOMETRY_COLUMN = "_geometry"


def setup_logger(output_dir: Path, verbose: bool) -> logging.Logger:
    output_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("nil_processor")
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.propagate = False
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    log_file = output_dir / "process.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def run_download_script(script_dir: Path, extra_args: List[str], logger: logging.Logger) -> None:
    download_script = script_dir / "download_core.py"
    if not download_script.exists():
        raise FileNotFoundError(f"Download script non trovato: {download_script}")

    cmd = [sys.executable, str(download_script)]
    if extra_args:
        cmd.extend(extra_args)
    logger.info("Esecuzione download: %s", " ".join(cmd))
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Download fallito con codice {result.returncode}")


def load_metadata(metadata_path: Path) -> Dict[str, Dict[str, str]]:
    if not metadata_path.exists():
        return {}

    with metadata_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    metadata_map: Dict[str, Dict[str, str]] = {}
    for category_key, category in data.get("categorie", {}).items():
        for dataset in category.get("datasets", []):
            filename = dataset.get("filename")
            if not filename:
                continue
            metadata_map[filename] = {
                "categoria": category_key,
                "categoria_nome": category.get("nome", ""),
                "descrizione": dataset.get("descrizione", ""),
            }
    return metadata_map


def discover_files(input_dir: Path, extensions: Iterable[str]) -> List[Path]:
    files: List[Path] = []
    for path in input_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in extensions:
            continue
        if "cleaned" in path.parts:
            continue
        if path.name in {"metadata_download.json", "download.log"}:
            continue
        files.append(path)
    return sorted(files)


def normalize_column_name(name: str) -> str:
    name = unicodedata.normalize("NFKD", str(name))
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name or "col"


def dedupe_columns(columns: List[str]) -> Tuple[List[str], Dict[str, str]]:
    seen: Dict[str, int] = {}
    mapping: Dict[str, str] = {}
    deduped: List[str] = []
    for original in columns:
        base = normalize_column_name(original)
        count = seen.get(base, 0)
        new_name = base if count == 0 else f"{base}_{count + 1}"
        seen[base] = count + 1
        mapping[original] = new_name
        deduped.append(new_name)
    return deduped, mapping


def is_geojson(payload: object) -> bool:
    return isinstance(payload, dict) and payload.get("type") == "FeatureCollection" and "features" in payload


def load_geojson(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    features = payload.get("features") or []
    records = []
    for feature in features:
        properties = feature.get("properties") or {}
        record = dict(properties)
        record[GEOMETRY_COLUMN] = feature.get("geometry")
        records.append(record)
    return pd.DataFrame(records)


def load_json(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if is_geojson(payload):
        return load_geojson(path)

    if isinstance(payload, list):
        return pd.json_normalize(payload)

    if isinstance(payload, dict):
        for key in ("data", "records", "result", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return pd.json_normalize(value)
        return pd.json_normalize(payload)

    return pd.DataFrame()


def read_csv_with_fallback(path: Path) -> pd.DataFrame:
    encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252"]
    last_error: Optional[Exception] = None
    for encoding in encodings:
        try:
            try:
                return pd.read_csv(
                    path,
                    sep=None,
                    engine="python",
                    dtype=str,
                    encoding=encoding,
                    on_bad_lines="skip",
                )
            except TypeError:
                return pd.read_csv(
                    path,
                    sep=None,
                    engine="python",
                    dtype=str,
                    encoding=encoding,
                    error_bad_lines=False,
                    warn_bad_lines=True,
                )
        except Exception as exc:  # noqa: BLE001 - fallback through encodings
            last_error = exc
            continue
    raise RuntimeError(f"Impossibile leggere CSV {path}: {last_error}")


def load_dataset(path: Path) -> Tuple[pd.DataFrame, str]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return read_csv_with_fallback(path), "csv"
    if suffix == ".geojson":
        return load_geojson(path), "geojson"
    if suffix == ".json":
        return load_json(path), "json"
    raise ValueError(f"Formato non supportato: {path}")


def coerce_numeric_series(series: pd.Series) -> pd.Series:
    values = series.astype("string")
    cleaned = values.str.replace(" ", "", regex=False)

    mask_both = cleaned.str.contains(",", regex=False) & cleaned.str.contains(".", regex=False)
    cleaned = cleaned.where(
        ~mask_both,
        cleaned.str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
    )

    mask_comma = cleaned.str.contains(",", regex=False) & ~cleaned.str.contains(".", regex=False)
    cleaned = cleaned.where(~mask_comma, cleaned.str.replace(",", ".", regex=False))

    return pd.to_numeric(cleaned, errors="coerce")


def maybe_parse_datetime(series: pd.Series) -> Optional[pd.Series]:
    values = series.dropna().astype("string")
    if values.empty:
        return None
    if not values.str.contains(r"\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|\d{4}-\d{2}-\d{2}").any():
        return None

    parsed = pd.to_datetime(series, errors="coerce", dayfirst=True, format="mixed")
    if parsed.notna().mean() >= 0.8:
        return parsed
    return None


def infer_types(df: pd.DataFrame) -> pd.DataFrame:
    for column in df.columns:
        if column == GEOMETRY_COLUMN:
            continue
        series = df[column]
        if pd.api.types.is_numeric_dtype(series) or pd.api.types.is_datetime64_any_dtype(series):
            continue
        if series.dropna().empty:
            continue

        column_lower = column.lower()
        if any(hint in column_lower for hint in DATE_HINTS):
            parsed = maybe_parse_datetime(series)
            if parsed is not None:
                df[column] = parsed
                continue

        if any(hint in column_lower for hint in YEAR_HINTS):
            numeric = coerce_numeric_series(series)
            if numeric.notna().mean() >= 0.9:
                df[column] = numeric.round(0).astype("Int64")
                continue

        if any(hint in column_lower for hint in IDENTIFIER_HINTS):
            continue

        numeric = coerce_numeric_series(series)
        if numeric.notna().mean() >= 0.9:
            df[column] = numeric
            continue

        parsed = maybe_parse_datetime(series)
        if parsed is not None:
            df[column] = parsed

    return df


def clean_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
    if df.empty:
        return df, {}

    df = df.copy()
    df.columns, mapping = dedupe_columns(list(df.columns))
    df = df.replace(r"^\s*$", pd.NA, regex=True)

    for column in df.select_dtypes(include=["object"]).columns:
        df[column] = df[column].astype("string").str.strip()

    if GEOMETRY_COLUMN in df.columns:
        df[GEOMETRY_COLUMN] = df[GEOMETRY_COLUMN].apply(
            lambda value: json.dumps(value, ensure_ascii=True) if pd.notna(value) else None
        )

    df = infer_types(df)
    df = df.dropna(axis=1, how="all")
    return df, mapping


def sanitize_table_name(category: str, filename: str) -> str:
    base = f"ds_{category}_{Path(filename).stem}"
    base = normalize_column_name(base)
    return base or "dataset"


def export_clean_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def build_catalog_record(
    table_name: str,
    path: Path,
    category: str,
    category_name: str,
    description: str,
    dataset_format: str,
    df: pd.DataFrame,
    mapping: Dict[str, str],
    error: Optional[str] = None,
) -> Dict[str, object]:
    return {
        "table_name": table_name,
        "filename": path.name,
        "category": category,
        "category_name": category_name,
        "description": description,
        "format": dataset_format,
        "rows": int(df.shape[0]) if error is None else 0,
        "columns": int(df.shape[1]) if error is None else 0,
        "column_names": list(df.columns) if error is None else [],
        "column_mapping": mapping,
        "source_path": str(path),
        "file_size_kb": round(path.stat().st_size / 1024, 3),
        "processed_at": datetime.utcnow().isoformat(),
        "error": error or "",
    }


def write_catalog(records: List[Dict[str, object]], csv_path: Path, json_path: Path) -> None:
    df = pd.DataFrame(records)
    df.to_csv(csv_path, index=False)
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def process_datasets(
    input_dir: Path,
    metadata_path: Path,
    db_path: Path,
    clean_dir: Path,
    export_clean: bool,
    categories: Optional[List[str]],
    no_db: bool,
    sample_rows: int,
    logger: logging.Logger,
) -> None:
    metadata_map = load_metadata(metadata_path)
    files = discover_files(input_dir, DEFAULT_EXTENSIONS)
    if not files:
        logger.warning("Nessun dataset trovato in %s", input_dir)
        return

    category_set = set(categories or [])

    if not no_db:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(db_path)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS dataset_catalog (
                table_name TEXT PRIMARY KEY,
                filename TEXT,
                category TEXT,
                category_name TEXT,
                description TEXT,
                format TEXT,
                rows INTEGER,
                columns INTEGER,
                column_names TEXT,
                column_mapping TEXT,
                source_path TEXT,
                file_size_kb REAL,
                processed_at TEXT,
                error TEXT
            )
            """
        )
    else:
        conn = None

    records: List[Dict[str, object]] = []
    for path in files:
        metadata = metadata_map.get(path.name, {})
        category = metadata.get("categoria") or path.parent.name
        if category_set and category not in category_set:
            continue
        category_name = metadata.get("categoria_nome", "")
        description = metadata.get("descrizione", "")
        table_name = sanitize_table_name(category, path.name)

        try:
            df, dataset_format = load_dataset(path)
            df, mapping = clean_dataframe(df)
            logger.info(
                "Processato %s (%s): %d righe, %d colonne",
                path.name,
                dataset_format,
                df.shape[0],
                df.shape[1],
            )

            if sample_rows > 0 and not df.empty:
                logger.info("Esempio %s:\n%s", path.name, df.head(sample_rows).to_string(index=False))

            if export_clean:
                relative = path.relative_to(input_dir)
                clean_path = clean_dir / relative.with_suffix(".csv")
                export_clean_csv(df, clean_path)

            if conn is not None:
                df.to_sql(table_name, conn, if_exists="replace", index=False)

            record = build_catalog_record(
                table_name,
                path,
                category,
                category_name,
                description,
                dataset_format,
                df,
                mapping,
            )
        except Exception as exc:  # noqa: BLE001 - per-dataset failure
            logger.exception("Errore su %s: %s", path.name, exc)
            record = build_catalog_record(
                table_name,
                path,
                category,
                category_name,
                description,
                "unknown",
                pd.DataFrame(),
                {},
                error=str(exc),
            )

        records.append(record)

        if conn is not None:
            conn.execute(
                """
                INSERT OR REPLACE INTO dataset_catalog (
                    table_name,
                    filename,
                    category,
                    category_name,
                    description,
                    format,
                    rows,
                    columns,
                    column_names,
                    column_mapping,
                    source_path,
                    file_size_kb,
                    processed_at,
                    error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["table_name"],
                    record["filename"],
                    record["category"],
                    record["category_name"],
                    record["description"],
                    record["format"],
                    record["rows"],
                    record["columns"],
                    json.dumps(record["column_names"], ensure_ascii=False),
                    json.dumps(record["column_mapping"], ensure_ascii=False),
                    record["source_path"],
                    record["file_size_kb"],
                    record["processed_at"],
                    record["error"],
                ),
            )

    if not records:
        logger.warning("Nessun dataset processato.")
        if conn is not None:
            conn.close()
        return

    if conn is not None:
        conn.commit()
        conn.close()
        logger.info("Database creato: %s", db_path)

    catalog_csv = input_dir / "catalogo_dataset_nil.csv"
    catalog_json = input_dir / "catalogo_dataset_nil.json"
    write_catalog(records, catalog_csv, catalog_json)
    logger.info("Catalogo creato: %s", catalog_csv)


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    default_input = project_root / "data_raw"
    default_db = project_root / "db" / "nil_core.db"
    default_metadata = default_input / "metadata_download.json"
    default_clean_dir = project_root / "data_clean"

    parser = argparse.ArgumentParser(
        description="Catalogazione, pulizia e caricamento DB dei dataset NIL scaricati.",
    )
    parser.add_argument(
        "-i",
        "--input-dir",
        default=str(default_input),
        help="Directory con i dataset scaricati (default: data_raw)",
    )
    parser.add_argument(
        "--metadata",
        default=str(default_metadata),
        help="File metadata_download.json (default: data_raw/metadata_download.json)",
    )
    parser.add_argument(
        "--db-path",
        default=str(default_db),
        help="Percorso DB SQLite (default: db/nil_core.db)",
    )
    parser.add_argument(
        "--clean-dir",
        default=str(default_clean_dir),
        help="Directory per esportare i CSV puliti (default: data_clean)",
    )
    parser.add_argument(
        "--export-clean",
        action="store_true",
        help="Esporta i dataset puliti in CSV nella clean-dir",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Salta il caricamento nel database SQLite",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Processa solo le categorie indicate (es. 01_struttura_demografica)",
    )
    parser.add_argument(
        "--sample-rows",
        type=int,
        default=0,
        help="Stampa un estratto per ogni dataset (numero righe)",
    )
    parser.add_argument(
        "--run-download",
        action="store_true",
        help="Esegue prima il download dei dataset",
    )
    parser.add_argument(
        "--download-args",
        nargs=argparse.REMAINDER,
        default=[],
        help="Argomenti aggiuntivi per download_nil_datasets.py",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Output verboso",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    input_dir = Path(args.input_dir)
    metadata_path = Path(args.metadata)
    db_path = Path(args.db_path)
    clean_dir = Path(args.clean_dir)

    logger = setup_logger(input_dir, args.verbose)

    if args.run_download:
        run_download_script(script_dir, args.download_args, logger)

    process_datasets(
        input_dir=input_dir,
        metadata_path=metadata_path,
        db_path=db_path,
        clean_dir=clean_dir,
        export_clean=args.export_clean,
        categories=args.categories,
        no_db=args.no_db,
        sample_rows=args.sample_rows,
        logger=logger,
    )


if __name__ == "__main__":
    main()
