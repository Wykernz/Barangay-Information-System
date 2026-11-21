"""Extract the original HDX feature unchanged; never simplify or invent geometry."""

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path


def features_from_stream(stream):
    """Decode one feature at a time so the country file does not exhaust memory."""
    import codecs

    reader = codecs.getreader("utf-8-sig")(stream)
    decoder = json.JSONDecoder()
    buffer = ""
    while not (match := re.search(r'"features"\s*:\s*\[', buffer)):
        chunk = reader.read(65536)
        if not chunk:
            raise ValueError("No GeoJSON features array found.")
        buffer += chunk
    buffer = buffer[match.end() :]
    while True:
        buffer = buffer.lstrip(" \r\n\t,")
        if buffer.startswith("]"):
            return
        try:
            feature, end = decoder.raw_decode(buffer)
        except json.JSONDecodeError:
            chunk = reader.read(1048576)
            if not chunk:
                raise ValueError("Incomplete GeoJSON feature.") from None
            buffer += chunk
            continue
        yield feature
        buffer = buffer[end:]


def extract(archive: Path, destination: Path) -> None:
    source_url = "https://data.humdata.org/dataset/cod-ab-phl"
    with zipfile.ZipFile(archive) as bundle:
        names = [
            name
            for name in bundle.namelist()
            if ("adm4" in name.lower() or "admin4" in name.lower())
            and name.lower().endswith((".geojson", ".json"))
        ]
        if len(names) != 1:
            raise ValueError(f"Expected exactly one ADM4 GeoJSON; found {names}")
        with bundle.open(names[0]) as stream:
            # HDX publishes one complete feature per line. Filter the target code
            # before decoding, retaining its original coordinates unchanged.
            features = []
            try:
                for line in stream:
                    if b'"PH0806003173"' not in line:
                        continue
                    feature = json.loads(line.strip().rstrip(b","))
                    if is_payahan(feature["properties"]):
                        features.append(feature)
            except (json.JSONDecodeError, KeyError):
                features = []
        if not features:
            # Also accept archives serialized with multi-line feature objects.
            with bundle.open(names[0]) as stream:
                features = [
                    feature
                    for feature in features_from_stream(stream)
                    if is_payahan(feature["properties"])
                ]
        if len(features) != 1:
            raise ValueError(
                "Could not uniquely identify Payahan, Calbayog City, Samar."
            )
        feature = features[0]
        if feature["geometry"]["type"] not in ("Polygon", "MultiPolygon"):
            raise ValueError("Boundary must be a polygon.")
        geometry = feature["geometry"]
        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
        )
        points = [point for polygon in polygons for ring in polygon for point in ring]
        bbox = [
            min(point[0] for point in points),
            min(point[1] for point in points),
            max(point[0] for point in points),
            max(point[1] for point in points),
        ]
        with archive.open("rb") as archive_stream:
            digest = hashlib.file_digest(archive_stream, "sha256").hexdigest()
        output = {
            "type": "FeatureCollection",
            "features": [feature],
            "bbox": bbox,
            "metadata": {
                "name": "Payahan, Calbayog City, Samar, Philippines",
                "status": "indicative",
                "officially_verified": False,
                "source_url": source_url,
                "source_download_url": (
                    "https://data.humdata.org/dataset/caf116df-f984-4deb-85ca-41b349d3f313/"
                    "resource/0120c30e-ba8b-487d-83f5-a664eddd3a8e/download/phl_admin_boundaries.geojson.zip"
                ),
                "source_archive": archive.name,
                "source_member": names[0],
                "archive_sha256": digest,
                "source_date": feature["properties"].get(
                    "valid_on", feature["properties"].get("validOn", "Not recorded")
                ),
                "licence": "CC BY 3.0 IGO",
                "licence_url": "https://creativecommons.org/licenses/by/3.0/igo/",
                "attribution": "NAMRIA / Philippine Statistics Authority; distributed by OCHA HDX",
                "processing": "Single feature extracted unchanged. No simplification or approximation.",
                "local_verification": "Pending barangay/LGU GIS review; not an official cadastral boundary.",
            },
        }
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(
            json.dumps(
                {
                    "output": str(destination),
                    "properties": feature["properties"],
                    "archive_sha256": digest,
                },
                indent=2,
            )
        )


def is_payahan(properties: dict) -> bool:
    """Match administrative hierarchy and code, not the repeated barangay name alone."""
    values = {key.lower(): value for key, value in properties.items()}
    return (
        values.get("adm4_pcode") == "PH0806003173"
        and values.get("adm4_name", values.get("adm4_en")) == "Payahan"
        and values.get("adm3_pcode") == "PH0806003"
        and values.get("adm3_name", values.get("adm3_en"))
        in ("Calbayog City", "City of Calbayog", "Calbayog")
    )


if __name__ == "__main__":
    extract(Path(sys.argv[1]), Path(sys.argv[2]))
