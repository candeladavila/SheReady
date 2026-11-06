"""Explicit one-off download of the Spanish-capable multilingual Whisper base model."""

from pathlib import Path

from faster_whisper.utils import download_model

destination = Path(__file__).resolve().parent / ".models/whisper-base"
download_model("base", output_dir=str(destination))
print("Modelo local preparado:", destination)
