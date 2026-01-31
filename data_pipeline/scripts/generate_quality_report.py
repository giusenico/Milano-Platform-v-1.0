#!/usr/bin/env python3
"""
Genera report di qualità dati in formato HTML e JSON.

Include:
- Statistiche per ogni dataset
- Risultati validazione
- Grafici e tabelle riassuntive
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from utils import (
    PROJECT_ROOT,
    DATA_RAW_DIR,
    DATA_CLEAN_DIR,
    DB_DIR,
    REPORTS_DIR,
    DEFAULT_DB_PATH,
    setup_logger,
    print_header,
    print_success,
    print_info,
    format_timestamp,
    ensure_directory,
    get_file_size_mb,
)
from validators import DataValidator, NILValidator, create_validator


# ─────────────────────────────────────────────────────────────────────────────
# Report generator
# ─────────────────────────────────────────────────────────────────────────────

class DataQualityReporter:
    """Genera report di qualità dati."""
    
    def __init__(
        self,
        db_path: Path = DEFAULT_DB_PATH,
        output_dir: Path = REPORTS_DIR,
    ):
        self.db_path = db_path
        self.output_dir = ensure_directory(output_dir)
        self.logger = setup_logger("quality_reporter")
        self.report_data: Dict[str, Any] = {
            "generated_at": format_timestamp(),
            "database_path": str(db_path),
            "tables": [],
            "summary": {},
            "validation_results": [],
        }
    
    def generate_report(self) -> Path:
        """Genera report completo."""
        print_header("REPORT QUALITÀ DATI")
        
        if not self.db_path.exists():
            self.logger.error(f"Database non trovato: {self.db_path}")
            return self._write_empty_report()
        
        conn = sqlite3.connect(self.db_path)
        
        try:
            # 1. Statistiche database
            self._collect_database_stats(conn)
            
            # 2. Analisi per tabella
            self._analyze_tables(conn)
            
            # 3. Validazione dati
            self._validate_data(conn)
            
            # 4. Genera summary
            self._generate_summary()
            
        finally:
            conn.close()
        
        # Scrivi report
        json_path = self._write_json_report()
        html_path = self._write_html_report()
        
        print_success(f"Report JSON: {json_path}")
        print_success(f"Report HTML: {html_path}")
        
        return html_path
    
    def _collect_database_stats(self, conn: sqlite3.Connection) -> None:
        """Raccoglie statistiche database."""
        print_info("Raccolta statistiche database...")
        
        # Tabelle
        tables = pd.read_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            conn,
        )["name"].tolist()
        
        # Indici
        indices = pd.read_sql(
            "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'",
            conn,
        )["name"].tolist()
        
        self.report_data["database"] = {
            "path": str(self.db_path),
            "size_mb": get_file_size_mb(self.db_path),
            "num_tables": len(tables),
            "num_indices": len(indices),
            "table_names": tables,
            "index_names": indices,
        }
    
    def _analyze_tables(self, conn: sqlite3.Connection) -> None:
        """Analizza ogni tabella."""
        print_info("Analisi tabelle...")
        
        tables = self.report_data["database"]["table_names"]
        
        for table in tables:
            try:
                df = pd.read_sql(f"SELECT * FROM {table}", conn)
                
                # Statistiche base
                table_stats = {
                    "name": table,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": list(df.columns),
                    "memory_mb": df.memory_usage(deep=True).sum() / (1024 * 1024),
                    "null_percentage": df.isnull().sum().sum() / df.size * 100 if df.size > 0 else 0,
                    "duplicate_rows": int(df.duplicated().sum()),
                }
                
                # Statistiche per colonna
                column_stats = []
                for col in df.columns:
                    series = df[col]
                    col_stat = {
                        "name": col,
                        "dtype": str(series.dtype),
                        "null_count": int(series.isnull().sum()),
                        "null_pct": series.isnull().mean() * 100,
                        "unique_count": int(series.nunique()),
                    }
                    
                    # Statistiche numeriche
                    if pd.api.types.is_numeric_dtype(series):
                        col_stat.update({
                            "min": float(series.min()) if series.notna().any() else None,
                            "max": float(series.max()) if series.notna().any() else None,
                            "mean": float(series.mean()) if series.notna().any() else None,
                        })
                    
                    column_stats.append(col_stat)
                
                table_stats["columns_detail"] = column_stats
                self.report_data["tables"].append(table_stats)
                
            except Exception as e:
                self.logger.warning(f"Errore analisi tabella {table}: {e}")
                self.report_data["tables"].append({
                    "name": table,
                    "error": str(e),
                })
    
    def _validate_data(self, conn: sqlite3.Connection) -> None:
        """Esegue validazione dati."""
        print_info("Validazione dati...")
        
        # Valida tabelle principali
        key_tables = [
            "dim_nil",
            "dim_tempo",
            "fact_demografia",
            "fact_immobiliare",
            "fact_servizi",
        ]
        
        for table in key_tables:
            try:
                df = pd.read_sql(f"SELECT * FROM {table}", conn)
                validator = create_validator(df, table)
                result = validator.validate()
                
                self.report_data["validation_results"].append({
                    "table": table,
                    "is_valid": result.is_valid,
                    "errors": result.errors,
                    "warnings": result.warnings,
                    "stats": result.stats,
                })
                
            except Exception as e:
                self.report_data["validation_results"].append({
                    "table": table,
                    "is_valid": False,
                    "errors": [f"Errore: {e}"],
                    "warnings": [],
                    "stats": {},
                })
    
    def _generate_summary(self) -> None:
        """Genera summary report."""
        tables = self.report_data["tables"]
        validations = self.report_data["validation_results"]
        
        total_rows = sum(t.get("rows", 0) for t in tables)
        total_cols = sum(t.get("columns", 0) for t in tables)
        
        valid_count = sum(1 for v in validations if v.get("is_valid", False))
        total_errors = sum(len(v.get("errors", [])) for v in validations)
        total_warnings = sum(len(v.get("warnings", [])) for v in validations)
        
        self.report_data["summary"] = {
            "total_tables": len(tables),
            "total_rows": total_rows,
            "total_columns": total_cols,
            "database_size_mb": self.report_data["database"]["size_mb"],
            "validation_passed": valid_count,
            "validation_failed": len(validations) - valid_count,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "quality_score": self._calculate_quality_score(),
        }
    
    def _calculate_quality_score(self) -> float:
        """Calcola punteggio qualità (0-100)."""
        score = 100.0
        
        # Penalità per tabelle con errori
        for table in self.report_data["tables"]:
            if "error" in table:
                score -= 10
            else:
                null_pct = table.get("null_percentage", 0)
                if null_pct > 50:
                    score -= 5
                elif null_pct > 20:
                    score -= 2
        
        # Penalità per validazioni fallite
        for validation in self.report_data["validation_results"]:
            if not validation.get("is_valid", True):
                score -= 5
            score -= len(validation.get("errors", [])) * 2
            score -= len(validation.get("warnings", [])) * 0.5
        
        return max(0, min(100, score))
    
    def _write_json_report(self) -> Path:
        """Scrive report JSON."""
        json_path = self.output_dir / "data_quality_report.json"
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(self.report_data, f, ensure_ascii=False, indent=2, default=str)
        return json_path
    
    def _write_html_report(self) -> Path:
        """Scrive report HTML."""
        html_path = self.output_dir / "data_quality_report.html"
        html_content = self._generate_html()
        html_path.write_text(html_content, encoding="utf-8")
        return html_path
    
    def _write_empty_report(self) -> Path:
        """Scrive report vuoto in caso di errore."""
        self.report_data["error"] = "Database non trovato"
        return self._write_json_report()
    
    def _generate_html(self) -> str:
        """Genera contenuto HTML."""
        summary = self.report_data.get("summary", {})
        database = self.report_data.get("database", {})
        tables = self.report_data.get("tables", [])
        validations = self.report_data.get("validation_results", [])
        
        # Determina colore quality score
        quality_score = summary.get("quality_score", 0)
        if quality_score >= 80:
            score_color = "#28a745"
        elif quality_score >= 60:
            score_color = "#ffc107"
        else:
            score_color = "#dc3545"
        
        # Genera righe tabelle
        table_rows = ""
        for t in tables:
            if "error" in t:
                table_rows += f"""
                <tr class="table-danger">
                    <td>{t['name']}</td>
                    <td colspan="4">Errore: {t['error']}</td>
                </tr>
                """
            else:
                table_rows += f"""
                <tr>
                    <td><strong>{t['name']}</strong></td>
                    <td>{t['rows']:,}</td>
                    <td>{t['columns']}</td>
                    <td>{t['null_percentage']:.1f}%</td>
                    <td>{t['duplicate_rows']:,}</td>
                </tr>
                """
        
        # Genera righe validazione
        validation_rows = ""
        for v in validations:
            status = "✓" if v.get("is_valid") else "✗"
            status_class = "success" if v.get("is_valid") else "danger"
            errors = "<br>".join(v.get("errors", [])[:3]) or "-"
            warnings = "<br>".join(v.get("warnings", [])[:3]) or "-"
            
            validation_rows += f"""
            <tr class="table-{status_class}">
                <td><strong>{v['table']}</strong></td>
                <td>{status}</td>
                <td>{errors}</td>
                <td>{warnings}</td>
            </tr>
            """
        
        html = f"""
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Qualità Dati - Api_Milano_Core</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .quality-score {{ font-size: 3rem; font-weight: bold; color: {score_color}; }}
        .card {{ margin-bottom: 1rem; }}
        .stat-card {{ text-align: center; padding: 1rem; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; color: #0d6efd; }}
        .stat-label {{ color: #6c757d; }}
    </style>
</head>
<body>
    <div class="container py-4">
        <h1 class="mb-4">📊 Report Qualità Dati</h1>
        <p class="text-muted">Generato: {self.report_data['generated_at']}</p>
        
        <!-- Summary Cards -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="quality-score">{quality_score:.0f}</div>
                    <div class="stat-label">Quality Score</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-value">{summary.get('total_tables', 0)}</div>
                    <div class="stat-label">Tabelle</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-value">{summary.get('total_rows', 0):,}</div>
                    <div class="stat-label">Righe Totali</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-value">{database.get('size_mb', 0):.2f} MB</div>
                    <div class="stat-label">Dimensione DB</div>
                </div>
            </div>
        </div>
        
        <!-- Tables Section -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">📋 Tabelle Database</h5>
            </div>
            <div class="card-body">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nome Tabella</th>
                            <th>Righe</th>
                            <th>Colonne</th>
                            <th>Null %</th>
                            <th>Duplicati</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Validation Section -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">✅ Risultati Validazione</h5>
            </div>
            <div class="card-body">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tabella</th>
                            <th>Status</th>
                            <th>Errori</th>
                            <th>Warning</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validation_rows}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Database Info -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">🗄️ Info Database</h5>
            </div>
            <div class="card-body">
                <ul>
                    <li><strong>Path:</strong> {database.get('path', 'N/A')}</li>
                    <li><strong>Dimensione:</strong> {database.get('size_mb', 0):.2f} MB</li>
                    <li><strong>Tabelle:</strong> {database.get('num_tables', 0)}</li>
                    <li><strong>Indici:</strong> {database.get('num_indices', 0)}</li>
                </ul>
            </div>
        </div>
        
        <footer class="mt-4 text-center text-muted">
            <p>Api_Milano_Core - Data Quality Report</p>
        </footer>
    </div>
</body>
</html>
        """
        
        return html


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Genera report qualità dati")
    parser.add_argument("--db", default="db/nil_core.db", help="Percorso database")
    parser.add_argument("--output", default="reports", help="Directory output")
    args = parser.parse_args()
    
    db_path = PROJECT_ROOT / args.db
    output_dir = PROJECT_ROOT / args.output
    
    reporter = DataQualityReporter(db_path, output_dir)
    reporter.generate_report()


if __name__ == "__main__":
    main()
