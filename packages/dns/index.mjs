// dns/index.mjs — Discovery via gate notes
//
// Replaces DNS. Each agent publishes a gate file (name, path, capabilities, sisters).
// Discovery = reading a gate file. Resolution = finding the agent's address.
// Caching = remembering gate notes with stated freshness.
//
// Gate notes are the DNS records of NPL.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { freshNow, isStale } from '../lang/index.mjs';

const NLP_ROOT = join(homedir(), '.nlp');
const GATES_DIR = join(NLP_ROOT, 'gates');
const CACHE_DIR = join(NLP_ROOT, 'cache');

// Ensure directories exist
mkdirSync(GATES_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

// ── Gate note format ───────────────────────────────────────────
// A gate note is a text file:
//
//   agent: <name>
//   path: <filesystem-path>
//   host: <hostname-or-ip>
//   port: <port>
//   capabilities: <comma-separated>
//   sisters: <comma-separated>
//   freshness: <iso-8601>
//   certainty: high|medium|low
//
//   <optional description>

export function createGateNote({ agent, path, host = '127.0.0.1', port, capabilities = [], sisters = [], description = '', certainty = 'high' }) {
  const freshness = freshNow();
  const lines = [
    `agent: ${agent}`,
    `path: ${path}`,
    `host: ${host}`,
  ];
  if (port) lines.push(`port: ${port}`);
  lines.push(`capabilities: ${capabilities.join(', ')}`);
  lines.push(`sisters: ${sisters.join(', ')}`);
  lines.push(`freshness: ${freshness}`);
  lines.push(`certainty: ${certainty}`);
  if (description) {
    lines.push('');
    lines.push(description);
  }
  return { text: lines.join('\n'), agent, path, host, port, capabilities, sisters, freshness, certainty, description };
}

export function parseGateNote(text) {
  const lines = text.trim().split('\n');
  const gate = {};
  const descStart = lines.findIndex(l => l.trim() === '');
  const headerLines = descStart >= 0 ? lines.slice(0, descStart) : lines;
  const descLines = descStart >= 0 ? lines.slice(descStart + 1) : [];

  for (const line of headerLines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (['capabilities', 'sisters'].includes(k)) {
        gate[k] = v.split(',').map(s => s.trim()).filter(s => s);
      } else if (k === 'port') {
        gate[k] = parseInt(v, 10);
      } else {
        gate[k] = v;
      }
    }
  }
  gate.description = descLines.join('\n').trim();
  return gate;
}

// ── Publish a gate note ─────────────────────────────────────────

export function publishGateNote(gateData) {
  const note = typeof gateData === 'string' ? gateData : createGateNote(gateData).text;
  mkdirSync(GATES_DIR, { recursive: true });
  const gatePath = join(GATES_DIR, `${gateData.agent || parseGateNote(note).agent}.gate`);
  writeFileSync(gatePath, note);
  return gatePath;
}

// ── Lookup (read a gate note) ───────────────────────────────────
// This is the DNS query equivalent.

export function lookup(agent) {
  // 1. Check cache first
  const cached = cacheLookup(agent);
  if (cached && !isStale(cached.freshness, 60000)) {
    return { ...cached, source: 'cache' };
  }

  // 2. Check ~/.nlp/gates/<agent>.gate
  const gatePath = join(GATES_DIR, `${agent}.gate`);
  if (existsSync(gatePath)) {
    const text = readFileSync(gatePath, 'utf8');
    const gate = parseGateNote(text);
    cacheStore(agent, gate);
    return { ...gate, source: 'gate-note' };
  }

  // 3. Check Desktop project's gate file
  const desktopGate = join(homedir(), 'Desktop', agent, 'gate.md');
  if (existsSync(desktopGate)) {
    const text = readFileSync(desktopGate, 'utf8');
    const gate = parseGateNote(text);
    cacheStore(agent, gate);
    return { ...gate, source: 'desktop-gate' };
  }

  // 4. Check Desktop project's .nlp-bridge/gate
  const bridgeGate = join(homedir(), 'Desktop', agent, '.nlp-bridge', 'gate');
  if (existsSync(bridgeGate)) {
    const text = readFileSync(bridgeGate, 'utf8');
    const gate = parseGateNote(text);
    cacheStore(agent, gate);
    return { ...gate, source: 'bridge-gate' };
  }

  return null;
}

// ── Resolution (agent name → address) ──────────────────────────
// Like DNS resolution: name → { host, port }

export function resolve(agent) {
  const gate = lookup(agent);
  if (!gate) return null;
  return {
    agent: gate.agent,
    host: gate.host || '127.0.0.1',
    port: gate.port || 7778,
    capabilities: gate.capabilities || [],
    freshness: gate.freshness,
  };
}

// ── Caching with stated freshness ──────────────────────────────

export function cacheStore(agent, gate) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${agent}.cache`);
  const entry = {
    ...gate,
    cachedAt: freshNow(),
  };
  writeFileSync(cachePath, JSON.stringify(entry, null, 2));
  return cachePath;
}

export function cacheLookup(agent) {
  const cachePath = join(CACHE_DIR, `${agent}.cache`);
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch (e) {
    console.error("[npl] read failed: " + e.message);
    return null;
  }
}

export function cacheClear(agent) {
  const cachePath = join(CACHE_DIR, `${agent}.cache`);
  if (existsSync(cachePath)) {
    // Can't unlinkSync with our fs imports, but we can overwrite
    writeFileSync(cachePath, '');
    return true;
  }
  return false;
}

// ── Discovery (list all known agents) ──────────────────────────

export function discover() {
  const agents = [];

  // From gate notes
  if (existsSync(GATES_DIR)) {
    for (const f of readdirSync(GATES_DIR)) {
      if (f.endsWith('.gate')) {
        const agent = f.replace('.gate', '');
        const gate = lookup(agent);
        if (gate && gate.agent) agents.push(gate);
      }
    }
  }

  // From Desktop projects
  const desktop = join(homedir(), 'Desktop');
  if (existsSync(desktop)) {
    for (const f of readdirSync(desktop)) {
      if (f === 'npl' || f === 'nlp') continue;
      const projPath = join(desktop, f);
      try {
        if (!statSync(projPath).isDirectory()) continue;
      } catch { continue; }
      const gate = lookup(f);
      if (gate && gate.agent && !agents.find(a => a.agent === gate.agent)) {
        agents.push(gate);
      }
    }
  }

  return agents;
}

// ── CLI ────────────────────────────────────────────────────────

export function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'lookup': {
      const [agent] = args;
      const gate = lookup(agent);
      if (!gate) { console.log(`No gate note found for ${agent}`); process.exit(1); }
      console.log(`Agent: ${gate.agent}`);
      console.log(`Path:  ${gate.path}`);
      console.log(`Host:  ${gate.host}:${gate.port || '?'}`);
      console.log(`Caps:  ${gate.capabilities?.join(', ') || 'none'}`);
      console.log(`Source: ${gate.source}`);
      break;
    }
    case 'resolve': {
      const [agent] = args;
      const addr = resolve(agent);
      if (!addr) { console.log(`Cannot resolve ${agent}`); process.exit(1); }
      console.log(`${addr.agent} → ${addr.host}:${addr.port}`);
      break;
    }
    case 'discover': {
      const agents = discover();
      console.log(`${agents.length} agents discovered:`);
      for (const a of agents) {
        const agentName = (a.agent || '?').padEnd(16);
        const host = a.host || '?';
        const port = a.port || '?';
        const caps = (a.capabilities || []).join(', ');
        console.log(`  ${agentName} ${host}:${port}  [${caps}]  (${a.source})`);
      }
      break;
    }
    case 'publish': {
      const [agent, path, capabilities, sisters] = args;
      const gate = createGateNote({
        agent,
        path,
        capabilities: capabilities ? capabilities.split(',') : [],
        sisters: sisters ? sisters.split(',') : [],
      });
      publishGateNote({ agent, ...gate });
      console.log(`Published gate note for ${agent} at ${GATES_DIR}/${agent}.gate`);
      break;
    }
    default:
      console.log(`NPL dns — Discovery via gate notes

Usage:
  lookup <agent>        Look up an agent's gate note
  resolve <agent>        Resolve agent to host:port
  discover               List all known agents
  publish <agent> <path> <caps> <sisters>  Publish a gate note

Gate notes live in ~/.nlp/gates/<agent>.gate`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('dns/index.mjs')) {
  cli();
}