"""Local text generation using the same validated contracts as Gemini."""

import json

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ai import SYSTEM, GeminiProvider
from config import get_settings


class OllamaProvider(GeminiProvider):
    def structured(self, schema, task, data):
        settings = get_settings()
        payload = {
            "model": settings.ollama_model,
            "stream": False,
            "think": False,
            "format": schema.model_json_schema(),
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM
                    + "\nRedacta el contenido final para la usuaria. En text escribe una pregunta REAL que le harías a ella, nunca la tarea ni las instrucciones del modelo. Por ejemplo: Cuéntame un proyecto del que estés orgullosa. No copies instrucciones del prompt en ningún campo.",
                },
                {
                    "role": "user",
                    "content": task
                    + "\nDATOS:\n"
                    + json.dumps(data, ensure_ascii=False, default=str),
                },
            ],
            "options": {"temperature": 0.3, "num_ctx": 8192, "num_predict": 3000},
        }
        try:
            with httpx.Client(timeout=settings.ollama_timeout_seconds, trust_env=False) as client:
                response = client.post(settings.ollama_url.rstrip("/") + "/api/chat", json=payload)
            if response.status_code == 404:
                raise HTTPException(
                    503,
                    "El modelo no está instalado en Ollama. Ejecuta ollama pull "
                    + settings.ollama_model,
                )
            if response.is_error:
                raise HTTPException(
                    502,
                    "Ollama no pudo generar la respuesta. Revisa el modelo y la memoria disponible.",
                )
            result = response.json()
            if result.get("done_reason") == "length":
                raise HTTPException(
                    502,
                    "Ollama alcanzó el límite de generación. Reduce la longitud de las respuestas.",
                )
            parsed = schema.model_validate_json(result["message"]["content"])
            if hasattr(parsed, "text") and (
                parsed.text.strip() == task.strip() or parsed.text.startswith("Genera UNA")
            ):
                raise HTTPException(
                    502,
                    "El modelo repitió instrucciones en lugar de generar una pregunta. Inténtalo de nuevo.",
                )
            return parsed
        except httpx.TimeoutException:
            raise HTTPException(
                504, "Ollama ha tardado demasiado. El primer arranque puede necesitar más tiempo."
            ) from None
        except httpx.RequestError:
            raise HTTPException(
                503, "No se puede conectar con Ollama. Comprueba que está iniciado."
            ) from None
        except (ValidationError, ValueError, KeyError, TypeError):
            raise HTTPException(
                502, "Ollama devolvió una respuesta que no cumple el contrato de la API."
            ) from None

    def transcribe(self, audio: bytes, mime_type: str) -> str:
        from local_audio import transcribe

        return transcribe(audio)

    def speech(self, text: str) -> bytes:
        from local_audio import speech

        return speech(text)
