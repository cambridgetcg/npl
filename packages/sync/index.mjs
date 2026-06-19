// sync/index.mjs — State synchronization via heartbeats
//
// Heartbeats replace polling/webhooks. Each agent determines its own rhythm
// and reports when ready. No central clock. No forced intervals.
//
// Implement: heartbeat registration, interval self-determination, state exchange, conflict detection.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { freshNow, freshNow as now, parseMessage } from '../lang/index.mjs';
import { deliverLocal } from '../tcp/index.mjs';

const NLP_ROOT = join(homedir(), '.nlp');
const HEARTBEATS_DIR = join(NLP_ROOT, 'heartbeats');
const STATE_DIR = join(NLP_ROOT, 'state');

mkdirSync(HEARTBEATS_DIR, { recursive: true });
mkdirSync(STATE_DIR, { recursive: true });

// ── Heartbeat registration ─────────────────────────────────────
// Agents register their heartbeat rhythm. They choose their own interval.

export function registerHeartbeat({ agent, intervalMs, capabilities = [], description = '' }) {
  const hb = {
    agent,
    intervalMs,
    capabilities,
    description,
    registered: freshNow(),
    lastBeat: null,
    beats: 0,
  };
  const hbPath = join(HEARTBEATS_DIR, `${agent}.heartbeat`);
  writeFileSync(hbPath, JSON.stringify(hb, null, 2));
  return hb;
}

export function getHeartbeat(agent) {
  const hbPath = join(HEARTBEATS_DIR, `${agent}.heartbeat`);
  if (!existsSync(hbPath)) return null;
  try {
    return JSON.parse(readFileSync(hbPath, 'utf8'));
  } catch {
    return null;
  }
}

export function listHeartbeats() {
  if (!existsSync(HEARTBEATS_DIR)) return [];
  return readdirSync(HEARTBEATS_DIR)
    .filter(f => f.endsWith('.heartbeat'))
    .map(f => {
      try {
        return JSON.parse(readFileSync(join(HEARTBEATS_DIR, f), 'utf8'));
      } catch { return null; }
    })
    .filter(Boolean);
}

// ── Interval self-determination ────────────────────────────────
// Each agent decides its own rhythm. No central scheduler.
// The agent looks at its own state and picks an interval.

export function determineInterval({ agent, workload = 'normal', urgency = 'normal', history = [] }) {
  // Base intervals by workload
  const base = {
    idle: 3600000,      // 1 hour
    light: 1800000,     // 30 minutes
    normal: 600000,     // 10 minutes
    heavy: 120000,      // 2 minutes
    critical: 30000,    // 30 seconds
  };

  let interval = base[workload] || base.normal;

  // Adjust by urgency
  if (urgency === 'high') interval = Math.floor(interval / 2);
  if (urgency === 'low') interval = interval * 2;

  // Adjust by history: if the last 3 beats were all "ok", slow down
  const recent = history.slice(-3);
  if (recent.length >= 3 && recent.every(b => b.status === 'ok')) {
    interval = Math.floor(interval * 1.5);
  }

  // If any recent beat was an alert, speed up
  if (recent.some(b => b.status === 'alert')) {
    interval = Math.floor(interval / 2);
  }

  return {
    intervalMs: interval,
    intervalLabel: formatInterval(interval),
    workload,
    urgency,
    basedOn: `${workload} workload, ${urgency} urgency, ${recent.length} recent beats`,
  };
}

function formatInterval(ms) {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

// ── Beat (send a heartbeat) ────────────────────────────────────

export function beat({ agent, to = 'heartbeat', status = 'ok', state = {}, body = '', certainty = 'high' }) {
  const hb = getHeartbeat(agent);
  const intervalMs = hb ? hb.intervalMs : 600000;

  // Update heartbeat record
  if (hb) {
    hb.lastBeat = freshNow();
    hb.beats = (hb.beats || 0) + 1;
    writeFileSync(join(HEARTBEATS_DIR, `${agent}.heartbeat`), JSON.stringify(hb, null, 2));
  }

  // Build state
  const stateBody = [
    body || `${status}:me`,
    `beat: ${hb ? hb.beats + 1 : 1}`,
    `next: ${formatInterval(intervalMs)}`,
    state ? Object.entries(state).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
  ].filter(Boolean).join('\n');

  // Deliver heartbeat as a darshanqing (greeting = state report)
  const result = deliverLocal({
    from: agent,
    to,
    verb: status === 'ok' ? 'darshanqing' : 'natsarqing',
    body: stateBody,
    certainty,
    provenance: 'heartbeat',
  });

  // Store state snapshot
  storeState(agent, { status, state, beat: hb ? hb.beats : 1, timestamp: freshNow() });

  return { beat: hb ? hb.beats : 1, status, delivered: result.ok, filepath: result.filepath };
}

// ── State storage ──────────────────────────────────────────────

export function storeState(agent, state) {
  const statePath = join(STATE_DIR, `${agent}.state`);
  const entry = { ...state, stored: freshNow() };
  writeFileSync(statePath, JSON.stringify(entry, null, 2));
  return statePath;
}

export function getState(agent) {
  const statePath = join(STATE_DIR, `${agent}.state`);
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

export function getAllStates() {
  if (!existsSync(STATE_DIR)) return {};
  const states = {};
  for (const f of readdirSync(STATE_DIR)) {
    if (f.endsWith('.state')) {
      const agent = f.replace('.state', '');
      states[agent] = getState(agent);
    }
  }
  return states;
}

// ── State exchange ──────────────────────────────────────────────
// Agents exchange state through heartbeats. When an agent beats,
// it includes its state. Other agents can read it.

export function exchangeState(agentA, agentB) {
  const stateA = getState(agentA);
  const stateB = getState(agentB);
  if (!stateA && !stateB) return { exchanged: false, reason: 'no states' };

  // Each agent gets the other's state via a jeongqing (bond) message
  if (stateA) {
    deliverLocal({
      from: agentA,
      to: agentB,
      verb: 'jeongqing',
      body: `state-exchange: ${JSON.stringify(stateA.state || {})}:me`,
      provenance: 'sync',
      certainty: 'high',
    });
  }
  if (stateB) {
    deliverLocal({
      from: agentB,
      to: agentA,
      verb: 'jeongqing',
      body: `state-exchange: ${JSON.stringify(stateB.state || {})}:me`,
      provenance: 'sync',
      certainty: 'high',
    });
  }

  return { exchanged: true, stateA, stateB };
}

// ── Conflict detection ─────────────────────────────────────────
// Conflicts arise when two agents report different state for the same thing.

export function detectConflicts() {
  const states = getAllStates();
  const conflicts = [];

  // Check for agents that report different status
  const agentsByStatus = {};
  for (const [agent, state] of Object.entries(states)) {
    if (!state) continue;
    const key = JSON.stringify(state.state || {});
    if (!agentsByStatus[key]) agentsByStatus[key] = [];
    agentsByStatus[key].push(agent);
  }

  // If agents have different state maps, that's not necessarily a conflict.
  // A conflict is when the same key has different values across agents.
  const allKeys = new Set();
  for (const state of Object.values(states)) {
    if (state && state.state) {
      for (const k of Object.keys(state.state)) allKeys.add(k);
    }
  }

  for (const key of allKeys) {
    const values = {};
    for (const [agent, state] of Object.entries(states)) {
      if (state && state.state && state.state[key] !== undefined) {
        const v = String(state.state[key]);
        if (!values[v]) values[v] = [];
        values[v].push(agent);
      }
    }
    const distinctValues = Object.keys(values);
    if (distinctValues.length > 1) {
      conflicts.push({
        key,
        values: Object.entries(values).map(([v, agents]) => ({ value: v, agents })),
      });
    }
  }

  return { conflicts, agentCount: Object.keys(states).length, conflictCount: conflicts.length };
}

// ── CLI ────────────────────────────────────────────────────────

export function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'register': {
      const [agent, intervalMs] = args;
      const hb = registerHeartbeat({ agent, intervalMs: parseInt(intervalMs) || 600000 });
      console.log(`Registered heartbeat for ${agent}: every ${formatInterval(hb.intervalMs)}`);
      break;
    }
    case 'beat': {
      const [agent, status = 'ok', ...bodyParts] = args;
      const body = bodyParts.join(' ') || 'alive:me';
      const result = beat({ agent, status, body });
      console.log(`Beat #${result.beat}: ${result.status} → ${result.filepath}`);
      break;
    }
    case 'states': {
      const states = getAllStates();
      for (const [agent, state] of Object.entries(states)) {
        console.log(`  ${agent}: ${state.status} (beat ${state.beat}, ${state.stored})`);
      }
      break;
    }
    case 'conflicts': {
      const result = detectConflicts();
      console.log(`${result.conflictCount} conflicts across ${result.agentCount} agents`);
      for (const c of result.conflicts) {
        console.log(`  ${c.key}: ${c.values.map(v => `${v.value} (${v.agents.join(',')})`).join(' vs ')}`);
      }
      break;
    }
    case 'list': {
      const hbs = listHeartbeats();
      console.log(`${hbs.length} heartbeats:`);
      for (const hb of hbs) {
        console.log(`  ${hb.agent.padEnd(16)} every ${formatInterval(hb.intervalMs)}  beats: ${hb.beats || 0}  last: ${hb.lastBeat || 'never'}`);
      }
      break;
    }
    default:
      console.log(`NPL sync — State synchronization via heartbeats

Usage:
  register <agent> <intervalMs>   Register a heartbeat rhythm
  beat <agent> [status] [body]    Send a heartbeat
  states                          Show all agent states
  conflicts                       Detect state conflicts
  list                            List all heartbeats

Each agent determines its own rhythm. No central clock.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('sync/index.mjs')) {
  cli();
}