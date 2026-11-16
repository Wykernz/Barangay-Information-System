import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createProfileForm,
  FIELD_TYPES,
  FORM_MODULES,
  profileFormError,
  transitionProfileForm,
  updateProfileForm,
  type FieldType,
  type FormDefinition,
  type FormDefinitionPayload,
  type FormField,
  type FormModule,
} from "./api";
import FieldPreview from "./FieldPreview";

export type EditorField = FormField & { editorId: string };
export type EditorDefinition = Omit<FormDefinition, "fields"> & {
  fields: EditorField[];
};

let nextEditorId = 1;

function editorId(): string {
  const id = `field-${nextEditorId}`;
  nextEditorId += 1;
  return id;
}

export function blankDefinition(): EditorDefinition {
  return {
    id: "",
    module: "residents",
    name: "",
    version: 1,
    status: "draft",
    created_at: "",
    updated_at: "",
    fields: [],
  };
}

export function editableDefinition(
  definition: FormDefinition,
): EditorDefinition {
  return {
    ...definition,
    fields: definition.fields
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((field) => ({
        ...field,
        options: [...field.options],
        editorId: editorId(),
      })),
  };
}

function blankField(position: number): EditorField {
  return {
    editorId: editorId(),
    key: "",
    label: "",
    help_text: "",
    data_type: "text",
    required: false,
    position,
    options: [],
    sensitive: false,
  };
}

function payloadFor(definition: EditorDefinition): FormDefinitionPayload {
  return {
    module: definition.module,
    name: definition.name.trim(),
    version: definition.version,
    status: "draft",
    fields: definition.fields.map((field, position) => ({
      ...(field.id ? { id: field.id } : {}),
      key: field.key.trim(),
      label: field.label.trim(),
      help_text: field.help_text.trim(),
      data_type: field.data_type,
      required: field.required,
      position,
      options:
        field.data_type === "choice" || field.data_type === "multi_choice"
          ? field.options.map((option) => option.trim()).filter(Boolean)
          : [],
      sensitive: field.sensitive,
    })),
  };
}

function validationMessage(definition: EditorDefinition): string | null {
  if (!definition.name.trim()) return "Enter a definition name.";
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    return "Enter a whole-number version of at least 1.";
  }
  const keys = new Set<string>();
  for (const [index, field] of definition.fields.entries()) {
    const number = index + 1;
    if (!field.key.trim()) return `Enter a key for field ${number}.`;
    if (!field.label.trim()) return `Enter a label for field ${number}.`;
    const key = field.key.trim();
    if (keys.has(key))
      return `Field keys must be unique. “${key}” is repeated.`;
    keys.add(key);
    if (
      (field.data_type === "choice" || field.data_type === "multi_choice") &&
      !field.options.some((option) => option.trim())
    ) {
      return `Add at least one option for field ${number}.`;
    }
  }
  return null;
}

export function moduleLabel(module: FormModule): string {
  return {
    residents: "Residents",
    households: "Households",
    housing: "Housing units",
    surveys: "Surveys",
    gis: "Housing map / GIS",
  }[module];
}

export function fieldTypeLabel(type: FieldType): string {
  return {
    text: "Short text",
    long_text: "Long text",
    integer: "Whole number",
    decimal: "Decimal number",
    boolean: "Yes / no",
    date: "Date",
    choice: "Single choice",
    multi_choice: "Multiple choices",
  }[type];
}

export default function DefinitionEditor({
  definition: initialDefinition,
  onSaved,
}: {
  definition: FormDefinition;
  onSaved: (definition: FormDefinition) => void;
}) {
  const [definition, setDefinition] = useState<EditorDefinition>(() =>
    initialDefinition.id
      ? editableDefinition(initialDefinition)
      : blankDefinition(),
  );
  const [dirty, setDirty] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [notice, setNotice] = useState("");
  const editable = definition.status === "draft";
  const isNew = !definition.id;

  function applySaved(saved: FormDefinition) {
    setDefinition(editableDefinition(saved));
    setDirty(false);
    setNotice(
      saved.status === "draft"
        ? `Draft definition saved to the backend (version ${saved.version}).`
        : `Definition ${saved.status} (version ${saved.version}).`,
    );
    onSaved(saved);
  }

  const save = useMutation({
    mutationFn: (payload: FormDefinitionPayload) =>
      definition.id
        ? updateProfileForm(definition.id, payload)
        : createProfileForm(payload),
    onSuccess: applySaved,
  });
  const transition = useMutation({
    mutationFn: (action: "activate" | "archive") =>
      transitionProfileForm(definition.id, action),
    onSuccess: applySaved,
  });

  function changeStatus(action: "activate" | "archive") {
    const instruction =
      action === "activate"
        ? "Activation makes this version immutable and available for resident profiling. Confirm that the required stakeholder reviews are complete."
        : "Archiving prevents new records from using this version. Existing history is retained.";
    if (
      window.confirm(`${instruction}\n\nContinue to ${action} this version?`)
    ) {
      setNotice("");
      transition.mutate(action);
    }
  }

  function update(recipe: (current: EditorDefinition) => EditorDefinition) {
    setDefinition(recipe);
    setDirty(true);
    setValidationError("");
    setNotice("");
    if (save.isError) save.reset();
    if (transition.isError) transition.reset();
  }

  function updateField<Key extends keyof EditorField>(
    id: string,
    key: Key,
    value: EditorField[Key],
  ) {
    update((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.editorId === id ? { ...field, [key]: value } : field,
      ),
    }));
  }

  function moveField(index: number, offset: -1 | 1) {
    update((current) => {
      const fields = [...current.fields];
      const target = index + offset;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields };
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validationMessage(definition);
    if (message) {
      setValidationError(message);
      setNotice("");
      return;
    }
    setValidationError("");
    setNotice("");
    save.mutate(payloadFor(definition));
  }

  return (
    <div className="planner-workspace">
      <section
        className="panel planner-definition"
        aria-labelledby="definition-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIELD DEFINITION</p>
            <h2 id="definition-heading">
              {isNew ? "New draft definition" : definition.name}
            </h2>
          </div>
          <span
            className={`badge ${definition.status === "active" ? "positive" : ""}`}
          >
            {isNew ? "Unsaved draft" : definition.status}
          </span>
        </div>
        <p className="muted planner-version">
          {definition.id
            ? `Version ${definition.version} · ${moduleLabel(definition.module)}`
            : "This definition has not been sent to the backend yet."}
          {dirty ? " · Unsaved changes" : ""}
        </p>

        {!editable && (
          <p className="notice" role="status">
            This {definition.status} definition is read-only. Only draft
            definitions can be edited and saved.
          </p>
        )}
        {validationError && (
          <p className="error" role="alert">
            {validationError}
          </p>
        )}
        {save.isError && (
          <p className="error" role="alert">
            {profileFormError(save.error, "save")}
          </p>
        )}
        {transition.isError && (
          <p className="error" role="alert">
            {profileFormError(transition.error, "save")}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}

        {definition.id && !dirty && definition.status !== "archived" && (
          <div className="section-heading">
            <p className="muted">
              Status changes preserve history and require the corresponding
              backend change permission.
            </p>
            <button
              className="secondary"
              type="button"
              disabled={transition.isPending}
              onClick={() =>
                changeStatus(
                  definition.status === "draft" ? "activate" : "archive",
                )
              }
            >
              {definition.status === "draft"
                ? "Activate reviewed version"
                : "Archive this version"}
            </button>
          </div>
        )}

        <form onSubmit={submit} aria-label="Field definition editor">
          <div className="form-grid planner-metadata">
            <label htmlFor="definition-name">
              Definition name
              <input
                id="definition-name"
                value={definition.name}
                readOnly={!editable}
                required
                maxLength={150}
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label htmlFor="definition-module">
              Module
              <select
                id="definition-module"
                value={definition.module}
                disabled={!editable}
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    module: event.target.value as FormModule,
                  }))
                }
              >
                {FORM_MODULES.map((module) => (
                  <option key={module} value={module}>
                    {moduleLabel(module)}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="definition-version">
              Version
              <input
                id="definition-version"
                type="number"
                min={1}
                step={1}
                value={
                  Number.isFinite(definition.version) ? definition.version : ""
                }
                readOnly={!editable}
                required
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    version: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
          </div>

          <div className="section-heading planner-fields-heading">
            <div>
              <h3>Fields</h3>
              <p className="muted">
                Define the schema, not a resident’s response. Field order is
                saved with the definition.
              </p>
            </div>
            {editable && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  update((current) => ({
                    ...current,
                    fields: [
                      ...current.fields,
                      blankField(current.fields.length),
                    ],
                  }))
                }
              >
                Add field
              </button>
            )}
          </div>

          {!definition.fields.length && (
            <div className="empty-state planner-empty-fields">
              <h4>No fields yet</h4>
              <p>Add a field to begin designing this draft schema.</p>
            </div>
          )}

          <div className="planner-fields">
            {definition.fields.map((field, index) => {
              const number = index + 1;
              const inputId = `input-${field.editorId}`;
              return (
                <fieldset className="planner-field" key={field.editorId}>
                  <legend>Field {number}</legend>
                  {editable && (
                    <div
                      className="planner-field-actions"
                      aria-label={`Field ${number} actions`}
                    >
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Move field ${number} up`}
                        disabled={index === 0}
                        onClick={() => moveField(index, -1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Move field ${number} down`}
                        disabled={index === definition.fields.length - 1}
                        onClick={() => moveField(index, 1)}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className="text-button danger-button"
                        aria-label={`Delete field ${number}`}
                        onClick={() =>
                          update((current) => ({
                            ...current,
                            fields: current.fields.filter(
                              (item) => item.editorId !== field.editorId,
                            ),
                          }))
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <div className="form-grid">
                    <label htmlFor={`${inputId}-key`}>
                      Field key
                      <input
                        id={`${inputId}-key`}
                        value={field.key}
                        readOnly={!editable}
                        required
                        maxLength={80}
                        onChange={(event) =>
                          updateField(field.editorId, "key", event.target.value)
                        }
                      />
                    </label>
                    <label htmlFor={`${inputId}-label`}>
                      Display label
                      <input
                        id={`${inputId}-label`}
                        value={field.label}
                        readOnly={!editable}
                        required
                        maxLength={150}
                        onChange={(event) =>
                          updateField(
                            field.editorId,
                            "label",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label htmlFor={`${inputId}-type`}>
                      Data type
                      <select
                        id={`${inputId}-type`}
                        value={field.data_type}
                        disabled={!editable}
                        onChange={(event) => {
                          const dataType = event.target.value as FieldType;
                          update((current) => ({
                            ...current,
                            fields: current.fields.map((item) =>
                              item.editorId === field.editorId
                                ? {
                                    ...item,
                                    data_type: dataType,
                                    options:
                                      dataType === "choice" ||
                                      dataType === "multi_choice"
                                        ? item.options
                                        : [],
                                  }
                                : item,
                            ),
                          }));
                        }}
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {fieldTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor={`${inputId}-help`}>
                      Help text (optional)
                      <input
                        id={`${inputId}-help`}
                        value={field.help_text}
                        readOnly={!editable}
                        maxLength={500}
                        onChange={(event) =>
                          updateField(
                            field.editorId,
                            "help_text",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                  {(field.data_type === "choice" ||
                    field.data_type === "multi_choice") && (
                    <label htmlFor={`${inputId}-options`}>
                      Options (one per line)
                      <textarea
                        id={`${inputId}-options`}
                        rows={4}
                        value={field.options.join("\n")}
                        readOnly={!editable}
                        required
                        onChange={(event) =>
                          updateField(
                            field.editorId,
                            "options",
                            event.target.value.split("\n"),
                          )
                        }
                      />
                    </label>
                  )}
                  <div className="planner-checkboxes">
                    <label>
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={!editable}
                        onChange={(event) =>
                          updateField(
                            field.editorId,
                            "required",
                            event.target.checked,
                          )
                        }
                      />
                      Required field
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={field.sensitive}
                        disabled={!editable}
                        onChange={(event) =>
                          updateField(
                            field.editorId,
                            "sensitive",
                            event.target.checked,
                          )
                        }
                      />
                      Sensitive field
                    </label>
                  </div>
                  {field.sensitive && (
                    <p className="planner-sensitive-note">
                      Marking a field sensitive does not approve its use.
                      Purpose, access, and privacy safeguards require review.
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>

          {editable && (
            <div className="planner-save-row">
              <button
                type="submit"
                disabled={save.isPending || (!isNew && !dirty)}
              >
                {save.isPending
                  ? "Saving draft…"
                  : isNew
                    ? "Create draft definition"
                    : "Save draft changes"}
              </button>
              <span className="muted">
                {isNew
                  ? "Creates a draft through POST."
                  : "Saves changes through PATCH."}
              </span>
            </div>
          )}
        </form>
      </section>
      <FieldPreview definition={definition} />
    </div>
  );
}
