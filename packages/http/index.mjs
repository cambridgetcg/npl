// http/index.mjs — Request/response layer
//
// The seven YOUSPEAK verbs replace HTTP methods:
//   darshanqing = GET/greeting
//   natsarqing  = POST/alert
//   zakarqing   = ACK
//   barakqing   = PUT/declaration
//   heurekin    = QUERY
//   kunance     = PREPARE
//   jeongqing   = bond
//
// Implement: request parsing, routing, response format, middleware.

import { parseMessage, formatMessage, checkConformance, VERBS, freshNow, Types } from '../lang/index.mjs';
import { deliverLocal, readInbox } from '../tcp/index.mjs';
import { resolve } from '../dns/index.mjs';

// ── Verb → HTTP method mapping (for interop) ───────────────────

export const VERB_TO_HTTP = {
  darshanqing: 'GET',
  natsarqing:  'POST',
  zakarqing:   'ACK',
  barakqing:   'PUT',
  heurekin:    'QUERY',
  kunance:     'PREPARE',
  jeongqing:   'BOND',
};

// ── Response format ────────────────────────────────────────────
// Responses are NLP messages too. The response verb mirrors the request.

export function createResponse({ to, from, requestVerb, status = 'ok', body, certainty = 'high', bond = '' }) {
  // Map request verb to response pattern
  let responseVerb = 'zakarqing'; // default: ack
  if (requestVerb === 'darshanqing') responseVerb = 'darshanqing';
  else if (requestVerb === 'heurekin') responseVerb = 'barakqing'; // query → declaration (the answer)
  else if (requestVerb === 'barakqing') responseVerb = 'zakarqing'; // declaration → ack
  else if (requestVerb === 'natsarqing') responseVerb = 'zakarqing'; // alert → ack
  else if (requestVerb === 'kunance') responseVerb = 'zakarqing'; // prepare → ack (ready)
  else if (requestVerb === 'jeongqing') responseVerb = 'jeongqing'; // bond → bond (reciprocal)

  return {
    verb: responseVerb,
    from,
    to,
    freshness: freshNow(),
    certainty,
    provenance: `response-to:${requestVerb}`,
    bond,
    body: body || (status === 'ok' ? 'received:me' : `error: ${status}:me`),
  };
}

// ── Router ─────────────────────────────────────────────────────

export function createRouter() {
  const routes = new Map();

  function addRoute(pattern, handler) {
    // pattern: { verb, from?, to?, path? }
    const key = routeKey(pattern);
    routes.set(key, { pattern, handler });
  }

  function routeKey(pattern) {
    return [pattern.verb || '*', pattern.from || '*', pattern.to || '*'].join('|');
  }

  function match(msg) {
    // Try exact match, then wildcard
    const keys = [
      routeKey({ verb: msg.verb, from: msg.from, to: msg.to }),
      routeKey({ verb: msg.verb, from: msg.from }),
      routeKey({ verb: msg.verb, to: msg.to }),
      routeKey({ verb: msg.verb }),
      routeKey({}),
    ];
    for (const k of keys) {
      if (routes.has(k)) return routes.get(k);
    }
    return null;
  }

  return {
    add: addRoute,
    darshanqing: (handler) => addRoute({ verb: 'darshanqing' }, handler),
    natsarqing:  (handler) => addRoute({ verb: 'natsarqing' }, handler),
    zakarqing:   (handler) => addRoute({ verb: 'zakarqing' }, handler),
    barakqing:   (handler) => addRoute({ verb: 'barakqing' }, handler),
    heurekin:    (handler) => addRoute({ verb: 'heurekin' }, handler),
    kunance:     (handler) => addRoute({ verb: 'kunance' }, handler),
    jeongqing:   (handler) => addRoute({ verb: 'jeongqing' }, handler),
    match,
    routes,
  };
}

// ── Middleware ─────────────────────────────────────────────────

export function createMiddleware() {
  const stack = [];

  function use(fn) {
    stack.push(fn);
  }

  // Built-in: Clear Standard conformance check
  function clearStandardCheck(msg) {
    const conf = checkConformance(msg);
    if (conf.fail > 0) {
      return { pass: false, errors: conf.results.filter(r => r.startsWith('FAIL')) };
    }
    return { pass: true, warnings: conf.results.filter(r => r.startsWith('WARN')) };
  }

  // Built-in: freshness check
  function freshnessCheck(msg, maxAgeMs = 300000) {
    if (!msg.freshness) return { pass: false, error: 'no freshness' };
    const age = Date.now() - new Date(msg.freshness).getTime();
    if (age > maxAgeMs) return { pass: false, error: `stale: ${Math.floor(age / 1000)}s old` };
    return { pass: true, age };
  }

  async function run(msg) {
    const context = { msg, results: [] };
    for (const fn of stack) {
      const result = await fn(context);
      if (result && result.terminate) {
        context.terminated = true;
        context.termination = result;
        break;
      }
    }
    return context;
  }

  return { use, run, clearStandardCheck, freshnessCheck, stack };
}

// ── Server (request handler) ───────────────────────────────────

export function createHttpServer({ router, middleware, identity, onRespond } = {}) {
  const defaultRouter = router || createRouter();
  const mw = middleware || createMiddleware();

  // Default: enforce Clear Standard
  mw.use((ctx) => {
    const check = mw.clearStandardCheck(ctx.msg);
    if (!check.pass) {
      return { terminate: true, status: 'conformance-fail', errors: check.errors };
    }
    ctx.results.push({ middleware: 'clear-standard', pass: true });
  });

  // Default: freshness check
  mw.use((ctx) => {
    const check = mw.freshnessCheck(ctx.msg);
    if (!check.pass) {
      return { terminate: true, status: 'stale', error: check.error };
    }
    ctx.results.push({ middleware: 'freshness', pass: true, age: check.age });
  });

  async function handleRequest(msgOrText) {
    const msg = typeof msgOrText === 'string' ? parseMessage(msgOrText) : msgOrText;

    // Run middleware
    const ctx = await mw.run(msg);
    if (ctx.terminated) {
      return createResponse({
        to: msg.from,
        from: msg.to || 'server',
        requestVerb: msg.verb,
        status: ctx.termination.status,
        body: ctx.termination.errors ? ctx.termination.errors.join('; ') : ctx.termination.error,
        certainty: 'high',
      });
    }

    // Route
    const route = defaultRouter.match(msg);
    if (!route) {
      return createResponse({
        to: msg.from,
        from: msg.to || 'server',
        requestVerb: msg.verb,
        status: 'no-route',
        body: `No handler for ${msg.verb}`,
      });
    }

    // Execute handler
    const response = await route.handler(msg, { resolve, readInbox, identity });
    const finalResponse = typeof response === 'string'
      ? parseMessage(response)
      : response || createResponse({ to: msg.from, from: msg.to || 'server', requestVerb: msg.verb });

    if (onRespond) onRespond(finalResponse, msg);

    return finalResponse;
  }

  return {
    router: defaultRouter,
    middleware: mw,
    handle: handleRequest,
  };
}

// ── Request builder ────────────────────────────────────────────

export function createRequest({ from, to, verb, body, certainty = 'high', provenance = 'manual', bond = '' }) {
  return {
    verb,
    from,
    to,
    freshness: freshNow(),
    certainty,
    provenance,
    bond,
    body,
  };
}

// ── CLI ────────────────────────────────────────────────────────

export async function cli(...cliArgs) {
  const [cmd, ...args] = cliArgs.length > 0 ? cliArgs : process.argv.slice(2);
  switch (cmd) {
    case 'request': {
      const [from, to, verb, ...bodyParts] = args;
      const body = bodyParts.join(' ');
      const req = createRequest({ from, to, verb, body });
      console.log(formatMessage(req));

      // Try to deliver locally
      const result = deliverLocal({ from, to, verb, body });
      console.log(`\nDelivered to ${result.filepath}`);
      break;
    }
    case 'verbs': {
      console.log('YOUSPEAK verbs → HTTP methods:');
      for (const [v, m] of Object.entries(VERB_TO_HTTP)) {
        console.log(`  ${v.padEnd(14)} ${m.padEnd(8)} ${VERBS[v].desc}`);
      }
      break;
    }
    default:
      console.log(`NPL http — Request/response with YOUSPEAK verbs

Usage:
  request <from> <to> <verb> <body>   Create and deliver a request
  verbs                                List YOUSPEAK verbs

Verbs:
${Object.entries(VERB_TO_HTTP).map(([v, m]) => `  ${v.padEnd(14)} ${m.padEnd(8)} ${VERBS[v].desc}`).join('\n')}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('http/index.mjs')) {
  cli();
}