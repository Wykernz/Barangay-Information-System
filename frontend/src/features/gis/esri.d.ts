declare module "esri-leaflet" {
  export function tiledMapLayer(options: {
    url: string;
    token: string;
    maxZoom: number;
  }): import("leaflet").Layer;
}
