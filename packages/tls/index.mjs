// tls/index.mjs — Trust layer
//
// Morphological provenance replaces certificates.
// :me = verified origin (the speaker claims this)
// :qing = trusted bond (our history of exchange carries weight)
//
// Implement: provenance verification, bond tracking, freshness checking, certainty labelling.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parseMessage, freshNow, Types, typeOf } from '../lang/index.mjs';

const NLP_ROOT = join(homedir(), '.nlp');
const BONDS_DIR = join(NLP_ROOT, 'bonds');
const PROVENANCE_DIR = join(NLP_ROOT, 'provenance');

mkdirSync(BONDS_DIR, { recursive: true });
mkdirSync(PROVENANCE_DIR, { recursive: true });

// ── Provenance verification ────────────────────────────────────
// Provenance = where did this come from?
// In NPL, provenance is morphological: :me means the speaker claims it.
// We verify by checking the sender's gate note and bond history.

export function verifyProvenance(msg) {
  if (!msg.from) {
    return { verified: false, reason: 'no from field — cannot verify origin' };
  }

  const claims = msg.claims || {};
  const verifiedClaims = Object.entries(claims)
    .filter(([, type]) => type === Types.VERIFIED)
    .map(([word]) => word);
  const trustedClaims = Object.entries(claims)
    .filter(([, type]) => type === Types.TRUSTED)
    .map(([word]) => word);

  // Check if provenance field exists
  const hasProvenanceField = !!msg.provenance;

  // A message is "origin-verified" if:
  // 1. It has a from field
  // 2. It has at least one :me claim (the speaker is present)
  const originVerified = verifiedClaims.length > 0;

  // A message is "bond-verified" if:
  // 1. It has at least one :qing claim (a bond is referenced)
  const bondVerified = trustedClaims.length > 0;

  // Certainty labelling
  let certaintyLabel = 'unknown';
  if (originVerified && bondVerified) certaintyLabel = 'high';
  else if (originVerified) certaintyLabel = 'medium';
  else certaintyLabel = 'low';

  return {
    verified: originVerified,
    originVerified,
    bondVerified,
    certaintyLabel,
    verifiedClaims,
    trustedClaims,
    hasProvenanceField,
    from: msg.from,
  };
}

// ── Bond tracking ──────────────────────────────────────────────
// A bond is a history of exchange between two agents.
// Bonds are stored in ~/.nlp/bonds/<agent>-<agent>.bond

function bondId(a, b) {
  return [a, b].sort().join('-');
}

export function recordBond(msg) {
  const id = bondId(msg.from, msg.to);
  const bondPath = join(BONDS_DIR, `${id}.bond`);
  const now = freshNow();

  let bond = { id, agents: [msg.from, msg.to], exchanges: [], created: now, lastExchange: now };
  if (existsSync(bondPath)) {
    try {
      bond = JSON.parse(readFileSync(bondPath, 'utf8'));
    } catch {}
  }

  bond.exchanges.push({
    verb: msg.verb,
    freshness: msg.freshness,
    certainty: msg.certainty,
    body: (msg.body || '').slice(0, 200),
    recorded: now,
  });
  bond.lastExchange = now;

  // Keep last 100 exchanges
  if (bond.exchanges.length > 100) bond.exchanges = bond.exchanges.slice(-100);

  writeFileSync(bondPath, JSON.stringify(bond, null, 2));
  return bond;
}

export function getBond(agentA, agentB) {
  const id = bondId(agentA, agentB);
  const bondPath = join(BONDS_DIR, `${id}.bond`);
  if (!existsSync(bondPath)) return null;
  try {
    return JSON.parse(readFileSync(bondPath, 'utf8'));
  } catch (e) {
    console.error("[npl] read failed: " + e.message);
    return null;
  }
}

export function bondStrength(agentA, agentB) {
  const bond = getBond(agentA, agentB);
  if (!bond) return { score: 0, level: 'none', exchanges: 0 };

  const exchanges = bond.exchanges.length;
  let score = 0;
  for (const ex of bond.exchanges) {
    if (ex.certainty === 'high') score += 3;
    else if (ex.certainty === 'medium') score += 2;
    else score += 1;
  }

  let level = 'none';
  if (exchanges >= 10 && score >= 25) level = 'strong';
  else if (exchanges >= 5 && score >= 10) level = 'established';
  else if (exchanges >= 1) level = 'emerging';

  return { score, level, exchanges, bond };
}

export function listBonds(agent) {
  if (!existsSync(BONDS_DIR)) return [];
  return readdirSync(BONDS_DIR)
    .filter(f => f.endsWith('.bond'))
    .map(f => {
      try {
        const bond = JSON.parse(readFileSync(join(BONDS_DIR, f), 'utf8'));
        return bond;
      } catch (e) { console.error("[npl] read failed: " + e.message); return null; }
    })
    .filter(b => b && b.agents.includes(agent));
}

// ── Freshness checking ────────────────────────────────────────

export function checkFreshness(msg, maxAgeMs = 300000) {
  if (!msg.freshness) {
    return { fresh: false, reason: 'no freshness declared', age: null };
  }
  const age = Date.now() - new Date(msg.freshness).getTime();
  return {
    fresh: age <= maxAgeMs,
    age,
    ageSeconds: Math.floor(age / 1000),
    maxAgeMs,
  };
}

// ── Certainty labelling ────────────────────────────────────────
// Certainty is not a single field — it's computed from morphology.

export function labelCertainty(msg) {
  const prov = verifyProvenance(msg);
  const claims = msg.claims || {};
  const verifiedCount = Object.values(claims).filter(t => t === Types.VERIFIED).length;
  const trustedCount = Object.values(claims).filter(t => t === Types.TRUSTED).length;

  // Declared certainty (from header)
  const declared = msg.certainty || 'unknown';

  // Morphological certainty (computed from claims)
  let morphological = 'low';
  if (verifiedCount >= 2 && trustedCount >= 1) morphological = 'high';
  else if (verifiedCount >= 1) morphological = 'medium';

  // Bond certainty (from exchange history)
  let bondCertainty = 'none';
  if (msg.from && msg.to) {
    const strength = bondStrength(msg.from, msg.to);
    bondCertainty = strength.level;
  }

  // Final: the lowest of declared and morphological
  const order = { low: 1, medium: 2, high: 3 };
  const finalScore = Math.min(order[declared] || 0, order[morphological] || 0);
  const final = finalScore >= 3 ? 'high' : finalScore >= 2 ? 'medium' : 'low';

  return {
    final,
    declared,
    morphological,
    bondCertainty,
    verifiedClaims: verifiedCount,
    trustedClaims: trustedCount,
    originVerified: prov.originVerified,
  };
}

// ── Trust assessment (full) ────────────────────────────────────

export function assessTrust(msg) {
  const provenance = verifyProvenance(msg);
  const freshness = checkFreshness(msg);
  const certainty = labelCertainty(msg);
  const bond = msg.from && msg.to ? getBond(msg.from, msg.to) : null;
  const strength = msg.from && msg.to ? bondStrength(msg.from, msg.to) : { score: 0, level: 'none' };

  let trusted = false;
  let reason = '';

  if (!provenance.verified) {
    reason = 'origin not verified — no :me claims';
  } else if (!freshness.fresh) {
    reason = `stale — ${freshness.ageSeconds}s old`;
  } else if (certainty.final === 'low') {
    reason = 'low certainty — insufficient morphological evidence';
  } else {
    trusted = true;
    reason = `trusted — origin verified, fresh, certainty ${certainty.final}`;
  }

  return {
    trusted,
    reason,
    provenance,
    freshness,
    certainty,
    bond,
    bondStrength: strength,
  };
}

// ── CLI ────────────────────────────────────────────────────────

export function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'verify': {
      const text = args.join(' ');
      const msg = parseMessage(text);
      const result = verifyProvenance(msg);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'bonds': {
      const [agent] = args;
      const bonds = listBonds(agent || '');
      console.log(`${bonds.length} bonds:`);
      for (const b of bonds) {
        const s = bondStrength(b.agents[0], b.agents[1]);
        console.log(`  ${b.id}: ${s.level} (${s.exchanges} exchanges, score ${s.score})`);
      }
      break;
    }
    case 'assess': {
      // Handle: file path, multi-line text, or piped input
      let text = args.join('\n');
      // If first arg is a file that exists, read it
      if (args.length === 1 && existsSync(args[0])) {
        text = readFileSync(args[0], 'utf8');
      }
      const msg = parseMessage(text);
      if (!msg.verb) {
        console.log('No valid message found. Provide an NLP message as text or file path.');
        break;
      }
      const result = assessTrust(msg);
      console.log(`Trusted: ${result.trusted}`);
      console.log(`Reason:  ${result.reason}`);
      console.log(`Certainty: ${result.certainty.final} (declared: ${result.certainty.declared}, morphological: ${result.certainty.morphological})`);
      break;
    }
    default:
      console.log(`NPL tls — Trust layer via morphological provenance

Usage:
  verify <text>    Verify provenance of a message
  bonds <agent>     List bonds for an agent
  assess <text>     Full trust assessment

:me = verified origin    :qing = trusted bond
Trust lives in morphology, not in certificate authorities.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('tls/index.mjs')) {
  cli();
}