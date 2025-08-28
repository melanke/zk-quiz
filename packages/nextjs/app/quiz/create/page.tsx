"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { hasQuestionStored, markQuestionSubmitted, saveQuestion } from "~~/utils/localStorage";
import { poseidonHashBigInt, strToBigInt } from "~~/utils/zk";

// Removed stringToBytes32 function as questions are now stored as strings

export default function CreateQuestionPage() {
  const { address } = useAccount();
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerHash, setAnswerHash] = useState<string>("");
  const [questionExists, setQuestionExists] = useState(false);
  const [alreadyStored, setAlreadyStored] = useState(false);

  const { writeContractAsync: write } = useScaffoldWriteContract({
    contractName: "Quiz",
  });

  // Check if question exists in contract
  const { data: existingQuestion } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(answerHash)],
    query: {
      enabled: !!answerHash,
    },
  });

  const handleCalculateHash = async () => {
    if (!answer.trim()) {
      alert("Please enter an answer.");
      return;
    }

    setIsCalculating(true);

    try {
      // Convert answer to BigInt and hash it
      const answerBigInt = strToBigInt(answer.trim());
      const hashedAnswer = await poseidonHashBigInt(answerBigInt);
      const hashString = hashedAnswer.toString();

      setAnswerHash(hashString);

      // Check if already stored locally
      const stored = hasQuestionStored(hashString);
      setAlreadyStored(stored);

      // The useScaffoldReadContract will automatically check if it exists in contract
    } catch (error) {
      console.error("Error calculating hash:", error);
      alert("Error calculating answer hash.");
    } finally {
      setIsCalculating(false);
    }
  };

  // Check if question exists in contract when answerHash changes
  useState(() => {
    if (existingQuestion) {
      setQuestionExists(true);
      // If exists and not stored locally, save it
      if (!alreadyStored && question && answer) {
        saveQuestion(answerHash, question, answer);
        setAlreadyStored(true);
      }
    } else {
      setQuestionExists(false);
    }
  });

  const handleSubmitQuestion = async () => {
    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!question.trim() || !answer.trim()) {
      alert("Please fill in all fields.");
      return;
    }

    if (!answerHash) {
      alert("Please calculate the hash first.");
      return;
    }

    if (questionExists) {
      alert("This question already exists in the contract!");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to contract (dependency = 0 for root quest)
      // Question is now passed as string directly
      await write({
        functionName: "createQuest",
        args: [question.trim(), BigInt(answerHash), 0n],
      });

      // Save to localStorage
      saveQuestion(answerHash, question.trim(), answer.trim());
      markQuestionSubmitted(answerHash);

      alert("Question created successfully!");
      router.push("/quiz");
    } catch (error) {
      console.error("Error submitting question:", error);
      alert("Error submitting question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = answerHash && !questionExists && question.trim() && answer.trim() && !isSubmitting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/quiz" className="btn btn-ghost btn-sm">
          ← Back to quiz
        </Link>
      </div>

      {/* Form Card */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h1 className="card-title text-2xl mb-6">Create New Question</h1>

          <div className="space-y-6">
            {/* Question Input */}
            <div>
              <label className="label">
                <span className="label-text font-medium">Question</span>
                <span className="label-text-alt">Variable length</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Enter your question here..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                rows={3}
              />
              <div className="label">
                <span className="label-text-alt">{question.length} characters</span>
              </div>
            </div>

            {/* Answer Input */}
            <div>
              <label className="label">
                <span className="label-text font-medium">Answer</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter the correct answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
              />
            </div>

            {/* Calculate Hash Button */}
            <div>
              <button
                className="btn btn-outline w-full"
                onClick={handleCalculateHash}
                disabled={!answer.trim() || isCalculating}
              >
                {isCalculating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Calculating hash...
                  </>
                ) : (
                  "Calculate Answer Hash"
                )}
              </button>
            </div>

            {/* Hash Result */}
            {answerHash && (
              <div className="space-y-4">
                <div className="alert alert-info">
                  <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="font-bold">Calculated hash:</h3>
                    <p className="text-xs break-all">{answerHash}</p>
                  </div>
                </div>

                {/* Status Messages */}
                {questionExists && (
                  <div className="alert alert-warning">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                      ></path>
                    </svg>
                    <div>
                      <h3 className="font-bold">Question already exists!</h3>
                      <p>This answer has already been used in another question in the contract.</p>
                      {alreadyStored && <p className="text-sm">✅ Saved in your localStorage.</p>}
                    </div>
                  </div>
                )}

                {!questionExists && alreadyStored && (
                  <div className="alert alert-success">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <div>
                      <h3 className="font-bold">Valid question!</h3>
                      <p>This question can be submitted to the contract.</p>
                      <p className="text-sm">✅ Saved in your localStorage.</p>
                    </div>
                  </div>
                )}

                {!questionExists && !alreadyStored && (
                  <div className="alert alert-success">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <div>
                      <h3 className="font-bold">Valid question!</h3>
                      <p>This question can be submitted to the contract.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="divider"></div>

            <button className="btn btn-primary w-full" onClick={handleSubmitQuestion} disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting question...
                </>
              ) : (
                "Submit Question to Contract"
              )}
            </button>

            {/* Help Text */}
            {!address && (
              <div className="alert alert-warning">
                <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                  ></path>
                </svg>
                <span>Connect your wallet to submit the question.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
