// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import L from "leaflet";
import { tiledMapLayer } from "esri-leaflet";
import { createHybridLayer } from "./EsriHybrid";
vi.mock("esri-leaflet", () => ({
  tiledMapLayer: vi.fn(() => ({ on: vi.fn() })),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
test("hybrid combines authenticated imagery and correctly aligned labels below operational overlays", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ copyrightText: "Source <credit>" }),
      }),
  );
  const labels = vi
    .spyOn(L, "tileLayer")
    .mockReturnValue({ on: vi.fn() } as unknown as L.TileLayer);
  const group = vi.spyOn(L, "layerGroup").mockReturnValue({} as L.LayerGroup);
  const pane = document.createElement("div");
  const map = {
    getPane: () => null,
    createPane: () => pane,
  } as unknown as L.Map;
  await createHybridLayer(
    map,
    "synthetic-test-only",
    vi.fn(),
    new AbortController().signal,
  );
  expect(tiledMapLayer).toHaveBeenCalledWith(
    expect.objectContaining({
      token: "synthetic-test-only",
      url: expect.stringContaining("World_Imagery"),
    }),
  );
  expect(labels.mock.calls[0][0]).toContain(
    "arcgis/imagery/labels/static/tile/{z}/{y}/{x}",
  );
  expect(labels.mock.calls[0][1]).toMatchObject({
    tileSize: 512,
    zoomOffset: -1,
    pane: "hybrid-labels",
    attribution: "Source &lt;credit&gt;",
  });
  expect(pane.style.zIndex).toBe("300");
  expect(pane.style.pointerEvents).toBe("none");
  expect(group.mock.calls[0][0]).toHaveLength(2);
});
test("provider authentication failure cannot construct an unattributed hybrid layer", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ error: { code: 498 } }),
      }),
  );
  await expect(
    createHybridLayer(
      {} as L.Map,
      "synthetic-test-only",
      vi.fn(),
      new AbortController().signal,
    ),
  ).rejects.toThrow("attribution unavailable");
  expect(tiledMapLayer).not.toHaveBeenCalled();
});
