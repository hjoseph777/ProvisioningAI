// ── sowToMermaid ─────────────────────────────────────────────────
// Drafts a Mermaid stateDiagram-v2 from a SOW or PRD written in plain
// prose. This is the one place in the import path where a model is used,
// and it is deliberately scoped: the model only ever DRAFTS. Its output
// goes straight through parseMermaidText, which is the same deterministic
// parser a hand-pasted diagram goes through, and the human sees the
// drafted Mermaid before anything reaches the canvas.
//
// That ordering is the whole point. The parser stays the source of truth,
// nothing the model produces is trusted on its own, and a draft that does
// not survive the grammar shows up as flagged lines rather than as states.
//
// Reuses the existing window.sow IPC bridges, so no new transport and no
// key is stored anywhere by this file.
//
// Two providers are supported on purpose. Which model drafts matters far
// less than the parser that judges the draft, so requiring a paid key to
// try the feature at all would be the wrong tradeoff. OpenRouter serves
// free models and is OpenAI-compatible, which covers most other services
// too.

export const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-opus-5",
    keyHint: "sk-ant-...",
    keyUrl: "console.anthropic.com",
    bridge: "claudeExtract",
  },
  openrouter: {
    label: "OpenRouter",
    // A free model by default, so the feature can be tried without spend.
    // Any OpenRouter model id works; this is only the starting value.
    //
    // Note for whoever changes this: ox-alpha is a stealth model whose
    // provider retains prompts and completions. Fine for a generic sample
    // document, worth a second thought before a real client's process
    // description goes through it.
    defaultModel: "minimax/minimax-m2.7:free",
    keyHint: "sk-or-v1-...",
    keyUrl: "openrouter.ai/keys",
    bridge: "openaiExtract",
  },
};

export const DEFAULT_PROVIDER = "openrouter";

// Names the grammar exactly, and when a trigger will not fit that grammar
// the model must carry the document's own wording through as the label
// rather than leaving the edge bare.
//
// That distinction is the whole design, and it is not obvious. A bare edge
// is NOT "we could not tell": the translator resolves it to
// `Manual transition (no label)` with IsSkeleton false, which asserts that
// a person deliberately chose a manual transition. Carrying the prose
// through instead produces IsSkeleton true with OriginalLabel preserved,
// which is the honest result and the one the conversion log needs. Leaving
// it bare would delete the signal before anything downstream could see it.
export const SYSTEM_PROMPT = `You convert a Statement of Work or PRD into a Mermaid stateDiagram-v2 describing an M-Files document workflow.

Output ONLY the diagram. No prose, no explanation, no markdown code fences.

STRUCTURE
- First line is exactly: stateDiagram-v2
- Use [*] --> FirstState for the starting state.
- Use FinalState --> [*] for each state the document ends in.
- State names: letters, digits and underscores only, no spaces. For a display name with spaces, add a separate line: StateId : Display Name
- One transition per line: FromState --> ToState : label

TRANSITION LABELS - use ONLY these forms:
  role(GroupName)              a named group performs it by hand
  role(GroupName)+esign        same, and an electronic signature is required
  after(Nd)                    fires automatically N days after arriving in the state
  if(Property=Value)           fires automatically when a property equals a value
  script(ScriptName)           fires automatically, gated by a named script
  +priority(N)                 optional suffix on any of the above

WHEN A TRIGGER WILL NOT FIT THOSE FORMS - this is the most important rule
Copy the document's own words in as the label instead. Do not leave the transition bare and do not force it into a form that changes its meaning.

  SOW: "invoices over $10,000 route to the CFO"
  WRITE:   Review --> CFO : over $10,000
  NOT:     Review --> CFO
  NOT:     Review --> CFO : if(Amount=10000)

An unlabelled transition means something specific: a person performs it by hand with no condition attached. Only write a bare transition when the document actually describes that. Using it for "the document said something I could not encode" is wrong, because it silently converts an unresolved trigger into a confident claim that no trigger exists. The label you copy through is preserved and flagged for a human; a bare edge is not.

OTHER RULES
- NEVER invent a condition, a property name, a group name or a number that the document does not state.
- if() tests equality only. There is no greater-than, less-than or range form. For a threshold, copy the document's wording through as the label.
- after(Nd) counts days from entering the state. It cannot express a date relative to a property, such as "30 days before the expiration date". Copy that wording through as the label.
- Do not use <<choice>>, <<fork>> or <<join>>. Branching is several transitions leaving one state.
- Do not invent states for things that are not document states. Notifications, PDF conversion, field requirements, permissions and assignments are configuration, not states.
- Prefer fewer states that the document actually names over a richer workflow you infer.`;

/**
 * Strips code fences and any preamble before the diagram.
 *
 * Deliberately does NOT delete trailing prose. An earlier version did,
 * and deleting is the wrong tool here: silently dropping a line is the
 * same failure as silently inventing one, and any rule strong enough to
 * catch the model's chatter also ate legitimate `StateId : Display Name`
 * lines sitting after the last transition. Trailing prose is left in
 * place so parseMermaidText flags it, with its original text and line
 * number, where the user can actually see it.
 */
export function cleanDraft(raw) {
  let out = String(raw || "").trim();

  // Take the contents of the first fenced block when there is one, rather
  // than deleting from the first fence to the end, which destroyed the
  // diagram whenever the model wrote a sentence before it.
  // The language tag must be newline-terminated, otherwise `[a-z]*` eats
  // into the diagram itself on ```stateDiagram-v2 with no line break.
  // Prefer a block that actually holds a diagram over merely the first one,
  // so a stray ```json block ahead of it does not kill the draft.
  const blocks = [...out.matchAll(/```[a-z]*[ \t]*\r?\n([\s\S]*?)```/gi)].map(
    (m) => m[1].trim(),
  );
  const fenced = blocks.find((b) => b.includes("stateDiagram")) || blocks[0];
  if (fenced) {
    out = fenced;
  } else {
    // No complete block. Strip an opening fence only when its tag ends the
    // line, so ```stateDiagram-v2 is left intact for the indexOf below
    // rather than having "stateDiagram" chewed off as a language tag.
    out = out
      .replace(/^```[a-z]*[ \t]*\r?\n/i, "")
      .replace(/\r?\n?```[ \t]*$/, "")
      .trim();
  }

  // The IPC handler already strips a ```json fence, which can leave the
  // bare word "mermaid" behind when the model fences its answer.
  out = out.replace(/^mermaid\s*\n/i, "").trim();

  const start = out.indexOf("stateDiagram");
  if (start > 0) out = out.slice(start).trim();

  return out;
}

/**
 * A diagram cut off mid-generation still parses, so it has to be caught
 * here. `max_tokens` from the API means the tail of the workflow is simply
 * missing, and nothing downstream can tell.
 */
export function looksTruncated(mermaid, stopReason) {
  if (stopReason === "max_tokens") return true;
  const lines = String(mermaid || "")
    .trim()
    .split(/\r?\n/);
  const tail = (lines[lines.length - 1] || "").trim();
  if (!tail) return false;
  // A final line holding a lone dangling arrow, or an arrow with no target.
  if (/-->\s*$/.test(tail)) return true;
  if (/^-+>?$/.test(tail)) return true;
  return false;
}

/**
 * Draft Mermaid from SOW/PRD prose.
 * Returns { ok, mermaid } or { ok: false, error }.
 */
export async function draftMermaidFromSow({
  apiKey,
  text,
  provider = DEFAULT_PROVIDER,
  model,
}) {
  const cfg = PROVIDERS[provider];
  if (!cfg) return { ok: false, error: `Unknown provider "${provider}".` };

  const doc = String(text || "").trim();
  if (!doc) return { ok: false, error: "Paste the SOW or PRD text first." };
  if (!apiKey)
    return {
      ok: false,
      error: `A ${cfg.label} API key is needed to draft from a document. Get one at ${cfg.keyUrl}.`,
    };

  const bridge = window.sow?.[cfg.bridge];
  if (!bridge) {
    return {
      ok: false,
      error:
        "Drafting runs through the desktop app. Start it with npm run electron:dev rather than a browser tab.",
    };
  }

  try {
    const res = await bridge({
      apiKey: apiKey.trim(),
      model: model || cfg.defaultModel,
      systemPrompt: SYSTEM_PROMPT,
      text: doc,
    });
    if (!res?.ok)
      return { ok: false, error: res?.error || "The drafting request failed." };

    const mermaid = cleanDraft(res.json);
    if (!mermaid.includes("stateDiagram")) {
      return {
        ok: false,
        error:
          "The draft did not come back as a state diagram. Try again, or paste Mermaid directly.",
      };
    }

    // Refuse rather than warn. A truncated diagram parses perfectly and
    // looks complete, so importing it would add a workflow that is quietly
    // missing its tail, which is worse than getting nothing back.
    if (looksTruncated(mermaid, res.stopReason)) {
      return {
        ok: false,
        error:
          "The draft was cut off before it finished, so the end of the workflow is missing. Shorten the document to its process section and draft again.",
      };
    }

    return { ok: true, mermaid };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
