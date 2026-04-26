import json
import logging
from datetime import timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import RouteCache

logger = logging.getLogger(__name__)

CACHE_TTL = timedelta(days=30)
GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
COORD_QUANT = Decimal("0.00001")


def _quantize(value: float) -> Decimal:
    return Decimal(str(value)).quantize(COORD_QUANT)


def _fetch_from_google(
    origin_lat: Decimal,
    origin_lng: Decimal,
    dest_lat: Decimal,
    dest_lng: Decimal,
    travel_mode: str,
) -> list[dict] | None:
    body: dict = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": float(origin_lat),
                    "longitude": float(origin_lng),
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": float(dest_lat),
                    "longitude": float(dest_lng),
                }
            }
        },
        "travelMode": travel_mode,
        "polylineEncoding": "GEO_JSON_LINESTRING",
        "languageCode": "ko",
        "regionCode": "JP",
    }
    if travel_mode == "TRANSIT":
        body["transitPreferences"] = {
            "allowedTravelModes": ["SUBWAY", "TRAIN", "LIGHT_RAIL", "RAIL"],
        }

    response = requests.post(
        GOOGLE_ROUTES_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_ROUTES_API_KEY,
            "X-Goog-FieldMask": "routes.polyline.geoJsonLinestring",
        },
        json=body,
        timeout=10,
    )
    if not response.ok:
        logger.warning(
            "Routes API %s failed %d: origin=(%s,%s) dest=(%s,%s) body=%s",
            travel_mode,
            response.status_code,
            origin_lat,
            origin_lng,
            dest_lat,
            dest_lng,
            response.text[:500],
        )
        return None

    payload = response.json()
    routes = payload.get("routes") or []
    if not routes:
        logger.warning(
            "Routes API %s returned no routes: origin=(%s,%s) dest=(%s,%s) payload=%s",
            travel_mode,
            origin_lat,
            origin_lng,
            dest_lat,
            dest_lng,
            json.dumps(payload)[:500],
        )
        return None

    coords = (
        routes[0].get("polyline", {}).get("geoJsonLinestring", {}).get("coordinates")
    )
    if not isinstance(coords, list) or len(coords) < 2:
        logger.warning(
            "Routes API %s returned invalid polyline: payload=%s",
            travel_mode,
            json.dumps(payload)[:500],
        )
        return None

    return [{"lng": c[0], "lat": c[1]} for c in coords]


@csrf_exempt
@require_POST
def compute(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body)
        origin_lat = _quantize(payload["origin"]["lat"])
        origin_lng = _quantize(payload["origin"]["lng"])
        dest_lat = _quantize(payload["destination"]["lat"])
        dest_lng = _quantize(payload["destination"]["lng"])
        travel_mode = payload["travelMode"]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({"error": "invalid payload"}, status=400)

    if travel_mode not in (RouteCache.WALK, RouteCache.TRANSIT):
        return JsonResponse({"error": "invalid travelMode"}, status=400)

    lookup = {
        "origin_lat": origin_lat,
        "origin_lng": origin_lng,
        "dest_lat": dest_lat,
        "dest_lng": dest_lng,
        "travel_mode": travel_mode,
    }

    cutoff = timezone.now() - CACHE_TTL
    cached = RouteCache.objects.filter(**lookup, created_at__gte=cutoff).first()
    if cached:
        return JsonResponse({"polyline": cached.polyline, "cached": True})

    polyline = _fetch_from_google(
        origin_lat, origin_lng, dest_lat, dest_lng, travel_mode
    )
    if polyline is None:
        return JsonResponse({"error": "upstream failure"}, status=502)

    RouteCache.objects.update_or_create(**lookup, defaults={"polyline": polyline})

    return JsonResponse({"polyline": polyline, "cached": False})
