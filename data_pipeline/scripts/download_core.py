#!/usr/bin/env python3
"""
Download dei dataset CORE NIL da Open Data Milano (solo set essenziale).
Genera anche metadata_download.json compatibile con process_core.py.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests

API_BASE_URL = "https://dati.comune.milano.it/api/3/action"
REQUESTS_DELAY = 0.5
TIMEOUT = 60
MAX_RETRIES = 3


@dataclass
class CoreDataset:
    category: str
    id: str
    resource_id: str
    filename: str
    format: str
    description: str
    url: str
    as_of_year: Optional[int] = None


def setup_logger(log_dir: Path, verbose: bool) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("core_downloader")
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.propagate = False

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    file_handler = logging.FileHandler(log_dir / "download.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    return logger


def load_config(config_path: Path) -> List[CoreDataset]:
    payload = json.loads(config_path.read_text(encoding="utf-8"))
    datasets = []
    for item in payload.get("datasets", []):
        datasets.append(
            CoreDataset(
                category=item["category"],
                id=item["id"],
                resource_id=item["resource_id"],
                filename=item["filename"],
                format=item.get("format", "csv"),
                description=item.get("description", ""),
                url=item["url"],
                as_of_year=item.get("as_of_year"),
            )
        )
    return datasets


def request_with_retries(url: str, logger: logging.Logger) -> requests.Response:
    last_error: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(url, timeout=TIMEOUT)
            response.raise_for_status()
            return response
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Tentativo %s fallito: %s", attempt, exc)
            time.sleep(REQUESTS_DELAY * attempt)
    raise RuntimeError(f"Download fallito: {last_error}")


def download_dataset(ds: CoreDataset, output_dir: Path, force: bool, logger: logging.Logger) -> Dict[str, str]:
    category_dir = output_dir / ds.category
    category_dir.mkdir(parents=True, exist_ok=True)
    destination = category_dir / ds.filename

    if destination.exists() and not force:
        logger.info("Skip (gia presente): %s", destination)
        return {
            "status": "skipped",
            "path": str(destination),
        }

    logger.info("Download: %s", ds.filename)
    try:
        response = request_with_retries(ds.url, logger)
        destination.write_bytes(response.content)
        return {
            "status": "downloaded",
            "path": str(destination),
        }
    except Exception as e:
        logger.error("Errore download %s: %s", ds.filename, str(e))
        return {
            "status": "error",
            "path": "",
            "error": str(e),
        }


def check_updates(datasets: List[CoreDataset]) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    for ds in datasets:
        try:
            resp = requests.get(f"{API_BASE_URL}/package_show", params={"id": ds.id}, timeout=TIMEOUT)
            resp.raise_for_status()
            payload = resp.json()
            modified = payload.get("result", {}).get("metadata_modified", "")
            results.append({
                "filename": ds.filename,
                "dataset_id": ds.id,
                "last_modified": modified,
            })
            time.sleep(REQUESTS_DELAY)
        except Exception:
            results.append({
                "filename": ds.filename,
                "dataset_id": ds.id,
                "last_modified": "",
            })
    return results


def write_metadata(output_dir: Path, datasets: List[CoreDataset], results: Dict[str, Dict[str, str]]) -> Path:
    categories: Dict[str, Dict[str, object]] = {}
    for ds in datasets:
        category = categories.setdefault(
            ds.category,
            {
                "nome": ds.category,
                "descrizione": "",
                "datasets": [],
            },
        )
        download_info = results.get(ds.filename, {})
        category["datasets"].append(
            {
                "filename": ds.filename,
                "descrizione": ds.description,
                "format": ds.format,
                "resource_id": ds.resource_id,
                "dataset_id": ds.id,
                "url": ds.url,
                "as_of_year": ds.as_of_year,
                "status": download_info.get("status", "unknown"),
                "path": download_info.get("path", ""),
            }
        )

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "categorie": categories,
    }

    metadata_path = output_dir / "metadata_download.json"
    metadata_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Download core dataset NIL (set essenziale).")
    parser.add_argument("--config", default="config/datasets_core.json", help="Percorso config JSON.")
    parser.add_argument("--output", default="data_raw", help="Directory di output (default: data_raw)")
    parser.add_argument("--force", action="store_true", help="Forza riscaricamento")
    parser.add_argument("--check-updates", action="store_true", help="Verifica aggiornamenti")
    parser.add_argument("--verbose", "-v", action="store_true", help="Output dettagliato")

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    config_path = project_root / args.config
    output_dir = project_root / args.output

    logger = setup_logger(project_root / "logs", args.verbose)

    datasets = load_config(config_path)

    if args.check_updates:
        updates = check_updates(datasets)
        for item in updates:
            logger.info("%s -> %s", item["filename"], item["last_modified"])
        return

    results: Dict[str, Dict[str, str]] = {}
    for ds in datasets:
        info = download_dataset(ds, output_dir, args.force, logger)
        results[ds.filename] = info
        time.sleep(REQUESTS_DELAY)

    metadata_path = write_metadata(output_dir, datasets, results)
    logger.info("Metadata salvato: %s", metadata_path)


if __name__ == "__main__":
    main()
