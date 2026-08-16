import { create } from 'zustand';

const makeId = () => Math.random().toString(36).slice(2, 9);

// ── Starting workflow ────────────────────────────────────────────
// Rebuilt 2026-08-15 — the prior Service Agreement seed (12 states, 16
// transitions, some with legacy color/theme overrides) was removed and
// replaced with a genuinely minimal example: plain states, plain
// transitions, no color/group/theme overrides on the data itself. This
// matches the State+Transition-only model M-Files Flow's palette actually
// produces (see studio_minimal_state_transition_model.md, project memory)
// — the seed data should look like something the palette itself could have
// built, not a richer example the palette can't reproduce.

const DOCUMENT_APPROVAL = {
  id: 'wf-da',
  name: 'Document Approval',
  states: [
    { id: 'da01', name: 'Draft',         initial: true  },
    { id: 'da02', name: 'Submitted',     initial: false },
    { id: 'da03', name: 'Under Review',  initial: false },
    { id: 'da04', name: 'Approved',      initial: false },
    { id: 'da05', name: 'Rejected',      initial: false },
    { id: 'da06', name: 'Closed',        initial: false },
  ],
  transitions: [
    { id: 'ta01', from: 'Draft',        to: 'Submitted',    conditions: null, permissions: null },
    { id: 'ta02', from: 'Submitted',    to: 'Under Review', conditions: null, permissions: null },
    { id: 'ta03', from: 'Under Review', to: 'Approved',     conditions: null, permissions: null },
    { id: 'ta04', from: 'Under Review', to: 'Rejected',     conditions: null, permissions: null },
    { id: 'ta05', from: 'Rejected',     to: 'Draft',        conditions: null, permissions: null },
    { id: 'ta06', from: 'Approved',     to: 'Closed',       conditions: null, permissions: null },
  ],
  groups: [],
  theme: 'neutral',
  // Comments/status boxes — freestanding, colored annotations positioned on
  // the canvas but NOT part of the state machine (no from/to, never
  // exported/translated to M-Files). M-Files Flow only, added per the
  // user's explicit "status box outside the workflow, for comments" ask.
  comments: [],
};

const fresh = () => ({
  workflows: [
    JSON.parse(JSON.stringify(DOCUMENT_APPROVAL)),
  ],
  activeId:   'wf-da',
  users:      [],
  properties: [],
  rules:      [],
  hoveredState: null,
  hoveredTransition: null,
  cmdPaletteOpen: false,
  // Snapshot-based undo/redo — same pattern useBpmnStore.js already proved
  // out (push the whole {workflows} pair before each mutating action, not a
  // diff/reducer). Added for M-Files Flow's right-click Undo/Redo; nothing
  // in Studio calls takeSnapshot() yet, so this is purely additive — Studio
  // behaves exactly as it did before until/unless it's explicitly wired in.
  history: { past: [], future: [] },
});

// Connection settings + activeSection are shell-level, not part of workflow data —
// resetAll() must not touch them, so they live outside fresh().
const shellDefaults = {
  activeSection: 'studio',
  mfServer: 'localhost',
  mfVault: '{E7E445BE-3AEF-425F-9D4D-BFCC33008C9E}',
  mfAuth: 'windows',
  studioResetHandler: null,
};


// ── Store ─────────────────────────────────────────────────────
export const useWorkflowStore = create((set, get) => ({
  ...fresh(),
  ...shellDefaults,
  setHoveredState: (name) => set({ hoveredState: name }),
  setHoveredTransition: (from, to) => {
    if (!from || !to) {
      set({ hoveredTransition: null });
      return;
    }
    set({ hoveredTransition: { from, to } });
  },
  setCmdPaletteOpen: (open) => set({ cmdPaletteOpen: open }),

  // ── Undo/redo — snapshot-based, same convention as useBpmnStore.js.
  // Callers take the snapshot themselves, right before the mutation they
  // want to be undoable (see MFlowCanvas.jsx's context-menu actions and
  // drag-end handler) — this store doesn't call it automatically from
  // every action, so per-keystroke interactions (typing a comment, dragging
  // a color slider) don't flood history unless a caller explicitly opts in. ──
  takeSnapshot: () => set(s => ({
    history: {
      past: [...s.history.past.slice(-99), { workflows: s.workflows }],
      future: [], // a new action invalidates whatever redo path existed
    },
  })),
  undo: () => set(s => {
    const prev = s.history.past[s.history.past.length - 1];
    if (!prev) return s;
    return {
      workflows: prev.workflows,
      history: {
        past: s.history.past.slice(0, -1),
        future: [...s.history.future, { workflows: s.workflows }],
      },
    };
  }),
  redo: () => set(s => {
    const next = s.history.future[s.history.future.length - 1];
    if (!next) return s;
    return {
      workflows: next.workflows,
      history: {
        past: [...s.history.past, { workflows: s.workflows }],
        future: s.history.future.slice(0, -1),
      },
    };
  }),

  // ── Shell: section nav + vault connection (survives resetAll) ──
  setActiveSection: (id) => set({ activeSection: id }),
  setMfServer: (server) => set({ mfServer: server }),
  setMfVault: (vault) => set({ mfVault: vault }),
  setMfAuth: (auth) => set({ mfAuth: auth }),
  // Studio registers its own handleReset here so the shell's Reset button
  // (rendered outside Studio) can trigger it without lifting Studio's local UI state.
  setStudioResetHandler: (fn) => set({ studioResetHandler: fn }),

  // ── Selectors ──────────────────────────────────────────────
  getActive: () => {
    const { workflows, activeId } = get();
    return workflows.find(w => w.id === activeId) || null;
  },

  // ── Workflow CRUD ──────────────────────────────────────────
  addWorkflow: () => {
    const wf = { id: makeId(), name: 'New Workflow', states: [], transitions: [], groups: [], theme: 'neutral', comments: [] };
    set(s => ({ workflows: [...s.workflows, wf], activeId: wf.id }));
  },
  deleteWorkflow: (id) => set(s => {
    const next = s.workflows.filter(w => w.id !== id);
    if (!next.length) return s;
    const activeId = s.activeId === id ? next[0].id : s.activeId;
    return { workflows: next, activeId };
  }),
  renameWorkflow: (id, name) => set(s => ({
    workflows: s.workflows.map(w => w.id === id ? { ...w, name } : w)
  })),
  setActive: (id) => set({ activeId: id }),

  // Clears states + transitions + comments of one workflow — keeps name, keeps other tabs
  clearWorkflow: (wfId) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : { ...w, states: [], transitions: [], comments: [] })
  })),

  // Stress-test seeder — creates a NEW temporary workflow tab pre-loaded with data.
  // Call from topbar 🔥 / 🔥🔥 buttons. User deletes the tab with ✕ when done.
  // N = number of states, target = approximate number of transitions.
  seedStressTest: (N = 25, target = 50) => {
    const pad = n => String(n).padStart(2, '0');
    const nm  = i => `State ${pad(i + 1)}`;

    const states = Array.from({ length: N }, (_, i) => ({
      id:      `st-${pad(i + 1)}`,
      name:    nm(i),
      initial: i === 0,
    }));

    const seen = new Set();
    const transitions = [];
    const addT = (from, to) => {
      const key = `${from}|${to}`;
      if (seen.has(key) || from === to) return;
      seen.add(key);
      transitions.push({ id: makeId(), from, to, conditions: null, permissions: null });
    };

    for (let i = 0; i < N - 1; i++)          addT(nm(i), nm(i + 1));
    for (let i = 9; i < N; i += 10)          addT(nm(i), nm(0));
    for (let i = 0; i < N - 10; i += 10)     addT(nm(i), nm(i + 10));
    for (let i = 0; i < N - 5; i += 5)       addT(nm(i), nm(i + 5));
    for (let i = 0; transitions.length < target && i < N - 3; i += 2) addT(nm(i), nm(i + 3));
    for (let i = N - 1; transitions.length < target && i > 1; i -= 3) addT(nm(i), nm(i - 2));

    const label = N <= 25 ? '🔥' : '🔥🔥';
    const wf = {
      id:   makeId(),
      name: `${label} Stress ${N}`,
      states,
      transitions,
      groups: [],
      theme: 'neutral',
      comments: [],
    };
    set(s => ({ workflows: [...s.workflows, wf], activeId: wf.id }));
  },

  // ── State CRUD ─────────────────────────────────────────────
  // Optional patch lets callers (e.g. the palette's "+ Initial State" tile)
  // set fields on the new state without a separate updateState round-trip.
  addState: (wfId, patch = {}) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, states: [...w.states, { id: makeId(), name: '', initial: false, ...patch }]
    })
  })),

  updateState: (wfId, stateId, patch) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, states: w.states.map(st => st.id !== stateId ? st : { ...st, ...patch })
    })
  })),

  // Persists a manually-dragged node position on the Live Diagram canvas.
  // null x/y (never set) means "let Mermaid auto-layout this node" — the
  // diagram renderer only overrides a node's transform when x/y are present.
  updateStatePosition: (wfId, stateId, x, y) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, states: w.states.map(st => st.id !== stateId ? st : { ...st, x, y })
    })
  })),

  // Rename + cascade all transitions referencing old name
  renameState: (wfId, stateId, newName) => {
    const wf = get().workflows.find(w => w.id === wfId);
    if (!wf) return;
    const oldName = wf.states.find(s => s.id === stateId)?.name || '';
    set(s => ({
      workflows: s.workflows.map(w => w.id !== wfId ? w : {
        ...w,
        states: w.states.map(st => st.id !== stateId ? st : { ...st, name: newName }),
        transitions: w.transitions.map(t => ({
          ...t,
          from: t.from === oldName ? newName : t.from,
          to:   t.to   === oldName ? newName : t.to,
        })),
      })
    }));
  },

  // Returns { ok, error } — blocked if state is in any transition
  deleteState: (wfId, stateId) => {
    const wf = get().workflows.find(w => w.id === wfId);
    if (!wf) return { ok: false, error: 'Workflow not found' };
    const state = wf.states.find(s => s.id === stateId);
    if (!state) return { ok: false, error: 'State not found' };
    const inUse = wf.transitions.some(t => t.from === state.name || t.to === state.name);
    if (inUse) return { ok: false, error: `"${state.name}" is in use — remove its transitions first.` };
    set(s => ({
      workflows: s.workflows.map(w => w.id !== wfId ? w : {
        ...w, states: w.states.filter(st => st.id !== stateId)
      })
    }));
    return { ok: true };
  },

  // Clones a state's own fields (color etc.) but not its transitions — same
  // "duplicate doesn't bring edges along" convention BPMN's own duplicateNode
  // uses. Not marked initial even if the original was, so duplicating never
  // silently creates a second initial state. Returns the new state's id.
  duplicateState: (wfId, stateId) => {
    const wf = get().workflows.find(w => w.id === wfId);
    const orig = wf?.states.find(s => s.id === stateId);
    if (!orig) return null;
    const newId = makeId();
    const newState = {
      ...orig, id: newId, initial: false,
      name: orig.name ? `${orig.name} copy` : '',
      x: orig.x != null ? orig.x + 30 : orig.x,
      y: orig.y != null ? orig.y + 30 : orig.y,
    };
    set(s => ({
      workflows: s.workflows.map(w => w.id !== wfId ? w : { ...w, states: [...w.states, newState] })
    }));
    return newId;
  },

  // ── Comment/status-box CRUD (M-Files Flow only — freestanding canvas
  // annotations, not state-machine data; see the `comments` field comment
  // on DOCUMENT_APPROVAL above) ────────────────────────────────
  addComment: (wfId, position = { x: 40, y: 40 }, color = '#e07b1a') => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, comments: [...(w.comments || []), { id: makeId(), text: 'Status', color, x: position.x, y: position.y }]
    })
  })),
  updateComment: (wfId, commentId, patch) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, comments: (w.comments || []).map(c => c.id !== commentId ? c : { ...c, ...patch })
    })
  })),
  deleteComment: (wfId, commentId) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, comments: (w.comments || []).filter(c => c.id !== commentId)
    })
  })),

  // ── Transition CRUD ────────────────────────────────────────
  addTransition: (wfId) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w,
      transitions: [...w.transitions, { id: makeId(), from: '', to: '', conditions: null, permissions: null }]
    })
  })),

  updateTransition: (wfId, transId, patch) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, transitions: w.transitions.map(t => t.id !== transId ? t : { ...t, ...patch })
    })
  })),

  deleteTransition: (wfId, transId) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, transitions: w.transitions.filter(t => t.id !== transId)
    })
  })),

  // Persists a manually-dragged bend point on a transition arrow (Live Diagram
  // canvas) — the arrow routes through this point instead of Mermaid's default
  // straight/auto-curved line. null bend (never set) means "let Mermaid draw it."
  updateTransitionBend: (wfId, transId, x, y) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, transitions: w.transitions.map(t => t.id !== transId ? t : { ...t, bend: { x, y } })
    })
  })),

  // Sets which diamond variant a gateway (a group value shared by 2+ transitions'
  // "from" states, per gatewayGroups.js) renders as. Deliberately keyed on the group
  // id itself, not a transition — the task's own model is "a single choice made once
  // per gateway," not a per-row setting. Upserts: replaces any existing entry for
  // this group id, or adds a new one.
  setGroupType: (wfId, groupId, type) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w, groups: [...(w.groups || []).filter(g => g.id !== groupId), { id: groupId, type }]
    })
  })),

  // Canvas color theme (canvasThemes.js) — workflow-level, same "one choice, not
  // per-node" pattern as setGroupType above.
  setWorkflowTheme: (wfId, theme) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : { ...w, theme })
  })),

  // Clears every dragged node position and bent edge for one workflow's
  // diagram, so it falls back to Mermaid's own auto-layout on next render.
  // Does not touch states/transitions data itself, only their layout overrides.
  resetDiagramLayout: (wfId) => set(s => ({
    workflows: s.workflows.map(w => w.id !== wfId ? w : {
      ...w,
      states: w.states.map(st => { const { x, y, ...rest } = st; return rest; }),
      transitions: w.transitions.map(t => { const { bend, ...rest } = t; return rest; }),
    })
  })),

  // ── Global: Users ──────────────────────────────────────────
  addUser: () => set(s => ({
    users: [...s.users, { id: makeId(), name: '', role: '', email: '', isCM: false }]
  })),
  updateUser: (id, patch) => set(s => ({
    users: s.users.map(u => u.id !== id ? u : { ...u, ...patch })
  })),
  deleteUser: (id) => set(s => ({ users: s.users.filter(u => u.id !== id) })),

  // ── Global: Properties ─────────────────────────────────────
  addProperty: () => set(s => ({
    properties: [...s.properties, { id: makeId(), name: '', type: 'Text', required: false }]
  })),
  updateProperty: (id, patch) => set(s => ({
    properties: s.properties.map(p => p.id !== id ? p : { ...p, ...patch })
  })),
  deleteProperty: (id) => set(s => ({ properties: s.properties.filter(p => p.id !== id) })),

  // ── Global: Rules ──────────────────────────────────────────
  addRule: () => set(s => ({
    rules: [...s.rules, { id: makeId(), text: '' }]
  })),
  updateRule: (id, text) => set(s => ({
    rules: s.rules.map(r => r.id !== id ? r : { ...r, text })
  })),
  deleteRule: (id) => set(s => ({ rules: s.rules.filter(r => r.id !== id) })),

  // Accepts a fully-parsed object and adds it as a new workflow tab,
  // merging users/properties/rules into the global store arrays.
  importWorkflow: ({ workflow, users = [], properties = [], rules = [] }) => {
    const wf = {
      id:          makeId(),
      name:        workflow.name || 'Imported Workflow',
      states:      (workflow.states      || []).map(s => ({ id: makeId(), ...s })),
      transitions: (workflow.transitions || []).map(t => ({ id: makeId(), ...t })),
      groups:      [],
      theme:       'neutral',
      comments:    [],
    };
    set(s => ({
      workflows:  [...s.workflows, wf],
      activeId:   wf.id,
      users:      [...s.users,      ...users.map(u => ({ id: makeId(), ...u }))],
      properties: [...s.properties, ...properties.map(p => ({ id: makeId(), ...p }))],
      rules:      [...s.rules,      ...rules.map(r => ({ id: makeId(), ...r }))],
    }));
    return wf.id;
  },

  // ── Import from M-Files Vault ──────────────────────────────
  // Takes workflow JSON from M-Files (via pull-from-vault.ps1) and creates a new tab.
  seedImportedWorkflow: (mfData) => {
    const date = mfData.importedAt ? mfData.importedAt.split('T')[0] : new Date().toISOString().split('T')[0];
    const wf = {
      id:          makeId(),
      name:        `📥 ${mfData.name} (imported ${date})`,
      source:      mfData.source || 'mfiles',
      importedAt:  mfData.importedAt,
      states:      (mfData.states || []).map(s => ({ id: makeId(), ...s })),
      transitions: (mfData.transitions || []).map(t => ({ id: makeId(), ...t })),
      groups:      [],
      theme:       'neutral',
      comments:    [],
    };
    set(s => {
      // Extract texts from rules and scripts to save to global rules
      const newRules = [
        ...(mfData.rules || []).map(r => ({ id: makeId(), text: r.text })),
        ...(mfData.scripts || []).map(scr => ({ id: makeId(), text: `VBScript on state ${scr.state}: ${scr.text}` }))
      ];
      return {
        workflows: [...s.workflows, wf],
        activeId:  wf.id,
        rules:     [...s.rules, ...newRules],
      };
    });
    return wf.id;
  },

  // ── Reset everything ───────────────────────────────────────
  resetAll: () => set(fresh()),
}));
