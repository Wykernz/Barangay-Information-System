// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HazardLayerControls, useHazardLayers } from "./HazardLayers";
import { syntheticLayer, syntheticCollection } from "./hazardFixtures";

function Panel() {
  const state = useHazardLayers();
  return (
    <>
      <HazardLayerControls state={state} />
      <p>Loaded polygons: {state.data?.features.length ?? 0}</p>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("pending flood/fire sources show unassessed and draw no risk polygons", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ version: 1, layers: [] }),
    }),
  );
  render(<Panel />);
  fireEvent.change(screen.getByLabelText("Risk overlay"), {
    target: { value: "pending-flood" },
  });
  expect(await screen.findByText(/No flood dataset loaded/)).toBeTruthy();
  expect(screen.getByText("Loaded polygons: 0")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Risk overlay"), {
    target: { value: "pending-fire" },
  });
  expect(screen.getByText(/No fire dataset loaded/)).toBeTruthy();
});
test("sourced layer loads, shows its legend and clears when switched off", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      text: async () =>
        JSON.stringify(
          url.endsWith("manifest.json")
            ? { version: 1, layers: [syntheticLayer] }
            : syntheticCollection,
        ),
    })),
  );
  render(<Panel />);
  await screen.findByRole("option", { name: "Flood: Synthetic test only" });
  fireEvent.change(screen.getByLabelText("Risk overlay"), {
    target: { value: syntheticLayer.id },
  });
  expect(await screen.findByText("Loaded polygons: 1")).toBeTruthy();
  expect(screen.getByText("Indicative — not locally verified")).toBeTruthy();
  expect(screen.getByText("High (source classification)")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Risk overlay"), {
    target: { value: "" },
  });
  expect(await screen.findByText("Loaded polygons: 0")).toBeTruthy();
});
