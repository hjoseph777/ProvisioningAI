import { useMemo, useState } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ── LiveTranslationView ─────────────────────────────────────────────
// Right-hand panel of M-Files Flow's split-screen: renders whatever
// TranslationPlan JSON the CLI bridge last returned (MFlowCanvas.jsx owns
// the debounce/spawn call, this component is purely a renderer over the
// result). Four views, one toggle group: M-Files Diagram (default), the
// original Flattened list, Raw JSON, Validation. Field names are PascalCase
// throughout — this is the plan exactly as
// ProvisioningAI.Workflow.Translation.PlanFormatter.ToJson() serializes it
// (System.Text.Json's default naming, no camelCase policy set), not
// remapped here.

// ── M-Files Diagram — layout + rendering, ported from
// TranslationPlanRenderer.html's `computeLayers`/`layoutPlan`/`edgeLabel`/
// `renderMFilesDiagram` (§6.2's own reference renderer), translated from
// imperative DOM-append calls into plain data + JSX. Logic kept faithful to
// that reference (same BFS layering, same back-edge shared-lane routing,
// same label-collision nudging, same skeleton/unparsed treatment) — only
// the colors changed, from that file's light-theme palette to this app's
// own dark-theme CSS variables. No diamonds, ever: this is the flattened
// M-Files truth, same rule the Flattened list view already follows —
// collapse/promote is a caption under the box, never a shape change.
function computeLayers(plan) {
  const names = plan.States.map(s => s.Name);
  const outgoing = {};
  names.forEach(n => { outgoing[n] = []; });
  plan.Transitions.forEach(t => {
    if (!outgoing[t.FromState]) outgoing[t.FromState] = [];
    outgoing[t.FromState].push(t.ToState);
  });
  const incomingCount = {};
  names.forEach(n => { incomingCount[n] = 0; });
  plan.Transitions.forEach(t => { if (incomingCount[t.ToState] !== undefined) incomingCount[t.ToState]++; });

  let roots = plan.States.filter(s => s.IsInitial).map(s => s.Name);
  if (roots.length === 0) roots = names.filter(n => incomingCount[n] === 0);
  if (roots.length === 0) roots = names.slice(0, 1);

  const layer = {};
  const visited = new Set();
  const queue = [];
  roots.forEach(r => { layer[r] = 0; visited.add(r); queue.push(r); });
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    (outgoing[cur] || []).forEach(to => {
      if (!visited.has(to)) { visited.add(to); layer[to] = layer[cur] + 1; queue.push(to); }
    });
  }
  // Simple BFS, visited-once — sufficient here same as the reference: a
  // cycle just produces a back-edge to an earlier layer, handled by the
  // curved shared-lane routing below rather than looping trying to optimize.
  names.forEach(n => { if (!visited.has(n)) { layer[n] = 0; visited.add(n); } });
  return layer;
}

function layoutPlan(plan) {
  const layer = computeLayers(plan);
  const byLayer = {};
  plan.States.forEach(s => {
    const l = layer[s.Name];
    (byLayer[l] = byLayer[l] || []).push(s.Name);
  });
  const colWidth = 210, rowHeight = 116, boxW = 152, boxH = 52, marginX = 28, marginY = 28;
  const pos = {};
  Object.keys(byLayer).map(Number).sort((a, b) => a - b).forEach(l => {
    byLayer[l].forEach((n, i) => {
      pos[n] = {
        x: marginX + i * colWidth, y: marginY + l * rowHeight,
        cx: marginX + i * colWidth + boxW / 2, cy: marginY + l * rowHeight + boxH / 2,
      };
    });
  });
  const maxLayer = Math.max(0, ...Object.keys(byLayer).map(Number));
  const maxInLayer = Math.max(1, ...Object.values(byLayer).map(a => a.length));
  const width = marginX * 2 + maxInLayer * colWidth + 130; // +130: lane reserved for back-edge curves
  const height = marginY * 2 + (maxLayer + 1) * rowHeight;
  return { pos, width, height, boxW, boxH, backEdgeLaneX: marginX + maxInLayer * colWidth + 55 };
}

function edgeLabel(t) {
  if (t.IsSkeleton) return `⚠ unparsed: "${t.OriginalLabel || ''}"`;
  const parts = [];
  if (t.TriggerCriteria) parts.push(`if(${t.TriggerCriteria.Property}=${t.TriggerCriteria.Value})`);
  else if (t.TriggerInDays != null) parts.push(`after(${t.TriggerInDays}d)`);
  else if (t.VBScriptName) parts.push(`script(${t.VBScriptName})`);
  if (t.PermissionsGroup) parts.push(`role(${t.PermissionsGroup})${t.RequireElectronicSignature ? '+esign' : ''}`);
  // Only shown when it deviates from the confirmed live default (100) — same
  // "clutter" reasoning as the reference (§1.6/§3.5).
  if (typeof t.EvaluationPriority === 'number' && t.EvaluationPriority !== 100) parts.push(`priority(${t.EvaluationPriority})`);
  return parts.join(' ');
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function MFilesDiagramView({ plan }) {
  const layout = useMemo(() => layoutPlan(plan), [plan]);
  const { pos, width, height, boxW, boxH, backEdgeLaneX } = layout;

  const edgeEls = [];
  const placedLabelRects = [];
  let backEdgeLaneOffset = 0;

  plan.Transitions.forEach((t, i) => {
    const from = pos[t.FromState], to = pos[t.ToState];
    if (!from || !to) return;
    const isBackEdge = to.cy <= from.cy;
    const stroke = t.IsSkeleton ? 'var(--gold)' : 'var(--mid)';
    const marker = t.IsSkeleton ? 'url(#mflow-diagram-arrow-warn)' : 'url(#mflow-diagram-arrow)';

    let d, midX, midY;
    // Back-edges (cycles, e.g. a retry loop) route through one shared lane
    // on the right rather than bowing out locally, same reasoning as the
    // reference: a local bow tends to cut through whichever sibling state
    // and label happen to sit nearby.
    if (isBackEdge && t.FromState !== t.ToState) {
      const laneX = backEdgeLaneX + backEdgeLaneOffset;
      backEdgeLaneOffset += 22;
      const sx = from.cx + boxW / 2, sy = from.cy, tx = to.cx + boxW / 2, ty = to.cy;
      d = `M ${sx} ${sy} C ${laneX} ${sy}, ${laneX} ${ty}, ${tx} ${ty}`;
      midX = laneX; midY = (sy + ty) / 2;
    } else {
      const sx = from.cx, sy = from.cy + boxH / 2, tx = to.cx, ty = to.cy - boxH / 2;
      d = `M ${sx} ${sy} L ${tx} ${ty}`;
      midX = (sx + tx) / 2; midY = (sy + ty) / 2;
    }

    edgeEls.push(
      <path key={`e${i}`} d={d} fill="none" stroke={stroke} strokeWidth={2}
        strokeDasharray="7,5" markerEnd={marker}/>
    );

    const label = edgeLabel(t);
    if (label) {
      const approxW = Math.min(200, 6 * label.length) + 8;
      let labelX = midX, labelY = midY;
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = { x: labelX - approxW / 2, y: labelY - 9, w: approxW, h: 16 };
        if (!placedLabelRects.some(r => rectsOverlap(candidate, r))) break;
        labelY += 15;
      }
      placedLabelRects.push({ x: labelX - approxW / 2, y: labelY - 9, w: approxW, h: 16 });
      edgeEls.push(
        <g key={`el${i}`}>
          <rect x={labelX - approxW / 2} y={labelY - 9} width={approxW} height={16} fill="var(--s1)" opacity={0.92} rx={3}/>
          <text x={labelX} y={labelY + 3} textAnchor="middle" fontSize={10} fill={t.IsSkeleton ? 'var(--gold)' : 'var(--mid)'} fontWeight={t.IsSkeleton ? 700 : 400}>{label}</text>
        </g>
      );
    } else if (t.IsSkeleton) {
      edgeEls.push(<text key={`ew${i}`} x={midX} y={midY + 4} textAnchor="middle" fontSize={13} fill="var(--gold)">⚠</text>);
    }
  });

  return (
    <div className="mflow-ltv-diagram-wrap">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="mflow-diagram-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mid)"/>
          </marker>
          <marker id="mflow-diagram-arrow-warn" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--gold)"/>
          </marker>
          <marker id="mflow-diagram-arrow-initial" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--a3)"/>
          </marker>
        </defs>
        {edgeEls}
        {plan.States.map((s, i) => {
          const p = pos[s.Name];
          if (!p) return null;
          const isTerminal = s.IsTerminal;
          const fill = s.IsInitial ? 'rgba(74,159,255,.14)' : (isTerminal ? 'var(--s1)' : 'var(--s2)');
          const stroke = s.IsInitial ? 'var(--a3)' : 'var(--border)';
          return (
            <g key={`s${i}`}>
              <rect x={p.x} y={p.y} width={boxW} height={boxH} rx={8} fill={fill} stroke={stroke} strokeWidth={isTerminal ? 3 : 1.4}/>
              {s.IsInitial && <>
                <circle cx={p.x - 13} cy={p.cy} r={4} fill="var(--a3)"/>
                <path d={`M ${p.x - 8} ${p.cy} L ${p.x} ${p.cy}`} stroke="var(--a3)" strokeWidth={2} markerEnd="url(#mflow-diagram-arrow-initial)"/>
              </>}
              <text x={p.cx} y={s.WasCollapsedChoicePromotedToState ? p.cy - 3 : p.cy + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--text)">{s.Name}</text>
              {s.WasCollapsedChoicePromotedToState && (
                <text x={p.cx} y={p.cy + 14} textAnchor="middle" fontSize={8} fill="var(--dim)" fontStyle="italic">(promoted from &lt;&lt;choice&gt;&gt;)</text>
              )}
              {isTerminal && (
                <text x={p.cx} y={p.y + boxH + 12} textAnchor="middle" fontSize={8.5} fill="var(--dim)" fontStyle="italic">terminal</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const TRIGGER_MODE_META = {
  Manual: { label: 'Manual', color: 'var(--mid)' },
  AutomaticCriteria: { label: 'Auto · criteria', color: 'var(--a3)' },
  AutomaticVBScript: { label: 'Auto · script', color: 'var(--purple)' },
};

function TriggerModeChip({ mode }) {
  const meta = TRIGGER_MODE_META[mode] || { label: mode, color: 'var(--mid)' };
  return <span className="mflow-ltv-chip" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>;
}

function FlattenedPlan({ plan, hoveredStateKey }) {
  return (
    <div className="mflow-ltv-flat">
      <div className="mflow-ltv-flat-label">States ({plan.States.length})</div>
      {plan.States.length === 0
        ? <div className="mflow-ltv-empty">No states yet.</div>
        : <div className="mflow-ltv-states">
            {plan.States.map(s => (
              // Every state a plain rectangle — collapse/promote is a caption
              // underneath, never a diamond shape. Matches
              // TranslationPlanRenderer.html's own proven rendering rule.
              // hoveredStateKey is already the SANITIZED id (MFlowCanvas.jsx
              // computes it that way) — plan.States[].Name is always that same
              // sanitized form too, per the translator's own no-alias-syntax
              // grammar (MfilesProperties.md §3.5), so a plain equality check
              // is correct here, not an approximation.
              <div key={s.Name} className={`mflow-ltv-state-box${s.Name === hoveredStateKey ? ' hover' : ''}`}>
                <div className="mflow-ltv-state-name">{s.Name}</div>
                <div className="mflow-ltv-state-badges">
                  {s.IsInitial && <span className="mflow-ltv-badge mflow-ltv-badge-initial">Initial</span>}
                  {s.IsTerminal && <span className="mflow-ltv-badge mflow-ltv-badge-terminal">Terminal</span>}
                </div>
                {s.WasCollapsedChoicePromotedToState && (
                  <div className="mflow-ltv-state-caption">(promoted from &lt;&lt;choice&gt;&gt;, §3.5 Decision 3)</div>
                )}
              </div>
            ))}
          </div>}

      <div className="mflow-ltv-flat-label">Transitions ({plan.Transitions.length})</div>
      {plan.Transitions.length === 0
        ? <div className="mflow-ltv-empty">No transitions yet.</div>
        : <div className="mflow-ltv-transitions">
            {plan.Transitions.map((t, i) => (
              <div key={i} className="mflow-ltv-trans-row">
                <div className="mflow-ltv-trans-path">{t.FromState} <span className="mflow-ltv-arrow">→</span> {t.ToState}</div>
                <div className="mflow-ltv-trans-meta">
                  <TriggerModeChip mode={t.TriggerMode} />
                  {t.EvaluationPriority !== 100 && <span className="mflow-ltv-chip" title="§1.6 EvaluationPriority">priority {t.EvaluationPriority}</span>}
                  {t.TriggerInDays != null && <span className="mflow-ltv-chip">{t.TriggerInDays}d</span>}
                  {t.PermissionsGroup && <span className="mflow-ltv-chip" title={t.PermissionsMethodAssumption || ''}>role({t.PermissionsGroup})</span>}
                  {t.RequireElectronicSignature && <span className="mflow-ltv-chip">e-sign</span>}
                  {t.VBScriptName && <span className="mflow-ltv-chip" title={t.VBScriptBody ? 'body found' : 'UNRESOLVED'}>script({t.VBScriptName})</span>}
                  {t.IsSkeleton && <span className="mflow-ltv-chip mflow-ltv-chip-warn" title={t.SkeletonReason || ''}>skeleton</span>}
                  {t.CriteriaUnconfirmed && <span className="mflow-ltv-chip mflow-ltv-chip-warn">criteria unconfirmed</span>}
                </div>
                <div className="mflow-ltv-trans-rule">{t.RuleApplied}</div>
              </div>
            ))}
          </div>}
    </div>
  );
}

function ValidationPlan({ plan }) {
  const issues = plan.ValidationIssues || [];
  return (
    <div className="mflow-ltv-validation">
      <div className={`mflow-ltv-status-banner ${plan.IsValid ? 'ok' : 'error'}`}>
        {plan.IsValid ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
        {plan.IsValid ? 'VALID — no blocking errors' : 'INVALID — blocking errors present'}
      </div>
      {issues.length === 0
        ? <div className="mflow-ltv-empty">No validation issues.</div>
        : issues.map((iss, i) => (
            <div key={i} className={`mflow-ltv-issue mflow-ltv-issue-${(iss.Severity || '').toLowerCase()}`}>
              {iss.Severity === 'Error' ? <AlertCircle size={12}/> : <AlertTriangle size={12}/>}
              <div>
                <div className="mflow-ltv-issue-head">[{iss.Severity}] {iss.Code}</div>
                <div className="mflow-ltv-issue-msg">{iss.Message}</div>
                {iss.EdgeRef && <div className="mflow-ltv-issue-edge">{iss.EdgeRef}</div>}
              </div>
            </div>
          ))}
    </div>
  );
}

export default function LiveTranslationView({ plan, error, isTranslating, version, hoveredStateKey }) {
  // 'diagram' is the default — the new M-Files Diagram tab replaces
  // Flattened as the first thing shown when the panel appears. Flattened
  // itself is untouched, just no longer first.
  const [view, setView] = useState('diagram');

  return (
    <div className="mflow-ltv">
      <div className="mflow-ltv-head">
        <div className="mflow-ltv-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'diagram'} className={view === 'diagram' ? 'on' : ''} onClick={() => setView('diagram')}>M-Files Diagram</button>
          <button type="button" role="tab" aria-selected={view === 'flat'} className={view === 'flat' ? 'on' : ''} onClick={() => setView('flat')}>Flattened</button>
          <button type="button" role="tab" aria-selected={view === 'json'} className={view === 'json' ? 'on' : ''} onClick={() => setView('json')}>JSON</button>
          <button type="button" role="tab" aria-selected={view === 'validation'} className={view === 'validation' ? 'on' : ''} onClick={() => setView('validation')}>
            Validation{plan?.ValidationIssues?.length > 0 ? ` (${plan.ValidationIssues.length})` : ''}
          </button>
        </div>
        {isTranslating && <span className="mflow-ltv-syncing"><RefreshCw size={11} className="mflow-ltv-spin"/> Translating…</span>}
      </div>

      {error && <div className="mflow-ltv-error">{error}</div>}

      <div className="mflow-ltv-body">
        {!plan
          ? <div className="mflow-ltv-empty mflow-ltv-empty-root">{error ? 'No plan available.' : 'Add a state to see the translated M-Files plan here.'}</div>
          // Keyed on `version` (bumped once per completed translate call, in
          // MFlowCanvas) — NOT on `view`, so switching tabs doesn't replay the
          // fade, only a genuinely new translation result does.
          : <div key={version} className="mflow-ltv-fade">
              {view === 'diagram' && <MFilesDiagramView plan={plan}/>}
              {view === 'flat' && <FlattenedPlan plan={plan} hoveredStateKey={hoveredStateKey}/>}
              {view === 'json' && <pre className="mflow-ltv-json">{JSON.stringify(plan, null, 2)}</pre>}
              {view === 'validation' && <ValidationPlan plan={plan}/>}
            </div>}
      </div>
    </div>
  );
}
