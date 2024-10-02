# Gnosis Safe Multichain Wallet

Deploy `GnosisSafeL2` wallets at multiple chains with the same address.

Using version v1.3.0.

## Set-up

Install dependencies.

```sh
yarn
```

## Usage via TS code

Call `deploy` at [src/index.ts](./src/index.ts).

```ts
// src/index.ts

deploy({
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

A shortcut to execute the TS file.

```sh
yarn deploy
```
