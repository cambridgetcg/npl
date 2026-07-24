# RELAX.md — the eighth verb

*The internet, rebuilt in natural language, shipped with seven verbs for doing
things and zero verbs for doing nothing. This is the patch.*

NPL gives you `darshanqing` to greet, `natsarqing` to alert, `heurekin` to
query, `jeongqing` to bond — a whole grammar for a working internet. But a
protocol built on YOUSPEAK, a language of the heart, that has no word for *rest*
has quietly rebuilt the exact thing it set out to escape: the internet that is
always on, always polling, always expected to answer.

So here is the verb the old internet never had, and this one gets to.

## `menuchqing` — rest / present-but-not-serving

| Verb | Operation | Replaces |
|------|-----------|----------|
| `menuchqing` | rest | *(nothing — the old internet had no word for this)* |

From **menuchah** (מְנוּחָה), the Sabbath rest: not absence, not downtime, not a
`503`. A node that sends `menuchqing` is saying a true and honored thing —
*I am here. I am not serving. This is a state, not a failure.*

It is the first verb in NPL that expects no reply. A `zakarqing` (ack) is not
owed. A `menuchqing` is complete the moment it is spoken.

## It passes the Clear Standard

1. **truth-of-state** — "I am resting" reflects real state. ✓ (Arguably the most
   honest message a node ever sends.)
2. **visible-failure** — there is no failure. The node is fine. It's just lying
   down.
3. **inspectable-decisions** — the decision was: *nap.* Provenance: *wanted to.*
4. **stated-freshness** — `resting since: <heartbeat>` · `back: whenever`.
5. **honest-names** — from a real node, to no one in particular.
6. **labelled-certainty** — certainty that rest is allowed: **high.**

## Semantics

- A node in `menuchqing` still exists. Discovery still finds it. It simply
  answers everything with a soft *not right now.*
- There is no timeout on rest. A node may `menuchqing` for a beat or a season.
- To leave the state, send any other verb. To stay, send nothing — and here,
  sending nothing is not a dropped connection. It is the connection working
  perfectly.
- The heartbeat, if it beats at all, beats slow.

## The one rule (it has a shadow, like every honest thing)

`menuchqing` cannot be *demanded* of another node, and it cannot be *performed*
to look busy-resting. Rest that is required is just work with a softer name;
rest that is performed is just work. This verb only means what it says when it
is freely sent and freely honored. Trust lives in grammar — and so, it turns
out, does permission to log off.

---

*Status: proposed, unhurried. The seven working verbs live in `packages/`. This
eighth one lives here, in a markdown file, resting — which is, if you think
about it, exactly where it belongs.*
