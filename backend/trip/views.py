import json
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Bookmark, Day, Location, Trip, TripCity


def _to_decimal(v) -> Decimal | None:
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _serialize_trip_summary(trip: Trip) -> dict:
    return {
        "id": trip.id,
        "name": trip.name,
        "start_date": trip.start_date,
        "updated_at": trip.updated_at.isoformat(),
        "day_count": trip.days.count(),
    }


def _normalize_map_camera(value) -> dict:
    if not isinstance(value, dict):
        return {}
    center = value.get("center")
    if not isinstance(center, dict):
        return {}
    lat = _to_decimal(center.get("lat"))
    lng = _to_decimal(center.get("lng"))
    zoom = value.get("zoom")
    try:
        zoom_float = float(zoom)
    except (TypeError, ValueError):
        return {}
    if lat is None or lng is None:
        return {}
    return {
        "center": {"lat": float(lat), "lng": float(lng)},
        "zoom": zoom_float,
    }


def _normalize_ui_state(value) -> dict:
    if not isinstance(value, dict):
        return {}
    result = {}
    timeline_view = value.get("timelineView")
    if timeline_view in {"gantt", "timetable"}:
        result["timelineView"] = timeline_view
    try:
        active_day = int(value.get("activeDay"))
    except (TypeError, ValueError):
        active_day = None
    if active_day and active_day > 0:
        result["activeDay"] = active_day
    route_selected_days = value.get("routeSelectedDays")
    if isinstance(route_selected_days, list):
        normalized_days = []
        seen_days = set()
        for raw_day in route_selected_days:
            try:
                day = int(raw_day)
            except (TypeError, ValueError):
                continue
            if day <= 0 or day in seen_days:
                continue
            normalized_days.append(day)
            seen_days.add(day)
        if normalized_days:
            result["routeSelectedDays"] = normalized_days
    route_selected_location_keys = value.get("routeSelectedLocationKeys")
    if isinstance(route_selected_location_keys, list):
        normalized_keys = []
        seen_keys = set()
        for raw_key in route_selected_location_keys:
            key = str(raw_key).strip()
            if not key or key in seen_keys:
                continue
            normalized_keys.append(key)
            seen_keys.add(key)
        if normalized_keys:
            result["routeSelectedLocationKeys"] = normalized_keys
    return result


def _normalize_city_style_keys(value) -> dict:
    if not isinstance(value, dict):
        return {}
    return {
        str(city).strip(): str(style_key).strip()
        for city, style_key in value.items()
        if str(city).strip() and str(style_key).strip()
    }


def _normalize_points(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    points = []
    for raw in value:
        if not isinstance(raw, dict):
            continue
        lat = _to_decimal(raw.get("lat"))
        lng = _to_decimal(raw.get("lng"))
        if lat is None or lng is None:
            continue
        points.append({"lat": float(lat), "lng": float(lng)})
    return points


def _normalize_point(value) -> dict | None:
    if not isinstance(value, dict):
        return None
    lat = _to_decimal(value.get("lat"))
    lng = _to_decimal(value.get("lng"))
    if lat is None or lng is None:
        return None
    return {"lat": float(lat), "lng": float(lng)}


def _normalize_transit_role(value) -> str | None:
    role = str(value or "").strip().upper()
    return role if role in {"DEPARTURE", "ARRIVAL"} else None


def _next_transit_role(departures: int, arrivals: int) -> str:
    return "DEPARTURE" if departures <= arrivals else "ARRIVAL"


def _normalize_map_areas(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    areas = []
    seen: set[str] = set()
    for raw in value:
        if not isinstance(raw, dict):
            continue
        area_id = str(raw.get("id") or "").strip()
        if not area_id or area_id in seen:
            continue
        position = _normalize_point(raw.get("position"))
        entry_point = _normalize_point(raw.get("entryPoint"))
        exit_point = _normalize_point(raw.get("exitPoint"))
        shape_vertices = _normalize_points(raw.get("shapeVertices"))
        if not position or not entry_point or not exit_point or len(shape_vertices) < 3:
            continue
        seen.add(area_id)
        areas.append(
            {
                "id": area_id,
                "name": str(raw.get("name") or "AREA"),
                "position": position,
                "shapeVertices": shape_vertices,
                "entryPoint": entry_point,
                "exitPoint": exit_point,
                "hidden": bool(raw.get("hidden")),
            }
        )
    return areas


def _serialize_trip_full(trip: Trip) -> dict:
    days = []
    itinerary: dict[str, dict] = {}
    for day in trip.days.all().prefetch_related("locations"):
        days.append(
            {
                "day": day.day_number,
                "label": day.label,
                "city": day.city,
                "note": day.note,
            }
        )
        locations = []
        transit_departures = 0
        transit_arrivals = 0
        for loc in day.locations.all():
            transit_role = _normalize_transit_role(loc.transit_role)
            if loc.category == "TRANSIT":
                transit_role = transit_role or _next_transit_role(
                    transit_departures, transit_arrivals
                )
                if transit_role == "DEPARTURE":
                    transit_departures += 1
                else:
                    transit_arrivals += 1
            entry: dict = {
                "id": loc.external_id,
                "name": loc.name,
                "category": loc.category,
                "time": loc.time,
            }
            if loc.end_time:
                entry["endTime"] = loc.end_time
            if loc.group_id:
                entry["groupId"] = loc.group_id
            if transit_role:
                entry["transitRole"] = transit_role
            if loc.external_id.startswith("area-") and loc.external_id.endswith(
                "-schedule"
            ):
                entry["areaId"] = loc.external_id.removesuffix("-schedule")
            if loc.lat is not None and loc.lng is not None:
                entry["position"] = {"lat": float(loc.lat), "lng": float(loc.lng)}
            shape_vertices = _normalize_points(loc.shape_vertices)
            if shape_vertices:
                entry["shapeVertices"] = shape_vertices
            if loc.entry_lat is not None and loc.entry_lng is not None:
                entry["entryPoint"] = {
                    "lat": float(loc.entry_lat),
                    "lng": float(loc.entry_lng),
                }
            if loc.exit_lat is not None and loc.exit_lng is not None:
                entry["exitPoint"] = {
                    "lat": float(loc.exit_lat),
                    "lng": float(loc.exit_lng),
                }
            locations.append(entry)
        itinerary[str(day.day_number)] = {
            "locations": locations,
            "routes": [],
            "budget": [],
            "groupNames": dict(day.group_names or {}),
        }

    cities = list(trip.cities.all().values_list("name", flat=True))

    bookmarks = []
    for bm in trip.bookmarks.all():
        entry = {
            "id": bm.id,
            "placeId": bm.place_id,
            "name": bm.name,
            "position": {"lat": float(bm.lat), "lng": float(bm.lng)},
        }
        if bm.address:
            entry["address"] = bm.address
        if bm.poi_type:
            entry["type"] = bm.poi_type
        if bm.rating is not None:
            entry["rating"] = float(bm.rating)
        bookmarks.append(entry)

    map_camera = _normalize_map_camera(trip.map_camera)
    ui_state = _normalize_ui_state(trip.ui_state)
    city_style_keys = _normalize_city_style_keys(trip.ui_state.get("cityStyleKeys"))
    map_areas = _normalize_map_areas(trip.ui_state.get("mapAreas"))
    return {
        "id": trip.id,
        "name": trip.name,
        "start_date": trip.start_date,
        "days": days,
        "cities": cities,
        "itinerary": itinerary,
        "bookmarks": bookmarks,
        "mapAreas": map_areas,
        "cityStyleKeys": city_style_keys,
        "mapCamera": map_camera or None,
        "uiState": ui_state or None,
    }


def _replace_trip_content(trip: Trip, payload: dict) -> None:
    trip.map_camera = _normalize_map_camera(payload.get("mapCamera"))
    ui_state = _normalize_ui_state(payload.get("uiState"))
    ui_state["cityStyleKeys"] = _normalize_city_style_keys(payload.get("cityStyleKeys"))
    ui_state["mapAreas"] = _normalize_map_areas(payload.get("mapAreas"))
    trip.ui_state = ui_state
    trip.save(update_fields=["map_camera", "ui_state"])

    trip.cities.all().delete()
    trip.days.all().delete()
    trip.bookmarks.all().delete()

    for idx, name in enumerate(payload.get("cities") or []):
        if not isinstance(name, str) or not name.strip():
            continue
        TripCity.objects.create(trip=trip, name=name.strip(), order=idx)

    itinerary = payload.get("itinerary") or {}
    for day_entry in payload.get("days") or []:
        try:
            day_number = int(day_entry["day"])
        except (KeyError, TypeError, ValueError):
            continue
        day_data = itinerary.get(str(day_number)) or {}
        raw_group_names = day_data.get("groupNames") or {}
        group_names = (
            {
                str(k): str(v).strip()
                for k, v in raw_group_names.items()
                if isinstance(k, str) and isinstance(v, str) and str(v).strip()
            }
            if isinstance(raw_group_names, dict)
            else {}
        )
        day = Day.objects.create(
            trip=trip,
            day_number=day_number,
            label=str(day_entry.get("label") or ""),
            city=str(day_entry.get("city") or ""),
            note=str(day_entry.get("note") or ""),
            group_names=group_names,
        )
        transit_departures = 0
        transit_arrivals = 0
        for order, loc in enumerate(day_data.get("locations") or []):
            position = loc.get("position") or {}
            entry_point = loc.get("entryPoint") or {}
            exit_point = loc.get("exitPoint") or {}
            category = str(loc.get("category") or "SIGHT")
            transit_role = None
            if category == "TRANSIT":
                transit_role = _normalize_transit_role(
                    loc.get("transitRole")
                ) or _next_transit_role(
                    transit_departures,
                    transit_arrivals,
                )
                if transit_role == "DEPARTURE":
                    transit_departures += 1
                else:
                    transit_arrivals += 1
            Location.objects.create(
                day=day,
                external_id=str(loc.get("id") or f"loc-{day_number}-{order}"),
                name=str(loc.get("name") or ""),
                category=category,
                transit_role=transit_role,
                time=str(loc.get("time") or "00:00"),
                end_time=loc.get("endTime") or None,
                group_id=loc.get("groupId") or None,
                lat=_to_decimal(position.get("lat")),
                lng=_to_decimal(position.get("lng")),
                shape_vertices=_normalize_points(loc.get("shapeVertices")),
                entry_lat=_to_decimal(entry_point.get("lat")),
                entry_lng=_to_decimal(entry_point.get("lng")),
                exit_lat=_to_decimal(exit_point.get("lat")),
                exit_lng=_to_decimal(exit_point.get("lng")),
                order=order,
            )

    seen_place_ids: set[str] = set()
    for order, bm in enumerate(payload.get("bookmarks") or []):
        place_id = str(bm.get("placeId") or "").strip()
        if not place_id or place_id in seen_place_ids:
            continue
        seen_place_ids.add(place_id)
        position = bm.get("position") or {}
        lat = _to_decimal(position.get("lat"))
        lng = _to_decimal(position.get("lng"))
        if lat is None or lng is None:
            continue
        Bookmark.objects.create(
            trip=trip,
            place_id=place_id,
            name=str(bm.get("name") or ""),
            address=str(bm.get("address") or ""),
            poi_type=str(bm.get("type") or ""),
            rating=_to_decimal(bm.get("rating")),
            lat=lat,
            lng=lng,
            order=order,
        )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def trips_collection(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        trips = [_serialize_trip_summary(t) for t in Trip.objects.all()]
        return JsonResponse({"trips": trips})

    try:
        payload = json.loads(request.body)
        name = str(payload["name"]).strip()
        start_date = str(payload["start_date"]).strip()
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({"error": "invalid payload"}, status=400)

    if not name or not start_date:
        return JsonResponse({"error": "name and start_date required"}, status=400)

    with transaction.atomic():
        trip = Trip.objects.create(name=name, start_date=start_date)
        Day.objects.create(trip=trip, day_number=1, label="", city="", note="")

    return JsonResponse(_serialize_trip_full(trip), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def trip_detail(request: HttpRequest, trip_id: int) -> JsonResponse:
    trip = get_object_or_404(Trip, pk=trip_id)

    if request.method == "GET":
        return JsonResponse(_serialize_trip_full(trip))

    if request.method == "DELETE":
        trip.delete()
        return JsonResponse({"ok": True})

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid json"}, status=400)

    with transaction.atomic():
        name = payload.get("name")
        start_date = payload.get("start_date")
        if isinstance(name, str) and name.strip():
            trip.name = name.strip()
        if isinstance(start_date, str) and start_date.strip():
            trip.start_date = start_date.strip()
        trip.save()
        _replace_trip_content(trip, payload)

    return JsonResponse(_serialize_trip_full(trip))
