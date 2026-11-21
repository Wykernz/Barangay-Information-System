// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Directions, { directionsUrl } from "./Directions";
import type { HouseholdLocation } from "./api";
const location: HouseholdLocation = {
  id: "synthetic-location",
  latitude: 1.25,
  longitude: 2.5,
  source: "Synthetic test",
  accuracy_m: null,
  verification_status: "unverified",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("directions sends only saved destination coordinates with no external request on render", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<Directions location={location} />);
  const link = screen.getByRole("link", {
    name: "Directions",
  }) as HTMLAnchorElement;
  const url = new URL(link.href);
  expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
  expect([...url.searchParams.entries()]).toEqual([
    ["api", "1"],
    ["destination", "1.25,2.5"],
  ]);
  expect(link.target).toBe("_blank");
  expect(link.rel).toContain("noreferrer");
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText("House location is not yet verified.")).toBeTruthy();
});
test.each([
  null,
  { ...location, verification_status: "rejected" },
  { ...location, latitude: NaN },
  { ...location, latitude: 91 },
  { ...location, longitude: Infinity },
  { ...location, longitude: -181 },
])(
  "missing, invalid or rejected locations cannot launch directions",
  (point) => {
    expect(directionsUrl(point)).toBeNull();
    render(<Directions location={point} />);
    expect(screen.queryByRole("link", { name: "Directions" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Directions" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  },
);
