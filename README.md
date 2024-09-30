# Gnosis Safe Multichain Wallet

Deploy `GnosisSafeL2` wallets at multiple chains with the same address.

## Usage

Install dependencies, and call `main` at [src/index.ts](./src/index.ts).

```sh
yarn
```

```ts
// src/index.ts

main({
  chains: ["arbitrumSepolia", "sepolia", "polygonAmoy", "avalancheFuji"],
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  owners: ["0xYourFirstOwner", "0xYourSecondOwner"],
  threshold: 2n,
  nonce: 1337n,
})
  .then(() => process.exit())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

```sh
yarn deploy
```
