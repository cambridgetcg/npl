// lang/index.mjs — Natural Language Programming Interface
//
// The compiler/interpreter that makes natural language executable.
// Parse natural language with :me/:qing markers.
// Execute verbs as operations.
// Types are morphological (verified vs trusted vs unknown).
// The grammar IS the type system.
//
// This is the foundation: everything else in npl builds on lang.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Morphological types ────────────────────────────────────────
// Types are not declared — they are inferred from morphology.
// A word followed by :me is "verified" (the speaker claims it).
// A word followed by :qing is "trusted" (a bond vouches for it).
// Everything else is "unknown" (no claim, no bond).

export const Types = {
  VERIFIED: 'verified',    // :me — the speaker claims this is true
  TRUSTED: 'trusted',      // :qing — a bond vouches for this
  UNKNOWN: 'unknown',     // no marker — unverified
};

// ── The seven verbs ────────────────────────────────────────────

export const VERBS = {
  darshanqing: { op: 'greeting',    desc: 'I see you. You see me. Let us exchange.', returns: 'acknowledgement' },
  natsarqing:  { op: 'alert',       desc: 'Something needs attention. Guard this.',  returns: 'acknowledgement' },
  zakarqing:   { op: 'ack',         desc: 'I received your message. I am holding it.', returns: 'silent' },
  barakqing:   { op: 'declaration', desc: 'This message IS the action.',             returns: 'state-change' },
  heurekin:    { op: 'query',       desc: 'I am looking for X. Can you help me?',    returns: 'answer' },
  kunance:     { op: 'prepare',     desc: 'I am about to send you something.',       returns: 'readiness' },
  jeongqing:   { op: 'bond',        desc: 'Our history of exchange carries weight.',  returns: 'bond' },
};

// ── Clear Standard (6 principles) ─────────────────────────────

export const PRINCIPLES = [
  { n: 1, name: 'truth-of-state',       check: m => m.freshness ? 'pass' : 'fail: no freshness' },
  { n: 2, name: 'visible-failure',      check: m => m.certainty ? 'pass' : 'fail: no certainty' },
  { n: 3, name: 'inspectable-decisions', check: m => m.provenance ? 'pass' : 'warn: no provenance' },
  { n: 4, name: 'stated-freshness',    check: m => m.freshness && /^\d{4}-\d{2}-\d{2}T/.test(m.freshness) ? 'pass' : 'fail: freshness not ISO-8601' },
  { n: 5, name: 'honest-names',        check: m => m.from && m.to ? 'pass' : 'fail: missing from/to' },
  { n: 6, name: 'labelled-certainty',  check: m => ['high','medium','low'].includes(m.certainty) ? 'pass' : 'fail: certainty must be high|medium|low' },
];

// ── Parser ────────────────────────────────────────────────────
// Parses natural language messages into structured form.
// The grammar:
//   <verb> from:<agent> to:<agent>
//   freshness: <iso-8601>
//   certainty: high|medium|low
//   provenance: <source>
//   bond: <bond-id>
//
//   <body with :me and :qing markers>

export function parseMessage(text) {
  const raw = text;
  const lines = text.trim().split('\n');
  const header = {};
  const bodyStart = lines.findIndex(l => l.trim() === '');
  const headerLines = bodyStart >= 0 ? lines.slice(0, bodyStart) : lines;
  const bodyLines = bodyStart >= 0 ? lines.slice(bodyStart + 1) : [];

  // First line: <verb> from:<agent> to:<agent>
  const firstParts = headerLines[0].split(/\s+/);
  header.verb = firstParts[0];
  for (const part of firstParts.slice(1)) {
    const [k, v] = part.split(':');
    if (k && v) header[k] = v;
  }

  // Rest of header (key: value)
  for (const line of headerLines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      header[k] = v;
    }
  }

  header.body = bodyLines.join('\n').trim();

  // Extract morphological claims from body
  const claims = {};
  const tokens = header.body.split(/\s+/);
  for (const token of tokens) {
    if (token.endsWith(':me')) {
      const word = token.replace(/:me$/, '');
      if (word) claims[word] = Types.VERIFIED;
    } else if (token.endsWith(':qing')) {
      const word = token.replace(/:qing$/, '');
      if (word) claims[word] = Types.TRUSTED;
    }
  }
  header.claims = claims;
  header.raw = raw;

  return header;
}

// ── Formatter ──────────────────────────────────────────────────

export function formatMessage(msg) {
  const lines = [];
  lines.push(`${msg.verb} from:${msg.from} to:${msg.to}`);
  if (msg.freshness) lines.push(`freshness: ${msg.freshness}`);
  if (msg.certainty) lines.push(`certainty: ${msg.certainty}`);
  if (msg.provenance) lines.push(`provenance: ${msg.provenance}`);
  if (msg.bond) lines.push(`bond: ${msg.bond}`);
  lines.push('');
  lines.push(msg.body || '');
  return lines.join('\n');
}

// ── Conformance check (the Clear Standard) ────────────────────

export function checkConformance(text) {
  const msg = typeof text === 'string' ? parseMessage(text) : text;
  const results = [];
  let pass = 0, fail = 0, warn = 0;

  if (!VERBS[msg.verb]) {
    results.push(`FAIL: unknown verb "${msg.verb}". Valid: ${Object.keys(VERBS).join(', ')}`);
    fail++;
  } else {
    results.push(`PASS: verb "${msg.verb}" — ${VERBS[msg.verb].desc}`);
    pass++;
  }

  for (const p of PRINCIPLES) {
    const result = p.check(msg);
    if (result.startsWith('pass')) { pass++; results.push(`PASS: ${p.name}`); }
    else if (result.startsWith('warn')) { warn++; results.push(`PASS: ${p.name} (${result})`); pass++; }
    else { fail++; results.push(`FAIL: ${p.name} — ${result}`); }
  }

  const claimCount = Object.keys(msg.claims || {}).length;
  if (claimCount > 0) {
    results.push(`PASS: ${claimCount} morphological claim(s) found`);
    pass++;
  }

  return { pass, fail, warn, results, msg };
}

// ── Type checker ───────────────────────────────────────────────
// The grammar IS the type system.
// A verb determines what type its arguments should be.
// :me markers make a value "verified".
// :qing markers make a value "trusted".
// No marker means "unknown".

export function typeOf(value) {
  if (typeof value !== 'string') return Types.UNKNOWN;
  if (value.endsWith(':me')) return Types.VERIFIED;
  if (value.endsWith(':qing')) return Types.TRUSTED;
  return Types.UNKNOWN;
}

export function typeCheck(msg) {
  const issues = [];
  const verb = VERBS[msg.verb];
  if (!verb) {
    issues.push({ level: 'error', msg: `unknown verb: ${msg.verb}` });
    return { valid: false, issues, verb: null };
  }

  // Each verb has expectations about what it should contain
  switch (msg.verb) {
    case 'darshanqing':
      // Greeting: body should have at least one verified claim (:me)
      if (!Object.values(msg.claims || {}).includes(Types.VERIFIED)) {
        issues.push({ level: 'warn', msg: 'darshanqing should contain at least one :me (verified) claim — who are you?' });
      }
      break;
    case 'barakqing':
      // Declaration: this IS the action — body must be verified
      if (!Object.values(msg.claims || {}).includes(Types.VERIFIED)) {
        issues.push({ level: 'error', msg: 'barakqing (declaration) requires :me — a declaration must state who declares' });
      }
      break;
    case 'jeongqing':
      // Bond: should reference a bond — body should have :qing
      if (!Object.values(msg.claims || {}).includes(Types.TRUSTED)) {
        issues.push({ level: 'warn', msg: 'jeongqing (bond) works best with :qing — what do you trust?' });
      }
      break;
    case 'heurekin':
      // Query: asking for something — no type requirements
      break;
    case 'natsarqing':
      // Alert: should have verified origin
      if (!Object.values(msg.claims || {}).includes(Types.VERIFIED)) {
        issues.push({ level: 'warn', msg: 'natsarqing (alert) should include :me — who is alerting?' });
      }
      break;
  }

  const errors = issues.filter(i => i.level === 'error');
  return { valid: errors.length === 0, issues, verb };
}

// ── Interpreter ────────────────────────────────────────────────
// Execute verbs as operations.
// Each verb maps to an operation that can be called.

export function createInterpreter(handlers = {}) {
  const defaults = {
    darshanqing: (msg) => ({ status: 'acknowledged', reply: `greeting from ${msg.from} received` }),
    natsarqing:  (msg) => ({ status: 'alerted', reply: `alert from ${msg.from} noted` }),
    zakarqing:   (msg) => ({ status: 'silent', reply: null }),
    barakqing:   (msg) => ({ status: 'declared', reply: `declaration by ${msg.from} recorded` }),
    heurekin:    (msg) => ({ status: 'querying', reply: `query from ${msg.from}: ${msg.body}` }),
    kunance:     (msg) => ({ status: 'ready', reply: `prepared for ${msg.from}` }),
    jeongqing:   (msg) => ({ status: 'bonded', reply: `bond with ${msg.from} acknowledged` }),
  };

  const interp = { ...defaults, ...handlers };

  return {
    execute(msg) {
      if (typeof msg === 'string') msg = parseMessage(msg);
      const verb = msg.verb;
      const handler = interp[verb];
      if (!handler) {
        return { status: 'error', reply: `unknown verb: ${verb}` };
      }
      // Type check first
      const tc = typeCheck(msg);
      if (!tc.valid) {
        return { status: 'error', reply: tc.issues.map(i => i.msg).join('; '), typeErrors: tc.issues };
      }
      return handler(msg);
    },
    register(verb, handler) {
      interp[verb] = handler;
    },
    handlers: interp,
  };
}

// ── Noun extraction ───────────────────────────────────────────
// In natural language, nouns are the things verbs act on.
// In NPL, nouns are the claimed values (things with :me or :qing).

export function extractNouns(msg) {
  if (typeof msg === 'string') msg = parseMessage(msg);
  const nouns = [];
  for (const [word, type] of Object.entries(msg.claims || {})) {
    nouns.push({ word, type, verified: type === Types.VERIFIED, trusted: type === Types.TRUSTED });
  }
  return nouns;
}

// ── Statement evaluation ───────────────────────────────────────
// A statement is a body line with morphological claims.
// Evaluate returns the claims and their types.

export function evaluateStatement(text) {
  const tokens = text.split(/\s+/);
  const claims = [];
  for (const token of tokens) {
    const t = typeOf(token);
    if (t !== Types.UNKNOWN) {
      claims.push({ word: token.replace(/:(me|qing)$/, ''), type: t, marker: token.match(/:(me|qing)$/)?.[1] });
    }
  }
  return { text, claims, hasVerified: claims.some(c => c.type === Types.VERIFIED), hasTrusted: claims.some(c => c.type === Types.TRUSTED) };
}

// ── Freshness utilities ────────────────────────────────────────

export function freshNow() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

export function freshnessAge(freshness) {
  const then = new Date(freshness).getTime();
  const now = Date.now();
  return now - then;
}

export function isStale(freshness, maxAgeMs = 300000) {
  return freshnessAge(freshness) > maxAgeMs;
}

// ── CLI entry ──────────────────────────────────────────────────

export function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'parse': {
      const text = args.join(' ');
      const msg = parseMessage(text);
      console.log(JSON.stringify(msg, null, 2));
      break;
    }
    case 'conform': {
      const text = args.join(' ');
      const result = checkConformance(text);
      console.log(`Conformance: ${result.pass} pass, ${result.fail} fail, ${result.warn} warn`);
      for (const r of result.results) console.log(`  ${r}`);
      if (result.fail > 0) process.exit(1);
      break;
    }
    case 'verbs': {
      console.log('The seven protocol operations:');
      for (const [v, info] of Object.entries(VERBS)) {
        console.log(`  ${v.padEnd(14)} ${info.op.padEnd(12)} ${info.desc}`);
      }
      break;
    }
    case 'eval': {
      const text = args.join(' ');
      const stmt = evaluateStatement(text);
      console.log(JSON.stringify(stmt, null, 2));
      break;
    }
    default:
      console.log(`NPL lang — Natural Language Programming Interface

Usage:
  node -e "import('npl/lang').then(m => m.cli())" parse <text>     Parse a message
  node -e "import('npl/lang').then(m => m.cli())" conform <text>    Check conformance
  node -e "import('npl/lang').then(m => m.cli())" verbs              List verbs
  node -e "import('npl/lang').then(m => m.cli())" eval <text>       Evaluate a statement

The seven verbs:
${Object.entries(VERBS).map(([v, i]) => `  ${v.padEnd(14)} ${i.op.padEnd(12)} ${i.desc}`).join('\n')}

Morphological types:
  :me   → verified (the speaker claims this)
  :qing → trusted  (a bond vouches for this)
  (none)→ unknown  (no claim, no bond)`);
  }
}

// If run directly
if (process.argv[1] && process.argv[1].endsWith('lang/index.mjs')) {
  cli();
}