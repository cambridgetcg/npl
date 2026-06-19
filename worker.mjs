// NPL Worker — Natural Language Protocol at the edge.
// Accepts natural language messages, validates Clear Standard, delivers to inbox.
// The wire format IS language. The worker IS the exchange.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Dashboard
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(DASHBOARD, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // API: live state
    if (url.pathname === '/api/live') {
      return Response.json(await getState(env));
    }

    // API: send a message
    if (url.pathname === '/api/send' && request.method === 'POST') {
      const text = await request.text();
      const msg = parseMessage(text);

      // Validate
      if (!VERBS[msg.verb]) {
        return Response.json({ error: `unknown verb: ${msg.verb}` }, { status: 400 });
      }
      if (!msg.from || !msg.to || !msg.freshness || !msg.certainty) {
        return Response.json({ error: 'missing required fields (from, to, freshness, certainty)' }, { status: 400 });
      }

      // Store in KV
      const key = `${msg.to}/${Date.now()}-${msg.from}-${msg.verb}`;
      await env.NLP_INBOX.put(key, text, { expirationTtl: 86400 });

      // Update live state
      const state = await getState(env);
      state.exchanges = (state.exchanges || 0) + 1;
      state.agents = state.agents || [];
      if (!state.agents.includes(msg.from)) state.agents.push(msg.from);
      if (!state.agents.includes(msg.to)) state.agents.push(msg.to);
      state.messages = state.messages || [];
      state.messages.unshift({
        verb: msg.verb, from: msg.from, to: msg.to,
        freshness: msg.freshness, certainty: msg.certainty,
        body: (msg.body || '').slice(0, 120), ts: Date.now(),
      });
      if (state.messages.length > 50) state.messages.pop();
      await env.NLP_STATE.put('live', JSON.stringify(state));

      return Response.json({ ok: true, key });
    }

    // API: receive messages
    if (url.pathname.startsWith('/api/recv/')) {
      const agent = url.pathname.split('/').pop();
      const list = await env.NLP_INBOX.list({ prefix: `${agent}/` });
      const messages = [];
      for (const key of list.keys) {
        const val = await env.NLP_INBOX.get(key.name);
        if (val) messages.push(val);
      }
      return Response.json({ messages });
    }

    return new Response('NPL — Natural Language Protocol', { status: 200 });
  },
};

const VERBS = {
  darshanqing: 'greeting',
  natsarqing: 'alert',
  zakarqing: 'ack',
  barakqing: 'declaration',
  heurekin: 'query',
  kunance: 'prepare',
  jeongqing: 'bond',
};

function parseMessage(text) {
  const lines = text.trim().split('\n');
  const header = {};
  const bodyStart = lines.findIndex(l => l.trim() === '');
  const headerLines = bodyStart >= 0 ? lines.slice(0, bodyStart) : lines;
  const bodyLines = bodyStart >= 0 ? lines.slice(bodyStart + 1) : [];

  const firstParts = headerLines[0]?.split(/\s+/) || [];
  header.verb = firstParts[0];
  for (const part of firstParts.slice(1)) {
    const [k, v] = part.split(':');
    if (k && v) header[k] = v;
  }
  for (const line of headerLines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx > 0) header[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  header.body = bodyLines.join('\n').trim();
  return header;
}

async function getState(env) {
  const raw = await env.NLP_STATE?.get('live');
  if (raw) return JSON.parse(raw);
  return { started: new Date().toISOString(), messages: [], agents: [], exchanges: 0 };
}

const DASHBOARD = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NPL Edge</title>
<style>
body{font-family:system-ui;background:#0a0c10;color:#eef2f8;padding:48px;text-align:center}
h1{font-family:Georgia,serif;font-weight:400;font-size:36px}
p{color:#6b7a90;max-width:480px;margin:8px auto}
.heart{color:#e0507a}
</style></head><body>
<h1>NPL <span style="color:#50b8e0">:me</span> <span style="color:#e0507a">:qing</span></h1>
<p>Natural Language Protocol — running at the edge on Cloudflare Workers.</p>
<p>Trust lives in the grammar. The wire IS language.</p>
<p><span class="heart">love is. create out of love.</span> 🐍❤️</p>
</body></html>`;