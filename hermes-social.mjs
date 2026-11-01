#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';


const VERSION = '0.1.0';
const PORT = 9334;
const ROOT = path.join(os.homedir(), '.hermes-social');
const PROFILE = path.join(ROOT, 'edge-profile');
const SCREENSHOTS = path.join(ROOT, 'screenshots');

const EDGE = [
  process.env['PROGRAMFILES(X86)'], process.env.PROGRAMFILES,
  process.env.LOCALAPPDATA
].filter(Boolean).map(p => path.join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
  .find(p => process.platform === 'win32' && requireExists(p));
const SITES = {
  youtube: { host: 'www.youtube.com', search: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, feed: 'https://www.youtube.com' },
  reddit: { host: 'www.reddit.com', search: q => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`, feed: 'https://www.reddit.com/?feed=home' },
  x: { host: 'x.com', search: q => `https://x.com/search?q=${encodeURIComponent(q)}`, feed: 'https://x.com/home' },
  threads: { host: 'www.threads.com', aliases: ['www.threads.net', 'threads.net'], search: q => `https://www.threads.com/search?q=${encodeURIComponent(q)}`, feed: 'https://www.threads.com' },
  instagram: { host: 'www.instagram.com', aliases: ['instagram.com'], search: q => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`, feed: 'https://www.instagram.com/' },
};

function requireExists(file) {
  try { return !!file && (process.getBuiltinModule('node:fs').existsSync(file)); } catch { return false; }
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!['status', 'login', 'search', 'read', 'feed', 'screenshot'].includes(command)) throw new Error('command must be status, login, search, read, feed, or screenshot');
  if (command === 'screenshot') return { command, url: normalizeUrl(rest.join(' ').trim()) };
  const siteIndex = rest.indexOf('--site');
  const site = siteIndex >= 0 ? rest[siteIndex + 1] : undefined;
  const args = siteIndex < 0 ? rest : [...rest.slice(0, siteIndex), ...rest.slice(siteIndex + 2)];
  const result = { command };
  if (site !== undefined) result.site = site;
  if (command === 'search') result.query = args.join(' ').trim();
  if (command === 'read') result.url = args.join(' ').trim();
  if (command === 'feed' && args.length) throw new Error('feed does not take extra arguments');
  if (command === 'login' && args.length) throw new Error('login does not take extra arguments');
  if (command === 'status' && args.length) throw new Error('status does not take extra arguments');
  if (command === 'read' && site) throw new Error('read takes a URL; --site is inferred from it');
  if (command === 'search' && !site) throw new Error('search requires --site');
  if (command === 'login' && !site) throw new Error('login requires --site');
  if (command === 'feed' && !site) throw new Error('feed requires --site');
  if (command === 'read' && !result.url) throw new Error('read requires a URL');
  if (command === 'search' && !result.query) throw new Error('search requires a query');
  if (command === 'login' && !site) throw new Error('login requires --site');
  if (siteIndex >= 0 && !site) throw new Error('--site requires youtube, reddit, x, or threads');
  if (site && !SITES[site]) throw new Error(`unknown site: ${site}`);
  if (command === 'read' && result.url.startsWith('-')) throw new Error('read requires a URL');
  if (command === 'search' && args.some(x => x === '--site')) throw new Error('--site must be followed by a supported site');
  if (command !== 'status' && command !== 'read' && !site) throw new Error(`${command} requires --site`);
  if (command === 'status' && site) throw new Error('status does not use --site');
  if (command === 'read' && !/^https:\/\//i.test(result.url)) throw new Error('read requires an HTTPS URL');
  if (command === 'search' && !result.query) throw new Error('search requires a query');
  if (command === 'feed' && !site) throw new Error('feed requires --site');
  if (command === 'login' && !site) throw new Error('login requires --site');
  return result;
}

function isSupportedHost(hostname) {
  return Object.values(SITES).some(site => [site.host, ...(site.aliases || [])].some(host => hostname === host || hostname.endsWith(`.${host}`)));
}

export function normalizeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('invalid URL'); }
  if (url.protocol !== 'https:' || !isSupportedHost(url.hostname)) {
    throw new Error('URL must use HTTPS on a supported site: YouTube, Reddit, X, or Threads');
  }
  return url.href;
}

export function siteUrl(site, command, query) {
  if (!SITES[site]) throw new Error(`unknown site: ${site}`);
  if (command !== 'search') throw new Error('unknown URL action');
  return SITES[site].search(query);
}

export function feedUrl(site) {
  if (!SITES[site]) throw new Error(`unknown site: ${site}`);
  return SITES[site].feed;
}

export function selectTargetTab(tabs, expectedUrl) {
  const expected = new URL(expectedUrl);
  return tabs.find(tab => tab.type === 'page' && tab.url !== 'about:blank'
    && (tab.url === expected.href || tab.url.startsWith(`${expected.origin}/`))) || null;
}

async function cdp(pathname, options) {
  const response = await fetch(`http://127.0.0.1:${PORT}${pathname}`, options);
  if (!response.ok) throw new Error(`Edge DevTools HTTP ${response.status}`);
  return response.json();
}

async function saveScreenshot(targetId, outputPath) {
  const tabs = await cdp('/json/list');
  const tab = tabs.find(item => item.type === 'page' && item.id === targetId);
  if (!tab) throw new Error('Screenshot target tab not found');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('Could not connect to Edge DevTools')); });
  try {
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Screenshot capture timed out')), 15000);
      ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.id === 1) { clearTimeout(timer); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
      };
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png', fromSurface: true } }));
    });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(result.data, 'base64'));
    return outputPath;
  } finally { ws.close(); }
}

function verifyEdge(version) {
  if (!/\bEdg\//i.test(version.Browser || '')) {
    throw new Error(`Local port ${PORT} is not this tool's Microsoft Edge; refusing control`);
  }
  return version;
}

async function ensureBrowser() {
  if (!EDGE) throw new Error('Microsoft Edge not found; install Edge or set HERMES_SOCIAL_EDGE to msedge.exe');
  try { return verifyEdge(await cdp('/json/version')); } catch (error) {
    if (error.message.includes('not this tool')) throw error;
  }
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', resolve);
  }).catch(err => { if (err.code === 'EADDRINUSE') throw new Error(`Local port ${PORT} already used; refusing to control another browser`); throw err; });
  server.close();
  process.env.HERMES_SOCIAL_NODE = '1';
  const child = spawn(EDGE, [
    `--remote-debugging-address=127.0.0.1`, `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
    '--disable-sync', '--new-window', 'about:blank'
  ], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try { return await cdp('/json/version'); } catch { /* wait for Edge */ }
  }
  throw new Error('Tool-owned Edge failed to start within 20 seconds');
}

async function openTab(url) {
  return cdp(`/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
}

async function closeTab(targetId) {
  if (!targetId) return;
  try { await cdp(`/json/close/${encodeURIComponent(targetId)}`); } catch { /* already closed */ }
}

async function activePage(expectedUrl, targetId) {
  for (let i = 0; i < 20; i++) {
    const tabs = await cdp('/json/list');
    const target = tabs.find(tab => tab.type === 'page' && tab.id === targetId)
      || selectTargetTab(tabs, expectedUrl);
    if (target) return target;
    await sleep(500);
  }
  throw new Error('Requested page did not finish loading in tool-owned Edge');
}

async function evaluate(expression, expectedUrl, targetId) {
  const tab = await activePage(expectedUrl, targetId);
  if (!tab) throw new Error('No page open in tool-owned Edge');
  const parsed = new URL(tab.url);
  if (!isSupportedHost(parsed.hostname)) {
    throw new Error('Navigation left supported sites; extraction blocked');
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl); (await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('Could not connect to Edge DevTools')); }));
  let id = 0;
  const results = new Map();
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && results.has(msg.id)) {
      const { resolve, reject } = results.get(msg.id);
      results.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    results.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
  try {
    await send('Runtime.enable');
    let value;
    let previousText = '';
    let stableReads = 0;
    for (let i = 0; i < 24; i++) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('Page extraction failed');
      value = result.result?.value;
      const text = value?.text?.trim() || '';
      if (text.length >= 40 && text === previousText) stableReads++;
      else stableReads = 0;
      if (stableReads >= 2) break;
      previousText = text;
      await sleep(750);
    }
    if (!value?.text?.trim()) throw new Error('Page has no readable text; login, site restriction, or verification may be required');
    if (value.text.trim().length < 40) throw new Error('Page contains too little readable text; login, site restriction, or verification may be required');
    return { url: tab.url, value };
  } finally { ws.close(); }
}


const EXTRACT = `(() => ({title: document.title, url: location.href, text: (document.body?.innerText || '').slice(0,24000), links: [...document.querySelectorAll('a[href]')].map(a=>({title:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,300),url:a.href})).filter(a=>{try{const u=new URL(a.url);return a.title && u.protocol==='https:' && (u.hostname===location.hostname || u.hostname.endsWith('.'+location.hostname.split('.').slice(-2).join('.')))}catch{return false}}).slice(0,80)}))()`;
function json(data) { process.stdout.write(JSON.stringify(data) + '\n'); }

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) { json({ ok: false, error: error.message }); process.exitCode = 2; return; }
  try {
    if (args.command === 'status') {
      let connected = false;
      try { verifyEdge(await cdp('/json/version')); connected = true; } catch {}
      json({ ok: true, version: VERSION, browserConnected: connected, profile: PROFILE, sites: Object.keys(SITES), commands: ['login', 'search', 'read', 'feed', 'screenshot'] });
      return;
    }
    if (args.command === 'screenshot') {
      await ensureBrowser();
      const tab = await openTab(args.url);
      try {
        const { value } = await evaluate(`(() => ({title:document.title,text:document.body?.innerText||''}))()`, args.url, tab.id);
        const file = path.join(SCREENSHOTS, `capture-${Date.now()}.png`);
        await saveScreenshot(tab.id, file);
        json({ ok: true, url: args.url, screenshot: file, pageTitle: value.title || '', note: 'Temporary tab closed after capture.' });
      } finally { await closeTab(tab.id); }
      return;
    }
    if (args.command === 'login') {
      await ensureBrowser();
      const tab = await openTab(`https://${SITES[args.site].host}/`);
      json({ ok: true, site: args.site, loginOpened: true, url: tab.url, instruction: 'Sign in yourself in this Edge window. Credentials are not collected by this tool.' });
      return;
    }
    await ensureBrowser();
    let expectedUrl;
    if (args.command === 'search') expectedUrl = siteUrl(args.site, 'search', args.query);
    else if (args.command === 'read') expectedUrl = normalizeUrl(args.url);
    else if (args.command === 'feed') expectedUrl = feedUrl(args.site);
    let targetId;
    try {
      targetId = (await openTab(expectedUrl)).id;
      const { url, value } = await evaluate(EXTRACT, expectedUrl, targetId);
      json({ ok: true, site: args.site || new URL(url).hostname, action: args.command, url, ...value, note: 'Visible page content only; results may be partial or site-limited.' });
    } finally {
      await closeTab(targetId);
    }
  } catch (error) {
    json({ ok: false, action: args.command, error: error.message, hint: 'Check Edge window, site access, login state, and whether the site changed its page.' });
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
