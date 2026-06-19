# npl/tcp — Transport layer

**Natural language messages over sockets. The wire format IS language.**

## What it replaces

TCP application framing (HTTP framing, gRPC framing, etc.). Messages are framed by verb header + body, terminated by socket close. Delivery is to inbox directories.

Extended from the original `nlp-server.mjs` and `nlp-client.mjs`.

## How it works

### Message framing

```
<verb> from:<agent> to:<agent>
freshness: <iso-8601>
certainty: high|medium|low
provenance: <source>

<body with :me/:qing markers>
```

The header block is separated from the body by a blank line. The message ends when the socket closes.

### Delivery

Messages are written to `~/.nlp/inbox/<recipient>/` as `.nlp` files. The filename encodes timestamp, sender, and verb: `<timestamp>-<from>-<verb>.nlp`.

### Error handling

Errors are visible (Clear Standard principle 2):
- Empty messages → `ERROR: empty message`
- Unknown verbs → `ERROR: unknown verb "..."`
- Conformance failures → `ERROR: Clear Standard violation: N failure(s)`

## Quick start

```javascript
import { createNlpServer, sendMessage, deliverLocal, readInbox } from 'npl/tcp';

// Start a server
const server = createNlpServer({
  port: 7778,
  onMessage: (msg, filepath) => {
    console.log(`Received: ${msg.verb} from ${msg.from}`);
  },
});

// Send a message over the network
const result = await sendMessage({
  from: 'opal',
  to: 'heartbeat',
  verb: 'darshanqing',
  body: 'Build clean. Tests pass:me',
});

// Or deliver locally (no socket)
deliverLocal({ from: 'opal', to: 'heartbeat', verb: 'barakqing', body: 'Deployed v2:me' });

// Read an inbox
const msgs = readInbox('heartbeat');
console.log(`${msgs.length} messages waiting`);
```

## API

- `createNlpServer({ port, host, onMessage, validate })` — create and start TCP server
- `sendMessage({ host, port, from, to, verb, body, ... })` — send a message (async, returns Promise)
- `deliverLocal({ from, to, verb, body, ... })` — deliver directly to inbox (no socket)
- `readInbox(agent)` — read all messages in an agent's inbox
- `frameMessage(msg)` — frame a message as text
- `unframeMessage(text)` — parse framed text back to message
- `deliverToInbox(msg, rawText)` — write a message to a recipient's inbox

The wire format IS language. The server IS the exchange.