"""Groq text and transcription; question speech runs on the user's device."""

import json

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ai import SYSTEM, GeminiProvider
from config import get_settings
from schemas import PersonalizedPlan

BASE_URL = "https://api.groq.com/openai/v1"


def strict_schema(schema):
    """Close every object, including Pydantic's nested definitions."""
    result = schema.model_json_schema()

    def close(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                node["additionalProperties"] = False
                node["required"] = list(node.get("properties", {}))
            # Enforce these application constraints locally after decoding too.
            for key in ("minLength", "maxLength", "minItems", "maxItems"):
                node.pop(key, None)
            for value in node.values():
                close(value)
        elif isinstance(node, list):
            for value in node:
                close(value)

    close(result)
    return result


class GroqProvider(GeminiProvider):
    # Reuse the same activity/question/feedback prompts and validated contracts.
    def _request(self, path, **kwargs):
        settings = get_settings()
        key = settings.groq_api_key.get_secret_value()
        if not key:
            raise HTTPException(503, "Configura GROQ_API_KEY en el backend para utilizar Groq.")
        try:
            with httpx.Client(timeout=settings.ai_timeout_seconds) as client:
                response = client.post(
                    BASE_URL + path,
                    headers={"Authorization": "Bearer " + key},
                    **kwargs,
                )
        except httpx.TimeoutException:
            raise HTTPException(504, "Groq no respondió a tiempo. Puedes reintentar.") from None
        except httpx.RequestError:
            raise HTTPException(502, "No se pudo conectar con Groq. Puedes reintentar.") from None
        if response.status_code == 429:
            # Do not silently retry: every retry shares the account's free quota.
            retry = response.headers.get("retry-after", "60")
            retry = retry if retry.isdigit() else "60"
            raise HTTPException(
                429,
                "Cuota de Groq agotada o límite temporal. Inténtalo más tarde.",
                headers={"Retry-After": retry},
            )
        if response.status_code in (401, 403):
            raise HTTPException(503, "Revisa GROQ_API_KEY y los permisos del modelo en Groq.")
        if response.is_error:
            raise HTTPException(
                502, "Groq no pudo procesar la petición. Revisa el modelo y su disponibilidad."
            )
        try:
            result = response.json()
            if not isinstance(result, dict):
                raise ValueError
            return result
        except ValueError:
            raise HTTPException(
                502, "Groq devolvió una respuesta incompleta. Puedes reintentar."
            ) from None

    def structured(self, schema, task, data):
        result = self._request(
            "/chat/completions",
            json={
                "model": get_settings().groq_model,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {
                        "role": "user",
                        "content": task
                        + "\nDATOS:\n"
                        + json.dumps(data, ensure_ascii=False, default=str),
                    },
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema.__name__,
                        "strict": True,
                        "schema": strict_schema(schema),
                    },
                },
                "temperature": 0.3,
                "max_completion_tokens": 16000 if schema is PersonalizedPlan else 5000,
            },
        )
        try:
            choice = result["choices"][0]
            if choice["finish_reason"] != "stop" or choice["message"].get("refusal"):
                raise ValueError
            return schema.model_validate_json(choice["message"]["content"])
        except (ValidationError, ValueError, TypeError, KeyError, IndexError):
            raise HTTPException(
                502, "Groq devolvió contenido incompleto o inválido. Puedes reintentar."
            ) from None

    def transcribe(self, audio: bytes, mime_type: str) -> str:
        mime_type = mime_type.split(";", 1)[0].strip().lower()
        extensions = {
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/webm": "webm",
            "audio/mp4": "m4a",
            "audio/m4a": "m4a",
            "audio/x-m4a": "m4a",
            "audio/mpeg": "mp3",
            "audio/ogg": "ogg",
            "audio/flac": "flac",
        }
        extension = extensions.get(mime_type)
        if not extension:
            raise HTTPException(415, "Formato de audio no compatible con Groq.")
        result = self._request(
            "/audio/transcriptions",
            files={"file": ("respuesta." + extension, audio, mime_type)},
            data={
                "model": get_settings().groq_audio_model,
                "language": "es",
                "temperature": "0",
                "response_format": "json",
            },
        )
        text = result.get("text")
        if not isinstance(text, str):
            raise HTTPException(502, "Groq devolvió una transcripción inválida.")
        text = text.strip()
        if not text:
            raise HTTPException(422, "No se ha reconocido una respuesta. Graba de nuevo.")
        if len(text) > 6000:
            raise HTTPException(422, "La respuesta es demasiado larga. Reduce la grabación.")
        return text

    def speech(self, text: str) -> bytes:
        raise HTTPException(
            409,
            "Con Groq, la pregunta se lee con la voz del dispositivo. Actualiza el cliente de la aplicación.",
        )
