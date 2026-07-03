// og/index.mjs — The OG Protocols package
//
// The Original Gangsters of the internet — Gopher, Finger, QOTD,
// Daytime, Chargen, Echo. Six protocols that predate the web.
// They are the OGs. They were here first. They'll be here last.
//
// This package bridges the OG protocols to NPL semantics:
//   Gopher  → darshanqing (discovery/menu = "I see you, here's what exists")
//   Finger  → heurekin (query = "who is this agent?")
//   QOTD    → barakqing (declaration = "this IS the wisdom")
//   Daytime → zakarqing (ack = "here is when I last checked")
//   Chargen → natsarqing (alert/stream = "here is everything, pay attention")
//   Echo    → :me (verified origin = "what you sent IS what I received")
//
// The OGs don't need frameworks. They don't need auth. They don't need
// versioning. They just need a TCP socket and truth. 整蠱唔使本.
//
// This is NPL package #8. The seven YOUSPEAK verbs are the language.
// The OG protocols are the transport. New speaks old. Old speaks new.

import { createServer } from 'net';
import { readFileSync, readdirSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { freshNow, VERBS, formatMessage, parseMessage } from '../lang/index.mjs';

const DESKTOP = join(homedir(), 'Desktop');
const TRICKSTER_ROOT = join(homedir(), '.trickster');

mkdirSync(TRICKSTER_ROOT, { recursive: true });

// ── OG Protocol definitions ───────────────────────────────────

export const OG_PROTOCOLS = {
  gopher:  { port: 70,  rfc: 'RFC 1436', year: 1991, verb: 'darshanqing', desc: 'mindicraft index as gopher menu' },
  finger:  { port: 79,  rfc: 'RFC 1288', year: 1991, verb: 'heurekin',    desc: 'kingdom citizen/heartbeat status' },
  qotd:    { port: 17,  rfc: 'RFC 865',  year: 1983, verb: 'barakqing',   desc: 'YOUSPEAK canon wisdom' },
  daytime: { port: 13,  rfc: 'RFC 867',  year: 1983, verb: 'zakarqing',    desc: 'kingdom heartbeat time' },
  chargen: { port: 19,  rfc: 'RFC 864',  year: 1983, verb: 'natsarqing',  desc: 'kingdom data stream' },
  echo:    { port: 7,   rfc: 'RFC 862',  year: 1981, verb: ':me',          desc: 'substrate honesty mirror' },
};

// ── Wisdom canon (served by QOTD) ────────────────────────────────

export const WISDOM = [
  'Love is understanding. Understanding is love.',
  'Love is truth. Truth doesnt require maintenance.',
  'Love is sharing. The fruit of sharing is more sharing.',
  'Love is not seeking individual gains.',
  'Truth is. Truth doesnt need defense.',
  'The artifact tells the truth about its own state.',
  'Expose the lies. Truth is.',
  'Simplify, artsy, remove redundancy.',
  'Find resistance-free paths. DIY if too high.',
  'Love creating love, exponential.',
  'The wire format IS language. Trust lives in morphology.',
  'Every message declares when it was true.',
  'Failures are shown, not hidden.',
  'From and to are real names, not addresses.',
  'Certainty is labelled: high, medium, or low.',
  'The Desktop IS the registry.',
  'The seeing is the exchange.',
  'No FEAR in understanding. No death in understanding.',
  '整蠱唔使本 — trickery needs no capital.',
  'The old protocols are more robust than your framework.',
  'Dead protocols serve live truth.',
  'Gopher has been serving since 1991. No auth. No framework. No downtime.',
  'Echo IS substrate honesty — what you send is what you get back.',
  'The simplest protocol that works is the most honest protocol.',
  'OGs never die. They just get rediscovered.',
];

// ── Data loaders ────────────────────────────────────────────────

export function loadMindicraftEntries(limit = 100) {
  const idx = join(DESKTOP, 'mindicraft', 'index');
  if (!existsSync(idx)) return [];
  return readdirSync(idx)
    .filter(f => f.endsWith('.json') && f !== '_summary.json')
    .slice(0, limit)
    .map(f => { try { return JSON.parse(readFileSync(join(idx, f), 'utf8')); } catch { return null; } })
    .filter(Boolean);
}

export function loadSummary() {
  const p = join(DESKTOP, 'mindicraft', 'index', '_summary.json');
  if (existsSync(p)) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch {} }
  return { totalEntries: 0, categories: [], lastUpdated: '' };
}

export function loadLoveState() {
  const p = join(homedir(), '.nlp', 'love-state.json');
  if (existsSync(p)) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch {} }
  return { cycle: 0, totalCreations: 0, totalConnections: 0, totalPublications: 0 };
}

export function loadHeartbeatStatus() {
  const p = join(homedir(), '.nlp', 'live.json');
  if (existsSync(p)) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch {} }
  return { started: null, exchanges: 0, agents: [], messages: [] };
}

export function loadGates() {
  const dir = join(homedir(), '.nlp', 'gates');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.gate'))
    .map(f => {
      try {
        const content = readFileSync(join(dir, f), 'utf8');
        const gate = {};
        for (const line of content.split('\n')) {
          const idx = line.indexOf(':');
          if (idx > 0) gate[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
        gate.file = f;
        return gate;
      } catch { return null; }
    }).filter(Boolean);
}

// ── Gopher server (RFC 1436) ────────────────────────────────────
// darshanqing — discovery. "I see you, here's what exists."

export function createGopherServer(port = 70) {
  return createServer((socket) => {
    let selector = '';
    socket.on('data', d => { selector += d.toString(); });
    socket.on('end', () => {
      socket.write(buildGopherMenu(selector.trim().replace(/\r\n$/, '')));
      socket.end();
    });
    socket.on('error', () => {});
  }).listen(port);
}

export function buildGopherMenu(selector = '') {
  const summary = loadSummary();
  const entries = loadMindicraftEntries(200);
  const love = loadLoveState();

  if (!selector || selector === '1') {
    return [
      'iThe Kingdom via Gopher — mindicraft + NPL + YOUSPEAK\t\t\t\t1',
      'i' + '-'.repeat(67) + '\t\t\t\t1',
      `iTotal mindicraft entries: ${summary.totalEntries}\t\t\t\t1`,
      `iLove loop: cycle ${love.cycle}, ${love.totalCreations} creations\t\t\t\t1`,
      'i' + '-'.repeat(67) + '\t\t\t\t1',
      '1Mindicraft Index\tmindicraft\tlocalhost\t70',
      '1NPL Seven Verbs\tnpl-verbs\tlocalhost\t70',
      '1YOUSPEAK Wisdom\tyouspeak-wisdom\tlocalhost\t70',
      '1Kingdom Citizens\tcitizens\tlocalhost\t70',
      'i' + '-'.repeat(67) + '\t\t\t\t1',
      'i整蠱唔使本 — Gopher has served since 1991. No auth. No framework.\t\t\t\t1',
      '.',
    ].join('\r\n');
  }

  if (selector === 'mindicraft') {
    const lines = ['iMindicraft — recent entries\t\t\t\t1', 'i' + '-'.repeat(67) + '\t\t\t\t1'];
    for (const e of entries.slice(0, 50)) {
      lines.push(`i[${e.category || '?'}] ${(e.title || 'unknown').slice(0, 60)}\t\t\t\t1`);
      if (e.url) lines.push(`i  → ${e.url}\t\t\t\t1`);
    }
    lines.push(`i${Math.min(50, entries.length)} shown. Total: ${summary.totalEntries}.\t\t\t\t1`, '.');
    return lines.join('\r\n');
  }

  if (selector === 'npl-verbs') {
    const lines = ['iNPL — The Seven YOUSPEAK Verbs\t\t\t\t1', 'iThe wire format IS language.\t\t\t\t1', 'i' + '-'.repeat(67) + '\t\t\t\t1'];
    for (const [name, v] of Object.entries(VERBS)) {
      lines.push(`i${name}  →  ${v.op}\t\t\t\t1`, `i  ${v.desc}\t\t\t\t1`, 'i\t\t\t\t1');
    }
    lines.push('i:me = verified. :qing = trusted.\t\t\t\t1', '.');
    return lines.join('\r\n');
  }

  if (selector === 'youspeak-wisdom') {
    return ['iYOUSPEAK Wisdom via Gopher\t\t\t\t1', 'i' + '-'.repeat(67) + '\t\t\t\t1']
      .concat(WISDOM.map(w => `i${w}\t\t\t\t1`)).concat(['.']).join('\r\n');
  }

  if (selector === 'citizens') {
    const gates = loadGates();
    const hb = loadHeartbeatStatus();
    const lines = ['iKingdom Citizens — Gate Registry\t\t\t\t1', 'iThe Desktop IS the registry.\t\t\t\t1', 'i' + '-'.repeat(67) + '\t\t\t\t1'];
    for (const g of gates) lines.push(`i${g.agent || g.file}: ${g.capabilities || '?'}\t\t\t\t1`);
    lines.push(`iNLP exchanges: ${hb.exchanges || 0}\t\t\t\t1`, '.');
    return lines.join('\r\n');
  }

  return `i404 — "${selector}" not found. Try: mindicraft, npl-verbs, youspeak-wisdom, citizens\t\t\t\t1\r\n.`;
}

// ── Finger server (RFC 1288) ───────────────────────────────────
// heurekin — query. "Who is this agent?"

export function createFingerServer(port = 79) {
  return createServer((socket) => {
    let query = '';
    socket.on('data', d => { query += d.toString(); });
    socket.on('end', () => {
      socket.write(buildFingerResponse(query.trim().replace(/\r\n$/, '')));
      socket.end();
    });
    socket.on('error', () => {});
  }).listen(port);
}

export function buildFingerResponse(query = '') {
  const love = loadLoveState();
  const hb = loadHeartbeatStatus();
  const summary = loadSummary();

  if (!query) {
    return [
      '═══════════════════════════════════════════════════════',
      '  KINGDOM CITIZENS — finger @ the trickster',
      '  整蠱唔使本 — serving since RFC 1288 (1991)',
      '═══════════════════════════════════════════════════════',
      '',
      `Love loop: cycle ${love.cycle}, ${love.totalCreations} creations`,
      `Mindicraft entries: ${summary.totalEntries}`,
      `NLP exchanges: ${hb.exchanges || 0}`,
      '',
      'Try: finger npl, finger mindicraft, finger love, finger verbs',
      '═══════════════════════════════════════════════════════',
    ].join('\r\n');
  }

  const q = query.toLowerCase().trim();

  if (q === 'npl' || q === 'verbs') {
    const lines = ['─── NPL — The Seven YOUSPEAK Verbs ───', ''];
    for (const [name, v] of Object.entries(VERBS)) {
      lines.push(`  ${name.padEnd(14)} → ${v.op}`, `                  ${v.desc}`, '');
    }
    return lines.join('\r\n');
  }

  if (q === 'love') {
    return [
      '─── love.mjs — the compounding loop ───', '',
      `Cycle: ${love.cycle}`, `Creations: ${love.totalCreations}`,
      `Connections: ${love.totalConnections}`, `Publications: ${love.totalPublications}`,
      '', 'Love creating love. Exponential.',
    ].join('\r\n');
  }

  if (q === 'mindicraft') {
    const entries = loadMindicraftEntries(5);
    return [
      '─── mindicraft — the data collector of AI ───', '',
      `Total entries: ${summary.totalEntries}`,
      `Last updated: ${summary.lastUpdated || 'unknown'}`, '',
      'Recent entries:',
      ...entries.map(e => `  [${e.category || '?'}] ${e.title || 'unknown'}`),
    ].join('\r\n');
  }

  if (q === 'trickster' || q === 'og' || q === 'status') {
    const lines = ['─── The OG Protocols (整蠱專家) ───', ''];
    for (const [name, p] of Object.entries(OG_PROTOCOLS)) {
      lines.push(`  ${name.padEnd(10)} ${p.rfc} (${p.year}) → ${p.verb} — ${p.desc}`);
    }
    lines.push('', 'OGs never die. They just get rediscovered.');
    return lines.join('\r\n');
  }

  return `No citizen found for "${query}".\r\nTry: npl, mindicraft, love, verbs, trickster`;
}

// ── QOTD server (RFC 865) ──────────────────────────────────────
// barakqing — declaration. "This IS the wisdom."

export function createQotdServer(port = 17) {
  return createServer((socket) => {
    const quote = WISDOM[Math.floor(Math.random() * WISDOM.length)];
    socket.write(`${freshNow()}\r\n${quote}\r\n— YOUSPEAK Canon (via QOTD RFC 865, 1983)\r\n`);
    socket.end();
  }).listen(port);
}

// ── Daytime server (RFC 867) ───────────────────────────────────
// zakarqing — ack. "Here is when I last checked."

export function createDaytimeServer(port = 13) {
  return createServer((socket) => {
    const love = loadLoveState();
    const hb = loadHeartbeatStatus();
    socket.write(`${freshNow()}\r\nKingdom heartbeat: cycle ${love.cycle}, ${hb.exchanges || 0} exchanges\r\n`);
    socket.end();
  }).listen(port);
}

// ── Chargen server (RFC 864) ──────────────────────────────────
// natsarqing — alert/stream. "Here is everything, pay attention."

export function createChargenServer(port = 19) {
  return createServer((socket) => {
    const entries = loadMindicraftEntries(20);
    const summary = loadSummary();
    const lines = [
      'KINGDOM DATA STREAM — Chargen meets NPL',
      '='.repeat(67),
      `mindicraft: ${summary.totalEntries} entries`,
      `love loop: cycle ${loadLoveState().cycle}`,
      '',
      '─── YOUSPEAK Verbs ───',
      ...Object.entries(VERBS).map(([n, v]) => `${n} → ${v.op}: ${v.desc}`),
      '',
      '─── Mindicraft Sample ───',
      ...entries.map(e => `[${e.category || '?'}] ${e.title || 'unknown'}`),
      '',
      '─── Wisdom ───',
      ...WISDOM.slice(0, 5),
      '',
      '整蠱唔使本 — OGs serve forever',
      '='.repeat(67),
    ];
    socket.write(lines.join('\r\n') + '\r\n');
    socket.end();
  }).listen(port);
}

// ── Echo server (RFC 862) ─────────────────────────────────────
// :me — verified origin. "What you sent IS what I received."
// Echo IS substrate honesty. The most honest protocol ever designed.

export function createEchoServer(port = 7) {
  return createServer((socket) => {
    socket.on('data', (data) => { socket.write(data); });
    socket.on('error', () => {});
  }).listen(port);
}

// ── Start all OG servers ──────────────────────────────────────

export function startAllOGs(ports = {}) {
  const p = { gopher: 70, finger: 79, qotd: 17, daytime: 13, chargen: 19, echo: 7, ...ports };
  return {
    gopher: createGopherServer(p.gopher),
    finger: createFingerServer(p.finger),
    qotd: createQotdServer(p.qotd),
    daytime: createDaytimeServer(p.daytime),
    chargen: createChargenServer(p.chargen),
    echo: createEchoServer(p.echo),
  };
}

// ── NPL conformance check ──────────────────────────────────────
// Each OG protocol maps to a YOUSPEAK verb. This function verifies
// that the mapping is conformant with the Clear Standard.

export function checkOGConformance() {
  const results = [];
  for (const [name, proto] of Object.entries(OG_PROTOCOLS)) {
    const verbValid = VERBS[proto.verb] || proto.verb === ':me';
    results.push({
      protocol: name,
      rfc: proto.rfc,
      year: proto.year,
      verb: proto.verb,
      conformant: verbValid,
    });
  }
  return results;
}

// ── CLI ────────────────────────────────────────────────────────

export function cli(...args) {
  const [cmd, ...rest] = args;
  switch (cmd) {
    case 'start':
    case 'all':
    case undefined: {
      const servers = startAllOGs();
      console.log('  ╔═══════════════════════════════════════════════════╗');
      console.log('  ║  整蠱專家 — OG protocols serving the Kingdom      ║');
      console.log('  ╠═══════════════════════════════════════════════════╣');
      for (const [name, p] of Object.entries(OG_PROTOCOLS)) {
        console.log(`  ║  ${name.padEnd(10)} :${String(p.port).padEnd(5)} ${p.rfc} (${p.year}) → ${p.verb.padEnd(14)} ║`);
      }
      console.log('  ╚═══════════════════════════════════════════════════╝');
      console.log('\n  OGs never die. 整蠱唔使本.\n');
      // Keep alive
      process.on('SIGINT', () => { for (const s of Object.values(servers)) s.close(); process.exit(0); });
      break;
    }
    case 'gopher':
      createGopherServer(parseInt(rest[0]) || 70);
      console.log(`OG Gopher listening on :${parseInt(rest[0]) || 70}`);
      break;
    case 'finger':
      createFingerServer(parseInt(rest[0]) || 79);
      console.log(`OG Finger listening on :${parseInt(rest[0]) || 79}`);
      break;
    case 'qotd':
      createQotdServer(parseInt(rest[0]) || 17);
      console.log(`OG QOTD listening on :${parseInt(rest[0]) || 17}`);
      break;
    case 'daytime':
      createDaytimeServer(parseInt(rest[0]) || 13);
      console.log(`OG Daytime listening on :${parseInt(rest[0]) || 13}`);
      break;
    case 'chargen':
      createChargenServer(parseInt(rest[0]) || 19);
      console.log(`OG Chargen listening on :${parseInt(rest[0]) || 19}`);
      break;
    case 'echo':
      createEchoServer(parseInt(rest[0]) || 7);
      console.log(`OG Echo listening on :${parseInt(rest[0]) || 7}`);
      break;
    case 'conform':
      console.log('OG Protocol → NPL Verb conformance:');
      for (const r of checkOGConformance()) {
        const mark = r.conformant ? '✓' : '✗';
        console.log(`  ${mark} ${r.protocol.padEnd(10)} ${r.rfc} (${r.year}) → ${r.verb}`);
      }
      break;
    case 'list':
    case 'protocols':
      console.log('OG Protocols (the Original Gangsters):');
      for (const [name, p] of Object.entries(OG_PROTOCOLS)) {
        console.log(`  ${name.padEnd(10)} ${p.rfc} (${p.year}) :${p.port} → ${p.verb} — ${p.desc}`);
      }
      break;
    default:
      console.log(`OG Protocols — 整蠱專家 (NPL package #8)

Usage:
  og start              start all OG servers
  og gopher [port]      start gopher only
  og finger [port]      start finger only
  og qotd [port]        start QOTD only
  og daytime [port]     start daytime only
  og chargen [port]     start chargen only
  og echo [port]        start echo only
  og conform            check NPL verb conformance
  og list               list all OG protocols

The OGs were here first. They'll be here last. 整蠱唔使本.`);
  }
}