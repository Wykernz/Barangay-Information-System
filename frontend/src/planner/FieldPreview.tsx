import { fieldTypeLabel, type EditorDefinition } from "./DefinitionEditor";

export default function FieldPreview({
  definition,
}: {
  definition: EditorDefinition;
}) {
  // The editor array is the current order, including unsaved move operations.
  const fields = definition.fields;

  return (
    <section
      className="panel planner-preview"
      aria-labelledby="preview-heading"
    >
      <p className="eyebrow">SCHEMA-DRIVEN PREVIEW</p>
      <h2 id="preview-heading">Potential capture layout</h2>
      <p className="muted">
        Illustration only. All preview controls are disabled and no resident,
        household, or other operational values are collected or saved.
      </p>
      {definition.fields.length ? (
        <div className="planner-preview-fields">
          {fields.map((field) => {
            const id = `preview-${field.editorId}`;
            const helpId = `${id}-help`;
            const describedBy = field.help_text ? helpId : undefined;
            return (
              <div className="planner-preview-field" key={field.editorId}>
                <label htmlFor={id}>
                  {field.label || "Untitled field"}
                  {field.required && (
                    <span aria-label=" required" className="planner-required">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                <span className="planner-preview-type">
                  {fieldTypeLabel(field.data_type)}
                  {field.sensitive ? " · Sensitive" : ""}
                </span>
                {field.data_type === "long_text" ? (
                  <textarea
                    id={id}
                    rows={3}
                    disabled
                    placeholder="Long-text preview"
                    aria-describedby={describedBy}
                  />
                ) : field.data_type === "choice" ||
                  field.data_type === "multi_choice" ? (
                  <select
                    id={id}
                    disabled
                    multiple={field.data_type === "multi_choice"}
                    value={field.data_type === "multi_choice" ? [] : ""}
                    aria-describedby={describedBy}
                  >
                    {field.data_type === "choice" && (
                      <option value="">Choice preview</option>
                    )}
                    {field.options
                      .filter((option) => option.trim())
                      .map((option, index) => (
                        <option key={`${option}-${index}`} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                ) : field.data_type === "boolean" ? (
                  <input
                    id={id}
                    type="checkbox"
                    disabled
                    aria-describedby={describedBy}
                  />
                ) : (
                  <input
                    id={id}
                    type={
                      field.data_type === "date"
                        ? "date"
                        : field.data_type === "integer" ||
                            field.data_type === "decimal"
                          ? "number"
                          : "text"
                    }
                    disabled
                    placeholder={
                      field.data_type === "date"
                        ? undefined
                        : `${fieldTypeLabel(field.data_type)} preview`
                    }
                    aria-describedby={describedBy}
                  />
                )}
                {field.help_text && (
                  <p className="help" id={helpId}>
                    {field.help_text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Preview is empty</h3>
          <p>Add fields to the draft to see their potential layout.</p>
        </div>
      )}
      <p className="notice planner-review-note">
        Workshop designs still need stakeholder field approval and privacy
        review before they can be activated or used for operational records.
      </p>
    </section>
  );
}
