#!/usr/bin/env python3
"""
Modulo di validazione dati per Api_Milano_Core.

Contiene:
- DataValidator: validatore generico per DataFrame
- NILValidator: validatore specifico per dati NIL
- SchemaValidator: validatore basato su schema Pydantic
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set

import pandas as pd

from utils import ValidationResult, normalize_nil_name


# ─────────────────────────────────────────────────────────────────────────────
# Regole di validazione
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ValidationRule:
    """Singola regola di validazione."""
    name: str
    description: str
    check: Callable[[pd.DataFrame], bool]
    severity: str = "error"  # "error" | "warning"
    columns: Optional[List[str]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Validatori
# ─────────────────────────────────────────────────────────────────────────────

class DataValidator:
    """Validatore generico per DataFrame."""
    
    def __init__(self, df: pd.DataFrame, name: str = "dataset"):
        self.df = df
        self.name = name
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.stats: Dict[str, Any] = {}
    
    def validate(self) -> ValidationResult:
        """Esegue tutte le validazioni."""
        self._compute_basic_stats()
        self._check_empty()
        self._check_duplicates()
        self._check_null_columns()
        self._check_data_types()
        
        return ValidationResult(
            is_valid=len(self.errors) == 0,
            errors=self.errors,
            warnings=self.warnings,
            stats=self.stats,
        )
    
    def _compute_basic_stats(self) -> None:
        """Calcola statistiche base."""
        self.stats = {
            "rows": len(self.df),
            "columns": len(self.df.columns),
            "memory_mb": self.df.memory_usage(deep=True).sum() / (1024 * 1024),
            "null_percentage": self.df.isnull().sum().sum() / self.df.size * 100 if self.df.size > 0 else 0,
            "duplicate_rows": self.df.duplicated().sum(),
            "column_types": self.df.dtypes.astype(str).to_dict(),
        }
    
    def _check_empty(self) -> None:
        """Verifica dataset non vuoto."""
        if self.df.empty:
            self.errors.append(f"{self.name}: Dataset vuoto")
        elif len(self.df) < 5:
            self.warnings.append(f"{self.name}: Poche righe ({len(self.df)})")
    
    def _check_duplicates(self) -> None:
        """Verifica righe duplicate."""
        dup_count = self.df.duplicated().sum()
        if dup_count > 0:
            dup_pct = dup_count / len(self.df) * 100
            if dup_pct > 50:
                self.errors.append(
                    f"{self.name}: Troppe righe duplicate ({dup_count}, {dup_pct:.1f}%)"
                )
            elif dup_pct > 10:
                self.warnings.append(
                    f"{self.name}: Righe duplicate rilevate ({dup_count}, {dup_pct:.1f}%)"
                )
    
    def _check_null_columns(self) -> None:
        """Verifica colonne completamente nulle."""
        null_cols = self.df.columns[self.df.isnull().all()].tolist()
        if null_cols:
            self.warnings.append(
                f"{self.name}: Colonne completamente nulle: {null_cols}"
            )
    
    def _check_data_types(self) -> None:
        """Verifica tipi di dato sensati."""
        for col in self.df.columns:
            series = self.df[col]
            
            # Verifica se colonna numerica ha valori anomali
            if pd.api.types.is_numeric_dtype(series):
                if series.notna().any():
                    min_val = series.min()
                    max_val = series.max()
                    if abs(max_val - min_val) > 1e15:
                        self.warnings.append(
                            f"{self.name}.{col}: Range numerico molto ampio"
                        )
    
    def check_required_columns(self, columns: List[str]) -> "DataValidator":
        """Verifica presenza colonne richieste."""
        missing = [c for c in columns if c not in self.df.columns]
        if missing:
            self.errors.append(
                f"{self.name}: Colonne richieste mancanti: {missing}"
            )
        return self
    
    def check_unique(self, column: str) -> "DataValidator":
        """Verifica unicità valori in colonna."""
        if column not in self.df.columns:
            return self
        
        dup_count = self.df[column].duplicated().sum()
        if dup_count > 0:
            self.warnings.append(
                f"{self.name}.{column}: {dup_count} valori duplicati"
            )
        return self
    
    def check_range(
        self,
        column: str,
        min_val: Optional[float] = None,
        max_val: Optional[float] = None,
    ) -> "DataValidator":
        """Verifica valori in range."""
        if column not in self.df.columns:
            return self
        
        series = pd.to_numeric(self.df[column], errors="coerce")
        
        if min_val is not None:
            below = (series < min_val).sum()
            if below > 0:
                self.warnings.append(
                    f"{self.name}.{column}: {below} valori sotto {min_val}"
                )
        
        if max_val is not None:
            above = (series > max_val).sum()
            if above > 0:
                self.warnings.append(
                    f"{self.name}.{column}: {above} valori sopra {max_val}"
                )
        
        return self
    
    def check_not_null(self, column: str, threshold: float = 0.9) -> "DataValidator":
        """Verifica colonna non troppo nulla."""
        if column not in self.df.columns:
            return self
        
        not_null_pct = self.df[column].notna().mean()
        if not_null_pct < threshold:
            self.errors.append(
                f"{self.name}.{column}: Troppi null ({(1-not_null_pct)*100:.1f}%)"
            )
        
        return self


class NILValidator(DataValidator):
    """Validatore specifico per dati NIL Milano."""
    
    # NIL validi conosciuti (subset per validazione)
    KNOWN_NILS: Set[str] = {
        "DUOMO", "BRERA", "GIARDINI PORTA VENEZIA", "GUASTALLA", "PORTA VENEZIA",
        "MAGENTA", "PARCO SEMPIONE", "SARPI", "PAGANO", "BUENOS AIRES",
        "LORETO", "PADOVA", "TURRO", "ADRIANO", "GRECO", "NIGUARDA",
        "BOVISA", "VILLAPIZZONE", "QT 8", "GALLARATESE", "TRENNO",
        "FIGINO", "SAN SIRO", "BAGGIO", "QUARTO CAGNINO", "DE ANGELI",
        "WASHINGTON", "TORTONA", "NAVIGLI", "TICINESE", "PORTA VIGENTINA",
        "PORTA ROMANA", "ORTOMERCATO", "CORVETTO", "ROGOREDO", "SANTA GIULIA",
        "MECENATE", "FORLANINI", "LAMBRATE", "CAVRIANO", "PORTA MONFORTE",
        "PORTA NUOVA", "ISOLA", "MACIACHINI", "AFFORI", "DERGANO",
        "BRUZZANO", "COMASINA", "PORTA GARIBALDI", "CENTRALE",
    }
    
    def __init__(self, df: pd.DataFrame, name: str = "nil_dataset"):
        super().__init__(df, name)
        self.nil_column: Optional[str] = None
        self._detect_nil_column()
    
    def _detect_nil_column(self) -> None:
        """Rileva automaticamente colonna NIL."""
        candidates = ["nil", "quartiere", "nil_norm", "nome_nil"]
        for col in candidates:
            if col in self.df.columns:
                self.nil_column = col
                return
        
        # Prova ricerca fuzzy
        for col in self.df.columns:
            if "nil" in col.lower() or "quartier" in col.lower():
                self.nil_column = col
                return
    
    def validate(self) -> ValidationResult:
        """Esegue validazioni NIL specifiche."""
        result = super().validate()
        self._validate_nil_names()
        self._validate_geographic_data()
        self._validate_temporal_consistency()
        return ValidationResult(
            is_valid=len(self.errors) == 0,
            errors=self.errors,
            warnings=self.warnings,
            stats=self.stats,
        )
    
    def _validate_nil_names(self) -> None:
        """Valida nomi NIL."""
        if not self.nil_column:
            self.warnings.append(f"{self.name}: Colonna NIL non rilevata")
            return
        
        nil_values = self.df[self.nil_column].dropna().apply(normalize_nil_name)
        unique_nils = set(nil_values.unique())
        
        self.stats["unique_nils"] = len(unique_nils)
        
        # Verifica NIL sconosciuti (se abbiamo abbastanza NIL conosciuti)
        if len(unique_nils) > 5:
            unknown = unique_nils - self.KNOWN_NILS
            # Filtra stringhe vuote e "N/A"
            unknown = {n for n in unknown if n and n not in ("N/A", "ND", "-", "NA")}
            if unknown and len(unknown) < len(unique_nils) * 0.5:
                self.warnings.append(
                    f"{self.name}: NIL potenzialmente non standard: {list(unknown)[:5]}..."
                )
    
    def _validate_geographic_data(self) -> None:
        """Valida dati geografici."""
        geo_columns = ["geometry", "_geometry", "lat", "lng", "latitude", "longitude"]
        has_geo = any(c in self.df.columns for c in geo_columns)
        
        if "geometry" in self.df.columns or "_geometry" in self.df.columns:
            geo_col = "geometry" if "geometry" in self.df.columns else "_geometry"
            null_geo = self.df[geo_col].isnull().sum()
            if null_geo > 0:
                self.warnings.append(
                    f"{self.name}: {null_geo} geometrie mancanti"
                )
        
        self.stats["has_geometry"] = has_geo
    
    def _validate_temporal_consistency(self) -> None:
        """Valida consistenza temporale."""
        year_cols = [c for c in self.df.columns if "anno" in c.lower() or "year" in c.lower()]
        
        for col in year_cols:
            years = pd.to_numeric(self.df[col], errors="coerce").dropna()
            if years.empty:
                continue
            
            min_year = int(years.min())
            max_year = int(years.max())
            
            self.stats[f"{col}_range"] = f"{min_year}-{max_year}"
            
            if min_year < 1900:
                self.warnings.append(f"{self.name}.{col}: Anno minimo sospetto ({min_year})")
            if max_year > 2030:
                self.warnings.append(f"{self.name}.{col}: Anno massimo sospetto ({max_year})")


# ─────────────────────────────────────────────────────────────────────────────
# Schema validation con Pydantic
# ─────────────────────────────────────────────────────────────────────────────

try:
    from pydantic import BaseModel, Field, field_validator
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False
    BaseModel = object


if PYDANTIC_AVAILABLE:
    
    class DemografiaRecord(BaseModel):
        """Schema per record demografico."""
        quartiere: str
        anno: int = Field(ge=1900, le=2100)
        totale: Optional[int] = Field(default=None, ge=0)
        stranieri: Optional[int] = Field(default=None, ge=0)
        famiglie_registrate_in_anagrafe: Optional[int] = Field(default=None, ge=0)
        
        @field_validator("quartiere")
        @classmethod
        def normalize_quartiere(cls, v: str) -> str:
            return v.strip().upper() if v else ""
    
    class NILRecord(BaseModel):
        """Schema per record NIL base."""
        id_nil: int = Field(ge=1)
        nil: str
        shape_area: Optional[float] = Field(default=None, ge=0)
        shape_length: Optional[float] = Field(default=None, ge=0)
        geometry: Optional[str] = None
        
        @field_validator("nil")
        @classmethod
        def normalize_nil(cls, v: str) -> str:
            return v.strip().upper() if v else ""
    
    class ImmobiliareRecord(BaseModel):
        """Schema per record immobiliare."""
        nil: str
        anno_ritiro: int = Field(ge=1900, le=2100)
        numero_abitazioni: Optional[int] = Field(default=None, ge=0)
        superficie_utile_abitabile: Optional[float] = Field(default=None, ge=0)
        volume_totale_v_p: Optional[float] = Field(default=None, ge=0)


def validate_with_schema(
    df: pd.DataFrame,
    schema_class: type,
    sample_size: int = 100,
) -> ValidationResult:
    """
    Valida DataFrame contro schema Pydantic.
    
    Args:
        df: DataFrame da validare
        schema_class: Classe Pydantic per validazione
        sample_size: Numero di righe da campionare per validazione
    
    Returns:
        ValidationResult con errori e statistiche
    """
    if not PYDANTIC_AVAILABLE:
        return ValidationResult(
            is_valid=True,
            warnings=["Pydantic non disponibile, validazione schema skippata"],
        )
    
    errors: List[str] = []
    warnings: List[str] = []
    
    # Campiona righe se dataset grande
    sample = df.head(sample_size) if len(df) > sample_size else df
    
    valid_count = 0
    error_samples: List[str] = []
    
    for idx, row in sample.iterrows():
        try:
            record = row.to_dict()
            # Rimuovi valori NaN
            record = {k: v for k, v in record.items() if pd.notna(v)}
            schema_class(**record)
            valid_count += 1
        except Exception as e:
            if len(error_samples) < 3:
                error_samples.append(f"Row {idx}: {str(e)[:100]}")
    
    valid_pct = valid_count / len(sample) * 100
    
    if valid_pct < 90:
        errors.append(f"Solo {valid_pct:.1f}% delle righe valide secondo schema")
        errors.extend(error_samples)
    elif valid_pct < 100:
        warnings.append(f"{100-valid_pct:.1f}% delle righe non conformi allo schema")
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        stats={"valid_percentage": valid_pct, "sample_size": len(sample)},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Factory function
# ─────────────────────────────────────────────────────────────────────────────

def create_validator(
    df: pd.DataFrame,
    name: str,
    validator_type: str = "auto",
) -> DataValidator:
    """
    Crea validatore appropriato per il dataset.
    
    Args:
        df: DataFrame da validare
        name: Nome dataset
        validator_type: "auto", "nil", "generic"
    
    Returns:
        Istanza validatore appropriata
    """
    if validator_type == "auto":
        # Rileva automaticamente se è un dataset NIL
        nil_hints = ["nil", "quartiere", "zona"]
        if any(hint in name.lower() for hint in nil_hints):
            return NILValidator(df, name)
        if any(hint in str(df.columns).lower() for hint in nil_hints):
            return NILValidator(df, name)
    elif validator_type == "nil":
        return NILValidator(df, name)
    
    return DataValidator(df, name)
