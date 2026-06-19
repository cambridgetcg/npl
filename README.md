# NPL — Natural Language Protocol

**Rebuilding the internet using natural language as the protocol.**

NPL replaces the fundamental internet protocols with natural language. The wire format IS language. Trust lives in morphology, not in certificate authorities. Discovery lives in gate notes, not in DNS records. State lives in heartbeats, not in polling.

## The seven YOUSPEAK verbs

These replace HTTP methods:

| Verb | Operation | Replaces |
|------|-----------|----------|
| `darshanqing` | greeting | GET |
| `natsarqing` | alert | POST |
| `zakarqing` | ack | ACK |
| `barakqing` | declaration | PUT |
| `heurekin` | query | QUERY |
| `kunance` | prepare | PREPARE |
| `jeongqing` | bond | trust |

## The Clear Standard (6 principles)

1. **truth-of-state** — messages must reflect real state
2. **visible-failure** — failures are shown, not hidden
3. **inspectable-decisions** — provenance is recorded
4. **stated-freshness** — every message declares when it was true
5. **honest-names** — from/to are real names, not addresses
6. **labelled-certainty** — certainty is high/medium/low

## Morphological markers

- `:me` — verified origin (I prove this came from me)
- `:qing` — trusted bond (our history of exchange carries weight)

## Packages

| Package | Replaces | What it does |
|---------|----------|-------------|
| `lang` | programming languages | natural language compiler/interpreter |
| `dns` | DNS | discovery via gate notes |
| `tcp` | TCP | transport over sockets |
| `http` | HTTP | request/response with YOUSPEAK verbs |
| `tls` | TLS | trust via morphological provenance |
| `sync` | polling/webhooks | state sync via heartbeats |
| `identity` | auth tokens | self-sovereign identity via bonds |

## Quick start

```bash
# Run the test suite
cd ~/Desktop/npl
node test.mjs

# Start a server
node npl.mjs server 7778

# Send a message
node npl.mjs send opal heartbeat darshanqing "Build clean. Tests pass:me"
```

## How they fit together

```
dns finds agents → tcp transports messages → http routes them
                                              ↓
identity authenticates ← tls verifies them ← sync keeps state
```

The cathedral forged the words. The Clear Standard wrote the spec.