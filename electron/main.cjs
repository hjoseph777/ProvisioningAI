'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn }     = require('child_process');
const { writeFile, unlink } = require('fs/promises');
const os    = require('os');
const https = require('https');
const http  = require('http');

const isDev  = !app.isPackaged;
const DEV_URL = 'http://localhost:3000';

// ── Window ───────────────────────────────────────────────────────
function createWindow () {
  const win = new BrowserWindow({
    width:     1440,
    height:    900,
    minWidth:  1100,
    minHeight: 700,
    icon:      path.join(__dirname, 'app-icon.ico'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    title:           'ProvisioningAI — Workflow Ingestion',
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── Resolve script paths (dev vs packaged) ────────────────────────
function scriptPath (name) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'scripts', name)
    : path.join(__dirname, '../scripts', name);
}

// Same isPackaged branching shape as scriptPath() above, applied to the
// M-Files Flow translator CLI (ProvisioningAI.Workflow.Cli — a thin wrapper
// around ProvisioningAI.Workflow's TranslationPipeline, built with
// `dotnet build -c Release` from provisioningai-backend/ProvisioningAI.Workflow.Cli).
// NOTE: the packaged-app path isn't populated yet — electron-builder's
// `files` list in package.json only ships scripts/**/*, not the .NET build
// output — same pre-existing gap the rest of the backend (:5000 API,
// MFilesConnectors) already has. Dev-mode spawn is what this task verifies.
function translatorCliPath () {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'cli', 'ProvisioningAI.Workflow.Cli.exe')
    : path.join(__dirname, '../provisioningai-backend/ProvisioningAI.Workflow.Cli/bin/Release/net8.0/ProvisioningAI.Workflow.Cli.exe');
}

// ── IPC: Connection test ──────────────────────────────────────────
// Uses MFilesServerApplication (server-side COM) so it works even
// while M-Files Desktop has an active client session on this vault.
// Script: scripts/test-connection.ps1
// Enumerates the vaults actually available on the server -- no vault GUID
// needed as input, since the whole point is the operator doesn't have to
// already know one. Vault GUIDs churn between environments/restores, so the
// UI fetches this live rather than trusting a hardcoded default.
ipcMain.handle('mfiles:list-vaults', async (_event, payload) => {
  const { server = 'localhost' } = payload || {};

  return new Promise((resolve) => {
    let resultJson = '';
    let lastError = '';
    // A chunk that continues an already-started [RESULT] payload (large JSON
    // split across multiple stdout 'data' events) has no [RESULT] marker of its
    // own -- without this flag it fell into the line-based progress/error branch
    // and got silently dropped, truncating the JSON. Once seen, every subsequent
    // chunk is unconditionally part of the payload, not re-parsed as lines.
    let inResult = false;
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File',          scriptPath('list-vaults.ps1'),
      '-ServerAddress', server,
    ]);

    ps.stdout.on('data', d => {
      const text = d.toString();
      if (!inResult && text.includes('[RESULT]')) {
        inResult = true;
        resultJson += text.substring(text.indexOf('[RESULT]') + 8);
      } else if (inResult) {
        resultJson += text;
      } else {
        text.split('\n').filter(l => l.trim()).forEach(line => {
          if (line.includes('[ERROR]')) lastError = line.replace(/\[ERROR\]\s*/, '').trim();
        });
      }
    });
    ps.stderr.on('data', d => { lastError = d.toString().trim() || lastError; });

    ps.on('close', (code) => {
      if (code === 0 && resultJson) {
        try {
          let parsed = JSON.parse(resultJson);
          if (parsed && !Array.isArray(parsed)) parsed = [parsed];
          resolve({ ok: true, vaults: parsed || [] });
        } catch (e) {
          resolve({ ok: false, error: 'Failed to parse JSON from PowerShell' });
        }
      } else {
        resolve({ ok: false, error: lastError || 'Failed to list vaults from server' });
      }
    });
  });
});

// ── IPC: Push workflow to vault ───────────────────────────────────
// Writes workflow JSON to a temp file, then hands off to push-to-vault.ps1
// which uses MFilesServerApplication — no Desktop session conflict.
// Progress lines are streamed back to the renderer via mfiles:progress.
ipcMain.handle('mfiles:push', async (event, payload) => {
  const {
    json,
    vaultGuid   = '{E7E445BE-3AEF-425F-9D4D-BFCC33008C9E}',
    server      = 'localhost',
    authType    = 'windows',
    username    = '',
    password    = '',
    licenseType = 0,
  } = payload;

  const tmpFile = path.join(os.tmpdir(), `provisioningai-wf-${Date.now()}.json`);
  await writeFile(tmpFile, JSON.stringify(json, null, 2), 'utf8');

  const send = (line) => {
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) ;
    win?.webContents.send('mfiles:progress', line.trim());
  };

  return new Promise((resolve) => {
    let lastError = '';
    let resultJson = '';

    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File',          scriptPath('push-to-vault.ps1'),
      '-JsonPath',      tmpFile,
      '-VaultGuid',     vaultGuid,
      '-ServerAddress', server,
      '-AuthType',      authType === 'mfiles' ? 'MFiles' : 'Windows',
      '-Username',      username,
      '-Password',      password,
      '-LicenseType',   String(licenseType),
    ]);

    ps.stdout.on('data', d => {
      d.toString().split('\n').filter(l => l.trim()).forEach(line => {
        // [RESULT] is a short, single-line, -Compress JSON summary -- kept out
        // of the human-readable progress log and parsed separately below so
        // the UI reports the script's REAL outcome (created/skipped/error)
        // instead of just trusting exit code 0, which the skip-duplicate path
        // also returns -- that's what let a "success" message show even when
        // nothing was actually written to the vault.
        if (line.includes('[RESULT]')) {
          resultJson += line.substring(line.indexOf('[RESULT]') + 8);
        } else {
          send(line);
          if (line.includes('[ERROR]')) lastError = line.replace(/\[ERROR\]\s*/,'').trim();
        }
      });
    });
    ps.stderr.on('data', d => {
      const msg = d.toString().trim();
      send(`[ERROR] ${msg}`);
      lastError = msg;
    });

    ps.on('close', async (code) => {
      await unlink(tmpFile).catch(() => {});
      let result = null;
      try { result = resultJson ? JSON.parse(resultJson) : null; } catch (e) { /* fall through to the honest-failure branch below */ }

      if (result?.status === 'created') {
        resolve({ ok: true, status: 'created', workflowId: result.workflowId, name: result.name, statesAdded: result.statesAdded, transitionsAdded: result.transitionsAdded });
      } else if (result?.status === 'skipped') {
        resolve({ ok: false, status: 'skipped', existingId: result.existingId, error: `Workflow "${result.name}" already exists (ID=${result.existingId}) -- nothing was pushed` });
      } else if (result?.status === 'error') {
        resolve({ ok: false, status: 'error', error: result.message || lastError || 'Push failed' });
      } else {
        resolve({ ok: false, status: 'error', error: lastError || 'Push produced no parseable result -- treat as failed, not succeeded' });
      }
    });
  });
});

// ── IPC: M-Files List Workflows ───────────────────────────────────
ipcMain.handle('mfiles:list-workflows', async (_event, { vaultGuid, server, authType, username, password }) => {
  return new Promise((resolve) => {
    let resultJson = '';
    let lastError = '';
    // See the identical comment in mfiles:list-vaults -- a continuation chunk of
    // an already-started [RESULT] payload has no marker of its own and must not
    // be re-parsed as progress/error lines, or the JSON silently truncates.
    let inResult = false;
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File',          scriptPath('pull-from-vault.ps1'),
      '-VaultGuid',     vaultGuid,
      '-ServerAddress', server,
      '-AuthType',      authType === 'mfiles' ? 'MFiles' : 'Windows',
      '-Username',      username,
      '-Password',      password,
      '-ListOnly'
    ]);

    ps.stdout.on('data', d => {
      const text = d.toString();
      if (!inResult && text.includes('[RESULT]')) {
        inResult = true;
        resultJson += text.substring(text.indexOf('[RESULT]') + 8);
      } else if (inResult) {
        resultJson += text;
      } else {
        text.split('\n').filter(l => l.trim()).forEach(line => {
          if (line.includes('[ERROR]')) lastError = line.replace(/\[ERROR\]\s*/, '').trim();
        });
      }
    });
    ps.stderr.on('data', d => { lastError = d.toString().trim() || lastError; });

    ps.on('close', (code) => {
      if (code === 0 && resultJson) {
        try {
          let parsed = JSON.parse(resultJson);
          if (parsed && !Array.isArray(parsed)) parsed = [parsed];
          resolve({ ok: true, workflows: parsed || [] });
        } catch (e) {
          // A genuine parse failure and "the script emitted only whitespace" used to
          // collapse into the same generic message, indistinguishable from each other.
          // Include the JS error and a preview of what PowerShell actually sent so a
          // real malformed-JSON bug is diagnosable without re-instrumenting this handler.
          const preview = resultJson.trim().slice(0, 200);
          resolve({ ok: false, error: `Failed to parse JSON from PowerShell (${e.message})${preview ? `: ${JSON.stringify(preview)}` : ' — no output received'}` });
        }
      } else {
        resolve({ ok: false, error: lastError || 'Failed to list workflows from vault' });
      }
    });
  });
});

// ── IPC: M-Files Pull Workflows ───────────────────────────────────
ipcMain.handle('mfiles:pull-workflows', async (_event, { vaultGuid, server, authType, username, password, workflowIds }) => {
  const send = (line) => {
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) ;
    win?.webContents.send('mfiles:progress', line.trim());
  };

  return new Promise((resolve) => {
    let resultJson = '';
    // See the identical comment in mfiles:list-vaults -- a continuation chunk of
    // an already-started [RESULT] payload has no marker of its own. This handler
    // in particular can return a large multi-state/multi-transition JSON payload
    // that routinely spans multiple stdout 'data' events; without this flag every
    // chunk after the first was misrouted into send() as a bogus progress line and
    // silently dropped from resultJson, truncating the JSON and failing to parse --
    // confirmed live, reproducibly, independent of which workflow was pulled.
    let inResult = false;
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File',          scriptPath('pull-from-vault.ps1'),
      '-VaultGuid',     vaultGuid,
      '-ServerAddress', server,
      '-AuthType',      authType === 'mfiles' ? 'MFiles' : 'Windows',
      '-Username',      username,
      '-Password',      password,
      '-WorkflowIds',   workflowIds.join(',')
    ]);

    ps.stdout.on('data', d => {
      const text = d.toString();
      if (!inResult && text.includes('[RESULT]')) {
        inResult = true;
        resultJson += text.substring(text.indexOf('[RESULT]') + 8);
      } else if (inResult) {
        resultJson += text;
      } else {
        text.split('\n').filter(l => l.trim()).forEach(send);
      }
    });
    ps.stderr.on('data', d => send(`[ERROR] ${d.toString().trim()}`));

    ps.on('close', (code) => {
      if (code === 0 && resultJson) {
        try {
          let parsed = JSON.parse(resultJson);
          if (parsed && !Array.isArray(parsed)) parsed = [parsed];
          resolve({ ok: true, workflows: parsed || [] });
        } catch (e) {
          resolve({ ok: false, error: 'Failed to parse JSON from PowerShell' });
        }
      } else {
        resolve({ ok: false, error: 'Failed to pull workflows from vault' });
      }
    });
  });
});

// ── IPC: Native Save-As dialog ────────────────────────────────────
// Renderer sends { content, defaultName, filters }
// Opens OS save-as dialog, writes file, returns { ok, filePath }
ipcMain.handle('file:save', async (_event, { content, defaultName, filters }) => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName || 'export.md',
    filters: filters || [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePath) return { ok: false, cancelled: true };
  await writeFile(filePath, content, 'utf8');
  return { ok: true, filePath };
});

// ── IPC: M-Files Flow live translation ─────────────────────────────
// Spawns the translator CLI fresh per call (confirmed cadence — see
// recover.md's 2026-08-19 "Electron → Translator bridge" measurement: the
// translator itself is effectively free, ~250-300ms is CLR process-start
// cost, and a persistent warm process was deliberately rejected in favor of
// this simpler spawn-per-call approach). Mermaid text goes in over stdin
// (same "no temp file, no arg-escaping" reasoning as any other short stdin
// payload); the CLI's stdout is the plan JSON verbatim (PlanFormatter.ToJson).
ipcMain.handle('workflow:translate', async (_event, { mermaid }) => {
  const exePath = translatorCliPath();
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(exePath, []);
    } catch (e) {
      resolve({ ok: false, error: `Failed to launch translator CLI: ${e.message}` });
      return;
    }

    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('error', e => resolve({ ok: false, error: `Failed to launch translator CLI: ${e.message}` }));
    proc.on('close', code => {
      if (code !== 0) {
        resolve({ ok: false, error: err.trim() || `Translator CLI exited with code ${code}` });
        return;
      }
      try {
        const plan = JSON.parse(out);
        resolve({ ok: true, plan });
      } catch (e) {
        resolve({ ok: false, error: `Translator CLI produced malformed JSON: ${e.message}` });
      }
    });

    proc.stdin.write(mermaid || '', 'utf8');
    proc.stdin.end();
  });
});

// ── Helper: HTTPS POST from Node (no CORS) ────────────────────────
function httpsPost(host, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request(
      { hostname: host, path: urlPath, method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            try { reject(new Error(JSON.parse(raw)?.error?.message || `HTTP ${res.statusCode}`)); }
            catch { reject(new Error(`HTTP ${res.statusCode}`)); }
          } else {
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error('Invalid JSON response')); }
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Helper: HTTPS GET from Node ───────────────────────────────────
function httpsGet(host, urlPath, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: host, path: urlPath, method: 'GET', headers },
      (res) => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            try { reject(new Error(JSON.parse(raw)?.message || `HTTP ${res.statusCode}`)); }
            catch { reject(new Error(`HTTP ${res.statusCode}`)); }
          } else {
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error('Invalid JSON response')); }
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ── IPC: Claude SOW extraction ────────────────────────────────────
// Renderer sends { apiKey, model, systemPrompt, text }
// Main process calls Anthropic from Node — no CORS, key never leaves main.
ipcMain.handle('sow:claude-extract', async (_event, { apiKey, model, systemPrompt, text }) => {
  try {
    const data = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      { model, max_tokens: 4096, system: systemPrompt,
        messages: [{ role: 'user', content: text }] }
    );
    const raw   = data.content?.[0]?.text || '';
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return { ok: true, json: clean };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── IPC: Cacoo diagram fetch ──────────────────────────────────────
// With apiKey  → calls Cacoo REST API directly from Node (no CORS).
// Without key  → falls back to localhost:5000 Python proxy.
ipcMain.handle('sow:cacoo-fetch', async (_event, { diagramId, apiKey }) => {
  try {
    if (apiKey && apiKey.trim()) {
      const data = await httpsGet(
        'cacoo.com',
        `/api/v1/diagrams/${encodeURIComponent(diagramId)}.json`,
        { 'X-Auth-Token': apiKey.trim() }
      );
      return { ok: true, raw: data };
    }
    // Fallback: local Python backend
    const result = await new Promise((resolve, reject) => {
      http.get(
        `http://localhost:5000/api/cacoo-fetch?diagramId=${encodeURIComponent(diagramId)}`,
        { timeout: 10000 },
        (res) => {
          let raw = '';
          res.on('data', c => { raw += c; });
          res.on('end', () => {
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error('Invalid JSON from backend')); }
          });
        }
      ).on('error', reject);
    });
    return { ok: true, raw: result };
  } catch (e) {
    const isDown = e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND';
    return {
      ok: false,
      error: isDown
        ? 'Backend not running — start with: python backend/app.py'
        : e.message,
    };
  }
});
