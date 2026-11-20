"""Public boundary provenance and extraction safety; no resident data."""

import io
import json
import runpy
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
extractor = runpy.run_path(str(ROOT / "scripts/extract_payahan.py"))


def test_committed_boundary_is_the_named_original_hdx_feature():
    data = json.loads((ROOT / "frontend/public/maps/payahan.geojson").read_text(encoding="utf-8"))
    assert len(data["features"]) == 1
    feature = data["features"][0]
    assert extractor["is_payahan"](feature["properties"])
    assert feature["properties"]["adm2_name"] == "Samar (Western Samar)"
    assert data["metadata"]["officially_verified"] is False
    assert data["metadata"]["status"] == "indicative"
    assert data["metadata"]["archive_sha256"] == (
        "032db5d91fcb8a13aef378d6b4453da7225ef7f0fb9c0a1c3bf3c2205d0010d6"
    )
    geometry = feature["geometry"]
    assert geometry["type"] in ("Polygon", "MultiPolygon")
    polygons = (
        [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    )
    for polygon in polygons:
        for ring in polygon:
            assert len(ring) >= 4 and ring[0] == ring[-1]
            assert all(-180 <= point[0] <= 180 and -90 <= point[1] <= 90 for point in ring)


def test_repeated_barangay_name_in_another_city_is_not_matched():
    assert not extractor["is_payahan"](
        {
            "adm4_name": "Payahan",
            "adm4_pcode": "PH0500510020",
            "adm3_name": "Malinao",
            "adm3_pcode": "PH0500510",
        }
    )


def test_stream_parser_handles_multiline_features():
    data = {
        "type": "FeatureCollection",
        "features": [{"type": "Feature", "properties": {"label": "Synthetic"}, "geometry": None}],
    }
    assert (
        list(extractor["features_from_stream"](io.BytesIO(json.dumps(data, indent=2).encode())))
        == data["features"]
    )


def test_missing_payahan_never_creates_a_fallback_boundary(tmp_path):
    archive = tmp_path / "synthetic.zip"
    destination = tmp_path / "boundary.geojson"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("admin4.geojson", json.dumps({"type": "FeatureCollection", "features": []}))
    with pytest.raises(ValueError, match="uniquely identify"):
        extractor["extract"](archive, destination)
    assert not destination.exists()
