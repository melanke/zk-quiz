"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { hasAnswered, saveAnswer } from "~~/utils/localStorage";
import { poseidonHashBigInt, strToBigInt } from "~~/utils/zk";

interface CheckInEvent {
  user: string;
  answerHash: string;
  blockNumber: number;
  timestamp?: number;
}

export default function QuestionPage() {
  const params = useParams();
  const questHash = params.hash as string;

  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Get question data
  const { data: questionText } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(questHash)],
  });

  // Get check-in events for this question
  const { data: checkInEvents } = useScaffoldEventHistory({
    contractName: "Quiz",
    eventName: "CheckedIn",
    filters: { answerHash: BigInt(questHash) },
    watch: true,
  });

  // questionText is now directly a string from the contract

  useEffect(() => {
    setIsAnswered(hasAnswered(questHash));
  }, [questHash]);

  const handleVerifyAnswer = async () => {
    if (!answer.trim()) {
      setVerificationResult({ success: false, message: "Please enter an answer." });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Convert answer to BigInt and hash it
      const answerBigInt = strToBigInt(answer.trim());
      const hashedAnswer = await poseidonHashBigInt(answerBigInt);

      // Check if the hash matches the quest hash
      if (hashedAnswer.toString() === questHash) {
        // Save to localStorage
        saveAnswer(questHash, questionText || "", answer.trim());
        setIsAnswered(true);
        setVerificationResult({
          success: true,
          message: "Correct answer! Saved to localStorage. You can submit it to the contract later.",
        });
      } else {
        setVerificationResult({
          success: false,
          message: "Incorrect answer. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error verifying answer:", error);
      setVerificationResult({
        success: false,
        message: "Error verifying the answer. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getSortedCheckIns = (): CheckInEvent[] => {
    if (!checkInEvents) return [];

    const mapped = checkInEvents.map(event => ({
      user: event.args.user as string,
      answerHash: event.args.answerHash?.toString() || "",
      blockNumber: Number(event.args.blockNumber || 0),
      timestamp: (event as any).blockTimestamp || 0,
    }));

    return mapped.sort((a, b) => {
      if (sortOrder === "desc") {
        return b.blockNumber - a.blockNumber;
      } else {
        return a.blockNumber - b.blockNumber;
      }
    });
  };

  if (!questionText || questionText === "") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-2">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/quiz" className="btn btn-ghost btn-sm">
          ← Back to list
        </Link>
      </div>

      {/* Question Card */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex justify-between items-start mb-4">
            <h1 className="card-title text-2xl">{questionText}</h1>
            {isAnswered && (
              <div className="badge badge-success gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Answered
              </div>
            )}
          </div>

          <p className="text-sm text-base-content/60 mb-6">Question hash: {questHash}</p>

          {/* Answer Form */}
          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Your answer:</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Enter your answer here..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={isVerifying}
                rows={3}
              />
            </div>

            <button className="btn btn-primary" onClick={handleVerifyAnswer} disabled={isVerifying || !answer.trim()}>
              {isVerifying ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Verifying...
                </>
              ) : (
                "Verify Answer"
              )}
            </button>

            {/* Verification Result */}
            {verificationResult && (
              <div className={`alert ${verificationResult.success ? "alert-success" : "alert-error"}`}>
                <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                  {verificationResult.success ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                <span>{verificationResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Check-ins List */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Who answered this question</h2>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-outline btn-sm">
                Sort by date {sortOrder === "desc" ? "↓" : "↑"}
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <a onClick={() => setSortOrder("desc")}>Most recent first</a>
                </li>
                <li>
                  <a onClick={() => setSortOrder("asc")}>Oldest first</a>
                </li>
              </ul>
            </div>
          </div>

          {getSortedCheckIns().length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <div className="text-4xl mb-2">🤷‍♂️</div>
              <p>Nobody has answered this question yet.</p>
              <p className="text-sm mt-1">Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getSortedCheckIns().map((checkIn, index) => (
                <div
                  key={`${checkIn.user}-${checkIn.blockNumber}`}
                  className="flex items-center justify-between p-3 border border-base-300 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-10">
                        <span className="text-xs">{index + 1}</span>
                      </div>
                    </div>
                    <div>
                      <Address address={checkIn.user} />
                      <p className="text-sm text-base-content/60">
                        Block #{checkIn.blockNumber}
                        {checkIn.timestamp && (
                          <span className="ml-2">• {new Date(checkIn.timestamp * 1000).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link href={`/quiz/profile/${checkIn.user}`} className="btn btn-ghost btn-xs">
                    View profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
