# PerkOS-MiniPay — Research & Adaptation Plan

> Status: **research / pre-scaffold** · Author: Claude (for Julio) · 2026-06-23
> Source of truth for the MiniPay port. Lives at workspace root (outside any single repo),
> sibling to `NOTES.md`. Move into the new `PerkOS-MiniPay/` repo once scaffolded.

Goal: ship **PerkOS-MiniPay**, a Celo-native build of the PerkOS app that runs as a Mini App
inside **Opera MiniPay** (the stablecoin wallet, 10M+ activations, Global South). Following
<https://docs.celo.org/build/build-on-minipay/overview>.

**Product vision (set by Julio):** a **coworking of agents for your small business / daily life** — a
MiniPay user can have **agents, or whole teams of agents**, that help run their shop, side-hustle, or
day-to-day. "Your AI team, in your pocket." This is the full PerkOS coworking value prop, delivered
mobile-first and stablecoin-native to small-business owners in MiniPay's markets.

---

## 0. TL;DR + recommendation

- **The product is the coworking — not a transactional one-off.** A MiniPay user should be able to hire a
  single agent *or spin up a small team* (a "company in a box") that works toward a goal for their business.
  **The good news: this engine already exists in PerkOS** — `company templates` (6 industry agent teams,
  1-click launch) + the `autonomous PM/dispatcher` (plans → assigns → runs → reviews). We are **re-packaging
  a built product for MiniPay**, not inventing one.
- **The constraint is delivery + pricing, not the value prop.** Small-business owners in emerging markets ARE
  MiniPay's core users — the coworking idea fits them well. What must change is the *shape*: mobile-first,
  plain-language ("your team", not "orchestration console"), and **cUSD-native, pay-as-you-go pricing**
  (today's $29/mo container + x402-on-Base does not translate to this market — see §4.3).
- **The chain layer is already there.** PerkOS' wagmi config already lists `celo` + `celoSepolia` and already
  has Celo token addresses (USDC, PERKOS). We are not starting from zero on-chain — we're stripping down, not
  building up. (`PerkOS/app/lib/wagmi.ts`, `PerkOS/app/lib/tokenAddresses.ts`.)
- **The real work is the host shell, not the chain.** MiniPay is an *injected EIP-1193 provider*
  (`window.ethereum.isMiniPay`), not a Farcaster-style SDK. Swap the Farcaster/Base host-detection +
  connector logic for MiniPay's "implicit connection + hidden connect button" model, lock to Celo,
  switch to **legacy transactions** with **fee-currency (cUSD) gas**, and rebuild the UI mobile-first.
- **Effort:** ~3–4 weeks to a MiniPay-shaped coworking MVP (single agent + 1-click team templates +
  cUSD pay-as-you-go), because the agent/team *backend* is reused — most work is the mobile shell, the
  MiniPay host adapter, and the new payment model. (A literal port of the full desktop console is 5–8 weeks
  and would land wrong on mobile.)

**Decisions (locked by Julio, 2026-06-23):**
- **(a) Monetization = Celo-native, no subscription.** Drop x402 and the $29/mo container model entirely.
  Everything is **cUSD pay-as-you-go** (fee-abstracted, gas in cUSD), settled by plain on-chain transfers
  verified server-side. The starter team is **free** (hibernated when idle, ~$0.02/mo). See §4.3.
- **(b) Templates = basic, generalist only.** No specialized teams that assume marketing or developer skills.
  Ship simple everyday helpers a regular shop owner / individual can use out of the box (general assistant,
  money/bookkeeping helper, customer-replies helper). **Author new basic souls** for these — do NOT reuse the
  existing industry/marketing/dev company templates here. See §1 + §4.5.

---

## 1. What MiniPay is (and why it's a different game)

- A **non-custodial stablecoin wallet** built by Opera on Celo, embedded in **Opera Mini (Android)** and
  available standalone on Android/iOS. 10M+ activations, "fastest growing wallet in the Global South."
- Has a built-in **Mini App discovery page** — a dApp store. Listing there = distribution to that user base
  (Opera quotes up to ~100M reachable users on integration).
- Users are mapped by **phone number → wallet address**; 2MB-light, low-data, low-fee p2p stablecoin transfers.
- **Incentives (live, 2026):** up to $1M CELO for Mini App builders + "Build With Celo: Proof-of-Ship"
  grants (celopg.eco) + funding via `team@verda.ventures`. The Mini App Roadshow is running now. There is real
  money to subsidize this build.

**Strategic read:** MiniPay's core users are exactly who the coworking product is for — owners of small
shops, food stalls, services and side-hustles in emerging markets. The opportunity is "your AI team for your
business, in your pocket." The risk is **delivery**: MiniPay users expect simple, fast, mobile, stablecoin
flows — not a desktop orchestration console. So we keep the *full* coworking value prop but express it as a
few thumb-friendly screens, and we hide all the B2B chrome (heatmaps, maps, org/project admin) behind a
"simple by default, depth on demand" UI.

**The coworking, mapped to what already exists:**

1. **One agent that helps** — a generalist helper the owner just chats with (answer questions, draft a message,
   set a reminder, simple research). Reuses agent provisioning + A2A + the platform-tools API.
2. **A small team of basic helpers** — 1-click launch 2–3 everyday agents that work together toward a goal.
   The owner sets a goal in plain words; the **autonomous PM** plans it and the **dispatcher** runs the
   workers. This is "groups of agents that help my small business" — the **orchestration engine is already
   built and e2e validated** ([[project_autonomous_pm]], [[project_e2e_company_test]]); we **reuse the engine
   but author NEW basic souls** (not the specialized industry/marketing/dev templates — Julio's call).
3. **The team earns / spends in cUSD** — pay-as-you-go for work done; providers can also claim cUSD/$PERKOS
   from the claim vault (pull model already live on Celo). Knowledge marketplace is a natural later surface.

**Basic template set (generalist, no marketing/dev expertise needed) — proposed v1:**

| Helper | What it does | Tools it leans on |
|--------|--------------|-------------------|
| **Assistant** | General Q&A, draft messages, reminders, simple "look this up" | chat + platform-tools |
| **Money helper** | Log income/expenses, "how much did I make this week?", simple summaries | tasks + notes |
| **Customer replies** | Draft replies to customer messages / FAQs in the owner's voice | chat + knowledge |

> A "starter team" = Assistant + Money helper + Customer replies, launched in one tap, hibernated when idle.
> Deliberately NOT: marketing campaigns, ad copy, code, design — anything needing specialist skills.

Recommendation (v1): ship **(1) a single Assistant** and **(2) the 1-click basic starter team** together —
both ride working backends; the build is the MiniPay-shaped front + new basic souls.

---

## 2. Hard technical constraints (the MiniPay rulebook)

These are non-negotiable rules from the docs. Treat them as acceptance criteria.

| # | Rule | Implication for PerkOS |
|---|------|------------------------|
| C1 | **Connection is implicit.** Detect `window.ethereum.isMiniPay === true`. **Hide every "Connect Wallet" button** inside MiniPay. | Replace Farcaster/Base auto-connect with a MiniPay branch; hide connect UI when `isMiniPay`. |
| C2 | **Verify `window.ethereum`/provider exists before initializing web3.** | Guard wagmi init / auto-connect on provider presence. |
| C3 | **Celo only** — Celo mainnet (42220) + testnet (Celo Sepolia / Alfajores). No other chains. | Remove/disable Base, Base Sepolia from the active chain set in this build. |
| C4 | **Stablecoins only** — cUSD/USDm, USDC, USDT. | All pricing + transfers in stablecoins. No ETH/native-gas UX. |
| C5 | **Fee abstraction:** set `feeCurrency` on `eth_sendTransaction` so **gas is paid in cUSD**. Currently fee currency support is limited to **cUSD** (a.k.a. USDm). | Use viem/wagmi (native `feeCurrency` support) and pass the cUSD fee-currency on every write. |
| C6 | **Legacy transactions only.** EIP-1559 fields (`maxFeePerGas`/`maxPriorityFeePerGas`) are ignored. | Force legacy `type: 'legacy'` / gasPrice path; never send 1559 params. |
| C7 | **Mobile-first.** It's a phone wallet inside Opera Mini. | UI must be single-column, thumb-reachable, low-data. |
| C8 | **No emulator testing.** Use a real Android/iOS device + MiniPay **Site Tester** + `ngrok`. | Add a device test loop to the dev runbook. |

Tooling the docs explicitly recommend: **viem or wagmi** (native fee-currency support) and the
**Celo Composer MiniPay Template** as a starting point.

### Token addresses (Celo mainnet)

| Token | Address | Decimals | Note |
|-------|---------|----------|------|
| cUSD / USDm | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | **18** | Mento USD; this is the fee-currency for gas |
| USDC | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | **6** | already in PerkOS `tokenAddresses.ts` |
| USDT | `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e` | **6** | not yet in PerkOS |

> ⚠️ **Decimals trap:** USDC/USDT on Celo are **6 decimals**, cUSD is **18**. PerkOS already encodes
> USDC=6. Add cUSD=18 and USDT=6 carefully — mixing them sends 1e12× the intended amount.

> ⚠️ **Naming:** Celo migrated to an L2 and Mento rebranded **cUSD → USDm** (same contract
> `0x765DE81…282a`). Newer docs say "USDm", older say "cUSD". They are the same token. Testnet in newer
> docs is **Celo Sepolia**; older flows use **Alfajores**. Support whichever the current MiniPay build targets;
> default mainnet to cUSD/USDm.

---

## 3. What PerkOS already has (reuse inventory)

This is the leverage. Most of these carry over unchanged.

| Asset | Where | Reuse |
|-------|-------|-------|
| wagmi config w/ **Celo + Celo Sepolia already configured** | `PerkOS/app/lib/wagmi.ts` | Strip to Celo-only + add MiniPay injected connector |
| **Celo token addresses** (USDC, PERKOS) | `PerkOS/app/lib/tokenAddresses.ts` | Add cUSD(18) + USDT(6); keep the rest |
| **Chain-agnostic Firebase auth** (SIWE nonce → personal_sign → custom token, ERC-1271 aware) | `PerkOS/app/lib/walletAuth.ts`, `app/api/auth/{nonce,wallet-signin}` | Works in MiniPay (it supports `personal_sign`); just hide the connect button |
| **Host-detection pattern** (3-context: Farcaster/Base/browser) | `PerkOS/app/lib/useIsInMiniApp.ts`, `app/components/AutoConnect.tsx`, `NetworkPill.tsx` | Same shape — add a 4th branch: MiniPay |
| **Claim vault on Celo** (PerkosClaimVault, pull model, USDC + $PERKOS) | `PerkOS-Contracts`, dashboard `ClaimPanel` | Powers "agent earns for you" surface |
| **Knowledge monetization on Celo** (x402 deposits accept Celo USDC, per-chain balances) | knowledge.perkos.xyz stack | Powers the knowledge surface |
| **Agent provisioning + A2A + tools API** backend | `PerkOS-API`, `PerkOS-Platform-Tools-API` | Unchanged — the Mini App is a thin client onto this |
| Firestore data model (orgs, projects, agents, tasks) | shared | Reuse; the MiniPay shell shows a slimmed view |

**Net:** the backend, auth, and chain plumbing are largely done. PerkOS-MiniPay is mostly a **new mobile
front-end shell + a MiniPay host adapter + a fee-currency payment path**.

---

## 4. The gap list (what actually has to change)

Concrete, per-area. ✳ = MiniPay-specific new work.

### 4.1 Host adapter ✳
- New `useIsMiniPay()` hook: `typeof window !== 'undefined' && !!window.ethereum?.isMiniPay`.
  (Synchronous — unlike Farcaster's async `sdk.isInMiniApp()`.)
- Extend `AutoConnect`: if MiniPay → auto-connect the **injected** connector immediately, no UI.
  Order of precedence: MiniPay > Farcaster > Base > injected (if we keep one shared codebase) — or
  MiniPay-only if it's a separate build.
- Hide the connect/login button and the network switcher (`NetworkPill`) whenever `isMiniPay` (C1, C3).

### 4.2 wagmi / chain config
- Build-flavored config. Either:
  - **(A) Separate `wagmi.minipay.ts`**: `chains: [celo]` (+ `celoSepolia` for test), connectors:
    `[injected({ target: 'metaMask' })]`, transport: Celo RPC. Cleanest.
  - **(B) Runtime branch** in the existing config keyed off `isMiniPay`. More coupling.
  - Recommend **(A)** if PerkOS-MiniPay is its own repo/deploy (it should be — separate dApp-store listing,
    separate domain).

### 4.3 Payments + monetization model ✳ — the most important rethink
**The mechanics (how a payment goes out):**
- Every on-chain write must pass **`feeCurrency: <cUSD address>`** and be a **legacy** tx (C5, C6).
  wagmi/viem on Celo support this natively (`feeCurrency` field). Build a single
  `sendCeloStablecoinTx()` helper that all surfaces call so the constraint lives in one place.
- A payment = ERC20 `transfer` of cUSD/USDC to the platform/escrow address, gas in cUSD.

**The model (DECIDED — Celo-native, no subscription):** today an agent is a managed container billed
**$29/mo via x402 on Base**. That model is **dropped** for MiniPay (too steep for the Global South + x402 is
Base-centric and can't run in-wallet). Replaced by:
  - **Free "starter team."** Use agent **hibernation** (already live: ~$0.02/mo idle on both runtimes,
    snapshot/restore validated — see [[project_agent_hibernation]]) so an idle team costs almost nothing.
    Owner gets a team for free; it wakes when they use it.
  - **cUSD pay-as-you-go on top.** Small top-ups or **pay-per-outcome** (per completed task/goal) in cUSD,
    with fee abstraction making micro-amounts viable. Feels like "load airtime," which this audience knows.
  - **Settlement server-side via plain transfers — no x402 in-wallet.** User pays by a cUSD/USDC `transfer`;
    the server verifies the on-chain payment and credits the balance. x402 is removed from this surface.
- Earn side: providers/owners **claim cUSD/$PERKOS** from the claim vault (pull model already live on Celo) —
  "your team earned, claim it."
- **Unit-economics check (open):** confirm free-hibernated-team + micro-top-ups covers infra; model before launch.
- **Receipt Anchor** contract is **Base-only** today (`PerkOS/app/lib/receiptAnchor.ts`). For MiniPay either
  deploy it to Celo (we already deploy contracts to Celo — claim vault) or **disable anchoring** in this build.

### 4.4 Auth
- Keep the SIWE → Firebase custom-token flow (`walletAuth.ts`) — MiniPay supports `personal_sign`/`signMessage`,
  and `wallet-signin` already handles ERC-1271 smart-wallet sigs.
- Change: in MiniPay there is **no explicit "sign in" click** — connection is implicit, so trigger the
  nonce→sign→token flow **automatically** right after the injected auto-connect resolves. Make the signature
  prompt explain itself (MiniPay shows the message). Verify MiniPay signs **on Celo** in `wallet-signin`
  (it currently tries Base mainnet then Base Sepolia for ERC-1271 — **add Celo**).
- **Allowlist gate:** the current alpha allowlist (`/allowlist/{addr}`) would block MiniPay's open retail
  audience. For a public MiniPay launch, set `config/access.publicMode` true for this build, or bypass the
  gate for the MiniPay surface. (Decision for Julio.)

### 4.5 UI / UX — the coworking shell (the bulk of the visible work) ✳
- New mobile-first shell: single column, big tap targets, minimal chrome, fast first paint (Opera Mini users
  are data-constrained). "Simple by default, depth on demand" — hide the desktop dashboard/heatmap/map/org-admin
  surfaces from this build.
- **Core coworking flows (this is the product):**
  1. **Onboard → start your team.** "What do you need help with?" → 1-click launch the **basic starter team**
     (Assistant + Money helper + Customer replies — new generalist souls, §1). Free, hibernated when idle.
     No vertical/specialist picker in v1.
  2. **Your team (home).** A simple roster of your agent(s) with status ("working / resting"), expressed in
     **plain team language** + **AgentOrb** badges (no robot imagery — per project rule). Tap an agent to chat.
  3. **Give the team a goal.** One text box: "Get me 10 new customers this week" / "Keep my books for June."
     The **autonomous PM** plans it, the **dispatcher** runs the workers — surfaced as a friendly task list
     the owner can watch and approve, not a kanban console.
  4. **Pay / top up in cUSD.** Pay-as-you-go or per-outcome; load cUSD like airtime. Show "gas paid in cUSD"
     so users aren't confused into thinking they need CELO (they don't).
  5. **(optional) Earnings / claim** — "your team earned X, claim it" from the Celo claim vault.
- Currency everywhere in cUSD; large, legible amounts; offline-tolerant where possible.

### 4.6 Manifest / listing ✳
- **No Farcaster manifest needed** here. MiniPay discovery is via the **MiniPay dApp store submission**
  (through the MiniPay/Opera team + Site Tester) — not `/.well-known/farcaster.json`. Keep the app a normal
  responsive web app at a public HTTPS URL; submit that URL.
- Drop `fc:frame` / `base:app_id` meta from this build (Farcaster/Base-specific). Keep standard PWA-ish meta,
  icon, splash, mobile viewport.
- (Optional) **Divvi referral SDK** — MiniPay's builder-reward attribution. Wrap transactions with Divvi to
  qualify for on-chain-usage incentives. Nice-to-have for the grant.

### 4.7 RPC / env
- Celo RPC via Forno (`https://forno.celo.org`) or Alchemy (Alchemy supports Celo). PerkOS already wires
  `NEXT_PUBLIC_ALCHEMY_API_KEY` for Celo — reuse.
- New env: `NEXT_PUBLIC_SITE_URL` = MiniPay launch domain (e.g. `minipay.perkos.xyz`), platform/escrow
  payment address, cUSD address.

---

## 5. Build approach: fork vs. fresh-from-template

| | **Fork PerkOS, add MiniPay flavor** | **Fresh from Celo Composer MiniPay template** |
|---|---|---|
| Speed to wallet/chain | Fast (Celo already wired) | Fast (template is Celo-native) |
| Backend reuse (agents, auth, tools) | **Full** | Must re-wire to PerkOS-API |
| Risk of B2B bloat leaking in | Higher | Lower |
| Mobile-first from day 1 | Must strip desktop UI | Yes, by default |
| Separate dApp-store deploy | Clean if its own repo | Clean |

**Recommendation: new repo `PerkOS-MiniPay/`, forked from PerkOS' code but trimmed to the MiniPay surface**,
pulling the proven libs (`wagmi.ts`, `tokenAddresses.ts`, `walletAuth.ts`, agent/API clients) and a new
mobile shell. Use the Celo Composer MiniPay template only as a **reference** for the connector/fee-currency
wiring, not as the base (we'd lose the PerkOS backend integration). This matches the repo convention
(`PerkOS-xyz/PerkOS-MiniPay`, sibling to PerkOS, PerkOS-Admin, etc.).

---

## 6. Reference: the MiniPay wiring (verified patterns from the docs)

```ts
// Detect MiniPay (synchronous, injected provider)
const isMiniPay = typeof window !== 'undefined' && !!(window as any).ethereum?.isMiniPay;

// wagmi v2 — Celo only, injected connector
import { createConfig, http } from 'wagmi';
import { celo, celoSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [injected({ target: 'metaMask' })], // MiniPay presents an injected provider
  transports: { [celo.id]: http(), [celoSepolia.id]: http() },
});

// Auto-connect (no UI) on load
useEffect(() => { connect({ connector: connectors[0] }); }, [connect, connectors]);

// ERC20 stablecoin transfer with fee abstraction (gas in cUSD) + LEGACY tx
import { encodeFunctionData, parseUnits } from 'viem';
import { stableTokenABI } from '@celo/abis';
const CUSD = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
await walletClient.sendTransaction({
  to: tokenAddress,
  data: encodeFunctionData({ abi: stableTokenABI, functionName: 'transfer',
                             args: [receiver, parseUnits(amount, decimals)] }),
  feeCurrency: CUSD,   // ✳ gas paid in cUSD
  // legacy: do NOT set maxFeePerGas/maxPriorityFeePerGas (C6)
});
```

New dep to add: `@celo/abis` (stable-token ABI + fee-currency helpers).

---

## 7. Testing & submission runbook

1. **Local:** `npm run dev`, expose via `ngrok http 3000`.
2. **Device:** real Android/iOS phone with MiniPay → Settings → About → tap version repeatedly →
   **Developer Settings** → **Site Tester** → paste the ngrok URL. (No emulator — C8.)
3. Toggle **Use Testnet** for Celo Sepolia/Alfajores; fund via `faucet.celo.org`.
4. Validate: implicit connect (no button), Celo-only, cUSD balance reads, a cUSD transfer with
   `feeCurrency` succeeds as a **legacy** tx, signature sign-in completes.
5. **Submit** the production HTTPS URL to the MiniPay dApp store via the MiniPay/Opera team; apply to
   Proof-of-Ship / verda.ventures for incentive funding. Optionally integrate **Divvi** for reward attribution.

---

## 8. Risks & open questions

- **Product fit (biggest):** will a small-business owner trust an **autonomous agent team** to act for their
  business, and is the value legible in <3 screens? The coworking engine exists; the bet is the *framing*
  ("your team") + trust. → recommend a 1-screen concept test of the "pick your team → give it a goal" flow.
- **Latency vs. "team" expectation:** an autonomous goal run (PM plan → dispatch → worker replies) takes
  minutes, and provisioning a fresh team is ~2-3 min. For mobile this must feel async and friendly
  ("your team is on it, we'll ping you"), and lean on **pre-warmed/hibernated** teams (instant wake) rather
  than cold provisioning per user.
- **x402 vs direct transfer:** confirm we can drop x402 inside the wallet and settle server-side from a plain
  cUSD/USDC transfer. (Likely yes.)
- **cUSD-only fee currency:** if a user holds only USDC/USDT, can they still pay gas? Docs say fee currency
  is currently limited to cUSD — users may need a cUSD dust balance. Verify current MiniPay behavior on device.
- **Monetization at this price point:** can a free hibernated team + cUSD micro-top-ups cover infra cost
  without a subscription? Model the unit economics (idle ~$0.02/mo helps a lot) before committing.
- **Allowlist:** opening to MiniPay's public means turning off the alpha gate for this surface — product +
  abuse/rate-limit decision.
- **Receipt anchoring:** deploy anchor to Celo or disable for v1.
- **Naming/decimals drift** (cUSD↔USDm, 18 vs 6 dec, Alfajores↔Sepolia) — single source of truth in
  `tokenAddresses.ts`, unit-test the decimals.

---

## 9. Recommended next steps (coworking MVP path)

1. ~~Decisions~~ **DONE** (§0): monetization = Celo-native cUSD pay-as-you-go + free hibernated starter team;
   templates = basic generalist only (new souls, no marketing/dev). Remaining open item: unit-economics check.
2. **Author the 3 basic souls** (Assistant, Money helper, Customer replies) in English, and **concept-test**
   the core flow on one screen: "start your team → meet them → give a goal." Confirm owners read it as
   "my team," not "a bot."
3. **Scaffold `PerkOS-MiniPay/`** repo: Next.js + wagmi (Celo-only) + `injected` connector + MiniPay host
   adapter + `@celo/abis`; import `walletAuth.ts`, `tokenAddresses.ts` (add cUSD/USDT), and the agent/team
   + PM/dispatcher API clients from PerkOS-API.
4. **Payment + monetization path**: `sendCeloStablecoinTx` helper (cUSD gas, legacy) + server-side settlement
   of cUSD transfers (drop in-wallet x402) + wire **hibernation** so the starter team is ~free when idle.
5. **Coworking mobile shell** (the §4.5 flows: onboard → starter team → your team → give a goal → top up),
   single-column, AgentOrb + team language, cUSD UX.
6. **Add Celo to `wallet-signin`** ERC-1271 chain list; auto-trigger sign-in after implicit connect.
7. **Device-test** via Site Tester + ngrok; iterate. Validate a full goal run end-to-end from the phone.
8. **Submit** to MiniPay dApp store + apply for Proof-of-Ship / verda.ventures funding (optionally add Divvi).

**Effort:** coworking MVP (single agent + 1-click team + goal run + cUSD pay-as-you-go) ≈ **3–4 weeks**,
because the agent/team/PM backend is reused — the build is the mobile shell, the MiniPay host adapter, and the
new payment/monetization path.

---

## 10. Publishing to MiniPay (submission + listing)

MiniPay has its own dev docs + submission portal (separate from the Celo docs):
**docs <https://docs.minipay.xyz>** · **submit form <https://developer.minipay.to/mini-app-listing>**.
There is **no `.well-known` manifest** — you submit a public HTTPS URL via the form, MiniPay reviews + tests it,
sends feedback, and on approval lists it in the in-wallet **Discover** page.

### Listing fields the form asks for
App name · tagline (1–2 sentences) · publisher · **support URL** (Telegram/WhatsApp/email/web) ·
**Terms of Service** link · **Privacy Policy** link · **category** (use `productivity` or `finance`) ·
**App URL** (public HTTPS, must be reachable) · **icon 512×512**.

### Pre-submission technical checklist (must pass, else rejected)
- **Auto-connects** to the wallet — no manual connect button ✅ (`AutoConnect`)
- **HTTPS** only · **mobile-optimized** (≥360×640 viewport) ✅
- **Works on Celo** (mainnet and/or Sepolia) ✅
- Graceful **error handling** on wallet ops
- **PageSpeed Insights** score required for the production URL
- **Network manifest** — document every URL/subdomain/origin/external JS·CSS·API the app calls
  (ours: api.perkos.xyz, the Firebase/Firestore + Google identity origins, Forno RPC, celo token contracts)
- Own **name/logo** — must not look MiniPay-operated ✅ ("PerkOS")
- **Support SLA:** fix reported critical issues within **24h** or the listing is temporarily disabled

### Dependency-security rules (MiniPay hardening — do before submitting)
- **Pin EXACT npm versions** (no `^`/`~` ranges) — we currently pin only `wagmi`; pin the rest
- Enforce a **7-day minimum dependency age** (`.npmrc` `minimumReleaseAge`) + `ignore-scripts=true`
- Commit the lockfile, build with `npm ci`

### Smart contracts
If the app calls any custom contract it must be **verified on Celoscan** with sample tx links. Our payments are
plain ERC20 `transfer`s (no custom contract); the claim vault is already verified — so likely **N/A for v1**.

### Our gap-list before we can submit
1. **Deploy to a public HTTPS host** (e.g. `minipay.perkos.xyz`, Caddy → Next standalone, same VPS pattern).
2. Add **Terms of Service + Privacy Policy** pages and a **support link** in-app.
3. Produce a **512×512 icon** + the listing copy (name/tagline/category).
4. **Pin exact deps** + add `.npmrc` (release-age + ignore-scripts); rebuild with `npm ci`.
5. Run **PageSpeed**; write the **network manifest**.
6. Then submit the URL at the form and (separately) apply to **Proof-of-Ship / verda.ventures**.

---

## Sources

- MiniPay overview — <https://docs.celo.org/build/build-on-minipay/overview>
- MiniPay quickstart — <https://docs.celo.org/build/build-on-minipay/quickstart>
- ngrok / prerequisites — <https://docs.celo.org/build/build-on-minipay/prerequisites/ngrok-setup>
- Celo Composer MiniPay template — <https://github.com/celo-org/minipay-template>
- MiniDApps reference — <https://github.com/celo-org/minipay-minidapps>
- Fee abstraction — <https://docs.celo.org/build-on-celo/fee-abstraction/overview>
- Proof-of-Ship grants — <https://www.celopg.eco/programs/proof-of-ship-s1>
- $1M builder incentive (2026) — <https://press.opera.com/2026/04/22/minipay-builders-incentive-and-roadshow/>
- MiniPay dev docs — <https://docs.minipay.xyz> · submit your Mini App — <https://docs.minipay.xyz/getting-started/submit-your-miniapp.html>
- MiniPay listing form — <https://developer.minipay.to/mini-app-listing>
- PerkOS code: `PerkOS/app/lib/{wagmi,tokenAddresses,walletAuth,receiptAnchor}.ts`,
  `PerkOS/app/components/{AutoConnect,NetworkPill}.tsx`, `PerkOS/app/lib/useIsInMiniApp.ts`,
  `PerkOS/app/api/auth/{nonce,wallet-signin}/route.ts`
