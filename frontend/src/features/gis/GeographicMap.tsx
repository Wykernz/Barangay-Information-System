import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import "./gis.css";
import type { MapConfiguration, MapHousehold, Position, Provider } from "./api";

type Props = {
  configuration: MapConfiguration;
  provider: Provider | undefined;
  households: MapHousehold[];
  selected: MapHousehold | undefined;
  draft: Position | null;
  editing: boolean;
  boundary: GeoJsonObject | null;
  boundaryFocus?: number;
  onSelect: (id: string) => void;
  onPosition: (position: Position) => void;
  onTileError: () => void;
};
const icon = (selected = false) =>
  L.divIcon({
    className: "house-marker",
    html: `<span class="house-marker-dot${selected ? " selected" : ""}">⌂</span>`,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });

export default function GeographicMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { maxZoom: 20 }).setView(
      props.configuration.center,
      props.configuration.zoom,
    );
    map.current = instance;
    instance.on("click", (event: L.LeafletMouseEvent) => {
      if (latest.current.editing)
        latest.current.onPosition({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !props.provider?.url) return;
    // Attribution strings are plain text; Leaflet's HTML surface receives escaped text.
    const credit = document.createElement("span");
    const link = document.createElement("a");
    link.textContent = props.provider.attribution;
    link.href = props.provider.url.includes("tile.openstreetmap.org")
      ? "https://www.openstreetmap.org/copyright"
      : props.provider.licence;
    link.target = "_blank";
    link.rel = "noreferrer";
    credit.append(link);
    const layer = L.tileLayer(props.provider.url, {
      attribution: credit.innerHTML,
      maxNativeZoom: props.provider.max_native_zoom,
      maxZoom: 20,
      referrerPolicy: "strict-origin-when-cross-origin",
    }).addTo(instance);
    layer.on("tileerror", () => latest.current.onTileError());
    return () => {
      layer.remove();
    };
  }, [props.provider]);
  useEffect(() => {
    if (!map.current || !props.boundary) return;
    const layer = L.geoJSON(props.boundary, {
      style: {
        color: "#a65d08",
        weight: 3,
        dashArray: "8 5",
        fillOpacity: 0.08,
      },
    }).addTo(map.current);
    return () => {
      layer.remove();
    };
  }, [props.boundary]);
  useEffect(() => {
    if (!map.current || !props.boundary || !props.boundaryFocus) return;
    const bounds = L.geoJSON(props.boundary).getBounds();
    if (bounds.isValid())
      map.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [props.boundaryFocus, props.boundary]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    // One physical house may have several households; a marker selects its first household.
    const units = new Set<string>();
    const ordered = [...props.households].sort(
      (a, b) =>
        Number(b.id === props.selected?.id) -
        Number(a.id === props.selected?.id),
    );
    for (const household of ordered) {
      if (
        !household.location ||
        household.location.verification_status === "rejected" ||
        !household.housing_unit ||
        units.has(household.housing_unit)
      )
        continue;
      units.add(household.housing_unit);
      if (
        props.editing &&
        household.housing_unit === props.selected?.housing_unit
      )
        continue;
      const marker = L.marker(
        [household.location.latitude, household.location.longitude],
        {
          icon: icon(household.id === props.selected?.id),
          title: household.housing_label ?? "House",
        },
      ).addTo(layer);
      marker.on("click", () => latest.current.onSelect(household.id));
    }
    if (props.editing && props.draft) {
      const marker = L.marker([props.draft.latitude, props.draft.longitude], {
        icon: icon(true),
        draggable: true,
        title: "Drag proposed house location",
      }).addTo(layer);
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        latest.current.onPosition({
          latitude: position.lat,
          longitude: position.lng,
        });
      });
    }
    return () => {
      layer.remove();
    };
  }, [props.households, props.selected, props.editing, props.draft]);
  useEffect(() => {
    if (
      props.selected?.location &&
      props.selected.location.verification_status !== "rejected"
    )
      map.current?.setView(
        [props.selected.location.latitude, props.selected.location.longitude],
        18,
      );
  }, [props.selected?.id, props.selected?.location?.id]);
  return (
    <div
      ref={container}
      className="geographic-map"
      role="region"
      aria-label="Barangay Payahan household map"
    />
  );
}
