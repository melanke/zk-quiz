import { buildPoseidon } from "circomlibjs";
import { initialize } from "zokrates-js";

let cachedKeypair: any = null;
let cachedCircuitCode: string | null = null;

/**
 * Type helper to create a tuple of specified length filled with bigint
 */
type BigIntTuple<N extends number, T extends readonly bigint[] = []> = T["length"] extends N
  ? T
  : BigIntTuple<N, readonly [...T, bigint]>;

/**
 * Structure representing a zero-knowledge proof compatible with AnswerVerifier contract
 * @template InputCount - The number of public inputs expected by the circuit
 */
export type Proof<InputCount extends number = number> = {
  proof: {
    a: { X: bigint; Y: bigint };
    b: { X: readonly [bigint, bigint]; Y: readonly [bigint, bigint] };
    c: { X: bigint; Y: bigint };
  };
  inputs: InputCount extends number ? BigIntTuple<InputCount> : readonly bigint[];
};

/**
 * Generates a zero-knowledge proof using the specified circuit and arguments
 *
 * @template InputCount - The number of public inputs expected by the circuit
 * @param circuitName - Name of the circuit (without .zok extension)
 * @param args - Array of string arguments to pass to the circuit
 * @returns Promise resolving to a zero-knowledge proof with type-safe input count
 */
export async function generateProof<InputCount extends number = number>(
  circuitName: string,
  args: string[],
): Promise<Proof<InputCount>> {
  const zokrates = await initialize();
  const circuitCode = await loadCircuitCode(circuitName);
  const artifacts = zokrates.compile(circuitCode);
  const keypair = await loadKeypair(circuitName);

  const { witness } = zokrates.computeWitness(artifacts, args);
  const rawProof = zokrates.generateProof(artifacts.program, witness, keypair.pk);
  return formatProof<InputCount>(rawProof);
}

/**
 * Generates a Poseidon hash of a BigInt using the circomlibjs library
 *
 * @param secret - The BigInt to be hashed
 * @returns A Promise that resolves to the Poseidon hash as BigInt
 *
 * @example
 * ```typescript
 * const secret = 32762643843461683n;
 * const hash = await poseidonHashBigInt(secret);
 * // hash: 19052927052134838559015530275350142770733084377916632950657130648826802161200n
 * ```
 */
export async function poseidonHashBigInt(secret: bigint): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const hash = poseidon([secret]);
  return poseidon.F.toObject(hash);
}

/**
 * Converts a string to a BigInt through UTF-8 encoding
 *
 * @param str - The string to be converted
 * @returns The BigInt representing the encoded string
 *
 * @example
 * ```typescript
 * const result = strToBigInt("test123");
 * // result: 32762643843461683n
 * ```
 */
export function strToBigInt(str: string): bigint {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  let strBigInt = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    strBigInt = (strBigInt << BigInt(8)) + BigInt(bytes[i]);
  }
  return strBigInt;
}

/**
 * Loads and caches the circuit code from public files
 *
 * @param circuitName - Name of the circuit (without .zok extension)
 * @returns Promise resolving to the circuit code as string
 */
async function loadCircuitCode(circuitName: string): Promise<string> {
  if (!cachedCircuitCode) {
    const response = await fetch(`/circuits/${circuitName}.zok`);
    if (!response.ok) {
      throw new Error(`Failed to load circuit: ${response.statusText}`);
    }
    cachedCircuitCode = await response.text();
  }
  return cachedCircuitCode;
}

/**
 * Loads and caches the proving and verification keypairs from public files
 *
 * @param circuitName - Name of the circuit (without .zok extension)
 * @returns Promise resolving to an object containing proving key (pk) and verification key (vk)
 */
async function loadKeypair(circuitName: string) {
  if (!cachedKeypair) {
    const provingKeyResponse = await fetch(`/circuits/keys/${circuitName}.proving.key`);
    const provingKeyBuffer = await provingKeyResponse.arrayBuffer();

    const verificationKeyResponse = await fetch(`/circuits/keys/${circuitName}.verification.key`);
    const verificationKeyBuffer = await verificationKeyResponse.arrayBuffer();

    const provingKeyUint8 = new Uint8Array(provingKeyBuffer);
    const verificationKeyUint8 = new Uint8Array(verificationKeyBuffer);

    cachedKeypair = {
      pk: provingKeyUint8,
      vk: verificationKeyUint8,
    };
  }
  return cachedKeypair;
}

/**
 * Formats raw proof data from ZoKrates into the expected Proof type structure
 *
 * @template InputCount - The number of public inputs expected by the circuit
 * @param rawProof - Raw proof object from ZoKrates
 * @returns Formatted proof with BigInt values compatible with AnswerVerifier contract
 */
function formatProof<InputCount extends number = number>(rawProof: any): Proof<InputCount> {
  const { a, b, c } = rawProof.proof;

  return {
    proof: {
      a: { X: BigInt(a[0]), Y: BigInt(a[1]) },
      b: { X: b[0].map(BigInt), Y: b[1].map(BigInt) },
      c: { X: BigInt(c[0]), Y: BigInt(c[1]) },
    },
    inputs: rawProof.inputs.map(BigInt),
  };
}
