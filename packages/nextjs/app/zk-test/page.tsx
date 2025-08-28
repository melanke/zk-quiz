"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { type Proof, generateProof, poseidonHashBigInt, strToBigInt } from "~~/utils/zk";

export default function ZKTest() {
  const [answer, setAnswer] = useState("");
  const [expectedAnswerHash, setExpectedAnswerHash] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [proof, setProof] = useState<Proof<3> | null>(null);
  const [isGeneratingHash, setIsGeneratingHash] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const { address } = useAccount();

  const { data: isVerified } = useScaffoldReadContract({
    contractName: "AnswerVerifier",
    functionName: "verifyTx",
    args: [proof?.proof, proof?.inputs],
    query: {
      enabled: !!proof,
    },
  });

  // Generate random answer on page load
  useEffect(() => {
    generateRandomAnswer();
  }, []);

  // Set user address when wallet connects
  useEffect(() => {
    if (address) {
      setUserAddress(address);
    }
  }, [address]);

  const generateRandomAnswer = () => {
    const randomWords = [
      "quantum",
      "stellar",
      "cosmic",
      "digital",
      "neural",
      "cyber",
      "atomic",
      "fusion",
      "matrix",
      "nexus",
      "cipher",
      "vortex",
      "phoenix",
      "eclipse",
      "prism",
      "zenith",
    ];

    const word1 = randomWords[Math.floor(Math.random() * randomWords.length)];
    const word2 = randomWords[Math.floor(Math.random() * randomWords.length)];
    const number = Math.floor(Math.random() * 1000);

    const randomAnswer = `${word1}${word2}${number}`;
    setAnswer(randomAnswer);
    setExpectedAnswerHash("");
    setProof(null);
  };

  const handleGenerateHash = async () => {
    if (!answer) return;

    setIsGeneratingHash(true);
    try {
      const answerBigInt = strToBigInt(answer);
      const hash = await poseidonHashBigInt(answerBigInt);
      setExpectedAnswerHash(hash.toString());
    } catch (error) {
      console.error("Error generating hash:", error);
      toast.error("Failed to generate hash");
    } finally {
      setIsGeneratingHash(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!answer || !expectedAnswerHash || !userAddress) {
      toast.error("Please fill all fields and generate hash first");
      return;
    }

    setIsGeneratingProof(true);
    try {
      const answerBigInt = strToBigInt(answer);
      const addressBigInt = BigInt(userAddress);

      const args = [answerBigInt.toString(), addressBigInt.toString(), expectedAnswerHash];

      const generatedProof = await generateProof<3>("AnswerVerifier", args);
      setProof(generatedProof);
    } catch (error) {
      console.error("Error generating proof:", error);
      toast.error("Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-8">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">ZK Proof Test</span>
          <span className="block text-2xl mb-2">Answer Verification System</span>
        </h1>

        <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center w-full rounded-3xl shadow-lg">
          {/* Step 1: Random Answer */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-bold mb-4">📝 Step 1: Answer</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Your answer"
                className="input input-bordered w-full max-w-md"
                readOnly
              />
              <button onClick={generateRandomAnswer} className="btn btn-primary">
                Generate Random Answer
              </button>
            </div>
          </div>

          {/* Step 2: Generate Hash */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-bold mb-4">🔐 Step 2: Expected Answer Hash</h2>
            <div className="flex flex-col gap-4 items-center">
              <input
                type="text"
                value={expectedAnswerHash}
                placeholder="Hash will appear here..."
                className="input input-bordered w-full max-w-2xl font-mono text-sm"
                readOnly
              />
              <button
                onClick={handleGenerateHash}
                disabled={!answer || isGeneratingHash}
                className={`btn btn-secondary ${isGeneratingHash ? "loading" : ""}`}
              >
                {isGeneratingHash ? "Generating..." : "Generate Hash"}
              </button>
            </div>
          </div>

          {/* Step 3: Address Input */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-bold mb-4">👤 Step 3: Address</h2>
            <div className="flex flex-col gap-4 items-center">
              <AddressInput value={userAddress} onChange={setUserAddress} placeholder="Enter your address" />
              {address && (
                <div className="text-sm text-gray-600">
                  Connected: <Address address={address} />
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Generate Proof */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-bold mb-4">🔒 Step 4: Generate ZK Proof</h2>
            <div className="flex flex-col gap-4 items-center">
              <button
                onClick={handleGenerateProof}
                disabled={!answer || !expectedAnswerHash || !userAddress || isGeneratingProof}
                className={`btn btn-accent ${isGeneratingProof ? "loading" : ""}`}
              >
                {isGeneratingProof ? "Generating Proof..." : "Generate Proof"}
              </button>

              {proof && (
                <div className="bg-base-200 p-4 rounded-lg w-full max-w-2xl">
                  <h3 className="font-bold mb-2">Generated Proof:</h3>
                  <pre className="text-xs overflow-auto max-h-40 text-left">
                    {JSON.stringify(proof, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Step 5: Submit Proof */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-bold mb-4">🚀 Step 5: Submit to Contract</h2>
            <div className="flex flex-col gap-4 items-center">
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-value text-primary">
                    {isVerified ? "Valid Proof" : isVerified === false ? "Invalid Proof" : "Not Verified"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-full mt-8 text-left">
            <div className="alert alert-info">
              <div>
                <h3 className="font-bold">How it works:</h3>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Generate a random answer string</li>
                  <li>Create a Poseidon hash of the answer</li>
                  <li>Set your wallet address</li>
                  <li>Generate a ZK proof that you know the answer without revealing it</li>
                  <li>Submit the proof to the Quiz smart contract</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
