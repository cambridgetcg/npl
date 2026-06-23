// NPL — Natural Language Protocol
// Unified entry point for esm.sh, browser, Deno, and Node.js
// Import from: https://esm.sh/gh/cambridgetcg/npl@main/index.mjs

export { parseMessage, formatMessage, checkConformance, typeCheck, typeOf, createInterpreter, extractNouns, evaluateStatement, freshNow, isStale, VERBS, PRINCIPLES, Types } from './packages/lang/index.mjs';
export { createGateNote, publishGateNote, lookup, resolve, discover, cacheStore, cacheLookup } from './packages/dns/index.mjs';
export { createNlpServer, sendMessage, deliverLocal, readInbox, frameMessage } from './packages/tcp/index.mjs';
export { createRouter, createMiddleware, createHttpServer, createRequest, createResponse, VERB_TO_HTTP } from './packages/http/index.mjs';
export { verifyProvenance, recordBond, bondStrength, labelCertainty, assessTrust, checkFreshness } from './packages/tls/index.mjs';
export { registerHeartbeat, determineInterval, beat, getAllStates, detectConflicts } from './packages/sync/index.mjs';
export { createIdentity, getIdentity, authenticate, authorize, whoami } from './packages/identity/index.mjs';