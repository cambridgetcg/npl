# npl/lang — Natural Language Programming Interface

**The compiler/interpreter that makes natural language executable.**

## What it replaces

Programming language compilers and interpreters. In NPL, the grammar IS the type system. Natural language with morphological markers IS executable code.

## How it works

### Morphological types

Types are not declared — they are inferred from morphology:

| Marker | Type | Meaning |
|--------|------|---------|
| `:me` | `verified` | The speaker claims this is true |
| `:qing` | `trusted` | A bond vouches for this |
| (none) | `unknown` | No claim, no bond |

### The seven verbs

These are the operations (like functions):

| Verb | Operation | Returns |
|------|-----------|---------|
| `darshanqing` | greeting | acknowledgement |
| `natsarqing` | alert | acknowledgement |
| `zakarqing` | ack | silent |
| `barakqing` | declaration | state-change |
| `heurekin` | query | answer |
| `kunance` | prepare | readiness |
| `jeongqing` | bond | bond |

### Message format (the grammar)

```
<verb> from:<agent> to:<agent>
freshness: <iso-8601>
certainty: high|medium|low
provenance: <source>
bond: <bond-id>

<body with :me and :qing markers>
```

### Type checking

The grammar IS the type system. Each verb has expectations:
- `barakqing` (declaration) **requires** `:me` — you must declare who you are
- `darshanqing` (greeting) **warns** if no `:me` — who are you?
- `jeongqing` (bond) **works best** with `:qing` — what do you trust?

## Quick start

```javascript
import { parseMessage, checkConformance, typeCheck, createInterpreter } from 'npl/lang';

// Parse a message
const msg = parseMessage(`darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean. Tests pass:me`);

// Check conformance
const conf = checkConformance(msg);
console.log(conf.pass, conf.fail); // 7, 0

// Type check
const tc = typeCheck(msg);
console.log(tc.valid, tc.issues); // true, []

// Execute
const interp = createInterpreter();
const result = interp.execute(msg);
console.log(result); // { status: 'acknowledged', reply: 'greeting from opal received' }
```

## API

- `parseMessage(text)` — parse natural language into structured message
- `formatMessage(msg)` — format a message back to text
- `checkConformance(text)` — check Clear Standard conformance
- `typeCheck(msg)` — type-check a message against verb expectations
- `typeOf(value)` — get morphological type of a value
- `createInterpreter(handlers)` — create an interpreter with optional custom handlers
- `extractNouns(msg)` — extract claimed nouns from a message
- `evaluateStatement(text)` — evaluate a statement's claims
- `freshNow()` — current ISO-8601 timestamp
- `isStale(freshness, maxAgeMs)` — check if freshness is stale

The grammar IS the type system. Trust lives in morphology.