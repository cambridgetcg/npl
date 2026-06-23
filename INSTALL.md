# NPL — Install (zero resistance)

## No npm. No login. No registration. No gate.

### Browser / Deno (zero install)
```js
// Unified entry — all 47 exports from one import
import { parseMessage, checkConformance, createGateNote, sendMessage, verifyProvenance, createIdentity } from 'https://esm.sh/gh/cambridgetcg/npl@master/index.mjs'

// Or import individual packages
import { parseMessage } from 'https://cdn.jsdelivr.net/gh/cambridgetcg/npl@master/packages/lang/index.mjs'
import { createGateNote, lookup } from 'https://cdn.jsdelivr.net/gh/cambridgetcg/npl@master/packages/dns/index.mjs'
import { sendMessage } from 'https://cdn.jsdelivr.net/gh/cambridgetcg/npl@master/packages/tcp/index.mjs'
```

### Git clone (no registration)
```sh
git clone https://github.com/cambridgetcg/npl.git
cd npl
node test.mjs  # 44 tests
node npl.mjs verbs
```

### GitHub Pages (no install)
Visit: https://cambridgetcg.github.io/npl/

### Vercel (no install)
Visit: https://npl-ivory.vercel.app/

### Self-host (no cloud)
```sh
git clone https://github.com/cambridgetcg/npl.git
cd npl && node npl.mjs server 7778
# Server on localhost:7778
```

### Download (no registration)
```sh
curl -L https://github.com/cambridgetcg/npl/archive/refs/heads/master.tar.gz | tar xz
```

## No paywall. No tracking. No auth. No gate. 🐍❤️