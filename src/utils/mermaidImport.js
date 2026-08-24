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
const RE_CHOICE = /^state\s+(\S+)\s+<<choice>>$/;
const RE_FORK_JOIN = /^state\s+(\S+)\s+<<(fork|join)>>$/;
const RE_STATE_DECL = /^state\s+(\S+)$/;
const RE_STATE_LABEL = /^state\s+"([^"]+)"\s+as\s+(\S+)$/;
const RE_ALIAS_DECL = /^([^\s:]+)\s*:\s*(.+)$/;
const RE_EDGE = /^(\S+)\s*-->\s*([^:]+?)\s*(?::\s*(.*))?$/;
const RE_NOTE_OPEN = /^note\b/i;
const RE_NOTE_CLOSE = /^end\s+note$/i;

// A label may carry a transition name in brackets before its condition,
// matching EdgeResolver.cs's own `name[condition]` split.
const RE_NAME_CONDITION = /^(.*)\[(.*)\]$/;

const START_END = '[*]';

// useMermaid.js emits hubs as `state gw_0` + `gw_0 : Gateway (3)` and
// reroutes real transitions through them. They are a drawing device, so
// a round-trip must not turn one into a persisted state.
function isHubPseudostate(id, label) {
  return /^gw_\d+$/.test(id) || /^Gateway\s*\(/.test((label || '').trim());
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

  const lines = String(raw || '').split(/\r?\n/);
  let sawHeader = false;
  let inNote = false;

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/%%.*$/, '').trim();
    if (!line) return;

    // Note bodies are free text and can contain anything, including
    // `Owner: Bob`, which would otherwise read as a state declaration.
    // Skip the whole block, not just its opening line.
    if (inNote) {
      if (RE_NOTE_CLOSE.test(line)) inNote = false;
      return;
    }
    if (RE_NOTE_OPEN.test(line)) {
      if (!/:/.test(line)) inNote = true; // one-line `note ... : text` form closes itself
      return;
    }

    if (RE_HEADER.test(line)) { sawHeader = true; return; }
    if (RE_DIRECTION.test(line)) return;

    const choice = RE_CHOICE.exec(line);
    if (choice) {
      flag(lineNo, rawLine.trim(), `"${choice[1]}" is a <<choice>> pseudostate. M-Files has no gateway shape, so branches are drawn as several outgoing transitions instead. The diamond badge appears on its own once a state has 2 or more outgoing transitions.`);
      return;
    }

    const forkJoin = RE_FORK_JOIN.exec(line);
    if (forkJoin) {
      flag(lineNo, rawLine.trim(), `"${forkJoin[1]}" is a <<${forkJoin[2]}>> pseudostate. M-Files cannot express parallel split or synchronised join, so this has no equivalent and needs a different workflow shape.`);
      return;
    }

    const labelled = RE_STATE_LABEL.exec(line);
    if (labelled) {
      const [, label, id] = labelled;
      if (isHubPseudostate(id, label)) {
        hubIds.add(id);
        flag(lineNo, rawLine.trim(), `"${id}" is a Gateway hub, which this canvas draws automatically from real inbound transitions. It is not a workflow state, so it was not imported.`);
        return;
      }
      touch(id).name = label;
      return;
    }

    const decl = RE_STATE_DECL.exec(line);
    if (decl) {
      if (isHubPseudostate(decl[1], null)) { hubIds.add(decl[1]); return; }
      touch(decl[1]);
      return;
    }

    if (line.includes('-->')) {
      // More than one arrow on a line is real Mermaid shorthand this
      // importer does not implement. Without this guard `A --> B --> C`
      // silently creates a state literally named "B --> C".
      if (line.split('-->').length > 2) {
        flag(lineNo, rawLine.trim(), 'More than one "-->" on a line. Split it into one transition per line so each one can be read separately.');
        return;
      }

      const edge = RE_EDGE.exec(line);
      if (!edge) {
        flag(lineNo, rawLine.trim(), 'Looks like a transition but could not be read. Expected "FromState --> ToState : condition".');
        return;
      }

      const from = edge[1].trim();
      const to = edge[2].trim();
      const label = (edge[3] || '').trim();

      if (from === START_END && to === START_END) {
        flag(lineNo, rawLine.trim(), 'An edge from start straight to end carries no state.');
        return;
      }

      // [*] --> X marks X initial and X --> [*] marks X terminal. Neither
      // is a transition object, per the start/end convention. A label on
      // one of those has nowhere to go, so say so rather than dropping it.
      if (from === START_END || to === START_END) {
        const realId = from === START_END ? to : from;
        if (hubIds.has(realId) || isHubPseudostate(realId, null)) {
          flag(lineNo, rawLine.trim(), `"${realId}" is a Gateway hub, not a workflow state, so this start/end marker was not imported.`);
          return;
        }
        if (from === START_END) touch(realId).initial = true;
        else touch(realId).terminal = true;
        if (label) {
          flag(lineNo, rawLine.trim(), `The label "${label}" was not imported. A start or end marker sets a property on the state itself, so it has no transition to carry a condition.`);
        }
        return;
      }

      if (hubIds.has(from) || hubIds.has(to) || isHubPseudostate(from, null) || isHubPseudostate(to, null)) {
        flag(lineNo, rawLine.trim(), 'This transition runs through a Gateway hub, which is a drawing device rather than a real state. Redraw it as a direct transition between two states.');
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
        flag(lineNo, rawLine.trim(), `"${id}" is a Gateway hub, which this canvas draws automatically from real inbound transitions. It is not a workflow state, so it was not imported.`);
        return;
      }
      touch(id).name = label;
      return;
    }

    flag(lineNo, rawLine.trim(), 'Not a state declaration or a transition, so it has no M-Files equivalent.');
  });

  if (!sawHeader && (order.length || edges.length)) {
    flag(1, '(no stateDiagram-v2 header)', 'Text had no "stateDiagram-v2" first line. It was read anyway, but check this is a state diagram and not a flowchart.');
  }

  // Resolve ids to display names now that every declaration has been seen.
  const nameOf = (id) => (seen.has(id) ? seen.get(id).name : id);
  const states = order.map(id => {
    const st = seen.get(id);
    return { name: st.name, initial: st.initial, terminal: st.terminal };
  });
  const transitions = edges.map(e => ({
    from: nameOf(e.from),
    to: nameOf(e.to),
    label: e.label,
    conditions: e.conditions,
  }));

  return {
    states,
    transitions,
    unsupported,
    isEmpty: states.length === 0 && transitions.length === 0,
  };
}

/**
 * Simple left-to-right layered layout so an imported diagram lands
 * readable instead of stacked on one point. Depth comes from walking
 * forward off the initial state(s); anything unreachable is placed after.
 */
export function layoutStates(states, transitions, { originX = 160, originY = 140, stepX = 240, stepY = 130 } = {}) {
  const depth = new Map();
  const outgoing = new Map();
  transitions.forEach(t => {
    if (!outgoing.has(t.from)) outgoing.set(t.from, []);
    outgoing.get(t.from).push(t.to);
  });

  const roots = states.filter(s => s.initial).map(s => s.name);
  const queue = (roots.length ? roots : states.slice(0, 1).map(s => s.name)).filter(Boolean);
  queue.forEach(n => depth.set(n, 0));

  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i];
    const d = depth.get(cur) || 0;
    (outgoing.get(cur) || []).forEach(next => {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    });
  }

  const orphanDepth = Math.max(-1, ...[...depth.values()]) + 1;
  states.forEach(s => {
    if (!depth.has(s.name)) depth.set(s.name, orphanDepth);
  });

  const perColumn = new Map();
  return states.map(s => {
    const d = depth.get(s.name) || 0;
    const row = perColumn.get(d) || 0;
    perColumn.set(d, row + 1);
    return { ...s, x: originX + d * stepX, y: originY + row * stepY };
  });
}
