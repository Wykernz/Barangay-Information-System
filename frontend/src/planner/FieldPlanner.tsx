import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getProfileForm,
  listProfileForms,
  profileFormError,
  type FormDefinition,
} from "./api";
import DefinitionEditor, {
  blankDefinition,
  moduleLabel,
} from "./DefinitionEditor";
import "./planner.css";

function DefinitionLoading() {
  return (
    <section className="panel" role="status">
      Loading the selected field definition…
    </section>
  );
}

function DefinitionFailure({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <section className="panel">
      <p className="error" role="alert">
        {profileFormError(error, "load")}
      </p>
      <button type="button" className="secondary" onClick={retry}>
        Retry definition
      </button>
    </section>
  );
}

function saveSucceeded(client: QueryClient, definition: FormDefinition) {
  client.setQueryData(["profile-forms", "detail", definition.id], definition);
  void client.invalidateQueries({ queryKey: ["profile-forms", "list"] });
}

export default function FieldPlanner() {
  const client = useQueryClient();
  const [listUrl, setListUrl] = useState("profile-forms/");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDraftNumber, setNewDraftNumber] = useState(0);
  const list = useQuery({
    queryKey: ["profile-forms", "list", listUrl],
    queryFn: () => listProfileForms(listUrl),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const detail = useQuery({
    queryKey: ["profile-forms", "detail", selectedId],
    queryFn: () => getProfileForm(selectedId!),
    enabled: selectedId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });

  function startNewDraft() {
    setSelectedId(null);
    setNewDraftNumber((number) => number + 1);
  }

  return (
    <div className="field-planner">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA CAPTURE · REAL BACKEND</p>
          <h1>Field planner</h1>
          <p className="muted">
            Design and preview schema-driven field definitions for stakeholder
            discussion. This workspace uses the live profile-form API.
          </p>
        </div>
        <button type="button" onClick={startNewDraft}>
          New draft definition
        </button>
      </div>

      <p className="notice planner-backend-note">
        <strong>Backend-persisted definitions:</strong> saved drafts are sent to
        <code> /api/v1/profile-forms/</code>, not held in the in-memory demo
        store. Unsaved edits can still be lost if you leave this page. Real
        field approval and privacy review are still required; no operational
        values are collected here.
      </p>

      <section
        className="panel planner-library"
        aria-labelledby="definition-list-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="definition-list-heading">Saved definitions</h2>
            <p className="muted">
              {list.data
                ? `${list.data.count} definition${list.data.count === 1 ? "" : "s"} reported by the backend.`
                : "Definitions stored by the profile-form service."}
            </p>
          </div>
          {list.isFetching && !list.isPending && (
            <span role="status">Refreshing list…</span>
          )}
        </div>

        {list.isPending ? (
          <p role="status">Loading field definitions from the backend…</p>
        ) : list.isError ? (
          <div>
            <p className="error" role="alert">
              {profileFormError(list.error, "load")}
            </p>
            <button
              type="button"
              className="secondary"
              disabled={list.isFetching}
              onClick={() => void list.refetch()}
            >
              Retry definition list
            </button>
          </div>
        ) : list.data.results.length ? (
          <>
            <ul className="planner-definition-list">
              {list.data.results.map((definition) => (
                <li key={definition.id}>
                  <button
                    type="button"
                    className={selectedId === definition.id ? "selected" : ""}
                    aria-current={
                      selectedId === definition.id ? "true" : undefined
                    }
                    onClick={() => setSelectedId(definition.id)}
                  >
                    <span>
                      <strong>{definition.name}</strong>
                      <small>
                        {moduleLabel(definition.module)} · Version{" "}
                        {definition.version}
                      </small>
                    </span>
                    <span
                      className={`badge ${definition.status === "active" ? "positive" : ""}`}
                    >
                      {definition.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="planner-pagination">
              <button
                type="button"
                className="secondary"
                disabled={!list.data.previous || list.isFetching}
                onClick={() => setListUrl(list.data!.previous!)}
              >
                Previous page
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!list.data.next || list.isFetching}
                onClick={() => setListUrl(list.data!.next!)}
              >
                Next page
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>No saved definitions</h3>
            <p>Create a draft to prepare fields for the workshop.</p>
          </div>
        )}
      </section>

      {selectedId === null ? (
        <DefinitionEditor
          key={`new-${newDraftNumber}`}
          definition={blankDefinition()}
          onSaved={(definition) => {
            saveSucceeded(client, definition);
            setSelectedId(definition.id);
          }}
        />
      ) : detail.isPending ? (
        <DefinitionLoading />
      ) : detail.isError ? (
        <DefinitionFailure
          error={detail.error}
          retry={() => void detail.refetch()}
        />
      ) : (
        <DefinitionEditor
          key={detail.data.id}
          definition={detail.data}
          onSaved={(definition) => saveSucceeded(client, definition)}
        />
      )}
    </div>
  );
}
