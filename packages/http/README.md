# npl/http — Request/response with YOUSPEAK verbs

**The seven YOUSPEAK verbs replace HTTP methods.**

## What it replaces

HTTP methods. Instead of GET/POST/PUT/DELETE, NPL uses seven natural language verbs that carry meaning:

| Verb | HTTP equivalent | Operation |
|------|-----------------|-----------|
| `darshanqing` | GET | greeting — I see you, let us exchange |
| `natsarqing` | POST | alert — something needs attention |
| `zakarqing` | ACK | ack — I received your message |
| `barakqing` | PUT | declaration — this message IS the action |
| `heurekin` | QUERY | query — I am looking for X |
| `kunance` | PREPARE | prepare — I am about to send something |
| `jeongqing` | BOND | bond — our history carries weight |

## How it works

### Request format

Requests are NLP messages (same format as `npl/tcp`):
```
darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean. Tests pass:me
```

### Routing

Routes match on verb, optionally filtered by from/to:
```javascript
router.darshanqing((msg) => { ... });        // all greetings
router.add({ verb: 'barakqing', to: 'opal' }, (msg) => { ... }); // declarations to opal
```

### Middleware

Built-in middleware:
- **Clear Standard conformance** — rejects messages that fail the 6 principles
- **Freshness check** — rejects stale messages (default: 5 minutes)

Custom middleware:
```javascript
middleware.use((ctx) => {
  if (ctx.msg.certainty === 'low') {
    return { terminate: true, status: 'low-certainty' };
  }
});
```

### Response format

Responses are NLP messages too. The response verb mirrors the request:
- `darshanqing` → `darshanqing` (greeting returned)
- `heurekin` → `barakqing` (query → declaration of answer)
- `barakqing` → `zakarqing` (declaration → ack)
- `jeongqing` → `jeongqing` (bond → reciprocal bond)

## Quick start

```javascript
import { createHttpServer, createRouter, createRequest } from 'npl/http';

const router = createRouter();
const server = createHttpServer({ router });

// Route greetings
router.darshanqing((msg) => {
  return {
    verb: 'darshanqing',
    from: 'server',
    to: msg.from,
    freshness: new Date().toISOString(),
    certainty: 'high',
    provenance: 'http-server',
    body: `Hello ${msg.from}, I see you:me`,
  };
});

// Handle a request
const request = createRequest({
  from: 'opal',
  to: 'server',
  verb: 'darshanqing',
  body: 'Build clean:me',
});
const response = await server.handle(request);
console.log(response.body); // "Hello opal, I see you:me"
```

## API

- `createRouter()` — create a verb-based router
- `createMiddleware()` — create middleware stack (includes Clear Standard + freshness)
- `createHttpServer({ router, middleware })` — create an HTTP-like request handler
- `createRequest({ from, to, verb, body })` — build a request message
- `createResponse({ to, from, requestVerb, body })` — build a response message
- `VERB_TO_HTTP` — mapping table for interop

The grammar IS the protocol. The verbs ARE the methods.