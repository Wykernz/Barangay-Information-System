/** Replace frontend/public/barangay-logo.svg with the approved logo later. */
export default function BarangayLogo({ size = 64 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}barangay-logo.svg`}
      alt="Barangay logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", flexShrink: 0 }}
    />
  );
}
