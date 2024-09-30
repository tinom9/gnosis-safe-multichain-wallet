import {
  createWalletClient,
  createPublicClient,
  http,
  HDAccount,
  PrivateKeyAccount,
  encodeFunctionData,
  zeroAddress,
} from "viem"
import { mnemonicToAccount, MnemonicToAccountOptions, privateKeyToAccount } from "viem/accounts"
import * as viemChains from "viem/chains"
import { GnosisSafeL2, GnosisSafeProxyFactory } from "./abis/v1.3.0"

type BaseParams = {
  chains: (keyof typeof viemChains)[]
  owners: `0x${string}`[]
  threshold: bigint
  nonce: bigint
}

type MnemonicParams = BaseParams & {
  mnemonic: string
  mnemonicOpts?: MnemonicToAccountOptions
  privateKey?: never
}

type PrivateKeyParams = BaseParams & {
  privateKey: `0x${string}`
  mnemonic?: never
  mnemonicOpts?: never
}

const PROXY_FACTORY_ADDRESS = "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2"
const SAFE_L2_ADDRESS = "0x3E5c63644E683549055b9Be8653de26E0B4CD36E"
const FALLBACK_HANDLER_ADDRESS = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"

async function main(params: MnemonicParams | PrivateKeyParams) {
  let account: HDAccount | PrivateKeyAccount
  if (params.mnemonic) {
    account = mnemonicToAccount(params.mnemonic, params.mnemonicOpts)
  } else {
    account = privateKeyToAccount(params.privateKey)
  }
  const data = encodeFunctionData({
    abi: GnosisSafeL2,
    functionName: "setup",
    args: [params.owners, params.threshold, zeroAddress, "0x", FALLBACK_HANDLER_ADDRESS, zeroAddress, 0n, zeroAddress],
  })
  const args = {
    address: PROXY_FACTORY_ADDRESS,
    abi: GnosisSafeProxyFactory,
    functionName: "createProxyWithNonce",
    args: [SAFE_L2_ADDRESS, data, params.nonce],
  } as const
  let expectedAddress: `0x${string}`
  for (const chainName of params.chains) {
    const chain = viemChains[chainName]
    const publicClient = createPublicClient({ chain, transport: http() })
    const { result } = await publicClient.simulateContract(args)
    if (!expectedAddress) {
      expectedAddress = result
    } else if (expectedAddress !== result) {
      throw new Error(`Expected address ${expectedAddress} but got ${result} in chain ${chain.name}`)
    }
    console.log(`Expected address ${expectedAddress} in chain ${chain.name}`)
  }
  for (const chainName of params.chains) {
    console.log(`Creating Safe in chain ${chainName}`)
    const chain = viemChains[chainName]
    const publicClient = createPublicClient({ chain, transport: http() })
    const walletClient = createWalletClient({ chain, account, transport: http() })
    const hash = await walletClient.writeContract({ chain, account, ...args })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Created Safe at ${expectedAddress} in chain ${chain.name}`)
  }
}
