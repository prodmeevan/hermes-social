import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { parseArgs, normalizeUrl, siteUrl, feedUrl } from './hermes-social.mjs';
const SCREENSHOTS = path.join(os.homedir(), '.hermes-social', 'screenshots');
function latestScreenshot() { return fs.readdir(SCREENSHOTS).then(names => names.filter(n => n.endsWith('.png')).sort().at(-1)).then(n => n ? path.join(SCREENSHOTS, n) : null); }

const sites = ['youtube', 'reddit', 'x', 'threads'];
const tools = [
  { name: 'social_search', description: 'Search visible page on YouTube, Reddit, X, or Threads.', inputSchema: { type: 'object', properties: { site: { type: 'string', enum: sites }, query: { type: 'string' } }, required: ['site', 'query'], additionalProperties: false } },
  { name: 'social_read', description: 'Open and read visible content from a supported site URL.', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'], additionalProperties: false } },
  { name: 'social_feed', description: 'Open selected site home/feed and return visible content from the user login.', inputSchema: { type: 'object', properties: { site: { type: 'string', enum: sites } }, required: ['site'], additionalProperties: false } },
  { name: 'social_login', description: 'Open selected site in dedicated Edge profile for user-managed login.', inputSchema: { type: 'object', properties: { site: { type: 'string', enum: sites } }, required: ['site'], additionalProperties: false } },
  { name: 'social_screenshot', description: 'Capture a PNG screenshot of a supported site URL. Saves screenshot locally and returns file path plus image.', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'], additionalProperties: false } },
];
function send(message) { process.stdout.write(JSON.stringify(message) + '\n'); }
function error(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }
async function callCli(args) {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('./hermes-social.mjs', import.meta.url)), ...args], { encoding: 'utf8', timeout: 90000, windowsHide: true, maxBuffer: 2000000 });
  if (run.error) throw run.error;
  const line = run.stdout.trim().split(/\r?\n/).at(-1) || '{}';
  const result = JSON.parse(line);
  if (!result.ok) throw new Error(result.error || result.hint || 'Social tool request failed');
  return result;
}
async function handle(msg) {
  const id = msg.id;
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: msg.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'hermes-social', version: '0.1.0' } } });
    return;
  }
  if (msg.method === 'notifications/initialized' || msg.method === 'notifications/cancelled') return;
  if (msg.method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }
  if (msg.method === 'tools/list') { send({ jsonrpc: '2.0', id, result: { tools } }); return; }
  if (msg.method === 'tools/call') {
    const name = msg.params?.name;
    const a = msg.params?.arguments || {};
    try {
      let result;
      if (name === 'social_search') result = await callCli(['search', '--site', a.site, a.query]);
      else if (name === 'social_read') result = await callCli(['read', normalizeUrl(a.url)]);
      else if (name === 'social_feed') result = await callCli(['feed', '--site', a.site]);
      else if (name === 'social_login') result = await callCli(['login', '--site', a.site]);
      else if (name === 'social_screenshot') {
        result = await callCli(['screenshot', normalizeUrl(a.url)]);
        const image = await fs.readFile(result.screenshot);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }, { type: 'image', data: image.toString('base64'), mimeType: 'image/png' }], structuredContent: result, isError: false } });
        return;
      }
      else throw new Error(`unknown tool: ${name}`);
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false } });
    } catch (err) {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: String(err.message || err) }], isError: true } });
    }
    return;
  }
  if (id !== undefined) error(id, -32601, `Method not found: ${msg.method}`);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  try { await handle(JSON.parse(line)); }
  catch (err) { error(null, -32700, 'Invalid JSON-RPC message'); }
}
