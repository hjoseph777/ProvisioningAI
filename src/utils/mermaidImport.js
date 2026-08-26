// ── mermaidImport ────────────────────────────────────────────────
// Reads Mermaid stateDiagram-v2 text back into the {states, transitions}
// shape useWorkflowStore already holds. This is the missing direction:
// useMermaid.js turns the store into Mermaid text, nothing turned text
// back into a workflow, so a diagram drafted or generated anywhere else
// had no route in.
//
// Deliberately deterministic. No model call, no inference. A line either
// matches the grammar below or it lands in `unsupported` with its exact
// original text and line number for a human to resolve. Nothing is
// guessed and nothing is silently dropped, the same contract the C#
// translator honours when a condition does not match section 3.5.
//
// Diamond and hub badges are NOT set here and must never be. They stay
// derived from real outgoing/inbound counts by the canvas itself. That
// also means this file has to REFUSE useMermaid.js's own `gw_N` hub
// pseudostates: those are a rendering artifact, not workflow data, and
// importing one would materialise a fake state that then earns a real
// hub badge. See isHubPseudostate below.

const RE_HEADER = /^stateDiagram(-v2)?$/;
const RE_DIRECTION = /^direction\s+(TB|TD|BT|RL|LR)$/i;
// Mermaid does not require a space before the marker: its own state-mode
// rules are `.*<<choice>>` style, so `state X<<choice>>` is valid. Requiring
// one here meant the tight form fell through to RE_STATE_DECL, whose greedy
// token swallowed the marker and produced a state literally named
// `X<<choice>>` with nothing flagged. That silently bypassed the pseudostate
// refusal below, which is the only thing keeping a gateway shape off a
// canvas that has no gateway concept.
const RE_CHOICE = /^state\s+(\S+?)\s*<<choice>>$/;
const RE_FORK_JOIN = /^state\s+(\S+?)\s*<<(fork|join)>>$/;
// Excludes `<` and `{` so a malformed or composite declaration is flagged
// rather than becoming a state named after its own syntax.
const RE_STATE_DECL = /^state\s+([^\s{<]+)$/;
const RE_STATE_LABEL = /^state\s+"([^"]+)"\s+as\s+(\S+)$/;
const RE_ALIAS_DECL = /^([^\s:]+)\s*:\s*(.+)$/;
// The target is a single token that also cannot contain a colon, matching
// Mermaid's own lexer, whose ID rule is `[^:\n\s\-\{]+` with the colon
// explicitly excluded so a description can follow without a space.
//
// Both halves of this class are load-bearing:
//   no whitespace - stops a line of prose containing an arrow ("Review -->
//     CFO threshold could not be encoded") creating a state named after
//     the sentence.
//   no colon      - stops `Draft --> UnderReview:role(X)` swallowing the
//     label into the state id. Every label in the section 3.5 grammar is
//     whitespace-free, so a tight colon is ordinary input, not an edge
//     case, and greedy matching there both invents a state and deletes
//     the trigger with nothing flagged.
const RE_EDGE = /^(\S+)\s*-->\s*([^:\s]+)\s*(?::\s*(.*))?$/;
// Real Mermaid notes are `note right of X`, `note left of X` or
// `note over X`. Matching a bare `note` would swallow an ordinary line of
// prose beginning "Note:" as though it were diagram syntax, dropping it
// with no flag - which is the silent-loss failure this parser exists to
// prevent.
const RE_NOTE_OPEN = /^note\s+(right|left|over)\b/i;
const RE_NOTE_CLOSE = /^end\s+note$/i;

// A label may carry a transition name in brackets before its condition,
// matching EdgeResolver.cs's own `name[condition]` split.
const RE_NAME_CONDITION = /^(.*)\[(.*)\]$/;

const START_END = "[*]";

// useMermaid.js emits hubs as `state gw_0` + `gw_0 : Gateway (3)` and
// reroutes real transitions through them. They are a drawing device, so
// a round-trip must not turn one into a persisted state.
function isHubPseudostate(id, label) {
  return /^gw_\d+$/.test(id) || /^Gateway\s*\(/.test((label || "").trim());
}

/**
 * Parse Mermaid stateDiagram-v2 text into a workflow shape.
 *
 * Returns { states, transitions, unsupported, isEmpty }.
 * `states` carry { name, initial, terminal }; `transitions` carry
 * { from, to, label, conditions } already resolved to display names.
 */
export function parseMermaidText(raw) {
  const unsupported = [];
  const order = [];
  const seen = new Map(); // id -> { id, name, initial, terminal }
  const edges = [];
  const hubIds = new Set();

  const flag = (line, text, reason) => unsupported.push({ line, text, reason });

  const touch = (id) => {
    if (!seen.has(id)) {
      seen.set(id, { id, name: id, initial: false, terminal: false });
      order.push(id);
    }
    return seen.get(id);
  };

  const lines = String(raw || "").split(/\r?\n/);
  let sawHeader = false;
  let inNote = false;
  let noteOpenedAt = 0;
  let noteOpenedText = "";
  const swallowedByNote = [];
  // Every display-name line that actually changes what a state is called.
  // Surfaced to the caller because a rename is a real edit to the diagram
  // and the user has to be able to see it before committing.
  const renames = [];

  // A `X : Label` line only names an existing state. Accepting one for an
  // id the diagram never mentions anywhere else is how a stray line of
  // prose ("Assumption: the reviewer is a named group") turns into a real
  // state. Collect the ids that genuinely exist first, so an alias for
  // anything else can be flagged instead of invented.
  const declaredIds = new Set();
  {
    let skipping = false;
    lines.forEach((rawLine) => {
      const line = rawLine.replace(/%%.*$/, "").trim();
      if (!line) return;
      if (skipping) {
        if (RE_NOTE_CLOSE.test(line)) skipping = false;
        return;
      }
      if (RE_NOTE_OPEN.test(line)) {
        if (!/:/.test(line)) skipping = true;
        return;
      }
      const d = RE_STATE_DECL.exec(line);
      if (d) {
        declaredIds.add(d[1]);
        return;
      }
      const l = RE_STATE_LABEL.exec(line);
      if (l) {
        declaredIds.add(l[2]);
        return;
      }
      if (line.includes("-->") && line.split("-->").length === 2) {
        const e = RE_EDGE.exec(line);
        if (e) {
          const from = e[1].trim();
          const to = e[2].trim();
          if (from !== START_END) declaredIds.add(from);
          if (to !== START_END) declaredIds.add(to);
        }
      }
    });
  }

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (!line) return;

    // Note bodies are free text and can contain anything, including
    // `Owner: Bob`, which would otherwise read as a state declaration.
    // Skip the whole block, not just its opening line.
    if (inNote) {
      if (RE_NOTE_CLOSE.test(line)) {
        inNote = false;
      } else {
        // Held rather than discarded. If the block never closes, every
        // line it swallowed gets flagged at the end instead of vanishing.
        swallowedByNote.push({ line: lineNo, text: rawLine.trim() });
      }
      return;
    }
    if (RE_NOTE_OPEN.test(line)) {
      if (!/:/.test(line)) {
        inNote = true; // one-line `note ... : text` form closes itself
        noteOpenedAt = lineNo;
        noteOpenedText = rawLine.trim();
        swallowedByNote.length = 0;
      }
      return;
    }

    if (RE_HEADER.test(line)) {
      sawHeader = true;
      return;
    }
    if (RE_DIRECTION.test(line)) return;

    const choice = RE_CHOICE.exec(line);
    if (choice) {
      flag(
        lineNo,
        rawLine.trim(),
        `"${choice[1]}" is a <<choice>> pseudostate. M-Files has no gateway shape, so branches are drawn as several outgoing transitions instead. The diamond badge appears on its own once a state has 2 or more outgoing transitions.`,
      );
      return;
    }

    const forkJoin = RE_FORK_JOIN.exec(line);
    if (forkJoin) {
      flag(
        lineNo,
        rawLine.trim(),
        `"${forkJoin[1]}" is a <<${forkJoin[2]}>> pseudostate. M-Files cannot express parallel split or synchronised join, so this has no equivalent and needs a different workflow shape.`,
      );
      return;
    }

    const labelled = RE_STATE_LABEL.exec(line);
    if (labelled) {
      const [, label, id] = labelled;
      if (isHubPseudostate(id, label)) {
        hubIds.add(id);
        flag(
          lineNo,
          rawLine.trim(),
          `"${id}" is a Gateway hub, which this canvas draws automatically from real inbound transitions. It is not a workflow state, so it was not imported.`,
        );
        return;
      }
      touch(id).name = label;
      return;
    }

    const decl = RE_STATE_DECL.exec(line);
    if (decl) {
      if (isHubPseudostate(decl[1], null)) {
        hubIds.add(decl[1]);
        return;
      }
      touch(decl[1]);
      return;
    }

    if (line.includes("-->")) {
      // More than one arrow on a line is real Mermaid shorthand this
      // importer does not implement. Without this guard `A --> B --> C`
      // silently creates a state literally named "B --> C".
      if (line.split("-->").length > 2) {
        flag(
          lineNo,
          rawLine.trim(),
          'More than one "-->" on a line. Split it into one transition per line so each one can be read separately.',
        );
        return;
      }

      const edge = RE_EDGE.exec(line);
      if (!edge) {
        flag(
          lineNo,
          rawLine.trim(),
          'Looks like a transition but could not be read. Expected "FromState --> ToState : condition".',
        );
        return;
      }

      const from = edge[1].trim();
      const to = edge[2].trim();
      const label = (edge[3] || "").trim();

      if (from === START_END && to === START_END) {
        flag(
          lineNo,
          rawLine.trim(),
          "An edge from start straight to end carries no state.",
        );
        return;
      }

      // [*] --> X marks X initial and X --> [*] marks X terminal. Neither
      // is a transition object, per the start/end convention. A label on
      // one of those has nowhere to go, so say so rather than dropping it.
      if (from === START_END || to === START_END) {
        const realId = from === START_END ? to : from;
        if (hubIds.has(realId) || isHubPseudostate(realId, null)) {
          flag(
            lineNo,
            rawLine.trim(),
            `"${realId}" is a Gateway hub, not a workflow state, so this start/end marker was not imported.`,
          );
          return;
        }
        if (from === START_END) touch(realId).initial = true;
        else touch(realId).terminal = true;
        if (label) {
          flag(
            lineNo,
            rawLine.trim(),
            `The label "${label}" was not imported. A start or end marker sets a property on the state itself, so it has no transition to carry a condition.`,
          );
        }
        return;
      }

      if (
        hubIds.has(from) ||
        hubIds.has(to) ||
        isHubPseudostate(from, null) ||
        isHubPseudostate(to, null)
      ) {
        flag(
          lineNo,
          rawLine.trim(),
          "This transition runs through a Gateway hub, which is a drawing device rather than a real state. Redraw it as a direct transition between two states.",
        );
        return;
      }

      touch(from);
      touch(to);

      let name = null;
      let conditions = label || null;
      const split = RE_NAME_CONDITION.exec(label);
      if (split) {
        name = split[1].trim() || null;
        conditions = split[2].trim() || null;
      }
      edges.push({ from, to, label: name, conditions });
      return;
    }

    // `X : Some Label` is how useMermaid.js carries a display name that
    // the sanitised id cannot hold (spaces, accents). Keep the label as
    // the real name, otherwise "Contrôle Apprentissage" round-trips back
    // as "Controle_Apprentissage".
    const alias = RE_ALIAS_DECL.exec(line);
    if (alias) {
      const id = alias[1].trim();
      const label = alias[2].trim();
      if (isHubPseudostate(id, label)) {
        hubIds.add(id);
        flag(
          lineNo,
          rawLine.trim(),
          `"${id}" is a Gateway hub, which this canvas draws automatically from real inbound transitions. It is not a workflow state, so it was not imported.`,
        );
        return;
      }
      // Only a state the diagram actually contains can be given a display
      // name. Anything else is a line of prose that happens to have a
      // colon in it, and inventing a state from it is exactly the failure
      // this parser exists to avoid.
      if (!declaredIds.has(id)) {
        flag(
          lineNo,
          rawLine.trim(),
          `"${id}" is not a state in this diagram, so this line was not imported. A display-name line has to name a state that a transition or a declaration already introduced.`,
        );
        return;
      }
      const st = touch(id);
      if (label !== st.name) {
        renames.push({ line: lineNo, id, from: st.name, to: label });
      }
      st.name = label;
      return;
    }

    flag(
      lineNo,
      rawLine.trim(),
      "Not a state declaration or a transition, so it has no M-Files equivalent.",
    );
  });

  // A note block that never closed swallowed everything after it. Those
  // lines were held rather than dropped, so flag each one now.
  if (inNote) {
    flag(
      noteOpenedAt,
      noteOpenedText || `note (opened at line ${noteOpenedAt})`,
      'This note block has no "end note", so everything after it was treated as note text. Close the block, and these lines will be read as part of the diagram.',
    );
    swallowedByNote.forEach((s) =>
      flag(
        s.line,
        s.text,
        "Swallowed by the unclosed note block above, so it was not imported.",
      ),
    );
  }

  if (!sawHeader && (order.length || edges.length)) {
    flag(
      1,
      "(no stateDiagram-v2 header)",
      'Text had no "stateDiagram-v2" first line. It was read anyway, but check this is a state diagram and not a flowchart.',
    );
  }

  // Two different states cannot share one display name. Resolving both to
  // the same string silently merges them, and any transition between the
  // two becomes a self-loop that the document never described, with
  // nothing flagged. Keep the first, refuse the later rename, and say so.
  {
    const claimed = new Map(); // display name -> id that holds it
    order.forEach((id) => {
      const st = seen.get(id);
      const owner = claimed.get(st.name);
      if (owner === undefined || owner === id) {
        claimed.set(st.name, id);
        return;
      }
      const clash = renames.find((r) => r.id === id && r.to === st.name);
      flag(
        clash ? clash.line : 0,
        clash ? `${id} : ${st.name}` : id,
        `"${st.name}" is already the name of a different state ("${owner}"), so this display name was not applied and "${id}" keeps its own name. Two states cannot share one name, and merging them would silently turn any transition between them into a loop.`,
      );
      st.name = id;
      // The rename did not happen, so it must not be reported as if it did.
      const idx = renames.indexOf(clash);
      if (idx !== -1) renames.splice(idx, 1);
      claimed.set(id, id);
    });
  }

  // Resolve ids to display names now that every declaration has been seen.
  const nameOf = (id) => (seen.has(id) ? seen.get(id).name : id);
  const states = order.map((id) => {
    const st = seen.get(id);
    return { name: st.name, initial: st.initial, terminal: st.terminal };
  });
  const transitions = edges.map((e) => ({
    from: nameOf(e.from),
    to: nameOf(e.to),
    label: e.label,
    conditions: e.conditions,
  }));

  return {
    states,
    transitions,
    unsupported,
    renames,
    isEmpty: states.length === 0 && transitions.length === 0,
  };
}

/**
 * Simple left-to-right layered layout so an imported diagram lands
 * readable instead of stacked on one point. Depth comes from walking
 * forward off the initial state(s); anything unreachable is placed after.
 */
export function layoutStates(
  states,
  transitions,
  { originX = 160, originY = 140, stepX = 240, stepY = 130 } = {},
) {
  const depth = new Map();
  const outgoing = new Map();
  transitions.forEach((t) => {
    if (!outgoing.has(t.from)) outgoing.set(t.from, []);
    outgoing.get(t.from).push(t.to);
  });

  const roots = states.filter((s) => s.initial).map((s) => s.name);
  const queue = (
    roots.length ? roots : states.slice(0, 1).map((s) => s.name)
  ).filter(Boolean);
  queue.forEach((n) => depth.set(n, 0));

  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i];
    const d = depth.get(cur) || 0;
    (outgoing.get(cur) || []).forEach((next) => {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    });
  }

  const orphanDepth = Math.max(-1, ...[...depth.values()]) + 1;
  states.forEach((s) => {
    if (!depth.has(s.name)) depth.set(s.name, orphanDepth);
  });

  const perColumn = new Map();
  return states.map((s) => {
    const d = depth.get(s.name) || 0;
    const row = perColumn.get(d) || 0;
    perColumn.set(d, row + 1);
    return { ...s, x: originX + d * stepX, y: originY + row * stepY };
  });
}
