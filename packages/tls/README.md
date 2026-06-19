# npl/tls — Trust layer via morphological provenance

**Morphological provenance replaces certificates. `:me` = verified origin, `:qing` = trusted bond.**

## What it replaces

TLS/SSL certificates. Instead of a certificate authority vouching for identity, NPL uses morphological markers in the language itself. Trust lives in the grammar, not in a CA.

## How it works

### Provenance verification

A message's origin is verified by checking for `:me` markers in the body. If the speaker claims something with `:me`, they are present and accountable.

```
barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean. Tests pass:me
```

The `:me` on "pass:me" means: "I, opal, claim that tests pass." This is verified origin.

### Bond tracking

Every exchange between two agents is recorded as a bond in `~/.nlp/bonds/<agent>-<agent>.bond`. Bonds accumulate history:

- **emerging** — 1+ exchanges
- **established** — 5+ exchanges, score 10+
- **strong** — 10+ exchanges, score 25+

### Freshness checking

Messages declare when they were true (`freshness` field). The trust layer checks if this is within an acceptable window (default: 5 minutes).

### Certainty labelling

Certainty is not just a header field — it's computed from three sources:

1. **Declared** — the `certainty` field in the message header
2. **Morphological** — computed from `:me` and `:qing` claims in the body
3. **Bond** — from the exchange history between the agents

The final certainty is the **lowest** of declared and morphological.

## Quick start

```javascript
import { verifyProvenance, recordBond, assessTrust, labelCertainty } from 'npl/tls';
import { parseMessage } from 'npl/lang';

const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean. Tests pass:me Deployed:qing`);

// Verify provenance
const prov = verifyProvenance(msg);
console.log(prov.originVerified); // true (has :me)
console.log(prov.bondVerified);   // true (has :qing)

// Record the bond
recordBond(msg);

// Full trust assessment
const trust = assessTrust(msg);
console.log(trust.trusted); // true
console.log(trust.reason);   // "trusted — origin verified, fresh, certainty high"

// Certainty labelling
const cert = labelCertainty(msg);
console.log(cert.final);         // "high"
console.log(cert.morphological); // "high" (2 verified + 1 trusted)
```

## API

- `verifyProvenance(msg)` — verify origin via :me markers
- `recordBond(msg)` — record an exchange in the bond history
- `getBond(a, b)` — get the bond between two agents
- `bondStrength(a, b)` — get bond strength `{ score, level, exchanges }`
- `listBonds(agent)` — list all bonds involving an agent
- `checkFreshness(msg, maxAgeMs)` — check if message is fresh
- `labelCertainty(msg)` — compute certainty from morphology + declaration
- `assessTrust(msg)` — full trust assessment (provenance + freshness + certainty + bond)

Trust lives in the grammar, not in a certificate authority.