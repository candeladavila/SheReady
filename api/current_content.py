"""Server-side providers for public events and licensed news."""
import csv
import hashlib
import io
import json
import re
import threading
import time
from datetime import datetime, timezone
from html import unescape
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from config import get_settings

SECTORS = {
    "Tecnología": ("technology OR engineering OR software", ["tecnolog", "ingenier", "digital", "programaci", "technology", "engineering"]),
    "Marketing": ("marketing OR advertising OR communications", ["marketing", "publicidad", "comunicaci", "advertising"]),
    "Finanzas": ("finance OR investment OR banking", ["finanza", "inversi", "banca", "finance", "investment"]),
    "Educación y salud": ("education OR healthcare OR medicine", ["educaci", "salud", "medicina", "education", "health"]),
    "Comercio y servicios": ("business OR retail OR entrepreneurship", ["comercio", "emprend", "empresa", "negocio", "business", "retail"]),
    "Otro sector": ("leadership OR career OR entrepreneurship", ["liderazgo", "empleo", "emprend", "leadership", "career"]),
}
WOMEN = re.compile(r"\b(women|woman|female|mujer(?:es)?|femenin[oa]s?|emprendedoras?|científicas?)\b", re.I)
RELEVANT = re.compile(r"mujer|femeni|emprend|empleo|profesional|laboral|mentor|networking|empresari", re.I)
_cache = {}
_lock = threading.Lock()


def clean(value):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]*>", " ", str(value or "")))).strip()


def url(value):
    try:
        p = urlsplit(str(value or ""))
        if p.scheme not in ("https", "http") or not p.netloc:
            return None
        return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path, p.query, ""))
    except ValueError:
        return None


def fetch(address):
    with urlopen(Request(address, headers={"User-Agent": "SheReady/1.0"}), timeout=15) as response:
        data = response.read(12_000_001)
        if len(data) > 12_000_000:
            raise ValueError("Respuesta demasiado grande")
        return data


def cached(key, loader, ttl=3600):
    with _lock:
        item = _cache.get(key)
        if item and time.time() - item[0] < ttl:
            return item[1]
        try:
            result = loader()
            _cache[key] = (time.time(), result)
            return result
        except Exception:
            if item:
                return {**item[1], "status": "stale", "message": "No se pudo actualizar la fuente; se muestran datos anteriores."}
            return {"items": [], "status": "error", "message": "No se pudo consultar la fuente.", "updated_at": None}


def classify(text):
    text = text.lower()
    return [name for name, (_, terms) in SECTORS.items() if any(term in text for term in terms)]


def timestamp(value, fmt=None):
    try:
        dt = datetime.strptime(value, fmt) if fmt else datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("Europe/Madrid"))
        return dt.isoformat()
    except (ValueError, TypeError, AttributeError):
        return None


def event(row, city):
    madrid = city == "Madrid"
    title = clean(row.get("title") if madrid else row.get("NOMBRE"))
    description = clean(row.get("description") if madrid else row.get("DESCRIPCION"))
    starts = timestamp(row.get("dtstart")) if madrid else timestamp(row.get("F_INICIO"), "%d/%m/%Y %H:%M:%S")
    link = url(row.get("link") if madrid else row.get("DIRECCION_WEB"))
    text = title + " " + description + " " + clean(row.get("PALABRAS_CLAVE"))
    if not title or not starts or not link or datetime.fromisoformat(starts) < datetime.now(timezone.utc) or not RELEVANT.search(text):
        return None
    if re.search(r"cancelad[oa]|suspendid[oa]", text, re.I):
        return None
    organization = row.get("organization") or {}
    address = row.get("address") or {}
    location = row.get("location") or {}
    return {"id": city + "-" + str(row.get("id") if madrid else row.get("ID_ACTIVIDAD")), "title": title, "description": description[:500], "url": link, "starts_at": starts, "timezone": "Europe/Madrid", "city": city, "location": clean(row.get("event-location") if madrid else row.get("OTROS_LUGARES") or row.get("EQP_DESCRIPCION")), "address": clean(address.get("street-address") if madrid else row.get("EQP_NOMBRECALLE")), "latitude": location.get("latitude"), "longitude": location.get("longitude"), "organizer": clean(organization.get("organization-name") if madrid else row.get("ORGANIZA")), "sectors": classify(text), "source": "Ayuntamiento de " + city, "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/"}


def load_events(city):
    if city == "Madrid":
        data = json.loads(fetch("https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json").decode("utf-8-sig"), strict=False)
        rows = data["@graph"]
    else:
        year = datetime.now(ZoneInfo("Europe/Madrid")).year
        raw = fetch(f"https://datosabiertos.malaga.eu/recursos/cultura/agenda/{year}.csv")
        try:
            data = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            data = raw.decode("cp1252")
        rows = csv.DictReader(io.StringIO(data))
    items = {}
    for row in rows:
        item = event(row, city)
        if item:
            items[(item["title"].casefold(), item["starts_at"], item["location"].casefold())] = item
    return {"items": sorted(items.values(), key=lambda x: x["starts_at"]), "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()}


# Enlaces seleccionados manualmente; los resúmenes son propios y no son un feed automático.
CURATED = {
    "Tecnología": ("Mujeres e inteligencia artificial en Asia del Sur", "UNESCO analiza la participación y el liderazgo de las mujeres en inteligencia artificial en Asia del Sur.", "https://www.unesco.org/en/articles/unesco-launches-outlook-study-artificial-intelligence-and-gender-south-asia?hub=370", "UNESCO"),
    "Marketing": ("Competencias digitales para mujeres en la economía digital", "Un programa en Ghana combina formación técnica y habilidades profesionales para ampliar oportunidades digitales.", "https://www.unesco.org/ar/open-science/inclusive-science/women-digital-skills-programme-expanding-womens-access-digital-economy", "UNESCO"),
    "Finanzas": ("Financiación innovadora para la igualdad de género", "ONU Mujeres reúne experiencias de financiación y colaboración para impulsar la igualdad de género.", "https://chile.unwomen.org/en/digital-library/publications/2025/10/scaling-up-innovative-finance-for-gender-equality-and-womens-empowerment", "ONU Mujeres"),
    "Educación y salud": ("Las mujeres y el liderazgo educativo", "El informe de género de UNESCO examina la representación de las mujeres en el liderazgo de la educación.", "https://www.unesco.org/gem-report/en/publication/2025-gender-report?hub=80094", "UNESCO"),
    "Comercio y servicios": ("Emprendimiento e innovación de las mujeres", "ONU Mujeres recoge indicadores sobre las barreras de financiación para el emprendimiento y la innovación.", "https://chile.unwomen.org/en/resources/gender-snapshot/sdg-9", "ONU Mujeres"),
    "Otro sector": ("Acceso de las mujeres a la tecnología", "UNESCO presenta iniciativas y datos sobre la participación de mujeres y niñas en la tecnología.", "https://www.unesco.org/en/artificial-intelligence/gender-equality", "UNESCO"),
}


def curated_news(sector, message):
    title, description, link, publisher = CURATED[sector]
    return {"items": [{"id": "curated-" + hashlib.sha256(link.encode()).hexdigest()[:16], "title": title, "description": description, "url": link, "publisher": publisher, "author": "", "published_at": None, "language": "en", "sectors": [sector], "imported_at": None, "image_url": None}], "status": "curated", "message": message, "updated_at": None}


def load_news(sector):
    settings = get_settings()
    if not settings.enable_gnews or not settings.gnews_api_key.get_secret_value():
        return curated_news(sector, "Selección editorial manual; la fuente automática no está configurada.")
    if settings.content_environment == "production" and not settings.gnews_commercial_license:
        return curated_news(sector, "Selección editorial manual; GNews requiere una licencia válida para producción.")
    terms = SECTORS.get(sector, SECTORS["Otro sector"])[0]
    params = urlencode({"q": f"(women OR woman OR female) AND ({terms})", "lang": "en", "max": 10, "nullable": "image,description,content", "apikey": settings.gnews_api_key.get_secret_value()})
    data = json.loads(fetch("https://gnews.io/api/v4/search?" + params))
    now = datetime.now(timezone.utc).isoformat()
    items = {}
    for row in data.get("articles", []):
        link, title = url(row.get("url")), clean(row.get("title"))
        description = clean(row.get("description"))[:250]
        published = timestamp(row.get("publishedAt"))
        if not link or not title or not published or not WOMEN.search(title + " " + description):
            continue
        items[link] = {"id": hashlib.sha256(link.encode()).hexdigest()[:16], "title": title, "description": description, "url": link, "publisher": clean((row.get("source") or {}).get("name")), "author": clean(row.get("author")), "published_at": published, "language": "en", "sectors": [sector] if sector else classify(title + " " + description), "imported_at": now, "image_url": None}
    return {"items": list(items.values()), "status": "ok", "updated_at": now}
