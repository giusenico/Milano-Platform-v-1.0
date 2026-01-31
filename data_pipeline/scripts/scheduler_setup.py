#!/usr/bin/env python3
"""
scheduler_setup.py
Configura l'aggiornamento automatico del database Milano Platform.

Supporta:
- macOS: launchd (plist)
- Linux: cron
- Windows: Task Scheduler

Uso:
    python scheduler_setup.py install    # Installa scheduler
    python scheduler_setup.py uninstall  # Rimuove scheduler
    python scheduler_setup.py status     # Verifica stato
    python scheduler_setup.py run-now    # Esegui subito
"""

import argparse
import os
import platform
import subprocess
import sys
from datetime import datetime, time
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
UPDATE_SCRIPT = SCRIPT_DIR / "update_database.py"

# Schedule: ogni giorno alle 03:00
SCHEDULE_HOUR = 3
SCHEDULE_MINUTE = 0

PLIST_NAME = "com.milanoplatform.updatedb"


def get_python_path() -> str:
    """Trova il Python nell'ambiente virtuale."""
    venv_python = PROJECT_ROOT / ".venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    
    venv_python = PROJECT_ROOT / "venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    
    return sys.executable


def generate_macos_plist() -> str:
    """Genera il file plist per launchd su macOS."""
    python_path = get_python_path()
    
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{PLIST_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>{python_path}</string>
        <string>{UPDATE_SCRIPT}</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>{PROJECT_ROOT}</string>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>{SCHEDULE_HOUR}</integer>
        <key>Minute</key>
        <integer>{SCHEDULE_MINUTE}</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>{PROJECT_ROOT}/logs/launchd_stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>{PROJECT_ROOT}/logs/launchd_stderr.log</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
"""


def generate_cron_entry() -> str:
    """Genera l'entry per crontab."""
    python_path = get_python_path()
    log_file = PROJECT_ROOT / "logs" / "cron.log"
    
    return f"{SCHEDULE_MINUTE} {SCHEDULE_HOUR} * * * cd {PROJECT_ROOT} && {python_path} {UPDATE_SCRIPT} >> {log_file} 2>&1"


def install_macos():
    """Installa il LaunchAgent su macOS."""
    launch_agents = Path.home() / "Library" / "LaunchAgents"
    launch_agents.mkdir(parents=True, exist_ok=True)
    
    plist_path = launch_agents / f"{PLIST_NAME}.plist"
    
    # Scrivi il plist
    plist_content = generate_macos_plist()
    plist_path.write_text(plist_content)
    
    print(f"✓ Creato: {plist_path}")
    
    # Carica il job
    subprocess.run(["launchctl", "unload", str(plist_path)], 
                   capture_output=True)  # Ignora errori se non esiste
    result = subprocess.run(["launchctl", "load", str(plist_path)],
                           capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✓ LaunchAgent caricato")
        print(f"  L'aggiornamento verrà eseguito ogni giorno alle {SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d}")
    else:
        print(f"✗ Errore caricamento: {result.stderr}")
        return False
    
    return True


def uninstall_macos():
    """Rimuove il LaunchAgent su macOS."""
    plist_path = Path.home() / "Library" / "LaunchAgents" / f"{PLIST_NAME}.plist"
    
    if plist_path.exists():
        subprocess.run(["launchctl", "unload", str(plist_path)], 
                       capture_output=True)
        plist_path.unlink()
        print(f"✓ Rimosso: {plist_path}")
    else:
        print("LaunchAgent non trovato")
    
    return True


def status_macos():
    """Verifica stato del LaunchAgent su macOS."""
    result = subprocess.run(
        ["launchctl", "list"],
        capture_output=True, text=True
    )
    
    if PLIST_NAME in result.stdout:
        print(f"✓ LaunchAgent attivo: {PLIST_NAME}")
        
        # Mostra dettagli
        plist_path = Path.home() / "Library" / "LaunchAgents" / f"{PLIST_NAME}.plist"
        if plist_path.exists():
            print(f"  File: {plist_path}")
            print(f"  Schedule: ogni giorno alle {SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d}")
        
        # Ultimo log
        log_file = PROJECT_ROOT / "logs" / "launchd_stdout.log"
        if log_file.exists():
            print(f"  Ultimo aggiornamento: {datetime.fromtimestamp(log_file.stat().st_mtime)}")
    else:
        print("✗ LaunchAgent non attivo")
        print("  Esegui: python scheduler_setup.py install")


def install_linux():
    """Installa cron job su Linux."""
    cron_entry = generate_cron_entry()
    
    # Leggi crontab esistente
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    current_crontab = result.stdout if result.returncode == 0 else ""
    
    # Rimuovi vecchie entry
    lines = [l for l in current_crontab.split("\n") 
             if "update_database.py" not in l and l.strip()]
    
    # Aggiungi nuova entry
    lines.append(cron_entry)
    new_crontab = "\n".join(lines) + "\n"
    
    # Installa
    process = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE)
    process.communicate(new_crontab.encode())
    
    if process.returncode == 0:
        print(f"✓ Cron job installato")
        print(f"  Schedule: {SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d} ogni giorno")
        print(f"  Comando: {cron_entry[:60]}...")
    else:
        print("✗ Errore installazione cron")
        return False
    
    return True


def uninstall_linux():
    """Rimuove cron job su Linux."""
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if result.returncode != 0:
        print("Nessun crontab trovato")
        return True
    
    lines = [l for l in result.stdout.split("\n") 
             if "update_database.py" not in l and l.strip()]
    
    new_crontab = "\n".join(lines) + "\n" if lines else ""
    
    process = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE)
    process.communicate(new_crontab.encode())
    
    print("✓ Cron job rimosso")
    return True


def status_linux():
    """Verifica stato cron su Linux."""
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    
    if result.returncode == 0 and "update_database.py" in result.stdout:
        print("✓ Cron job attivo")
        for line in result.stdout.split("\n"):
            if "update_database.py" in line:
                print(f"  {line}")
    else:
        print("✗ Cron job non attivo")


def run_now():
    """Esegue l'aggiornamento immediatamente."""
    python_path = get_python_path()
    
    print("🚀 Avvio aggiornamento manuale...")
    print("-" * 40)
    
    result = subprocess.run(
        [python_path, str(UPDATE_SCRIPT)],
        cwd=str(PROJECT_ROOT)
    )
    
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(
        description="Gestione scheduler aggiornamento database Milano Platform"
    )
    parser.add_argument("action", choices=["install", "uninstall", "status", "run-now"],
                       help="Azione da eseguire")
    parser.add_argument("--hour", type=int, default=SCHEDULE_HOUR,
                       help="Ora di esecuzione (default: 3)")
    parser.add_argument("--minute", type=int, default=SCHEDULE_MINUTE,
                       help="Minuto di esecuzione (default: 0)")
    
    args = parser.parse_args()
    
    # Aggiorna orario se specificato
    global SCHEDULE_HOUR, SCHEDULE_MINUTE
    SCHEDULE_HOUR = args.hour
    SCHEDULE_MINUTE = args.minute
    
    system = platform.system()
    
    print(f"Sistema: {system}")
    print(f"Progetto: {PROJECT_ROOT}")
    print(f"Script: {UPDATE_SCRIPT}")
    print()
    
    if args.action == "run-now":
        success = run_now()
        sys.exit(0 if success else 1)
    
    if system == "Darwin":  # macOS
        if args.action == "install":
            install_macos()
        elif args.action == "uninstall":
            uninstall_macos()
        elif args.action == "status":
            status_macos()
            
    elif system == "Linux":
        if args.action == "install":
            install_linux()
        elif args.action == "uninstall":
            uninstall_linux()
        elif args.action == "status":
            status_linux()
            
    elif system == "Windows":
        print("⚠️ Windows non completamente supportato")
        print("Usa Task Scheduler manualmente:")
        print(f"  Programma: {get_python_path()}")
        print(f"  Argomenti: {UPDATE_SCRIPT}")
        print(f"  Directory: {PROJECT_ROOT}")
    else:
        print(f"Sistema {system} non supportato")
        sys.exit(1)


if __name__ == "__main__":
    main()
