#!/usr/bin/env python3
"""
Pipeline end-to-end per dataset CORE NIL.

Versione migliorata con:
- Progress bar e output colorato
- Report finale dettagliato
- Gestione errori avanzata
- Generazione report qualità dati
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# Prova import Rich per output colorato
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
    from rich.table import Table
    from rich import print as rprint
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent


# ─────────────────────────────────────────────────────────────────────────────
# Dataclass per tracciare risultati
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class StepResult:
    """Risultato di uno step della pipeline."""
    name: str
    status: str  # "success", "failed", "skipped"
    duration_seconds: float = 0.0
    error_message: str = ""


@dataclass 
class PipelineReport:
    """Report completo della pipeline."""
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    steps: List[StepResult] = field(default_factory=list)
    
    @property
    def total_duration(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0
    
    @property
    def success_count(self) -> int:
        return sum(1 for s in self.steps if s.status == "success")
    
    @property
    def failed_count(self) -> int:
        return sum(1 for s in self.steps if s.status == "failed")


# ─────────────────────────────────────────────────────────────────────────────
# Console utilities
# ─────────────────────────────────────────────────────────────────────────────

console = Console() if RICH_AVAILABLE else None


def print_header(title: str) -> None:
    """Stampa header decorato."""
    if console:
        console.print(Panel(f"[bold blue]{title}[/bold blue]", expand=False))
    else:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}\n")


def print_step(step_name: str, status: str, duration: float = 0.0) -> None:
    """Stampa risultato step."""
    if console:
        if status == "success":
            icon = "[green]✓[/green]"
        elif status == "failed":
            icon = "[red]✗[/red]"
        else:
            icon = "[yellow]○[/yellow]"
        
        duration_str = f"({duration:.1f}s)" if duration > 0 else ""
        console.print(f"  {icon} {step_name} {duration_str}")
    else:
        icon = "✓" if status == "success" else ("✗" if status == "failed" else "○")
        duration_str = f"({duration:.1f}s)" if duration > 0 else ""
        print(f"  {icon} {step_name} {duration_str}")


def print_summary(report: PipelineReport) -> None:
    """Stampa summary finale."""
    if console:
        table = Table(title="📊 Pipeline Summary")
        table.add_column("Step", style="cyan")
        table.add_column("Status", justify="center")
        table.add_column("Duration", justify="right")
        
        for step in report.steps:
            status_str = {
                "success": "[green]✓ Success[/green]",
                "failed": "[red]✗ Failed[/red]",
                "skipped": "[yellow]○ Skipped[/yellow]",
            }.get(step.status, step.status)
            
            table.add_row(
                step.name,
                status_str,
                f"{step.duration_seconds:.1f}s" if step.duration_seconds > 0 else "-"
            )
        
        console.print()
        console.print(table)
        console.print()
        
        # Statistiche finali
        if report.failed_count == 0:
            console.print(Panel(
                f"[green bold]Pipeline completata con successo![/green bold]\n"
                f"Steps: {report.success_count} completati, {len(report.steps) - report.success_count} skipped\n"
                f"Tempo totale: {report.total_duration:.1f}s",
                title="✅ Risultato",
                border_style="green"
            ))
        else:
            console.print(Panel(
                f"[red bold]Pipeline completata con errori[/red bold]\n"
                f"Steps: {report.success_count} ok, {report.failed_count} falliti\n"
                f"Tempo totale: {report.total_duration:.1f}s",
                title="❌ Risultato",
                border_style="red"
            ))
    else:
        print("\n" + "="*60)
        print("  PIPELINE SUMMARY")
        print("="*60)
        for step in report.steps:
            icon = {"success": "✓", "failed": "✗", "skipped": "○"}.get(step.status, "?")
            print(f"  {icon} {step.name}: {step.status} ({step.duration_seconds:.1f}s)")
        print(f"\nTempo totale: {report.total_duration:.1f}s")
        print("="*60)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline runner
# ─────────────────────────────────────────────────────────────────────────────

def run_step(
    name: str,
    cmd: List[str],
    report: PipelineReport,
    skip: bool = False,
) -> bool:
    """
    Esegue uno step della pipeline.
    
    Returns:
        True se successo o skipped, False se errore
    """
    if skip:
        report.steps.append(StepResult(name=name, status="skipped"))
        print_step(name, "skipped")
        return True
    
    start_time = time.time()
    
    if console:
        console.print(f"  [cyan]▶[/cyan] {name}...")
    else:
        print(f"  ▶ {name}...")
    
    try:
        result = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
        )
        duration = time.time() - start_time
        
        if result.returncode == 0:
            report.steps.append(StepResult(
                name=name,
                status="success",
                duration_seconds=duration,
            ))
            print_step(name, "success", duration)
            return True
        else:
            error_msg = result.stderr or result.stdout or f"Exit code {result.returncode}"
            report.steps.append(StepResult(
                name=name,
                status="failed",
                duration_seconds=duration,
                error_message=error_msg[:500],
            ))
            print_step(name, "failed", duration)
            if console:
                console.print(f"    [red]Error: {error_msg[:200]}[/red]")
            else:
                print(f"    Error: {error_msg[:200]}")
            return False
            
    except Exception as e:
        duration = time.time() - start_time
        report.steps.append(StepResult(
            name=name,
            status="failed",
            duration_seconds=duration,
            error_message=str(e),
        ))
        print_step(name, "failed", duration)
        return False


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="🚀 Pipeline Core NIL - Download, processing e star schema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi:
  python run_pipeline.py                    # Esegue pipeline completa
  python run_pipeline.py --force            # Forza riscaricamento dati
  python run_pipeline.py --skip-download    # Usa dati già scaricati
  python run_pipeline.py --only-report      # Solo report qualità
        """
    )
    parser.add_argument("--skip-download", action="store_true", help="Salta download")
    parser.add_argument("--skip-process", action="store_true", help="Salta processing")
    parser.add_argument("--skip-index", action="store_true", help="Salta creazione indici")
    parser.add_argument("--skip-star", action="store_true", help="Salta star schema")
    parser.add_argument("--skip-master", action="store_true", help="Salta master geo")
    parser.add_argument("--skip-report", action="store_true", help="Salta report qualità")
    parser.add_argument("--force", action="store_true", help="Forza riscaricamento")
    parser.add_argument("--only-report", action="store_true", help="Genera solo report qualità")
    parser.add_argument("--continue-on-error", action="store_true", help="Continua anche se uno step fallisce")
    parser.add_argument("--verbose", "-v", action="store_true", help="Output dettagliato")
    
    args = parser.parse_args()
    py = sys.executable
    
    # Header
    print_header("🚀 Api_Milano_Core Pipeline")
    
    if console:
        console.print(f"[dim]Project root: {PROJECT_ROOT}[/dim]")
        console.print(f"[dim]Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/dim]\n")
    else:
        print(f"Project root: {PROJECT_ROOT}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    report = PipelineReport()
    
    # Solo report
    if args.only_report:
        report_script = SCRIPT_DIR / "generate_quality_report.py"
        if report_script.exists():
            success = run_step(
                "Generate Quality Report",
                [py, str(report_script)],
                report,
            )
        else:
            if console:
                console.print("[yellow]Report script non trovato[/yellow]")
            else:
                print("Report script non trovato")
        
        report.end_time = datetime.now()
        print_summary(report)
        return
    
    # Steps pipeline
    steps = [
        {
            "name": "Download Core Datasets",
            "script": "download_core.py",
            "skip": args.skip_download,
            "extra_args": ["--force"] if args.force else [],
        },
        {
            "name": "Process & Load to SQLite",
            "script": "process_core.py",
            "skip": args.skip_process,
            "extra_args": [],
        },
        {
            "name": "Apply DB Optimizations",
            "script": "apply_optimizations.py",
            "skip": args.skip_index,
            "extra_args": [],
        },
        {
            "name": "Build Star Schema",
            "script": "build_star_schema.py",
            "skip": args.skip_star,
            "extra_args": [],
        },
        {
            "name": "Build Master GeoDataset",
            "script": "build_master_geo.py",
            "skip": args.skip_master,
            "extra_args": [],
        },
        {
            "name": "Generate Quality Report",
            "script": "generate_quality_report.py",
            "skip": args.skip_report,
            "extra_args": [],
        },
    ]
    
    # Esegui steps
    for step in steps:
        script_path = SCRIPT_DIR / step["script"]
        
        if not script_path.exists():
            if not step["skip"]:
                if console:
                    console.print(f"[yellow]⚠ Script non trovato: {step['script']}[/yellow]")
                else:
                    print(f"⚠ Script non trovato: {step['script']}")
            continue
        
        cmd = [py, str(script_path)] + step.get("extra_args", [])
        
        success = run_step(
            step["name"],
            cmd,
            report,
            skip=step["skip"],
        )
        
        if not success and not args.continue_on_error:
            if console:
                console.print("\n[red]Pipeline interrotta per errore.[/red]")
                console.print("[dim]Usa --continue-on-error per continuare nonostante gli errori.[/dim]")
            else:
                print("\nPipeline interrotta per errore.")
                print("Usa --continue-on-error per continuare nonostante gli errori.")
            break
    
    report.end_time = datetime.now()
    print_summary(report)
    
    # Exit code basato su risultato
    if report.failed_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
