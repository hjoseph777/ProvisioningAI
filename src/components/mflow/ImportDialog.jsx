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
import { X, ClipboardPaste, AlertTriangle, CornerDownLeft } from "lucide-react";
import { parseMermaidText } from "../../utils/mermaidImport";

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

  const result = useMemo(
    () => (text.trim() ? parseMermaidText(text) : null),
    [text],
  );
  const canImport = !!result && !result.isEmpty;

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
          <h2>Paste a diagram</h2>
          <button
            type="button"
            className="mflow-import-x"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </header>

        <div className="mflow-import-body">
          <label className="mflow-import-lbl" htmlFor="mflow-import-ta">
            Mermaid stateDiagram-v2
          </label>
          <textarea
            id="mflow-import-ta"
            className="mflow-import-ta"
            value={text}
            spellCheck="false"
            placeholder={SAMPLE}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="mflow-import-sample"
            onClick={() => setText(SAMPLE)}
          >
            Use the example
          </button>

          {result && (
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
            Adds to the current workflow. Undo reverses it.
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
              disabled={!canImport}
              onClick={() => {
                onImport(result);
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
