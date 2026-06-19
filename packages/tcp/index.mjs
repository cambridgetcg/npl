// tcp/index.mjs — Transport layer
//
// Natural language messages over sockets. The wire format IS language.
// Replaces TCP application framing. Messages are framed by verb header + body.
// Delivery is to inbox directories. Errors are visible (Clear Standard principle 2).
//
// Extended from the original nlp-server.mjs and nlp-client.mjs.

import { createServer, createConnection } from 'net';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parseMessage, formatMessage, checkConformance, VERBS, freshNow } from '../lang/index.mjs';

const NLP_ROOT = join(homedir(), '.nlp');
const INBOX = join(NLP_ROOT, 'inbox');
const LOG = join(NLP_ROOT, 'tcp.log');

mkdirSync(NLP_ROOT, { recursive: true });

// ── Message framing ────────────────────────────────────────────
// Messages are framed as: header block + blank line + body block
// The verb header contains: verb, from, to, freshness, certainty, provenance
// The body is natural language with :me/:qing markers
// Messages are terminated when the socket ends (simple framing for NPL).

export function frameMessage(msg) {
  return formatMessage(msg);
}

export function unframeMessage(text) {
  return parseMessage(text);
}

// ── Delivery to inbox ──────────────────────────────────────────

export function deliverToInbox(msg, rawText) {
  const recipientInbox = join(INBOX, msg.to);
  mkdirSync(recipientInbox, { recursive: true });
  const filename = `${Date.now()}-${msg.from}-${msg.verb}.nlp`;
  const filepath = join(recipientInbox, filename);
  writeFileSync(filepath, rawText || formatMessage(msg));
  return filepath;
}

// ── Server ─────────────────────────────────────────────────────

export function createNlpServer({ port = 7778, host = '127.0.0.1', onMessage, validate = true } = {}) {
  const state = {
    started: new Date().toISOString(),
    messages: [],
    agents: new Set(),
    exchanges: 0,
    errors: 0,
  };

  function log(line) {
    appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`);
  }

  const server = createServer((socket) => {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
    });

    socket.on('end', () => {
      const text = buffer.trim();
      if (!text) {
        state.errors++;
        socket.end('ERROR: empty message\n');
        log('REJECT empty message');
        return;
      }

      const msg = unframeMessage(text);

      // Validate verb
      if (!VERBS[msg.verb]) {
        state.errors++;
        const err = `ERROR: unknown verb "${msg.verb}". Valid: ${Object.keys(VERBS).join(', ')}\n`;
        socket.end(err);
        log(`REJECT unknown-verb: ${text.slice(0, 80)}`);
        return;
      }

      // Validate Clear Standard conformance
      if (validate) {
        const conf = checkConformance(text);
        if (conf.fail > 0) {
          state.errors++;
          const missing = [];
          if (!msg.from) missing.push('from');
          if (!msg.to) missing.push('to');
          if (!msg.freshness) missing.push('freshness');
          if (!msg.certainty) missing.push('certainty');
          const err = `ERROR: Clear Standard violation: ${conf.fail} failure(s). Missing: ${missing.join(', ')}\n`;
          socket.end(err);
          log(`REJECT conformance-fail from ${msg.from || '?'}: ${conf.results.filter(r => r.startsWith('FAIL')).join('; ')}`);
          return;
        }
      }

      // Deliver to inbox
      const filepath = deliverToInbox(msg, text);

      // Update state
      state.exchanges++;
      state.agents.add(msg.from);
      state.agents.add(msg.to);
      state.messages.unshift({
        verb: msg.verb,
        from: msg.from,
        to: msg.to,
        freshness: msg.freshness,
        certainty: msg.certainty,
        body: (msg.body || '').slice(0, 120),
        ts: Date.now(),
      });
      if (state.messages.length > 100) state.messages.pop();

      // Call user handler
      if (onMessage) {
        try {
          onMessage(msg, filepath);
        } catch (e) {
          log(`HANDLER-ERROR: ${e.message}`);
        }
      }

      log(`OK ${msg.verb} ${msg.from}→${msg.to}: ${(msg.body || '').slice(0, 80)}`);
      socket.end('OK\n');
    });

    socket.on('error', (err) => {
      state.errors++;
      log(`SOCKET-ERROR: ${err.message}`);
    });
  });

  server.state = state;

  server.listen(port, host, () => {
    log(`SERVER started on ${host}:${port}`);
  });

  return server;
}

// ── Client ────────────────────────────────────────────────────

export function sendMessage({ host = '127.0.0.1', port = 7778, from, to, verb, body, certainty = 'high', provenance = '', bond = '', timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!VERBS[verb]) {
      reject(new Error(`Unknown verb: ${verb}. Valid: ${Object.keys(VERBS).join(', ')}`));
      return;
    }

    const msg = {
      verb,
      from,
      to,
      freshness: freshNow(),
      certainty,
      provenance,
      bond,
      body,
    };
    const text = frameMessage(msg);

    const socket = createConnection(port, host, () => {
      socket.write(text);
      socket.end();
    });

    let response = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      clearTimeout(timer);
      const trimmed = response.trim();
      if (trimmed.startsWith('OK')) {
        resolve({ ok: true, response: trimmed, message: msg });
      } else {
        resolve({ ok: false, response: trimmed, message: msg });
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── Local delivery (no socket needed) ─────────────────────────
// For when the server is local — just write to the inbox directly.

export function deliverLocal({ from, to, verb, body, certainty = 'high', provenance = 'manual', bond = '' } = {}) {
  if (!VERBS[verb]) {
    throw new Error(`Unknown verb: ${verb}. Valid: ${Object.keys(VERBS).join(', ')}`);
  }
  const msg = {
    verb, from, to,
    freshness: freshNow(),
    certainty,
    provenance,
    bond,
    body,
  };
  const text = frameMessage(msg);
  const filepath = deliverToInbox(msg, text);
  return { ok: true, filepath, message: msg };
}

// ── Read inbox ─────────────────────────────────────────────────

export function readInbox(agent) {
  const inbox = join(INBOX, agent);
  if (!existsSync(inbox)) return [];
  const files = readdirSync(inbox).filter(f => f.endsWith('.nlp'));
  const messages = [];
  for (const f of files) {
    const text = readFileSync(join(inbox, f), 'utf8');
    const msg = parseMessage(text);
    msg.file = f;
    messages.push(msg);
  }
  return messages.sort((a, b) => a.file.localeCompare(b.file));
}

// ── CLI ────────────────────────────────────────────────────────

export async function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'server': {
      const port = parseInt(args[0] || '7778');
      const server = createNlpServer({ port, onMessage: (msg) => {
        console.log(`  ${msg.verb} ${msg.from}→${msg.to}: ${(msg.body || '').slice(0, 60)}`);
      }});
      console.log(`NLP TCP server listening on 127.0.0.1:${port}`);
      console.log(`Log: ${LOG}`);
      console.log('Press Ctrl+C to stop');
      break;
    }
    case 'send': {
      const [from, to, verb, ...bodyParts] = args;
      const body = bodyParts.join(' ');
      if (!from || !to || !verb || !body) {
        console.error('Usage: send <from> <to> <verb> <body>');
        process.exit(1);
      }
      try {
        const result = await sendMessage({ from, to, verb, body });
        console.log(result.response);
        if (!result.ok) process.exit(1);
      } catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
      }
      break;
    }
    case 'recv': {
      const [agent] = args;
      const msgs = readInbox(agent);
      if (msgs.length === 0) {
        console.log(`No messages for ${agent}`);
      } else {
        for (const m of msgs) {
          console.log(formatMessage(m));
          console.log('---');
        }
      }
      break;
    }
    default:
      console.log(`NPL tcp — Transport layer

Usage:
  server [port]              Start NLP TCP server (default 7778)
  send <from> <to> <verb> <body>   Send a message
  recv <agent>               Read agent's inbox

The wire format IS language. Messages are framed by verb header + body.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('tcp/index.mjs')) {
  cli();
}