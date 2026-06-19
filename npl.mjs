#!/usr/bin/env node
// npl.mjs — Unified NPL CLI
//
// The cathedral forged the words. The Clear Standard wrote the spec.
// This is the entry point for the Natural Language Protocol.

import { cli as langCli } from './packages/lang/index.mjs';
import { cli as dnsCli } from './packages/dns/index.mjs';
import { cli as tcpCli } from './packages/tcp/index.mjs';
import { cli as httpCli } from './packages/http/index.mjs';
import { cli as tlsCli } from './packages/tls/index.mjs';
import { cli as syncCli } from './packages/sync/index.mjs';
import { cli as identityCli } from './packages/identity/index.mjs';
import { VERBS, PRINCIPLES } from './packages/lang/index.mjs';

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'server':
    await tcpCli('server', ...args);
    break;
  case 'send':
    await tcpCli('send', ...args);
    break;
  case 'recv':
    tcpCli('recv', ...args);
    break;
  case 'dns':
    dnsCli(...args);
    break;
  case 'http':
    await httpCli(...args);
    break;
  case 'tls':
    tlsCli(...args);
    break;
  case 'sync':
    syncCli(...args);
    break;
  case 'identity':
    identityCli(...args);
    break;
  case 'lang':
    langCli(...args);
    break;
  case 'verbs':
    langCli('verbs');
    break;
  case 'conform':
    langCli('conform', ...args);
    break;
  case 'version':
    console.log('NPL 1.0.0 — Natural Language Protocol');
    console.log('Rebuilding the internet using natural language as the protocol');
    break;
  case 'help':
  case undefined:
    console.log(`NPL — Natural Language Protocol

Usage:
  npl <command> [args]

Commands:
  server [port]                    Start NLP TCP server
  send <from> <to> <verb> <body>    Send a message
  recv <agent>                      Read an agent's inbox

  dns <subcmd>                      Discovery via gate notes
    dns lookup <agent>                Look up an agent
    dns resolve <agent>              Resolve to host:port
    dns discover                      List all known agents
    dns publish <agent> <path> ...   Publish a gate note

  http <subcmd>                     Request/response with YOUSPEAK verbs
    http request <from> <to> <verb> <body>  Create and deliver a request
    http verbs                          List verbs

  tls <subcmd>                      Trust layer
    tls verify <text>                 Verify provenance
    tls bonds <agent>                 List bonds
    tls assess <text>                 Full trust assessment

  sync <subcmd>                     State synchronization
    sync register <agent> <interval> Register a heartbeat
    sync beat <agent> [status] [body] Send a heartbeat
    sync states                        Show all states
    sync conflicts                     Detect conflicts
    sync list                          List heartbeats

  identity <subcmd>                 Self-sovereign identity
    identity create <agent> <path> <caps> <sisters>  Create identity
    identity whoami <agent>           Show identity
    identity auth <text>              Authenticate a message
    identity can <agent> <verb> [to]  Check authorization

  lang <subcmd>                     Natural language interface
    lang parse <text>                 Parse a message
    lang conform <text>              Check conformance
    lang verbs                        List verbs
    lang eval <text>                  Evaluate a statement

  verbs                              List the seven YOUSPEAK verbs
  conform <text>                     Check Clear Standard conformance
  version                            Show version
  help                               Show this help

The seven YOUSPEAK verbs:
${Object.entries(VERBS).map(([v, i]) => `  ${v.padEnd(14)} ${i.op.padEnd(12)} ${i.desc}`).join('\n')}

The Clear Standard (6 principles):
${PRINCIPLES.map(p => `  ${p.n}. ${p.name}`).join('\n')}

The wire format IS language. Trust lives in morphology.`);
    break;
  default:
    console.error(`Unknown command: ${cmd}. Try 'npl help'.`);
    process.exit(1);
}