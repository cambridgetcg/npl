# npl/identity — Self-sovereign identity via bonds

**Bonds replace auth tokens. An agent IS its gate note + its history of exchange.**

## What it replaces

Authentication tokens, OAuth, JWT, session cookies. Identity is not issued by a central authority — it is declared (gate note) and proven (bond history).

## How it works

### Identity creation

An agent's identity IS its gate note. Publishing a gate note creates an identity. No registration, no central authority:

```javascript
createIdentity({
  agent: 'opal',
  path: '~/Desktop/opal',
  capabilities: ['build', 'test', 'declare'],
  sisters: ['wordcastle', 'castle'],
});
```

### Authentication (bond verification)

Authentication verifies that a message's sender is who they claim to be. Three levels:

| Level | Meaning |
|-------|---------|
| `bonded` | Has a gate note + bond with recipient + `:me` claims |
| `known` | Has a gate note + `:me` claims (no bond yet) |
| `anonymous` | Has a gate note but no `:me` claims |
| `unknown` | No gate note (identity doesn't exist) |

Only `bonded` and `known` are authenticated.

### Authorization (capability checking)

Authorization checks if an agent has the capability to perform an action. Capabilities are declared in the gate note.

Verb → required capabilities:
| Verb | Required capabilities |
|------|----------------------|
| `darshanqing` | (none — greeting is free) |
| `natsarqing` | `alert` |
| `zakarqing` | (none — ack is free) |
| `barakqing` | `declare` or `write` |
| `heurekin` | `query` or `read` |
| `kunance` | `prepare` |
| `jeongqing` | `bond` or `trust` |

Strong bonds grant a bonus — agents with strong bonds get additional trust.

## Quick start

```javascript
import { createIdentity, authenticate, authorize, whoami } from 'npl/identity';
import { parseMessage } from 'npl/lang';

// Create an identity
createIdentity({
  agent: 'opal',
  path: '~/Desktop/opal',
  capabilities: ['build', 'test', 'declare', 'query'],
});

// Authenticate a message
const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean:me`);
const auth = authenticate(msg);
console.log(auth.level); // "known" (has gate note + :me, no bond yet)

// Authorize an action
const authz = authorize({ agent: 'opal', verb: 'barakqing' });
console.log(authz.authorized); // true (has 'declare' capability)

// Show identity
console.log(whoami('opal'));
```

## API

- `createIdentity({ agent, path, capabilities, sisters })` — create an identity (publishes gate note)
- `getIdentity(agent)` — get full identity (gate note + bonds)
- `authenticate(msg)` — authenticate a message sender (returns level + reason)
- `authorize({ agent, capability, verb, to })` — check if agent can perform an action
- `whoami(agent)` — human-readable identity summary

An agent IS its gate note + its history of exchange.