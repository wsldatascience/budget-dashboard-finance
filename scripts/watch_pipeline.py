"""
File watcher — dispara o pipeline automaticamente quando teste_budget.xlsx é salvo.
Debounce de 8s para evitar disparos múltiplos do Excel.
Ignora arquivos temporários (~$...).
"""
import subprocess
import threading
import time
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

ROOT       = Path(__file__).resolve().parent.parent
WATCH_DIR  = ROOT / "data"
WATCH_FILE = "teste_budget.xlsx"
PIPELINE   = ROOT / "scripts" / "run_pipeline.bat"
LOG_FILE   = ROOT / "output" / "watcher.log"
DEBOUNCE   = 8  # segundos de silêncio antes de rodar

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

_timer: threading.Timer | None = None
_running = False
_lock = threading.Lock()


def _run_pipeline():
    global _running
    with _lock:
        if _running:
            log.info("Pipeline já em execução — ignorando disparo.")
            return
        _running = True
    try:
        log.info("Iniciando pipeline...")
        result = subprocess.run(
            ["cmd", "/c", str(PIPELINE)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            log.info("Pipeline concluído com sucesso.")
        else:
            log.error(f"Pipeline falhou (código {result.returncode}):\n{result.stderr}")
    finally:
        with _lock:
            _running = False


def _schedule():
    global _timer
    if _timer:
        _timer.cancel()
    _timer = threading.Timer(DEBOUNCE, _run_pipeline)
    _timer.daemon = True
    _timer.start()


class ExcelHandler(FileSystemEventHandler):
    def on_modified(self, event):
        self._check(event.src_path)

    def on_created(self, event):
        self._check(event.src_path)

    def _check(self, path):
        name = Path(path).name
        if name.startswith("~$") or not name.endswith(".xlsx"):
            return
        if name != WATCH_FILE:
            return
        log.info(f"Alteração detectada: {name} — aguardando {DEBOUNCE}s...")
        _schedule()


if __name__ == "__main__":
    log.info(f"Watcher iniciado — monitorando {WATCH_DIR / WATCH_FILE}")
    observer = Observer()
    observer.schedule(ExcelHandler(), str(WATCH_DIR), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
