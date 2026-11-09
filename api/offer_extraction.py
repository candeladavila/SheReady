"""Fetch and extract public job-offer text without forwarding secrets or cookies."""

from __future__ import annotations

import http.client
import ipaddress
import socket
import ssl
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

MAX_RESPONSE_BYTES = 1_000_000
MAX_EXTRACTED_CHARS = 6_000
MAX_REDIRECTS = 3
TIMEOUT_SECONDS = 12
USER_AGENT = "SheReadyOfferReader/1.0 (public job offer extraction)"
REDIRECT_STATUSES = {301, 302, 303, 307, 308}
SKIPPED_TAGS = {
    "script", "style", "noscript", "svg", "nav", "footer", "aside", "form", "button", "iframe"
}


class OfferExtractionError(Exception):
    """An offer URL could not be read safely or did not contain usable text."""


class _OfferHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.parts: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False
        self.meta: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in SKIPPED_TAGS:
            self.skip_depth += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            name = (attrs.get("name") or attrs.get("property") or "").lower()
            if name in {"description", "og:description", "og:title"} and attrs.get("content"):
                self.meta.append(attrs["content"])
        if not self.skip_depth and tag in {"p", "li", "h1", "h2", "h3", "br", "div", "section"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag in SKIPPED_TAGS and self.skip_depth:
            self.skip_depth -= 1
        if not self.skip_depth and tag in {"p", "li", "h1", "h2", "h3", "div", "section"}:
            self.parts.append("\n")

    def handle_data(self, data):
        value = " ".join(data.split())
        if not value:
            return
        if self.in_title:
            self.title_parts.append(value)
        if not self.skip_depth:
            self.parts.append(value)

    def text(self):
        values = [" ".join(self.title_parts), *self.meta, " ".join(self.parts)]
        return "\n".join(" ".join(value.split()) for value in values if value.strip())


def _validated_url(value: str) -> tuple[str, set[str]]:
    try:
        parsed = urlsplit(value.strip())
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    except ValueError:
        raise OfferExtractionError("El enlace de la oferta no es válido.") from None

    scheme = parsed.scheme.lower()
    host = (parsed.hostname or "").rstrip(".").lower()
    if scheme not in {"http", "https"} or not host or parsed.username or parsed.password:
        raise OfferExtractionError("El enlace debe ser una página pública http o https.")
    if (
        port not in {80, 443}
        or host in {"localhost", "localhost.localdomain"}
        or host.endswith((".localhost", ".local", ".internal"))
    ):
        raise OfferExtractionError("El enlace debe apuntar a una página pública.")

    try:
        literal = ipaddress.ip_address(host)
        addresses = {str(literal)}
    except ValueError:
        try:
            host = host.encode("idna").decode("ascii")
            addresses = {
                str(ipaddress.ip_address(record[4][0].split("%", 1)[0]))
                for record in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            }
        except (OSError, ValueError):
            raise OfferExtractionError("No se ha podido localizar el servidor de la oferta.") from None

    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise OfferExtractionError("El enlace debe apuntar a una página pública.")

    netloc = f"[{host}]" if ":" in host else host
    if port != (443 if scheme == "https" else 80):
        netloc = f"{netloc}:{port}"
    normalized = urlunsplit((scheme, netloc, parsed.path or "/", parsed.query, ""))
    return normalized, addresses


def _decode(body: bytes, content_type: str) -> str:
    charset = "utf-8"
    for part in content_type.split(";")[1:]:
        key, _, value = part.partition("=")
        if key.strip().lower() == "charset" and value.strip():
            charset = value.strip().strip('"\'')
            break
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def extract_offer_text(offer_url: str) -> str:
    """Read a small public HTML/text offer, following only validated redirects."""
    current = offer_url.strip()
    deadline = time.monotonic() + TIMEOUT_SECONDS
    for redirect_count in range(MAX_REDIRECTS + 1):
        current, addresses = _validated_url(current)
        parsed = urlsplit(current)
        host = parsed.hostname or ""
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        host_header = f"[{host}]" if ":" in host else host
        if port != (443 if parsed.scheme == "https" else 80):
            host_header = f"{host_header}:{port}"
        target = parsed.path or "/"
        if parsed.query:
            target += "?" + parsed.query

        connection = None
        response = None
        last_error = None
        for address in addresses:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise OfferExtractionError("La página de la oferta ha tardado demasiado en responder.")
            sock = None
            try:
                sock = socket.create_connection((address, port), timeout=min(4.0, remaining))
                if parsed.scheme == "https":
                    context = ssl.create_default_context()
                    sock = context.wrap_socket(sock, server_hostname=host)
                connection = http.client.HTTPConnection(host, port, timeout=remaining)
                connection.sock = sock  # Connect to the validated IP, while preserving Host and TLS SNI.
                connection.request(
                    "GET",
                    target,
                    headers={
                        "Host": host_header,
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9",
                        "Accept-Encoding": "identity",
                        "Connection": "close",
                    },
                )
                response = connection.getresponse()
                break
            except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
                last_error = exc
                if connection:
                    connection.close()
                elif sock:
                    sock.close()

        if response is None or connection is None:
            if isinstance(last_error, (TimeoutError, socket.timeout)):
                raise OfferExtractionError(
                    "La página de la oferta ha tardado demasiado en responder."
                ) from None
            raise OfferExtractionError("No se ha podido acceder a la página de la oferta.") from None

        try:
            if response.status in REDIRECT_STATUSES:
                location = response.getheader("Location")
                if not location or redirect_count == MAX_REDIRECTS:
                    raise OfferExtractionError("La oferta redirige a una página que no se puede leer.")
                current = urljoin(current, location)
                continue
            if response.status < 200 or response.status >= 300:
                raise OfferExtractionError("La página de la oferta no está disponible públicamente.")

            content_type = (response.getheader("Content-Type") or "").lower()
            if not any(kind in content_type for kind in ("text/html", "application/xhtml+xml", "text/plain")):
                raise OfferExtractionError("El enlace no ofrece una página HTML o texto que podamos leer.")
            declared_size = response.getheader("Content-Length")
            if declared_size and declared_size.isdigit() and int(declared_size) > MAX_RESPONSE_BYTES:
                raise OfferExtractionError("La página de la oferta es demasiado grande para procesarla.")
            body = bytearray()
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise OfferExtractionError(
                        "La página de la oferta ha tardado demasiado en responder."
                    )
                connection.sock.settimeout(remaining)
                chunk = response.read(min(65_536, MAX_RESPONSE_BYTES + 1 - len(body)))
                if not chunk:
                    break
                body.extend(chunk)
                if len(body) > MAX_RESPONSE_BYTES:
                    raise OfferExtractionError("La página de la oferta es demasiado grande para procesarla.")
        except (OSError, http.client.HTTPException) as exc:
            if isinstance(exc, (TimeoutError, socket.timeout)):
                raise OfferExtractionError(
                    "La página de la oferta ha tardado demasiado en responder."
                ) from None
            raise OfferExtractionError("No se ha podido acceder a la página de la oferta.") from None
        finally:
            connection.close()

        source = _decode(bytes(body), content_type)
        if "text/plain" in content_type:
            extracted_text = " ".join(source.split())
        else:
            parser = _OfferHTMLParser()
            parser.feed(source)
            extracted_text = parser.text()
        extracted_text = "\n".join(line.strip() for line in extracted_text.splitlines() if line.strip())
        if len(extracted_text) < 40:
            raise OfferExtractionError("No hemos encontrado suficiente texto en la oferta.")
        return extracted_text[:MAX_EXTRACTED_CHARS]

    raise OfferExtractionError("No se ha podido leer la oferta.")
