'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mfiles', {
  // Enumerates vaults available on the server -- no vault GUID needed as input.
  // payload: { server }
  // returns: { ok, vaults: [{ name, guid }] } | { ok: false, error }
  listVaults:   (payload)  => ipcRenderer.invoke('mfiles:list-vaults', payload),
  // payload: { vaultGuid, server, authType, username, password }
  listWorkflows: (payload) => ipcRenderer.invoke('mfiles:list-workflows', payload),
  // payload: { workflowIds, vaultGuid, server, authType, username, password }
  pullWorkflows: (payload) => ipcRenderer.invoke('mfiles:pull-workflows', payload),
  // payload: { json, vaultGuid, server, authType, username, password }
  // returns: { ok: true, status: 'created', workflowId, name, statesAdded, transitionsAdded }
  //        | { ok: false, status: 'skipped'|'error', error }
  // status reflects the script's REAL outcome, not just exit code -- a
  // duplicate-name skip is a real, distinct outcome, not a success.
  pushWorkflow: (payload)  => ipcRenderer.invoke('mfiles:push', payload),
  // Subscribe to streaming progress — wrapper strips IPC event arg so cb receives message string directly
  onProgress:   (cb)       => ipcRenderer.on('mfiles:progress', (_e, msg) => cb(msg)),
  // Unsubscribe — NOTE: removeListener needs the exact wrapper reference; use ipcRenderer.removeAllListeners if needed
  offProgress:  ()         => ipcRenderer.removeAllListeners('mfiles:progress'),
});

contextBridge.exposeInMainWorld('sow', {
  // Calls Anthropic API from Node main process (no CORS, key stays in main)
  // payload: { apiKey, model, systemPrompt, text }
  // returns: { ok, json } | { ok: false, error }
  claudeExtract: (payload) => ipcRenderer.invoke('sow:claude-extract', payload),
  openaiExtract: (payload) => ipcRenderer.invoke('sow:openai-extract', payload),
  // Calls Cacoo REST API (with key) or localhost:5000 proxy (without key)
  // payload: { diagramId, apiKey }
  // returns: { ok, raw } | { ok: false, error }
  cacooFetch:    (payload) => ipcRenderer.invoke('sow:cacoo-fetch', payload),
});
contextBridge.exposeInMainWorld('file', {
  // Opens OS Save-As dialog and writes the file
  // payload: { content, defaultName, filters }
  // returns: { ok, filePath } | { ok: false, cancelled: true }
  save: (payload) => ipcRenderer.invoke('file:save', payload),
});

contextBridge.exposeInMainWorld('archive', {
  // payload: { name, sourceVault, sourceWorkflowId, stateCount, transitionCount, importedAt, data }
  // returns: { ok, id, filePath }
  save: (payload) => ipcRenderer.invoke('archive:save', payload),
  // returns: { ok, rows: [{ id, name, sourceVault, sourceWorkflowId, stateCount, transitionCount, importedAt, filePath }] }
  list: () => ipcRenderer.invoke('archive:list'),
});

contextBridge.exposeInMainWorld('storage', {
  // Fire-and-forget nudge after a localStorage write -- main debounces these
  // into one flushStorageData() call ~500ms after the last one, so a hard
  // crash or OS-initiated shutdown (which never reaches this app's own
  // before-quit handler on Windows) only risks losing the last ~500ms of
  // edits instead of whatever hasn't landed since the last quit.
  flushSoon: () => ipcRenderer.send('storage:flush-soon'),
});

contextBridge.exposeInMainWorld('workflowTranslator', {
  // Spawns ProvisioningAI.Workflow.Cli fresh, feeds it Mermaid text over
  // stdin, returns its parsed plan JSON (PlanFormatter.ToJson shape).
  // payload: { mermaid }
  // returns: { ok, plan } | { ok: false, error }
  translate: (payload) => ipcRenderer.invoke('workflow:translate', payload),
});
