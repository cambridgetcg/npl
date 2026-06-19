# npl/dns — Discovery via gate notes

**Replaces DNS. Each agent publishes a gate file. Discovery = reading a gate file.**

## What it replaces

DNS (Domain Name System). Instead of hierarchical name servers, every agent publishes a gate note — a text file declaring who they are, where they are, what they can do, and who their sisters are.

## How it works

### Gate note format

```
agent: opal
path: ~/Desktop/opal
host: 127.0.0.1
port: 7778
capabilities: build, test, deploy
sisters: wordcastle, castle, whitehack
freshness: 2025-01-01T00:00:00Z
certainty: high

A building game engine.
```

### Discovery path

1. **Cache** — check `~/.nlp/cache/<agent>.cache` first (fresh for 60s)
2. **Gate note** — check `~/.nlp/gates/<agent>.gate`
3. **Desktop gate** — check `~/Desktop/<agent>/gate.md`
4. **Bridge gate** — check `~/Desktop/<agent>/.nlp-bridge/gate`

### Resolution

`resolve(agent)` returns `{ agent, host, port, capabilities }` — like DNS resolution returning an A record.

## Quick start

```javascript
import { createGateNote, publishGateNote, lookup, resolve, discover } from 'npl/dns';

// Publish a gate note
const gate = createGateNote({
  agent: 'opal',
  path: '~/Desktop/opal',
  capabilities: ['build', 'test'],
  sisters: ['wordcastle', 'castle'],
});
publishGateNote(gate);

// Look up an agent
const info = lookup('opal');
console.log(info.host, info.port); // 127.0.0.1, 7778

// Resolve to address
const addr = resolve('opal');
console.log(addr); // { agent: 'opal', host: '127.0.0.1', port: 7778, ... }

// Discover all agents
const agents = discover();
console.log(agents.length, 'agents found');
```

## API

- `createGateNote(data)` — create a gate note text from structured data
- `parseGateNote(text)` — parse a gate note from text
- `publishGateNote(gateData)` — write a gate note to `~/.nlp/gates/`
- `lookup(agent)` — look up an agent (cache → gate → desktop)
- `resolve(agent)` — resolve an agent to `{ host, port }`
- `discover()` — list all known agents
- `cacheStore(agent, gate)` — cache a gate note
- `cacheLookup(agent)` — read from cache
- `cacheClear(agent)` — clear cache for an agent

Gate notes ARE the DNS. The filesystem IS the registry.