// ── ImportDialog ─────────────────────────────────────────────────
// Paste a stateDiagram-v2 diagram and drop it onto the M-Files Flow
// canvas. Closes the one-way gap: useMermaid.js turned the store into
// Mermaid text, but nothing read text back, so a diagram drafted
// anywhere else had no route in.
//
// Shows what will be created BEFORE anything is added, and lists every
// line it could not use with the original text and line number. Flag,
// never fabricate - the same contract the C# translator honours.

import { useMemo, useState } from "react";
import {
  X,
  ClipboardPaste,
  AlertTriangle,
  CornerDownLeft,
  FileText,
  Wand2,
  Loader2,
} from "lucide-react";
import { parseMermaidText } from "../../utils/mermaidImport";
import { draftMermaidFromSow } from "../../utils/sowToMermaid";

const SAMPLE = `stateDiagram-v2
    [*] --> Draft
    Draft --> UnderReview : role(ContractManager)
    UnderReview --> Draft : if(Rejected=Yes)
    UnderReview --> Approved : role(Approver)+esign
    Approved --> Expired : after(30d)
    Expired --> [*]`;

export default function ImportDialog({
  onClose,
  onImport,
  workflowHasInitial = false,
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("mermaid"); // 'mermaid' | 'sow'
  const [sowText, setSowText] = useState("");
  // Held in memory only, and gone when the dialog closes. Studio's own
  // key fields do the same. No credential in this app is written to disk,
  // and this is not the place to be the first.
  const [apiKey, setApiKey] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [draftedFrom, setDraftedFrom] = useState(false);
  const [editedAfterDraft, setEditedAfterDraft] = useState(false);

  const result = useMemo(
    () => (text.trim() ? parseMermaidText(text) : null),
    [text],
  );
  const canImport = !!result && !result.isEmpty;

  // The model only drafts. Whatever comes back lands in the same textarea
  // a hand-pasted diagram would, so it goes through the same parser and
  // the same preview before it can reach the canvas.
  const runDraft = async () => {
    // Re-drafting replaces the diagram wholesale. If the user has already
    // corrected the previous draft by hand, those corrections are about to
    // be thrown away, so ask first.
    if (
      editedAfterDraft &&
      !window.confirm(
        "Drafting again will replace the diagram and lose the edits you made to it. Continue?",
      )
    ) {
      return;
    }
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await draftMermaidFromSow({ apiKey, text: sowText });
      if (!res.ok) {
        setDraftError(res.error);
        return;
      }
      setText(res.mermaid);
      setDraftedFrom(true);
      setEditedAfterDraft(false);
      setMode("mermaid");
    } finally {
      setDrafting(false);
    }
  };

  // A workflow can hold only one initial state. If this one already has
  // it, the imported start marker is dropped on the way in, so say so
  // here rather than letting the translator fail validation afterwards.
  const droppedInitial =
    workflowHasInitial && !!result && result.states.some((s) => s.initial);

  return (
    <div
      className="mflow-import-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Paste a diagram"
    >
      <div className="mflow-import">
        <header className="mflow-import-head">
          <ClipboardPaste size={15} strokeWidth={2} />
          <h2>Add a workflow</h2>
          <button
            type="button"
            className="mflow-import-x"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </header>

        <div className="mflow-import-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "mermaid"}
            className={`mflow-import-tab${mode === "mermaid" ? " active" : ""}`}
            onClick={() => setMode("mermaid")}
          >
            <ClipboardPaste size={12} strokeWidth={2} />
            Paste a diagram
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sow"}
            className={`mflow-import-tab${mode === "sow" ? " active" : ""}`}
            onClick={() => setMode("sow")}
          >
            <FileText size={12} strokeWidth={2} />
            From a SOW or PRD
          </button>
        </div>

        <div className="mflow-import-body">
          {mode === "sow" ? (
            <>
              <label className="mflow-import-lbl" htmlFor="mflow-import-sow">
                Paste the document text
              </label>
              <textarea
                id="mflow-import-sow"
                className="mflow-import-ta"
                value={sowText}
                spellCheck="false"
                placeholder={
                  "Paste the process section of a SOW or PRD.\n\nFor Service Agreements, the process is as follows:\nThe new Service Agreements are drafted by an Acme employee...\nThe Service Agreements are reviewed internally..."
                }
                onChange={(e) => setSowText(e.target.value)}
              />

              <label className="mflow-import-lbl" htmlFor="mflow-import-key">
                Anthropic API key
              </label>
              <input
                id="mflow-import-key"
                className="mflow-import-key"
                type="password"
                autoComplete="off"
                spellCheck="false"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />

              <div className="mflow-import-draftrow">
                <button
                  type="button"
                  className="mflow-import-btn primary"
                  disabled={drafting || !sowText.trim() || !apiKey.trim()}
                  onClick={runDraft}
                >
                  {drafting ? (
                    <Loader2 size={13} strokeWidth={2} className="mflow-spin" />
                  ) : (
                    <Wand2 size={13} strokeWidth={2} />
                  )}
                  {drafting ? "Drafting..." : "Draft the workflow"}
                </button>
                <span className="mflow-import-hint">
                  Produces a draft you review before anything is added.
                </span>
              </div>

              {draftError && (
                <div className="mflow-import-gaps">
                  <div className="mflow-import-gaps-head">
                    <AlertTriangle size={13} strokeWidth={2} />
                    Could not draft
                  </div>
                  <span className="mflow-import-gap-why">{draftError}</span>
                </div>
              )}

              <div className="mflow-import-gaps">
                <div className="mflow-import-gaps-head">
                  <AlertTriangle size={13} strokeWidth={2} />
                  Read the draft before you add it
                </div>
                <span className="mflow-import-gap-why">
                  A document describes far more than M-Files workflows can hold.
                  Notifications, PDF conversion, required fields and permissions
                  are configuration, not states, so they will not appear.
                  <br />
                  <br />
                  The checks after drafting read the syntax, not the meaning. A
                  state or a condition the document never mentioned would still
                  count as valid. Read every state and every label against the
                  document before adding it.
                </span>
              </div>
            </>
          ) : (
            <>
              <label className="mflow-import-lbl" htmlFor="mflow-import-ta">
                Mermaid stateDiagram-v2
              </label>
              <textarea
                id="mflow-import-ta"
                className="mflow-import-ta"
                value={text}
                spellCheck="false"
                placeholder={SAMPLE}
                onChange={(e) => {
                  setText(e.target.value);
                  // Provenance sticks. Correcting a draft does not turn it
                  // into a hand-written diagram, and a corrected draft is
                  // exactly what the learning loop most wants to see.
                  if (draftedFrom) setEditedAfterDraft(true);
                }}
              />
              {draftedFrom ? (
                <span className="mflow-import-drafted">
                  Drafted from your document. Edit it here if anything is wrong.
                </span>
              ) : (
                <button
                  type="button"
                  className="mflow-import-sample"
                  onClick={() => setText(SAMPLE)}
                >
                  Use the example
                </button>
              )}
            </>
          )}

          {mode === "mermaid" && result && (
            <div className="mflow-import-preview">
              <div className="mflow-import-counts">
                <span>
                  <strong>{result.states.length}</strong> states
                </span>
                <span>
                  <strong>{result.transitions.length}</strong> transitions
                </span>
                {result.unsupported.length > 0 && (
                  <span className="warn">
                    <strong>{result.unsupported.length}</strong> line
                    {result.unsupported.length === 1 ? "" : "s"} not used
                  </span>
                )}
              </div>

              {result.isEmpty && (
                <p className="mflow-import-empty">
                  Nothing readable yet. A diagram starts with{" "}
                  <code>stateDiagram-v2</code> and has lines like{" "}
                  <code>Draft --&gt; Review : role(Approver)</code>.
                </p>
              )}

              {droppedInitial && (
                <div className="mflow-import-gaps">
                  <div className="mflow-import-gaps-head">
                    <AlertTriangle size={13} strokeWidth={2} />
                    Start marker will not be imported
                  </div>
                  <span className="mflow-import-gap-why">
                    This workflow already has an initial state, and M-Files
                    allows only one. The pasted start marker is dropped so the
                    plan still validates. Set the initial state you want
                    afterwards if it should change.
                  </span>
                </div>
              )}

              {result.renames?.length > 0 && (
                <div className="mflow-import-gaps">
                  <div className="mflow-import-gaps-head">
                    <AlertTriangle size={13} strokeWidth={2} />
                    Display names being applied
                  </div>
                  <ul>
                    {result.renames.map((r, i) => (
                      <li key={i}>
                        <code>line {r.line}</code>
                        <span className="mflow-import-gap-text">
                          {r.from} shown as &quot;{r.to}&quot;
                        </span>
                      </li>
                    ))}
                  </ul>
                  <span className="mflow-import-gap-why">
                    Check each of these reads like a state name. A stray line of
                    text can rename a real state without looking wrong.
                  </span>
                </div>
              )}

              {result.unsupported.length > 0 && (
                <div className="mflow-import-gaps">
                  <div className="mflow-import-gaps-head">
                    <AlertTriangle size={13} strokeWidth={2} />
                    Not imported, left for you to handle
                  </div>
                  <ul>
                    {result.unsupported.map((u, i) => (
                      <li key={i}>
                        <code>line {u.line}</code>
                        <span className="mflow-import-gap-text">{u.text}</span>
                        <span className="mflow-import-gap-why">{u.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mflow-import-foot">
          <span className="mflow-import-hint">
            {mode === "sow"
              ? "Draft the workflow first, then review it before adding."
              : "Adds to the current workflow. Undo reverses it."}
          </span>
          <div className="mflow-import-actions">
            <button
              type="button"
              className="mflow-import-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="mflow-import-btn primary"
              disabled={mode !== "mermaid" || !canImport}
              title={
                mode === "sow"
                  ? "Draft the workflow first, then review it before adding"
                  : undefined
              }
              onClick={() => {
                onImport(result, {
                  draftedFromDocument: draftedFrom,
                  editedAfterDraft,
                });
                onClose();
              }}
            >
              <CornerDownLeft size={13} strokeWidth={2} />
              Add to canvas
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
