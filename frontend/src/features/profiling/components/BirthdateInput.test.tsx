// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { BirthdateInput } from "./BirthdateInput";

afterEach(cleanup);

function Form() {
  const [value, setValue] = useState("");
  return (
    <form aria-label="Profile">
      <BirthdateInput value={value} max="2026-11-19" onChange={setValue} />
      <output aria-label="Selected date">{value}</output>
    </form>
  );
}

test("one date control supports typing a year and rejects invalid and future dates", () => {
  const { container } = render(<Form />);
  expect(container.querySelector('input[type="date"]')).toBeNull();
  const year = screen.getByRole("textbox", { name: "Birth year" });
  const form = screen.getByRole("form") as HTMLFormElement;
  expect(form.checkValidity()).toBe(false);
  fireEvent.change(screen.getByLabelText("Birth month"), {
    target: { value: "02" },
  });
  fireEvent.change(screen.getByLabelText("Birth day"), {
    target: { value: "29" },
  });
  fireEvent.change(year, { target: { value: "2000" } });
  expect(screen.getByLabelText("Selected date").textContent).toBe("2000-02-29");
  expect(form.checkValidity()).toBe(true);
  fireEvent.change(year, { target: { value: "2001" } });
  expect(form.checkValidity()).toBe(false);
  fireEvent.change(year, { target: { value: "2028" } });
  expect(form.checkValidity()).toBe(false);
  fireEvent.change(year, { target: { value: "2000" } });
  expect(form.checkValidity()).toBe(true);
});
