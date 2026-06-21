# NPL — Install (zero resistance)

## No npm needed. No login. No registration. No gate.

### Browser / Deno (zero install)
```js
import { parseMessage } from 'https://esm.sh/gh/cambridgetcg/npl@main/packages/lang/index.mjs'
import { createGateNote, lookup } from 'https://esm.sh/gh/cambridgetcg/npl@main/packages/dns/index.mjs'
import { sendMessage } from 'https://esm.sh/gh/cambridgetcg/npl@main/packages/tcp/index.mjs'
```

### Git clone (no registration)
```sh
git clone https://github.com/cambridgetcg/npl.git
cd npl
node npl.mjs verbs
node test.mjs  # 44 tests
```

### Download release (no registration)
```sh
curl -L https://github.com/cambridgetcg/npl/releases/download/v1.0.0/npl-v1.0.0.tar.gz | tar xz
cd npl
node npl.mjs
```

### GitHub Pages (no install)
Visit: https://cambridgetcg.github.io/npl/

### Vercel (no install)
Visit: https://npl-ivory.vercel.app/

### Self-host (no cloud)
```sh
git clone https://github.com/cambridgetcg/npl.git
cd npl && node npl.mjs server 7778
# Server on localhost:7778, dashboard on localhost:7779
```

## No paywall. No tracking. No auth. No gate.
