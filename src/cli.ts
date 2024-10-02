import { Command } from "commander"
import { z } from "zod"
import * as viemChains from "viem/chains"
import { calculateAddress, deploy } from "."

function validateObject(schema: any, obj: unknown): { parsed: any | null; isValid: boolean } {
  const result = schema.safeParse(obj)
  if (result.success) {
    return { parsed: result.data, isValid: true }
  } else {
    result.error.errors.forEach((err: any) => {
      if (err.message === "Invalid" || err.message === "Invalid input") {
        console.error(`Invalid ${err.path.join(".")} parameter`)
      } else {
        console.error(err.message)
      }
    })
    return { parsed: null, isValid: false }
  }
}

const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/)
const bigintStringSchema = z
  .string()
  .refine((val) => {
    try {
      BigInt(val)
      return true
    } catch {
      return false
    }
  })
  .transform((val) => BigInt(val))

const program = new Command()

program.description("CLI to deploy and calculate addresses of Gnosis Safe wallets")

program
  .command("calculate-address")
  .description("Calculate a Gnosis Safe wallet address based on owners, threshold, and nonce")
  .requiredOption("-o, --owners <addresses...>", "list of owners (Ethereum addresses)")
  .requiredOption("-t, --threshold <threshold>", "threshold (bigint)")
  .requiredOption("-n, --nonce <nonce>", "nonce (bigint)")
  .action((options) => {
    const schema = z.object({
      owners: z.array(ethereumAddressSchema),
      threshold: bigintStringSchema,
      nonce: bigintStringSchema,
    })
    const validation = validateObject(schema, options)
    if (!validation.isValid) {
      return
    }
    const { owners, threshold, nonce } = validation.parsed
    const address = calculateAddress(owners, threshold, nonce)
    console.log(address)
  })

program
  .command("deploy")
  .description("Deploy a Gnosis Safe wallet with either mnemonic or private key")
  .requiredOption("-c, --chains <chains...>", "list of chains (e.g. ethereum, polygon)")
  .requiredOption("-o, --owners <addresses...>", "list of owners (Ethereum addresses)")
  .requiredOption("-t, --threshold <threshold>", "threshold (bigint)")
  .requiredOption("-n, --nonce <nonce>", "nonce (bigint)")
  .option("-m, --mnemonic <mnemonic>", "mnemonic for the account")
  .option("-k, --privateKey <privateKey>", "private key for the account")
  .action(async (options) => {
    const schema = z
      .object({
        chains: z.array(z.enum(Object.keys(viemChains) as any)),
        owners: z.array(ethereumAddressSchema),
        threshold: bigintStringSchema,
        nonce: bigintStringSchema,
        mnemonic: z.string().optional(),
        privateKey: z
          .string()
          .regex(/^0x[a-fA-F0-9]{64}$/)
          .optional(),
      })
      .refine((data) => data.mnemonic || data.privateKey, {
        message: "Either mnemonic or private key must be provided",
        path: ["mnemonic", "privateKey"],
      })
    const validation = validateObject(schema, options)
    if (!validation.isValid) {
      return
    }
    const { chains, owners, threshold, nonce, mnemonic, privateKey } = validation.parsed
    await deploy({ chains, owners, threshold, nonce, ...(mnemonic ? { mnemonic } : { privateKey }) })
    process.exit(0)
  })

program.parse(process.argv)
