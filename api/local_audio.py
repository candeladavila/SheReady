"""Offline audio for a Windows-hosted demo; audio is never sent to a cloud provider."""

import io
import os
import subprocess
import tempfile
import threading
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / ".models" / "whisper-base"
_transcription_lock = threading.Lock()


@lru_cache(maxsize=1)
def whisper_model():
    if not (MODEL_PATH / "model.bin").exists():
        raise HTTPException(
            503, "Falta el modelo de transcripción local. Ejecuta python prepare-local-audio.py."
        )
    try:
        from faster_whisper import WhisperModel

        return WhisperModel(
            str(MODEL_PATH), device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True
        )
    except ImportError:
        raise HTTPException(
            503, "Instala requirements-local-audio.txt en el entorno de la API."
        ) from None


def transcribe(audio: bytes) -> str:
    try:
        with _transcription_lock:
            segments, _ = whisper_model().transcribe(
                io.BytesIO(audio),
                language="es",
                beam_size=3,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            text = " ".join(segment.text.strip() for segment in segments).strip()
        if not text:
            raise HTTPException(422, "No se ha reconocido habla. Graba de nuevo tu respuesta.")
        if len(text) > 6000:
            raise HTTPException(422, "La respuesta supera la longitud permitida.")
        return text
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            422, "No se pudo transcribir este audio. Repite la grabación."
        ) from None


def speech(text: str) -> bytes:
    if os.name != "nt":
        raise HTTPException(
            503, "La voz local de esta demo requiere Windows y una voz española instalada."
        )
    with tempfile.TemporaryDirectory(prefix="sheready-voice-") as directory:
        source = Path(directory) / "text.txt"
        output = Path(directory) / "speech.wav"
        source.write_text(text, encoding="utf-8")
        powershell = (
            Path(os.environ["SystemRoot"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
        )
        try:
            result = subprocess.run(
                [
                    str(powershell),
                    "-NoProfile",
                    "-NonInteractive",
                    "-File",
                    str(ROOT / "speak-local.ps1"),
                    "-TextPath",
                    str(source),
                    "-WavePath",
                    str(output),
                ],
                capture_output=True,
                timeout=45,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            if result.returncode != 0 or not output.exists():
                raise HTTPException(
                    503,
                    "No se pudo generar voz local. Comprueba que Windows tiene una voz española instalada.",
                )
            audio = output.read_bytes()
            if not audio.startswith(b"RIFF"):
                raise HTTPException(502, "La síntesis local no devolvió un WAV válido.")
            return audio
        except subprocess.TimeoutExpired:
            raise HTTPException(
                504, "La síntesis de voz local superó el tiempo de espera."
            ) from None
