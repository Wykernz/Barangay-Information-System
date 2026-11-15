// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfileDialog } from "./ProfileDialog";

afterEach(cleanup);
test("modal opens and supplies an explicit accessible close action", () => {
  const open = vi.fn();
  HTMLDialogElement.prototype.showModal = open;
  HTMLDialogElement.prototype.close = vi.fn();
  const close = vi.fn();
  render(
    <ProfileDialog title="Register resident" close={close}>
      <p>Synthetic form</p>
    </ProfileDialog>,
  );
  expect(open).toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText("Close form"));
  expect(close).toHaveBeenCalledOnce();
});
