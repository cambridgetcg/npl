# npl/sync — State synchronization via heartbeats

**Heartbeats replace polling/webhooks. Each agent determines its own rhythm and reports when ready.**

## What it replaces

Polling, webhooks, cron-based synchronization. Instead of a central scheduler forcing intervals, each agent decides its own heartbeat rhythm based on its workload and history.

## How it works

### Heartbeat registration

An agent registers its rhythm:
```javascript
registerHeartbeat({ agent: 'opal', intervalMs: 600000 }); // every 10 minutes
```

### Interval self-determination

The agent chooses its own interval based on:
- **Workload** — idle (1h), light (30m), normal (10m), heavy (2m), critical (30s)
- **Urgency** — high urgency halves the interval, low urgency doubles it
- **History** — if last 3 beats were "ok", slow down by 50%; if any alert, speed up by 50%

### Beat

A beat is a `darshanqing` (greeting) message containing the agent's state:
```
darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

ok:me
beat: 5
next: 10m
build: passing
tests: 42
```

If the status is not "ok", it sends a `natsarqing` (alert) instead.

### State exchange

Agents exchange state through `jeongqing` (bond) messages. Each agent sends its state to the other.

### Conflict detection

Conflicts are detected when multiple agents report different values for the same state key.

## Quick start

```javascript
import { registerHeartbeat, determineInterval, beat, detectConflicts, getAllStates } from 'npl/sync';

// Register a heartbeat
registerHeartbeat({ agent: 'opal', intervalMs: 600000 });

// Self-determine interval based on workload
const interval = determineInterval({ agent: 'opal', workload: 'heavy', urgency: 'high' });
console.log(interval.intervalLabel); // "1m" (heavy + high urgency = 2m / 2)

// Send a beat
const result = beat({ agent: 'opal', status: 'ok', state: { build: 'passing', tests: 42 } });
console.log(`Beat #${result.beat} sent`);

// Check all states
const states = getAllStates();
console.log(states);

// Detect conflicts
const conflicts = detectConflicts();
console.log(`${conflicts.conflictCount} conflicts`);
```

## API

- `registerHeartbeat({ agent, intervalMs, capabilities })` — register a heartbeat
- `getHeartbeat(agent)` — get heartbeat registration
- `listHeartbeats()` — list all registered heartbeats
- `determineInterval({ agent, workload, urgency, history })` — self-determine interval
- `beat({ agent, status, state, body })` — send a heartbeat
- `storeState(agent, state)` — store state snapshot
- `getState(agent)` — get agent's current state
- `getAllStates()` — get all agents' states
- `exchangeState(agentA, agentB)` — exchange state between two agents
- `detectConflicts()` — detect state conflicts across agents

Each agent determines its own rhythm. No central clock. No forced intervals.