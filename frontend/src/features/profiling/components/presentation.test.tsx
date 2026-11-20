// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DemoProvider } from "../../../demo/store";
import { ProfilingPage, ProfilingProvider } from "../Profiling";

beforeEach(() => {
  // jsdom does not implement native dialog visibility; reflect browser behavior.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});
afterEach(cleanup);
function page(path: string, module: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider profilingFixtures>
        <ProfilingProvider>
          <Routes>
            {[...new Set([module, "residents", "households"])].flatMap(
              (key) => [
                <Route
                  key={`${key}-list`}
                  path={`/${key}`}
                  element={<ProfilingPage key={`${key}-list`} module={key} />}
                />,
                <Route
                  key={`${key}-detail`}
                  path={`/${key}/:id`}
                  element={<ProfilingPage key={`${key}-detail`} module={key} />}
                />,
              ],
            )}
          </Routes>
        </ProfilingProvider>
      </DemoProvider>
    </MemoryRouter>,
  );
}
test("registry keeps labeled actions and delete cancellation preserves records", () => {
  page("/residents", "residents");
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "View Bayonon, Adrian Joseph" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Delete Bayonon, Adrian Joseph" }),
  );
  expect(screen.getByLabelText("Confirm record removal")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.getByRole("link", { name: "View Bayonon, Adrian Joseph" }),
  ).toBeTruthy();
});

test("residency filter offers only the two classifications and preserves old records in All", () => {
  page("/residents", "residents");
  fireEvent.change(screen.getByLabelText("Filter by residency"), {
    target: { value: "Resident" },
  });
  expect(
    screen.queryByRole("link", { name: "View Bayonon, Adrian Joseph" }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Filter by residency"), {
    target: { value: "" },
  });
  expect(
    screen.getByRole("link", { name: "View Bayonon, Adrian Joseph" }),
  ).toBeTruthy();
  expect(screen.queryByRole("option", { name: "Not classified" })).toBeNull();
});
test("resident create and edit save profile fields", () => {
  page("/residents", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Synthetic" },
  });
  fireEvent.change(screen.getByLabelText("Surname"), {
    target: { value: "Workflow" },
  });
  for (const [label, value] of [
    ["Birth month", "01"],
    ["Birth day", "01"],
    ["Birth year", "1995"],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText("Residency classification"), {
    target: { value: "Resident" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Workflow, Synthetic",
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Workflow, Updated",
  );
});

test.each(["Resident", "Non-resident"])(
  "registration requires an explicit classification before saving %s",
  (classification) => {
    page("/residents", "residents");
    fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
    const select = screen.getByLabelText(
      "Residency classification",
    ) as HTMLSelectElement;
    expect(select.required).toBe(true);
    expect(select.value).toBe("");
    for (const [label, value] of [
      ["First name", "Synthetic"],
      ["Surname", "Required"],
      ["Birth month", "01"],
      ["Birth day", "01"],
      ["Birth year", "2000"],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.submit(select.closest("form")!);
    expect(
      within(screen.getByRole("dialog")).getByRole("alert").textContent,
    ).toBe("Choose Resident or Non-resident.");
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.change(select, { target: { value: classification } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(classification)).toBeTruthy();
  },
);
test("archive search shows an empty state and restore does not reopen membership", () => {
  page("/residents", "residents");
  fireEvent.change(screen.getByLabelText("Search residents"), {
    target: { value: "Adrian Joseph" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Delete Bayonon, Adrian Joseph" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(screen.getByText(/No matching records/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Show archived records"));
  fireEvent.click(
    screen.getByRole("button", { name: "Restore Bayonon, Adrian Joseph" }),
  );
  const row = screen
    .getByRole("link", { name: "View Bayonon, Adrian Joseph" })
    .closest("tr")!;
  expect(within(row).getByText("Unassigned")).toBeTruthy();
});
test("same-household relationship edits persist as a new history segment", () => {
  page("/residents/DEMO-R002", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.change(screen.getByLabelText("Residency classification"), {
    target: { value: "Non-resident" },
  });
  fireEvent.change(screen.getByLabelText("Household"), {
    target: { value: "DEMO-H001" },
  });
  fireEvent.change(screen.getByLabelText("Relationship"), {
    target: { value: "Sibling" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByText(/Sibling.*Current/)).toBeTruthy();
  expect(screen.getByText("Non-resident")).toBeTruthy();
  expect(screen.getByText(/Son.*2026-01-01/)).toBeTruthy();
});
test("a household with active members cannot be removed", () => {
  page("/households", "households");
  fireEvent.click(screen.getByRole("button", { name: "Delete HH-001" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(
    screen.getAllByText(
      "Unassign or transfer household members before removal.",
    ).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "View HH-001" })).toBeTruthy();
});
test("registration has one dialog heading and retains all identity fields", () => {
  page("/residents", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
  expect(
    screen.getAllByRole("heading", { name: "Register resident" }),
  ).toHaveLength(1);
  for (const label of [
    "First name",
    "Surname",
    "Birth month",
    "Birth day",
    "Birth year",
    "Sex",
    "Civil status",
    "Relationship",
  ]) {
    expect(screen.getByLabelText(label)).toBeTruthy();
  }
  expect(screen.getByRole("button", { name: "Save profile" })).toBeTruthy();
});
test("household keeps member controls, occupancy and survey sections", () => {
  page("/households/DEMO-H001", "households");
  fireEvent.click(screen.getByText("Age-group summary"));
  expect(
    screen.getByRole("region", { name: "Household demographic summary" }),
  ).toBeTruthy();
  expect(screen.getByText("Senior Citizens (60–74 years)")).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Household members (3)" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add member" })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Manage / })).toHaveLength(3);
  expect(
    screen.getByRole("heading", { name: "Housing occupancy history" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "Household surveys" }),
  ).toBeNull();
});

test("household capture details save and reopen in the same session", () => {
  page("/households/DEMO-H001", "households");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  for (const [label, value] of [
    ["Survey date", "2026-11-17"],
    ["Water source", "Communal faucet"],
    ["Does this household have a septic tank?", "Yes"],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByText("Yes")).toBeTruthy();
  fireEvent.click(screen.getByText("Water, sanitation & survey details"));
  expect(screen.getAllByText("Water source", { selector: "dt" })).toHaveLength(
    1,
  );
  expect(screen.queryByText("Water supply")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(
    (screen.getByLabelText("Water source") as HTMLSelectElement).value,
  ).toBe("Communal faucet");
  expect(screen.queryByLabelText("Barangay")).toBeNull();
  expect(
    (
      screen.getByLabelText(
        "Does this household have a septic tank?",
      ) as HTMLSelectElement
    ).value,
  ).toBe("Yes");
});

test("new households start with Family 1 and the first added family is Family 2", () => {
  page("/households", "households");
  fireEvent.click(screen.getByRole("button", { name: "Add household" }));
  fireEvent.change(screen.getByLabelText("Household label"), {
    target: { value: "Synthetic New Household" },
  });
  expect(screen.getAllByLabelText("Water source")).toHaveLength(1);
  expect(screen.queryByLabelText("Water supply")).toBeNull();
  fireEvent.change(screen.getByLabelText("Water source"), {
    target: { value: "Rainwater" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByRole("article", { name: "Family 1" })).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(
    (screen.getByLabelText("Water source") as HTMLSelectElement).value,
  ).toBe("Rainwater");
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Add family" }));
  expect((screen.getByLabelText("Family name") as HTMLInputElement).value).toBe(
    "Family 2",
  );
  fireEvent.click(screen.getByRole("button", { name: "Create family" }));
  expect(screen.getByRole("article", { name: "Family 2" })).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("adding a person to a single-family household defaults to Family 1", () => {
  page("/households/DEMO-H001", "households");
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(
    (dialog.getByLabelText("Family") as HTMLSelectElement).selectedOptions[0]
      .text,
  ).toBe("Family 1");
  fireEvent.click(
    dialog.getByRole("link", { name: /Register a new resident/ }),
  );
  expect(
    (screen.getByLabelText("Family") as HTMLSelectElement).selectedOptions[0]
      .text,
  ).toBe("Family 1");
});

function createFamily(name: string, people: RegExp[] = []) {
  fireEvent.click(screen.getByRole("button", { name: "Add family" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Family name"), {
    target: { value: name },
  });
  for (const person of people)
    fireEvent.click(within(dialog).getByRole("checkbox", { name: person }));
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Create family" }),
  );
}

test("a second family shows its selected members without changing household totals", () => {
  page("/households/DEMO-H001", "households");
  expect(
    within(screen.getByRole("article", { name: "Family 1" })).getByText(
      "3 members",
    ),
  ).toBeTruthy();
  createFamily("Synthetic Family B", [/Doinog, MIko/]);
  const first = within(screen.getByRole("article", { name: "Family 1" }));
  const second = within(
    screen.getByRole("article", { name: "Synthetic Family B" }),
  );
  expect(first.getByText("2 members")).toBeTruthy();
  expect(first.getByText("Household head")).toBeTruthy();
  expect(second.getByText("1 member")).toBeTruthy();
  expect(second.getByRole("link", { name: "Doinog, MIko" })).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(
    screen.getByRole("heading", { name: "Household members (3)" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Membership history"));
  expect(
    screen.getByRole("table", { name: "Household membership history" }),
  ).toBeTruthy();
});

test("choosing members moves family assignment and preserves the household head", () => {
  page("/households/DEMO-H001", "households");
  createFamily("Synthetic A", [/Bayonon, Adrian Joseph/]);
  createFamily("Synthetic B");
  fireEvent.click(
    within(screen.getByRole("article", { name: "Synthetic B" })).getByRole(
      "button",
      { name: "Choose members" },
    ),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("checkbox", {
      name: /Bayonon, Adrian Joseph/,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save members" }));
  expect(
    within(screen.getByRole("article", { name: "Synthetic A" })).getByText(
      "0 members",
    ),
  ).toBeTruthy();
  expect(
    within(screen.getByRole("article", { name: "Synthetic B" })).getByText(
      "Household head",
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Household members (3)" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Filter by family"), {
    target: { value: "unassigned" },
  });
  expect(screen.getByText("Showing 0 of 3 household members")).toBeTruthy();
});

test("duplicate family names are rejected and cancel does not create a family", () => {
  page("/households/DEMO-H001", "households");
  createFamily("Synthetic A");
  createFamily("  synthetic a  ");
  expect(
    within(screen.getByRole("dialog")).getByRole("alert").textContent,
  ).toContain("already has a family");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("existing people transfer into the selected family with an explicit warning", () => {
  page("/households/DEMO-H001", "households");
  createFamily("Synthetic Second Family");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add person to Synthetic Second Family",
    }),
  );
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("radio", { name: /Ardidon, Paul Vincent/ }));
  expect(
    dialog.getByText(/previous household will be left without a head/),
  ).toBeTruthy();
  fireEvent.change(dialog.getByLabelText("Relationship to household head"), {
    target: { value: "Parent" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Transfer member" }));
  expect(
    screen.getByRole("heading", { name: "Household members (4)" }),
  ).toBeTruthy();
  expect(
    within(
      screen.getByRole("article", { name: "Synthetic Second Family" }),
    ).getByRole("link", { name: "Ardidon, Paul Vincent" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Manage Ardidon, Paul Vincent" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remove from household" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.getByRole("heading", { name: "Household members (4)" }),
  ).toBeTruthy();
});

test("membership removal is confirmed and leaves the resident profile available", () => {
  page("/households/DEMO-H001", "households");
  fireEvent.click(screen.getByRole("button", { name: "Manage General, Renz" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Remove from household" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Remove household member" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  expect(
    screen.getByRole("heading", { name: "Household members (2)" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Membership history"));
  expect(
    within(
      screen.getByRole("table", { name: "Household membership history" }),
    ).getByText("Renz General"),
  ).toBeTruthy();
});

test("registration from a family returns the new person to that household and family", () => {
  page("/households/DEMO-H001", "households");
  createFamily("Synthetic Second Family");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add person to Synthetic Second Family",
    }),
  );
  fireEvent.click(
    screen.getByRole("link", { name: /Register a new resident/ }),
  );
  const dialog = within(
    screen.getByRole("dialog", { name: "Register resident" }),
  );
  expect((dialog.getByLabelText("Household") as HTMLSelectElement).value).toBe(
    "DEMO-H001",
  );
  expect(
    (dialog.getByLabelText("Family") as HTMLSelectElement).selectedOptions[0]
      .text,
  ).toBe("Synthetic Second Family");
  for (const [label, value] of [
    ["First name", "Synthetic"],
    ["Surname", "Newmember"],
    ["Birth month", "01"],
    ["Birth day", "02"],
    ["Birth year", "2000"],
    ["Residency classification", "Resident"],
  ]) {
    fireEvent.change(dialog.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(dialog.getByRole("button", { name: "Save profile" }));
  expect(
    screen.getByRole("heading", { name: "Household members (4)" }),
  ).toBeTruthy();
  expect(
    within(
      screen.getByRole("article", { name: "Synthetic Second Family" }),
    ).getByRole("link", { name: "Newmember, Synthetic" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Manage Newmember, Synthetic" }),
  );
  fireEvent.click(screen.getByRole("link", { name: /Edit resident profile/ }));
  expect(
    (screen.getByLabelText("Family") as HTMLSelectElement).selectedOptions[0]
      .text,
  ).toBe("Synthetic Second Family");
});
