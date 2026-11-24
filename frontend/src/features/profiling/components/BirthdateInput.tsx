import { useState } from "react";

export function BirthdateInput({
  value,
  max,
  onChange,
  required = true,
}: {
  value: string;
  max: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [parts, setParts] = useState(() => value.split("-"));
  const [year = "", month = "", day = ""] = parts;
  function choose(index: number, selected: string) {
    const next = [year, month, day];
    next[index] = selected;
    setParts(next);
    const candidate =
      next.every(Boolean) && next[0].length === 4 ? next.join("-") : "";
    const parsed = new Date(`${candidate}T00:00:00Z`);
    onChange(
      candidate &&
        Number(next[0]) > 0 &&
        Number.isFinite(+parsed) &&
        parsed.toISOString().slice(0, 10) === candidate &&
        candidate <= max
        ? candidate
        : "",
    );
  }
  return (
    <span className="birthdate-control">
      <span className="birthdate-parts">
        <select
          aria-label="Birth month"
          required={required}
          value={month}
          onChange={(event) => choose(1, event.target.value)}
        >
          <option value="">Month</option>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index} value={String(index + 1).padStart(2, "0")}>
              {new Date(2000, index, 1).toLocaleString("en", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          aria-label="Birth day"
          required={required}
          value={day}
          onChange={(event) => choose(2, event.target.value)}
        >
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, index) => (
            <option key={index} value={String(index + 1).padStart(2, "0")}>
              {index + 1}
            </option>
          ))}
        </select>
        <input
          aria-label="Birth year"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required={required}
          placeholder="Year"
          value={year}
          ref={(input) => {
            input?.setCustomValidity(
              year && month && day && !value
                ? "Enter a valid birthdate that is not in the future."
                : "",
            );
          }}
          onChange={(event) => choose(0, event.target.value)}
        />
      </span>
      <small>Choose month and day, then type the four-digit birth year.</small>
    </span>
  );
}
