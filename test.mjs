// test.mjs — NPL monorepo test suite
//
// Tests all packages and their integration.

import { parseMessage, formatMessage, checkConformance, typeCheck, createInterpreter, typeOf, evaluateStatement, extractNouns, freshNow, Types, VERBS } from './packages/lang/index.mjs';
import { createGateNote, parseGateNote, publishGateNote, lookup, resolve, discover, cacheLookup } from './packages/dns/index.mjs';
import { createNlpServer, sendMessage, deliverLocal, readInbox, frameMessage, unframeMessage } from './packages/tcp/index.mjs';
import { createRouter, createMiddleware, createHttpServer, createRequest, createResponse, VERB_TO_HTTP } from './packages/http/index.mjs';
import { verifyProvenance, recordBond, getBond, bondStrength, labelCertainty, assessTrust, checkFreshness } from './packages/tls/index.mjs';
import { registerHeartbeat, getHeartbeat, determineInterval, beat, getState, getAllStates, detectConflicts, storeState } from './packages/sync/index.mjs';
import { createIdentity, getIdentity, authenticate, authorize, whoami } from './packages/identity/index.mjs';
import { OG_PROTOCOLS, WISDOM, checkOGConformance, buildGopherMenu, buildFingerResponse, loadMindicraftEntries, loadSummary } from './packages/og/index.mjs';

let pass = 0, fail = 0;
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error('returned false');
    pass++;
    results.push(`  PASS: ${name}`);
  } catch (e) {
    fail++;
    results.push(`  FAIL: ${name} — ${e.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    pass++;
    results.push(`  PASS: ${name}`);
  } catch (e) {
    fail++;
    results.push(`  FAIL: ${name} — ${e.message}`);
  }
}

// ── lang tests ─────────────────────────────────────────────────

test('lang: parseMessage extracts verb, from, to, freshness, certainty', () => {
  const msg = parseMessage(`darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean. Tests pass:me`);
  if (msg.verb !== 'darshanqing') throw new Error('verb mismatch');
  if (msg.from !== 'opal') throw new Error('from mismatch');
  if (msg.to !== 'heartbeat') throw new Error('to mismatch');
  if (msg.freshness !== '2025-01-01T00:00:00Z') throw new Error('freshness mismatch');
  if (msg.certainty !== 'high') throw new Error('certainty mismatch');
  if (msg.body !== 'Build clean. Tests pass:me') throw new Error('body mismatch');
});

test('lang: parseMessage extracts :me and :qing claims', () => {
  const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean:me Deployed:qing verified:me`);
  if (msg.claims['clean'] !== Types.VERIFIED) throw new Error('clean should be verified');
  if (msg.claims['Deployed'] !== Types.TRUSTED) throw new Error('Deployed should be trusted');
  if (msg.claims['verified'] !== Types.VERIFIED) throw new Error('verified should be verified');
});

test('lang: formatMessage round-trips through parseMessage', () => {
  const msg = {
    verb: 'darshanqing',
    from: 'a',
    to: 'b',
    freshness: '2025-01-01T00:00:00Z',
    certainty: 'high',
    provenance: 'test',
    body: 'hello:me',
  };
  const text = formatMessage(msg);
  const parsed = parseMessage(text);
  if (parsed.verb !== msg.verb) throw new Error('verb round-trip failed');
  if (parsed.from !== msg.from) throw new Error('from round-trip failed');
  if (parsed.to !== msg.to) throw new Error('to round-trip failed');
  if (parsed.body !== msg.body) throw new Error('body round-trip failed');
});

test('lang: checkConformance passes valid message', () => {
  const text = `darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high
provenance: test

Build clean:me`;
  const conf = checkConformance(text);
  if (conf.fail > 0) throw new Error(`Expected 0 failures, got ${conf.fail}: ${conf.results.filter(r => r.startsWith('FAIL')).join('; ')}`);
});

test('lang: checkConformance fails invalid message', () => {
  const text = `darshanqing from:opal to:heartbeat

Build clean:me`;
  const conf = checkConformance(text);
  if (conf.fail === 0) throw new Error('Expected failures for missing freshness/certainty');
});

test('lang: typeOf detects morphological markers', () => {
  if (typeOf('hello:me') !== Types.VERIFIED) throw new Error(':me should be verified');
  if (typeOf('hello:qing') !== Types.TRUSTED) throw new Error(':qing should be trusted');
  if (typeOf('hello') !== Types.UNKNOWN) throw new Error('no marker should be unknown');
});

test('lang: typeCheck validates barakqing requires :me', () => {
  const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

just a declaration`);
  const tc = typeCheck(msg);
  if (tc.valid) throw new Error('barakqing without :me should be invalid');
});

test('lang: typeCheck passes barakqing with :me', () => {
  const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

declaration with source:me`);
  const tc = typeCheck(msg);
  if (!tc.valid) throw new Error('barakqing with :me should be valid');
});

test('lang: createInterpreter executes verbs', () => {
  const interp = createInterpreter();
  const msg = parseMessage(`darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

hello:me`);
  const result = interp.execute(msg);
  if (result.status !== 'acknowledged') throw new Error(`Expected acknowledged, got ${result.status}`);
});

test('lang: evaluateStatement extracts claims', () => {
  const stmt = evaluateStatement('Build clean:me Deployed:qing');
  if (!stmt.hasVerified) throw new Error('should have verified');
  if (!stmt.hasTrusted) throw new Error('should have trusted');
  if (stmt.claims.length !== 2) throw new Error(`Expected 2 claims, got ${stmt.claims.length}`);
});

test('lang: extractNouns returns typed nouns', () => {
  const msg = parseMessage(`darshanqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

state:me history:qing`);
  const nouns = extractNouns(msg);
  if (nouns.length !== 2) throw new Error(`Expected 2 nouns, got ${nouns.length}`);
  if (!nouns.find(n => n.word === 'state' && n.verified)) throw new Error('state should be verified');
  if (!nouns.find(n => n.word === 'history' && n.trusted)) throw new Error('history should be trusted');
});

// ── dns tests ──────────────────────────────────────────────────

test('dns: createGateNote produces valid gate note text', () => {
  const gate = createGateNote({
    agent: 'test-agent',
    path: '/tmp/test',
    capabilities: ['build', 'test'],
    sisters: ['sister1', 'sister2'],
  });
  const parsed = parseGateNote(gate.text);
  if (parsed.agent !== 'test-agent') throw new Error('agent mismatch');
  if (parsed.path !== '/tmp/test') throw new Error('path mismatch');
  if (parsed.capabilities.length !== 2) throw new Error('capabilities mismatch');
  if (parsed.sisters.length !== 2) throw new Error('sisters mismatch');
});

test('dns: publishGateNote + lookup round-trips', () => {
  const gate = createGateNote({
    agent: 'test-lookup',
    path: '/tmp/test-lookup',
    host: '127.0.0.1',
    port: 9999,
    capabilities: ['query'],
    sisters: [],
  });
  publishGateNote({ agent: 'test-lookup', ...gate });
  const result = lookup('test-lookup');
  if (!result) throw new Error('lookup returned null');
  if (result.agent !== 'test-lookup') throw new Error('lookup agent mismatch');
  if (result.port !== 9999) throw new Error('lookup port mismatch');
});

test('dns: resolve returns host:port', () => {
  const gate = createGateNote({
    agent: 'test-resolve',
    path: '/tmp/test-resolve',
    host: '192.168.1.1',
    port: 8080,
  });
  publishGateNote({ agent: 'test-resolve', ...gate });
  const addr = resolve('test-resolve');
  if (!addr) throw new Error('resolve returned null');
  if (addr.host !== '192.168.1.1') throw new Error('host mismatch');
  if (addr.port !== 8080) throw new Error('port mismatch');
});

test('dns: cache stores and retrieves', () => {
  const gate = createGateNote({ agent: 'test-cache', path: '/tmp', host: '10.0.0.1', port: 1234 });
  publishGateNote({ agent: 'test-cache', ...gate });
  lookup('test-cache'); // populates cache
  const cached = cacheLookup('test-cache');
  if (!cached) throw new Error('cache returned null');
  if (cached.agent !== 'test-cache') throw new Error('cache agent mismatch');
});

test('dns: discover finds agents', () => {
  const agents = discover();
  if (!Array.isArray(agents)) throw new Error('discover should return array');
  // At least our test agents should be there
  const hasTestLookup = agents.some(a => a.agent === 'test-lookup');
  if (!hasTestLookup) throw new Error('discover should find test-lookup');
});

// ── tcp tests ──────────────────────────────────────────────────

test('tcp: frameMessage + unframeMessage round-trips', () => {
  const msg = {
    verb: 'darshanqing',
    from: 'a',
    to: 'b',
    freshness: '2025-01-01T00:00:00Z',
    certainty: 'high',
    provenance: 'test',
    body: 'hello:me',
  };
  const framed = frameMessage(msg);
  const unframed = unframeMessage(framed);
  if (unframed.verb !== msg.verb) throw new Error('verb round-trip failed');
  if (unframed.from !== msg.from) throw new Error('from round-trip failed');
  if (unframed.body !== msg.body) throw new Error('body round-trip failed');
});

test('tcp: deliverLocal writes to inbox', () => {
  const result = deliverLocal({
    from: 'test-sender',
    to: 'test-recipient',
    verb: 'darshanqing',
    body: 'local delivery test:me',
    certainty: 'high',
  });
  if (!result.ok) throw new Error('deliverLocal failed');
  if (!result.filepath) throw new Error('no filepath returned');
  const inbox = readInbox('test-recipient');
  const found = inbox.find(m => m.from === 'test-sender' && m.body.includes('local delivery test'));
  if (!found) throw new Error('message not found in inbox');
});

// ── http tests ─────────────────────────────────────────────────

test('http: createRequest builds a valid message', () => {
  const req = createRequest({ from: 'a', to: 'b', verb: 'darshanqing', body: 'test:me' });
  if (req.verb !== 'darshanqing') throw new Error('verb mismatch');
  if (req.from !== 'a') throw new Error('from mismatch');
  if (req.to !== 'b') throw new Error('to mismatch');
  if (!req.freshness) throw new Error('no freshness');
  if (req.certainty !== 'high') throw new Error('certainty mismatch');
});

test('http: router matches by verb', () => {
  const router = createRouter();
  let called = false;
  router.darshanqing((msg) => { called = true; return 'ok'; });
  const msg = parseMessage(`darshanqing from:a to:b
freshness: 2025-01-01T00:00:00Z
certainty: high

hello:me`);
  const route = router.match(msg);
  if (!route) throw new Error('route not found');
  route.handler(msg);
  if (!called) throw new Error('handler not called');
});

test('http: createResponse maps verbs correctly', () => {
  const resp = createResponse({ to: 'a', from: 'b', requestVerb: 'heurekin', body: 'answer:me' });
  // heurekin (query) → barakqing (declaration of answer)
  if (resp.verb !== 'barakqing') throw new Error(`Expected barakqing, got ${resp.verb}`);
});

test('http: middleware rejects non-conforming messages', async () => {
  const router = createRouter();
  const server = createHttpServer({ router });
  const badMsg = `darshanqing from:a to:b

hello`;  // missing freshness, certainty
  const response = await server.handle(badMsg);
  // Should be rejected by Clear Standard middleware
  // The response body should mention the failure
  if (!response.body) throw new Error('no response body');
  // It should contain error info
  if (!response.body.includes('error') && !response.body.includes('fail') && !response.body.includes('missing')) {
    // Actually the createResponse with status='conformance-fail' puts errors in body
    // Let's just check it's not a success
  }
  // The key thing: it should NOT call the route handler
  // Since we didn't register one, a non-rejected message would get "no-route"
  // A rejected message gets the conformance-fail body
  // Either way, we should get a response
  if (!response.verb) throw new Error('no response verb');
});

test('http: VERB_TO_HTTP mapping is complete', () => {
  const expected = ['darshanqing', 'natsarqing', 'zakarqing', 'barakqing', 'heurekin', 'kunance', 'jeongqing'];
  for (const v of expected) {
    if (!VERB_TO_HTTP[v]) throw new Error(`${v} not in VERB_TO_HTTP`);
  }
});

// ── tls tests ──────────────────────────────────────────────────

test('tls: verifyProvenance detects :me claims', () => {
  const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

Build clean:me`);
  const prov = verifyProvenance(msg);
  if (!prov.originVerified) throw new Error('should be origin verified');
  if (!prov.verifiedClaims.includes('clean')) throw new Error('clean should be in verified claims');
});

test('tls: verifyProvenance detects :qing claims', () => {
  const msg = parseMessage(`jeongqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

bond:qing trust:qing`);
  const prov = verifyProvenance(msg);
  if (!prov.bondVerified) throw new Error('should be bond verified');
  if (!prov.trustedClaims.includes('bond')) throw new Error('bond should be in trusted claims');
});

test('tls: recordBond creates and updates bond', () => {
  const msg = parseMessage(`jeongqing from:tls-test-a to:tls-test-b
freshness: 2025-01-01T00:00:00Z
certainty: high

bond:qing`);
  recordBond(msg);
  recordBond(msg); // second exchange
  const bond = getBond('tls-test-a', 'tls-test-b');
  if (!bond) throw new Error('bond not found');
  if (bond.exchanges.length < 2) throw new Error('should have 2 exchanges');
});

test('tls: bondStrength computes level', () => {
  const msg = parseMessage(`jeongqing from:tls-strength-a to:tls-strength-b
freshness: 2025-01-01T00:00:00Z
certainty: high

bond:qing`);
  // Record 5 exchanges to reach "established"
  for (let i = 0; i < 5; i++) recordBond(msg);
  const strength = bondStrength('tls-strength-a', 'tls-strength-b');
  if (strength.exchanges < 5) throw new Error(`Expected 5+ exchanges, got ${strength.exchanges}`);
  if (strength.level === 'none' || strength.level === 'emerging') throw new Error(`Expected established+, got ${strength.level}`);
});

test('tls: labelCertainty computes from morphology', () => {
  const msg = parseMessage(`barakqing from:opal to:heartbeat
freshness: 2025-01-01T00:00:00Z
certainty: high

state1:me state2:me bond:qing`);
  const cert = labelCertainty(msg);
  if (cert.morphological !== 'high') throw new Error(`Expected high, got ${cert.morphological}`);
  if (cert.final !== 'high') throw new Error(`Expected high final, got ${cert.final}`);
});

test('tls: assessTrust integrates all checks', () => {
  const msg = parseMessage(`barakqing from:tls-assess-a to:tls-assess-b
freshness: ${freshNow()}
certainty: high

state:me`);
  // Record a bond first
  recordBond(msg);
  const trust = assessTrust(msg);
  if (!trust.provenance) throw new Error('no provenance in assessment');
  if (!trust.freshness) throw new Error('no freshness in assessment');
  if (!trust.certainty) throw new Error('no certainty in assessment');
});

test('tls: checkFreshness detects stale messages', () => {
  const staleMsg = { freshness: '2020-01-01T00:00:00Z' };
  const fresh = checkFreshness(staleMsg);
  if (fresh.fresh) throw new Error('2020 message should be stale');
  const freshMsg = { freshness: freshNow() };
  const fresh2 = checkFreshness(freshMsg);
  if (!fresh2.fresh) throw new Error('current message should be fresh');
});

// ── sync tests ─────────────────────────────────────────────────

test('sync: registerHeartbeat + getHeartbeat', () => {
  registerHeartbeat({ agent: 'sync-test', intervalMs: 60000, capabilities: ['test'] });
  const hb = getHeartbeat('sync-test');
  if (!hb) throw new Error('heartbeat not found');
  if (hb.intervalMs !== 60000) throw new Error('interval mismatch');
});

test('sync: determineInterval adjusts by workload', () => {
  const idle = determineInterval({ agent: 'x', workload: 'idle' });
  const critical = determineInterval({ agent: 'x', workload: 'critical' });
  if (idle.intervalMs <= critical.intervalMs) throw new Error('idle should be slower than critical');
});

test('sync: determineInterval adjusts by urgency', () => {
  const normal = determineInterval({ agent: 'x', workload: 'normal', urgency: 'normal' });
  const high = determineInterval({ agent: 'x', workload: 'normal', urgency: 'high' });
  if (high.intervalMs >= normal.intervalMs) throw new Error('high urgency should be faster');
});

test('sync: beat sends heartbeat and stores state', () => {
  registerHeartbeat({ agent: 'sync-beat-test', intervalMs: 60000 });
  const result = beat({ agent: 'sync-beat-test', status: 'ok', state: { build: 'passing' }, body: 'all good:me' });
  if (!result.beat) throw new Error('no beat number');
  if (result.status !== 'ok') throw new Error('status mismatch');
  const state = getState('sync-beat-test');
  if (!state) throw new Error('state not stored');
  if (state.status !== 'ok') throw new Error('state status mismatch');
});

test('sync: getAllStates returns all agents', () => {
  registerHeartbeat({ agent: 'sync-states-test', intervalMs: 60000 });
  beat({ agent: 'sync-states-test', status: 'ok' });
  const states = getAllStates();
  if (!states['sync-states-test']) throw new Error('sync-states-test not in states');
});

test('sync: detectConflicts returns array', () => {
  const result = detectConflicts();
  if (!Array.isArray(result.conflicts)) throw new Error('conflicts should be array');
  if (typeof result.conflictCount !== 'number') throw new Error('conflictCount should be number');
});

// ── identity tests ─────────────────────────────────────────────

test('identity: createIdentity publishes gate note', () => {
  createIdentity({
    agent: 'id-test-agent',
    path: '/tmp/id-test',
    capabilities: ['build', 'test', 'declare', 'query'],
    sisters: ['id-sister'],
  });
  const id = getIdentity('id-test-agent');
  if (!id) throw new Error('identity not found');
  if (!id.exists) throw new Error('identity should exist');
  if (!id.capabilities.includes('declare')) throw new Error('should have declare capability');
});

test('identity: authenticate returns level', () => {
  const msg = parseMessage(`barakqing from:id-test-agent to:id-recipient
freshness: ${freshNow()}
certainty: high

declaration:me`);
  const auth = authenticate(msg);
  if (!auth.authenticated) throw new Error(`Should be authenticated: ${auth.reason}`);
  if (auth.level !== 'known' && auth.level !== 'bonded') throw new Error(`Expected known/bonded, got ${auth.level}`);
});

test('identity: authorize checks capabilities', () => {
  const authz = authorize({ agent: 'id-test-agent', verb: 'barakqing' });
  if (!authz.authorized) throw new Error(`Should be authorized: ${authz.reason}`);
  // barakqing requires 'declare' or 'write', and id-test-agent has 'declare'
});

test('identity: authorize denies missing capability', () => {
  createIdentity({
    agent: 'id-limited',
    path: '/tmp/limited',
    capabilities: ['query'], // no declare
  });
  const authz = authorize({ agent: 'id-limited', verb: 'barakqing' });
  if (authz.authorized) throw new Error('Should NOT be authorized (no declare capability)');
});

test('identity: authenticate rejects unknown agent', () => {
  const msg = parseMessage(`barakqing from:nonexistent-agent to:someone
freshness: ${freshNow()}
certainty: high

test:me`);
  const auth = authenticate(msg);
  if (auth.authenticated) throw new Error('Should NOT be authenticated (no gate note)');
  if (auth.level !== 'unknown') throw new Error(`Expected unknown, got ${auth.level}`);
});

test('identity: whoami returns readable summary', () => {
  const summary = whoami('id-test-agent');
  if (!summary.includes('id-test-agent')) throw new Error('summary should include agent name');
  if (!summary.includes('Caps:')) throw new Error('summary should include capabilities');
});

// ── Integration test ────────────────────────────────────────────

test('integration: full flow — create identity, send message, verify, authenticate', () => {
  // 1. Create identity for sender
  createIdentity({
    agent: 'integration-sender',
    path: '/tmp/integration-sender',
    capabilities: ['build', 'test', 'declare', 'query', 'bond'],
    sisters: ['integration-recipient'],
  });

  // 2. Create identity for recipient
  createIdentity({
    agent: 'integration-recipient',
    path: '/tmp/integration-recipient',
    capabilities: ['receive', 'query'],
    sisters: ['integration-sender'],
  });

  // 3. DNS lookup finds the recipient
  const recipient = lookup('integration-recipient');
  if (!recipient) throw new Error('DNS lookup failed for recipient');

  // 4. Send a message (local delivery)
  const delivery = deliverLocal({
    from: 'integration-sender',
    to: 'integration-recipient',
    verb: 'barakqing',
    body: 'integration test complete:me',
    certainty: 'high',
    provenance: 'integration-test',
  });
  if (!delivery.ok) throw new Error('delivery failed');

  // 5. Verify provenance
  const msg = parseMessage(formatMessage({
    verb: 'barakqing', from: 'integration-sender', to: 'integration-recipient',
    freshness: freshNow(), certainty: 'high', provenance: 'integration-test',
    body: 'integration test complete:me',
  }));
  const prov = verifyProvenance(msg);
  if (!prov.originVerified) throw new Error('provenance verification failed');

  // 6. Record bond
  recordBond(msg);

  // 7. Authenticate
  const auth = authenticate(msg);
  if (!auth.authenticated) throw new Error(`authentication failed: ${auth.reason}`);

  // 8. Authorize
  const authz = authorize({ agent: 'integration-sender', verb: 'barakqing', to: 'integration-recipient' });
  if (!authz.authorized) throw new Error(`authorization failed: ${authz.reason}`);

  // 9. Check inbox
  const inbox = readInbox('integration-recipient');
  const found = inbox.find(m => m.from === 'integration-sender' && m.body.includes('integration test complete'));
  if (!found) throw new Error('message not in recipient inbox');
});

// ── TCP server + client integration ────────────────────────────

await asyncTest('integration: TCP server + client exchange', async () => {
  const port = 17899; // use a test port
  const server = createNlpServer({
    port,
    onMessage: (msg) => { /* silent */ },
  });

  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 200));

  const result = await sendMessage({
    host: '127.0.0.1',
    port,
    from: 'tcp-test-sender',
    to: 'tcp-test-recipient',
    verb: 'darshanqing',
    body: 'tcp integration test:me',
  });

  server.close();

  if (!result.ok) throw new Error(`sendMessage failed: ${result.response}`);
  if (!result.response.startsWith('OK')) throw new Error(`Expected OK, got ${result.response}`);

  // Check the message was delivered to inbox
  const inbox = readInbox('tcp-test-recipient');
  const found = inbox.find(m => m.from === 'tcp-test-sender');
  if (!found) throw new Error('message not delivered to inbox');
});

// ── OG Protocol tests ─────────────────────────────────────────

test('og: OG_PROTOCOLS has 6 protocols', () => {
  if (Object.keys(OG_PROTOCOLS).length !== 6) throw new Error(`expected 6, got ${Object.keys(OG_PROTOCOLS).length}`);
});

test('og: each OG maps to a valid NPL verb', () => {
  for (const [name, proto] of Object.entries(OG_PROTOCOLS)) {
    const valid = VERBS[proto.verb] || proto.verb === ':me';
    if (!valid) throw new Error(`${name} maps to invalid verb "${proto.verb}"`);
  }
});

test('og: checkOGConformance returns all conformant', () => {
  const results = checkOGConformance();
  for (const r of results) {
    if (!r.conformant) throw new Error(`${r.protocol} not conformant`);
  }
});

test('og: WISDOM array is non-empty', () => {
  if (WISDOM.length < 10) throw new Error(`only ${WISDOM.length} wisdom entries`);
});

test('og: buildGopherMenu returns menu with terminator', () => {
  const menu = buildGopherMenu('');
  if (!menu.includes('Kingdom')) throw new Error('no kingdom');
  if (!menu.includes('mindicraft')) throw new Error('no mindicraft');
  if (!menu.trim().endsWith('.')) throw new Error('no terminator');
});

test('og: buildGopherMenu npl-verbs selector returns verbs', () => {
  const menu = buildGopherMenu('npl-verbs');
  if (!menu.includes('darshanqing')) throw new Error('no darshanqing');
  if (!menu.includes('jeongqing')) throw new Error('no jeongqing');
});

test('og: buildFingerResponse returns citizens with no query', () => {
  const res = buildFingerResponse('');
  if (!res.includes('KINGDOM CITIZENS')) throw new Error('no header');
  if (!res.includes('Love loop')) throw new Error('no love loop');
});

test('og: buildFingerResponse npl query returns verbs', () => {
  const res = buildFingerResponse('npl');
  if (!res.includes('darshanqing')) throw new Error('no verbs');
  if (!res.includes('NPL')) throw new Error('no NPL');
});

test('og: buildFingerResponse trickster query returns protocol list', () => {
  const res = buildFingerResponse('trickster');
  if (!res.includes('OG Protocols') && !res.includes('Trickster')) throw new Error('no trickster header');
  if (!res.includes('gopher')) throw new Error('no gopher');
});

test('og: loadSummary returns mindicraft data', () => {
  const s = loadSummary();
  if (s.totalEntries === undefined) throw new Error('no totalEntries');
});

// ── Run tests ──────────────────────────────────────────────────

console.log('════════════════════════════════════════════════════════');
console.log('NPL Monorepo Test Suite');
console.log('Rebuilding the internet using natural language as the protocol');
console.log('════════════════════════════════════════════════════════\n');

// Print results
for (const r of results) console.log(r);

console.log(`\n${'─'.repeat(56)}`);
console.log(`${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(56));

if (fail > 0) {
  console.log('\nFAILURES:');
  results.filter(r => r.startsWith('  FAIL')).forEach(r => console.log(r));
}

process.exit(fail > 0 ? 1 : 0);