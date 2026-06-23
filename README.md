# PerkOS-MiniPay

**Your AI team, in your pocket.** A coworking of agents for your small business — built on **Celo** and
delivered as a Mini App inside **Opera MiniPay**.

This is the Celo/MiniPay build of [PerkOS](https://app.perkos.xyz): a small-business owner can launch a
free **starter team** of basic helper agents (Assistant, Money helper, Customer replies), give them a goal
in plain words, and pay only for the work — in **cUSD**, pay-as-you-go.

> Full research, constraints, and the adaptation plan: [`docs/PERKOS-MINIPAY-RESEARCH.md`](docs/PERKOS-MINIPAY-RESEARCH.md).

## Locked product decisions

- **Monetization — Celo-native, no subscription.** No x402, no $29/mo container. Everything is **cUSD
  pay-as-you-go** (gas paid in cUSD via fee abstraction), settled by on-chain transfers verified
  server-side. The starter team is **free** (hibernated when idle, ~$0.02/mo).
- **Templates — basic generalist only.** No specialized teams needing marketing or developer skills.
  v1 = Assistant · Money helper · Customer replies (new generalist souls).

## MiniPay rules baked into the code

| Rule | Where it lives |
|------|----------------|
| Implicit connection — no "Connect Wallet" button | [`app/components/AutoConnect.tsx`](app/components/AutoConnect.tsx) |
| Detect MiniPay via `window.ethereum.isMiniPay` | [`app/lib/useIsMiniPay.ts`](app/lib/useIsMiniPay.ts) |
| Celo-only chains + injected connector | [`app/lib/wagmi.ts`](app/lib/wagmi.ts) |
| Stablecoins + decimals (cUSD=18, USDC/USDT=6) | [`app/lib/tokenAddresses.ts`](app/lib/tokenAddresses.ts) |
| Gas in cUSD (`feeCurrency`) + legacy tx only | [`app/lib/celo.ts`](app/lib/celo.ts) |
| Mobile-first shell | [`app/globals.css`](app/globals.css), [`app/page.tsx`](app/page.tsx) |

## Tech stack

Next.js 15 (App Router) · React 19 · wagmi 3 · viem 2 · TanStack Query · Tailwind v4.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run build
```

### Test inside MiniPay

You cannot use an emulator. On a real Android/iOS device with MiniPay:

1. Expose your dev server: `ngrok http 3000`.
2. MiniPay → Settings → About → tap the version repeatedly → **Developer Settings** → **Site Tester**.
3. Paste the ngrok URL. Toggle **Use Testnet** for Celo Sepolia/Alfajores; fund via
   [faucet.celo.org](https://faucet.celo.org).

## Branch workflow

`main` is the baseline. All work happens on feature branches → PR → `main`.
Commits are authored by **JulioMCruz** (no `Co-Authored-By` trailers), per the PerkOS convention.
