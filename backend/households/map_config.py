"""Map sources are configuration, never inferred licences or embedded API keys."""

import os
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured


def map_config() -> dict:
    providers = []
    for kind, label in (("street", "Street map"), ("satellite", "Satellite map")):
        prefix = f"GIS_{kind.upper()}_"
        url = os.environ.get(prefix + "URL", "")
        attribution = os.environ.get(prefix + "ATTRIBUTION", "")
        licence = os.environ.get(prefix + "LICENCE", "")
        offline = os.environ.get(prefix + "OFFLINE", "false").lower() == "true"
        native_zoom = os.environ.get(prefix + "MAX_NATIVE_ZOOM", "18")
        note = ""
        if not url and kind == "street":
            url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution = "© OpenStreetMap contributors"
            licence = "https://operations.osmfoundation.org/policies/tiles/"
        elif not url and kind == "satellite":
            url = (
                "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
                "BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg"
            )
            attribution = "NASA Earth Observatory / Blue Marble Next Generation / NASA GIBS (ESDIS)"
            licence = "https://nasa-gibs.github.io/gibs-api-docs/"
            native_zoom = "8"
            note = (
                "Historical satellite composite, approximately 500 m resolution. "
                "Cannot identify individual houses. Configure licensed high-resolution imagery "
                "for house placement."
            )
        try:
            native_zoom = int(native_zoom)
            if not 0 <= native_zoom <= 20:
                raise ValueError
        except ValueError as error:
            raise ImproperlyConfigured(prefix + "MAX_NATIVE_ZOOM must be 0..20.") from error
        if url:
            parsed = urlparse(url)
            local = url.startswith("/") and not url.startswith("//")
            if not (local or parsed.scheme == "https"):
                raise ImproperlyConfigured(prefix + "URL must be same-origin or HTTPS.")
            if not all(token in url for token in ("{z}", "{x}", "{y}")):
                raise ImproperlyConfigured(prefix + "URL must contain {z}, {x}, {y}.")
            if not attribution or not licence:
                raise ImproperlyConfigured(prefix + "ATTRIBUTION and LICENCE are required.")
            if urlparse(licence).scheme != "https":
                raise ImproperlyConfigured(prefix + "LICENCE must be an HTTPS terms URL.")
            if offline and not local:
                raise ImproperlyConfigured("Offline layers must use locally hosted licensed tiles.")
        providers.append(
            {
                "id": kind,
                "label": label,
                "url": url or None,
                "attribution": attribution,
                "licence": licence,
                "offline": offline,
                "max_native_zoom": native_zoom,
                "note": note,
            }
        )
    esri_key = os.environ.get("GIS_ESRI_BROWSER_KEY", "").strip()
    if esri_key and (len(esri_key) > 4096 or any(character.isspace() for character in esri_key)):
        raise ImproperlyConfigured(
            "GIS_ESRI_BROWSER_KEY must be a valid browser-scoped ArcGIS key."
        )
    providers.append(
        {
            "id": "hybrid",
            "label": "Hybrid · Esri imagery + labels",
            "engine": "esri",
            "style": "arcgis/imagery",
            "available": bool(esri_key),
            "access_token": esri_key,
            "url": None,
            "attribution": "Esri and imagery/data contributors (dynamic credits on map)",
            "licence": "https://developers.arcgis.com/esri-leaflet/",
            "offline": False,
            "max_native_zoom": 18,
            "note": (
                "Esri imagery with matching road and place labels. "
                "Imagery date and detail vary by location."
                if esri_key
                else "Hybrid needs an entitled, browser-scoped ArcGIS key "
                "configured by the administrator."
            ),
        }
    )
    return {
        "default_provider": "hybrid" if esri_key else "street",
        "center": [12.0715, 124.5922],
        "zoom": 18,
        "providers": providers,
        "boundary_url": "/maps/payahan.geojson",
    }
