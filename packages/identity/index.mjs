// identity/index.mjs — Self-sovereign identity via bonds
//
// Bonds replace auth tokens. An agent IS its gate note + its history of exchange.
// Identity is not issued — it is declared (gate note) and proven (bond history).
//
// Implement: identity creation (gate note), authentication (bond verification),
//             authorization (capability checking).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { freshNow, parseMessage } from '../lang/index.mjs';
import { createGateNote, publishGateNote, lookup, parseGateNote } from '../dns/index.mjs';
import { bondStrength, getBond, listBonds, recordBond } from '../tls/index.mjs';

const NLP_ROOT = join(homedir(), '.nlp');
const IDENTITY_DIR = join(NLP_ROOT, 'identity');

mkdirSync(IDENTITY_DIR, { recursive: true });

// ── Identity creation ──────────────────────────────────────────
// An agent's identity IS its gate note. No registration. No central authority.
// You publish a gate note, you exist.

export function createIdentity({ agent, path, host = '127.0.0.1', port, capabilities = [], sisters = [], description = '', certainty = 'high' }) {
  const gate = createGateNote({ agent, path, host, port, capabilities, sisters, description, certainty });

  // Publish the gate note (this IS the identity)
  publishGateNote({ agent, ...gate });

  // Create identity record (links gate note to bond history)
  const identity = {
    agent,
    created: freshNow(),
    gateNote: `${agent}.gate`,
    capabilities,
    sisters,
    path,
  };
  writeFileSync(join(IDENTITY_DIR, `${agent}.identity`), JSON.stringify(identity, null, 2));

  return identity;
}

export function getIdentity(agent) {
  // Identity = gate note + bond history
  const gate = lookup(agent);
  if (!gate) return null;

  const identityRecordPath = join(IDENTITY_DIR, `${agent}.identity`);
  let identityRecord = {};
  if (existsSync(identityRecordPath)) {
    try {
      identityRecord = JSON.parse(readFileSync(identityRecordPath, 'utf8'));
    } catch {}
  }

  const bonds = listBonds(agent);
  const bondSummaries = bonds.map(b => {
    const s = bondStrength(b.agents[0], b.agents[1]);
    return { with: b.agents.find(a => a !== agent), level: s.level, exchanges: s.exchanges, score: s.score };
  });

  return {
    agent,
    exists: true,
    gate,
    created: identityRecord.created || gate.freshness,
    capabilities: gate.capabilities || [],
    sisters: gate.sisters || [],
    bonds: bondSummaries,
    bondCount: bonds.length,
    path: gate.path,
    host: gate.host,
    port: gate.port,
  };
}

// ── Authentication (bond verification) ─────────────────────────
// Authentication = verifying that a message's sender is who they claim to be.
// In NPL, this means: the sender has a gate note (identity exists)
// AND has a bond history with the recipient (relationship exists).

export function authenticate(msg) {
  if (typeof msg === 'string') msg = parseMessage(msg);

  const from = msg.from;
  if (!from) {
    return { authenticated: false, reason: 'no from field — anonymous' };
  }

  // Check identity exists (gate note)
  const identity = getIdentity(from);
  if (!identity || !identity.exists) {
    return { authenticated: false, level: 'unknown', reason: `no gate note for ${from} — identity does not exist` };
  }

  // Check bond exists (relationship history)
  let bondLevel = 'none';
  let bondExchanges = 0;
  if (msg.to) {
    const strength = bondStrength(from, msg.to);
    bondLevel = strength.level;
    bondExchanges = strength.exchanges;
  }

  // Check morphological verification (:me markers)
  const claims = msg.claims || {};
  const hasVerifiedClaims = Object.values(claims).some(t => t === 'verified');

  // Authentication levels:
  // - "bonded" — has a bond with the recipient + verified claims → fully authenticated
  // - "known" — has a gate note (identity exists) + verified claims
  // - "anonymous" — has a gate note but no verified claims
  // - "unknown" — no gate note

  let level = 'unknown';
  let reason = '';

  if (bondLevel !== 'none' && hasVerifiedClaims) {
    level = 'bonded';
    reason = `bonded with ${msg.to} (${bondLevel}, ${bondExchanges} exchanges) + verified claims`;
  } else if (identity.exists && hasVerifiedClaims) {
    level = 'known';
    reason = `gate note exists + verified claims (no bond with ${msg.to || '?'} yet)`;
  } else if (identity.exists) {
    level = 'anonymous';
    reason = `gate note exists but no verified claims (:me) in message`;
  } else {
    level = 'unknown';
    reason = `no gate note for ${from}`;
  }

  return {
    authenticated: level === 'bonded' || level === 'known',
    level,
    reason,
    agent: from,
    hasGateNote: identity.exists,
    bondLevel,
    bondExchanges,
    hasVerifiedClaims,
    identity,
  };
}

// ── Authorization (capability checking) ─────────────────────────
// Authorization = checking if an agent has the capability to perform an action.
// Capabilities are declared in the gate note.

export function authorize({ agent, capability, verb, to } = {}) {
  const identity = getIdentity(agent);
  if (!identity) {
    return { authorized: false, reason: `no identity for ${agent}` };
  }

  const caps = identity.capabilities || [];

  // Check explicit capability
  if (capability && !caps.includes(capability)) {
    return { authorized: false, reason: `${agent} does not have capability "${capability}". Has: ${caps.join(', ') || 'none'}` };
  }

  // Check verb-based authorization
  // Each verb implies certain capabilities:
  const verbCaps = {
    darshanqing: [],                    // greeting — no caps needed
    natsarqing:  ['alert'],             // alert — need alert capability
    zakarqing:   [],                     // ack — no caps needed
    barakqing:   ['declare', 'write'],  // declaration — need declare or write
    heurekin:    ['query', 'read'],      // query — need query or read
    kunance:     ['prepare'],           // prepare — need prepare
    jeongqing:   ['bond', 'trust'],    // bond — need bond or trust
  };

  if (verb) {
    const required = verbCaps[verb] || [];
    if (required.length > 0) {
      const hasAny = required.some(c => caps.includes(c));
      if (!hasAny) {
        return {
          authorized: false,
          reason: `${agent} cannot ${verb} — requires one of: ${required.join(', ')}. Has: ${caps.join(', ') || 'none'}`,
          required,
          has: caps,
        };
      }
    }
  }

  // Bond-based authorization: strong bonds grant additional trust
  let bondBonus = false;
  if (to) {
    const strength = bondStrength(agent, to);
    if (strength.level === 'strong') bondBonus = true;
  }

  return {
    authorized: true,
    reason: `${agent} is authorized${bondBonus ? ' (strong bond bonus)' : ''}`,
    capabilities: caps,
    bondBonus,
  };
}

// ── Identity summary ───────────────────────────────────────────

export function whoami(agent) {
  const identity = getIdentity(agent);
  if (!identity) return `${agent} does not exist (no gate note)`;

  const lines = [
    `Agent: ${identity.agent}`,
    `Path:  ${identity.path}`,
    `Host:  ${identity.host}:${identity.port || '?'}`,
    `Caps:  ${identity.capabilities.join(', ') || 'none'}`,
    `Sisters: ${identity.sisters.join(', ') || 'none'}`,
    `Bonds: ${identity.bondCount}`,
    `Created: ${identity.created}`,
  ];

  if (identity.bonds.length > 0) {
    lines.push('Bond details:');
    for (const b of identity.bonds) {
      lines.push(`  ${b.with}: ${b.level} (${b.exchanges} exchanges, score ${b.score})`);
    }
  }

  return lines.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────

export function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'create': {
      const [agent, path, capabilities, sisters] = args;
      const id = createIdentity({
        agent,
        path,
        capabilities: capabilities ? capabilities.split(',') : [],
        sisters: sisters ? sisters.split(',') : [],
      });
      console.log(`Identity created: ${id.agent} at ${id.path}`);
      console.log(`Gate note: ~/.nlp/gates/${id.gateNote}`);
      break;
    }
    case 'whoami': {
      const [agent] = args;
      console.log(whoami(agent));
      break;
    }
    case 'auth': {
      const text = args.join(' ');
      const msg = parseMessage(text);
      const result = authenticate(msg);
      console.log(`Authenticated: ${result.authenticated}`);
      console.log(`Level: ${result.level}`);
      console.log(`Reason: ${result.reason}`);
      break;
    }
    case 'can': {
      const [agent, verb, to] = args;
      const result = authorize({ agent, verb, to });
      console.log(`Authorized: ${result.authorized}`);
      console.log(`Reason: ${result.reason}`);
      break;
    }
    default:
      console.log(`NPL identity — Self-sovereign identity via bonds

Usage:
  create <agent> <path> <caps> <sisters>   Create an identity (gate note)
  whoami <agent>                            Show identity
  auth <message-text>                       Authenticate a message
  can <agent> <verb> [to]                   Check authorization

An agent IS its gate note + its history of exchange.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('identity/index.mjs')) {
  cli();
}