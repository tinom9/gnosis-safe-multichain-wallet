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

First, add your function call.

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

Then, execute it.

```sh
yarn ts-node src/index.ts
```

## Usage via CLI

```sh
yarn cli calculate-address -o 0xYourFirstOwner 0xYourSecondOwner -t 2 -n 1337
yarn cli find-vanity-address -o 0xYourFirstOwner 0xYourSecondOwner -t 2 -v abc123
yarn cli deploy \
  -c arbitrumSepolia sepolia polygonAmoy avalancheFuji \
  -o 0xYourFirstOwner 0xYourSecondOwner \
  -t 2 \
  -n 1337 \
  -k 0xYourPrivateKey
yarn cli deploy \
  -c arbitrumSepolia sepolia polygonAmoy avalancheFuji \
  -o 0xYourFirstOwner 0xYourSecondOwner \
  -t 2 \
  -n 1337 \
  -m 'test test test test test test test test test test test junk'
```
