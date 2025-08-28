import { generateProof, poseidonHashBigInt, strToBigInt } from "./zk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read real keypair and circuit data from the project
const provingKeyPath = path.join(__dirname, "../public/circuits/keys/AnswerVerifier.proving.key");
const verificationKeyPath = path.join(__dirname, "../public/circuits/keys/AnswerVerifier.verification.key");
const circuitPath = path.join(__dirname, "../public/circuits/AnswerVerifier.zok");

const realProvingKey = fs.readFileSync(provingKeyPath);
const realVerificationKey = fs.readFileSync(verificationKeyPath);
const realCircuitCode = fs.readFileSync(circuitPath, "utf8");

// Mock only fetch for keypair loading
const originalFetch = global.fetch;
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeAll(() => {
  global.fetch = mockFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("zk", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fetch mocks for circuit code and keypair files using real data
    mockFetch.mockImplementation(url => {
      if (url === "/circuits/AnswerVerifier.zok") {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(realCircuitCode),
        } as unknown as Response);
      }
      if (url === "/circuits/keys/AnswerVerifier.proving.key") {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(realProvingKey.buffer),
        } as unknown as Response);
      }
      if (url === "/circuits/keys/AnswerVerifier.verification.key") {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(realVerificationKey.buffer),
        } as unknown as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });
  });

  describe("generateProof", () => {
    it("should generate proof with the provided test data", async () => {
      const circuitName = "AnswerVerifier";
      const args = [
        "32762643843461683", // answer (private)
        "12345", // address (public)
        "19052927052134838559015530275350142770733084377916632950657130648826802161200", // expectedAnswerHash (public)
      ];

      // This will use real ZoKrates but mocked keypair loading
      const result = await generateProof(circuitName, args);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.inputs).toBeDefined();

      // Verify the structure
      expect(typeof result.proof.a.X).toBe("bigint");
      expect(typeof result.proof.a.Y).toBe("bigint");
      expect(Array.isArray(result.proof.b.X)).toBe(true);
      expect(Array.isArray(result.proof.b.Y)).toBe(true);
      expect(typeof result.proof.c.X).toBe("bigint");
      expect(typeof result.proof.c.Y).toBe("bigint");
      expect(Array.isArray(result.inputs)).toBe(true);
      expect(result.inputs).toHaveLength(3);

      // Verify fetch was called for circuit and keypair files
      expect(mockFetch).toHaveBeenCalledWith("/circuits/AnswerVerifier.zok");
      expect(mockFetch).toHaveBeenCalledWith("/circuits/keys/AnswerVerifier.proving.key");
      expect(mockFetch).toHaveBeenCalledWith("/circuits/keys/AnswerVerifier.verification.key");
    }, 30000); // 30s timeout for ZoKrates operations

    it("should handle different address values", async () => {
      const circuitName = "AnswerVerifier";
      const args = [
        "32762643843461683", // answer (private)
        "999888777", // address (public) - different value
        "19052927052134838559015530275350142770733084377916632950657130648826802161200", // expectedAnswerHash (public)
      ];

      const result = await generateProof(circuitName, args);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.inputs).toBeDefined();
    }, 30000);

    it("should handle valid test case with different values", async () => {
      // Calculate the actual Poseidon hash of 123
      const expectedAnswerHash = await poseidonHashBigInt(123n);

      const circuitName = "AnswerVerifier";
      const args = [
        "123", // answer (private)
        "456", // address (public)
        expectedAnswerHash.toString(), // expectedAnswerHash (public)
      ];

      const result = await generateProof(circuitName, args);

      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.inputs).toBeDefined();
    }, 30000);
  });

  describe("poseidonHashBigInt", () => {
    it("should generate consistent hash for the same input", async () => {
      const input = 123n;
      const hash1 = await poseidonHashBigInt(input);
      const hash2 = await poseidonHashBigInt(input);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("bigint");
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await poseidonHashBigInt(123n);
      const hash2 = await poseidonHashBigInt(456n);

      expect(hash1).not.toBe(hash2);
    });

    it("should match the expected hash for test data", async () => {
      const input = 32762643843461683n;
      const expectedHash = 19052927052134838559015530275350142770733084377916632950657130648826802161200n;

      const actualHash = await poseidonHashBigInt(input);
      expect(actualHash).toBe(expectedHash);
    });
  });

  describe("strToBigInt", () => {
    it("should convert string to bigint correctly", () => {
      const result = strToBigInt("test123");
      expect(typeof result).toBe("bigint");
      expect(result).toBe(32762643843461683n);
    });

    it("should handle empty string", () => {
      const result = strToBigInt("");
      expect(result).toBe(0n);
    });

    it("should handle single character", () => {
      const result = strToBigInt("a");
      expect(result).toBe(97n); // ASCII value of 'a'
    });

    it("should be deterministic", () => {
      const str = "hello world";
      const result1 = strToBigInt(str);
      const result2 = strToBigInt(str);
      expect(result1).toBe(result2);
    });
  });

  describe("File loading validation", () => {
    it("should use real circuit and keypair data", async () => {
      // Verify the circuit code was loaded correctly
      expect(realCircuitCode).toBeDefined();
      expect(realCircuitCode.length).toBeGreaterThan(0);
      expect(realCircuitCode).toContain('import "hashes/poseidon/poseidon.zok"');
      expect(realCircuitCode).toContain("def main");

      // Verify the keys were loaded correctly
      expect(realProvingKey).toBeDefined();
      expect(realVerificationKey).toBeDefined();
      expect(realProvingKey.length).toBeGreaterThan(0);
      expect(realVerificationKey.length).toBeGreaterThan(0);

      // Verify they are different files
      expect(realProvingKey.length).not.toBe(realVerificationKey.length);
    });
  });
});
