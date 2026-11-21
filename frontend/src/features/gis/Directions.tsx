import type { HouseholdLocation } from "./api";

export function directionsUrl(
  location: HouseholdLocation | null,
): string | null {
  if (
    !location ||
    location.verification_status === "rejected" ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  )
    return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    `${location.latitude},${location.longitude}`,
  );
  return url.toString();
}

export default function Directions({
  location,
}: {
  location: HouseholdLocation | null;
}) {
  const url = directionsUrl(location);
  return (
    <div className="house-directions">
      {url ? (
        <>
          <a
            className="button"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions
          </a>
          <small>
            Opens Google Maps with this house’s coordinates. Internet required.
          </small>
          {location?.verification_status !== "verified" && (
            <small>House location is not yet verified.</small>
          )}
        </>
      ) : (
        <>
          <button className="secondary" disabled>
            Directions
          </button>
          <small>
            Assign a valid house location before requesting directions.
          </small>
        </>
      )}
    </div>
  );
}
