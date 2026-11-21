import L from "leaflet";
import { tiledMapLayer } from "esri-leaflet";

/** Authenticated imagery + matching raster labels, avoiding a WebGL dependency. */
export async function createHybridLayer(
  map: L.Map,
  token: string,
  onError: () => void,
  signal: AbortSignal,
) {
  const root =
    "https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/arcgis/imagery/labels/static";
  const query = new URLSearchParams({ f: "json", token });
  const response = await fetch(`${root}?${query}`, {
    signal,
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok) throw Error("Hybrid metadata unavailable");
  const metadata = (await response.json()) as {
    error?: unknown;
    copyrightText?: string;
  };
  if (metadata.error || !metadata.copyrightText)
    throw Error("Hybrid attribution unavailable");
  if (!map.getPane("hybrid-labels")) {
    const pane = map.createPane("hybrid-labels");
    pane.style.zIndex = "300";
    pane.style.pointerEvents = "none";
  }
  const credit = document.createElement("span");
  credit.textContent = metadata.copyrightText;
  const imagery = tiledMapLayer({
    url: "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer",
    token,
    maxZoom: 20,
  });
  const labels = L.tileLayer(
    `${root}/tile/{z}/{y}/{x}?${new URLSearchParams({ token })}`,
    {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      pane: "hybrid-labels",
      attribution: credit.innerHTML,
      referrerPolicy: "strict-origin-when-cross-origin",
    },
  );
  imagery.on("tileerror requesterror authenticationerror", onError);
  labels.on("tileerror", onError);
  return L.layerGroup([imagery, labels]);
}
