import {
  createWalletClient,
  createPublicClient,
  http,
  HDAccount,
  PrivateKeyAccount,
  encodeFunctionData,
  zeroAddress,
  getContractAddress,
  toBytes,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  encodeDeployData,
  TransactionReceipt,
} from "viem"
import { mnemonicToAccount, MnemonicToAccountOptions, privateKeyToAccount } from "viem/accounts"
import * as viemChains from "viem/chains"
import { GnosisSafeL2, GnosisSafeProxy, GnosisSafeProxyFactory } from "./contracts/v1.3.0"

type ViemChainNames = (keyof typeof viemChains)[]

type BaseParams<Chains extends ViemChainNames> = {
  chains: Chains
  owners: `0x${string}`[]
  threshold: bigint
  nonce: bigint
}

type MnemonicParams<Chains extends ViemChainNames> = BaseParams<Chains> & {
  mnemonic: string
  mnemonicOpts?: MnemonicToAccountOptions
  privateKey?: never
}

type PrivateKeyParams<Chains extends ViemChainNames> = BaseParams<Chains> & {
  privateKey: `0x${string}`
  mnemonic?: never
  mnemonicOpts?: never
}

// v1.3.0 addresses across chains for canonical deployments.
// https://github.com/safe-global/safe-deployments/tree/main/src/assets/v1.3.0
const PROXY_FACTORY_ADDRESS = "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2"
const SAFE_L2_ADDRESS = "0x3E5c63644E683549055b9Be8653de26E0B4CD36E"
const FALLBACK_HANDLER_ADDRESS = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"

export function calculateAddress(owners: `0x${string}`[], threshold: bigint, nonce: bigint): `0x${string}` {
  return getContractAddress({
    opcode: "CREATE2",
    bytecodeHash: keccak256(encodeDeployData({ ...GnosisSafeProxy, args: [SAFE_L2_ADDRESS] })),
    from: PROXY_FACTORY_ADDRESS,
    salt: toBytes(
      keccak256(
        encodeAbiParameters(parseAbiParameters("bytes32, uint256"), [
          keccak256(
            encodeFunctionData({
              abi: GnosisSafeL2.abi,
              functionName: "setup",
              args: [owners, threshold, zeroAddress, "0x", FALLBACK_HANDLER_ADDRESS, zeroAddress, 0n, zeroAddress],
            }),
          ),
          nonce,
        ]),
      ),
    ),
  })
}

export async function deploy<Chains extends ViemChainNames>(params: MnemonicParams<Chains> | PrivateKeyParams<Chains>) {
  let account: HDAccount | PrivateKeyAccount
  if (params.mnemonic) {
    account = mnemonicToAccount(params.mnemonic, params.mnemonicOpts)
  } else {
    account = privateKeyToAccount(params.privateKey)
  }
  const data = encodeFunctionData({
    abi: GnosisSafeL2.abi,
    functionName: "setup",
    args: [params.owners, params.threshold, zeroAddress, "0x", FALLBACK_HANDLER_ADDRESS, zeroAddress, 0n, zeroAddress],
  })
  const args = {
    address: PROXY_FACTORY_ADDRESS,
    abi: GnosisSafeProxyFactory.abi,
    functionName: "createProxyWithNonce",
    args: [SAFE_L2_ADDRESS, data, params.nonce],
  } as const
  const expectedAddress = calculateAddress(params.owners, params.threshold, params.nonce)
  console.log(`Safe will be created at ${expectedAddress} across chains`)
  for (const chainName of params.chains) {
    const chain = viemChains[chainName]
    const publicClient = createPublicClient({ chain, transport: http() })
    const { result } = await publicClient.simulateContract(args)
    if (expectedAddress !== result) {
      throw new Error(`Expected address ${expectedAddress} but got ${result} in chain ${chain.name}`)
    }
    console.log(`Expected address ${expectedAddress} in chain ${chain.name}`)
  }
  const receipts: { [key in Chains[number]]: TransactionReceipt } = {} as any
  for (const chainName of params.chains) {
    console.log(`Creating Safe in chain ${chainName}`)
    const chain = viemChains[chainName]
    const publicClient = createPublicClient({ chain, transport: http() })
    const walletClient = createWalletClient({ chain, account, transport: http() })
    const hash = await walletClient.writeContract({ chain, account, ...args })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Created Safe at ${expectedAddress} in chain ${chain.name}`)
    receipts[chainName] = receipt
  }
  return { address: expectedAddress, receipts }
}
