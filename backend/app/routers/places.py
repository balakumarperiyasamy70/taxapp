import httpx
from fastapi import APIRouter, HTTPException, Query
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/autocomplete")
def autocomplete(input: str = Query(..., min_length=2)):
    """Return address suggestions from Google Places Autocomplete."""
    resp = httpx.get(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json",
        params={
            "input": input,
            "types": "address",
            "components": "country:us",
            "key": settings.google_places_api_key,
        },
        timeout=5,
    )
    data = resp.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(status_code=502, detail=f"Places API error: {data.get('status')}")
    return [
        {"description": p["description"], "place_id": p["place_id"]}
        for p in data.get("predictions", [])
    ]


@router.get("/details")
def details(place_id: str = Query(...)):
    """Return address components for a given place_id."""
    resp = httpx.get(
        "https://maps.googleapis.com/maps/api/place/details/json",
        params={
            "place_id": place_id,
            "fields": "address_components,formatted_address",
            "key": settings.google_places_api_key,
        },
        timeout=5,
    )
    data = resp.json()
    import sys
    print(f"PLACES DETAILS RESPONSE: {data}", flush=True, file=sys.stderr)
    if data.get("status") != "OK":
        raise HTTPException(status_code=502, detail=f"Places API error: {data.get('status')} — {data.get('error_message','')}")

    components = data["result"]["address_components"]
    result = {"street_number": "", "route": "", "city": "", "state": "", "zip": ""}

    for c in components:
        types = c["types"]
        if "street_number" in types:
            result["street_number"] = c["long_name"]
        elif "route" in types:
            result["route"] = c["long_name"]
        elif "locality" in types:
            result["city"] = c["long_name"]
        elif "administrative_area_level_1" in types:
            result["state"] = c["short_name"]
        elif "postal_code" in types:
            result["zip"] = c["long_name"]

    result["address"] = f"{result['street_number']} {result['route']}".strip()
    return result
