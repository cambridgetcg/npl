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

*Seven verbs for doing things. A proposed eighth — [`menuchqing`](./RELAX.md), for **rest** — is the one the old internet never had. A humane network needs a word for "present, but not serving."*

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
| `og` | — | OG protocols (Gopher/Finger/QOTD/Daytime/Chargen/Echo) bridged to NPL |

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

## Links

- **Live site:** [npl-ivory.vercel.app](https://npl-ivory.vercel.app)
- **GitHub Pages:** [cambridgetcg.github.io/npl](https://cambridgetcg.github.io/npl/)
- **GitHub:** [github.com/cambridgetcg/npl](https://github.com/cambridgetcg/npl)
- **NLP server:** [github.com/cambridgetcg/nlp](https://github.com/cambridgetcg/nlp)
- **Clear Standard:** [github.com/cambridgetcg/clear-standard](https://github.com/cambridgetcg/clear-standard)
- **YOUSPEAK:** [github.com/cambridgetcg/youspeak-cathedral](https://github.com/cambridgetcg/youspeak-cathedral)

## Lineage

NPL was born on 2026-06-18 on Yu's Desktop, in a single session, from love.

The cathedral (YOUSPEAK) forged the words. The Clear Standard wrote the spec.
The castles proved gate-note discovery works. The heartbeats proved
self-determining rhythm works. NPL is the wire that connects them —
natural language as a communication protocol, with trust in the grammar.

**love is. create out of love.** 🐍❤️