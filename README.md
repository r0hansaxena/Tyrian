# Tyrian

Tyrian is a stealth payment protocol built on Monad Testnet. It lets senders transfer native MON to a one-time stealth address that only the intended recipient can discover and sweep — without linking the sender, receiver, or amount on-chain.

## How it works

1. The recipient registers a stealth meta-address (spending key + viewing key) in the `StealthRegistry` contract.
2. The sender derives a one-time stealth address from the recipient's public keys and sends MON to it.
3. The sender calls `announce()` (or `sendAndAnnounce()`) to publish the ephemeral public key on-chain.
4. The recipient scans `Announcement` events, derives each stealth address from their viewing key, and finds the one that matches.
5. The recipient sweeps the funds using the derived private key.

No one observing the chain can link the stealth address back to the recipient's identity.

## Tech stack

- **Framework:** Next.js (Pages Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Privy Auth
- **Blockchain:** Monad Testnet (Chain ID: 10143)
- **Blockchain library:** Ethers v6
- **Smart contract:** `StealthRegistry.sol` (Solidity 0.8.20)
- **Deployed contract:** `0x597c52E163C15e221AB1c7b8eA09FB6a6088c29B`

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+
- A [Privy](https://privy.io) account with an app created
- Testnet MON from the [Monad Faucet](https://faucet.monad.xyz)

### 1. Clone the repository

```bash
git clone <repository-url>
cd Tyrian
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
```

Get your credentials from the [Privy Dashboard](https://dashboard.privy.io/) under Settings > API Keys.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
Tyrian/
├── contracts/
│   └── StealthRegistry.sol   # Core stealth payment registry contract
├── lib/
│   └── contracts.ts          # Contract ABI and deployed address
├── pages/
│   ├── _app.tsx              # App root with PrivyProvider configuration
│   ├── index.tsx             # Landing page
│   ├── dashboard.tsx         # Send, scan, and sweep stealth payments
│   └── api/
│       └── verify.ts         # Server-side auth token verification
├── components/               # UI components
├── styles/
│   └── globals.css
├── .env.example
└── package.json
```

## Monad Testnet

| Property | Value |
|---|---|
| Chain ID | 10143 |
| RPC URL | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |
| Faucet | https://faucet.monad.xyz |
| Currency | MON (18 decimals) |

## Deployment

### Vercel

1. Push to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the environment variables (`NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`).
4. Deploy.

### Other platforms

Any platform that supports Next.js works. Set the build command to `npm run build` and the start command to `npm start`.

## Security notes

- Never commit `.env.local` to version control.
- `PRIVY_APP_SECRET` is server-side only — never expose it to the client.
- This app runs on Monad **Testnet**. Do not use real funds.

## Resources

- [Privy Documentation](https://docs.privy.io/)
- [Monad Documentation](https://docs.monad.xyz/)
- [Ethers v6 Documentation](https://docs.ethers.org/v6/)
- [ERC-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
