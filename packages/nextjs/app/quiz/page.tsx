"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { hasAnswered } from "~~/utils/localStorage";

// Removed bytes32ToString function as questions are now stored as strings

export default function QuizHome() {
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Get total number of root quests
  const { data: totalRootQuests } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "rootQuestsLength",
  });

  // Get root quests for current page
  const { data: rootQuests, isLoading } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "listRootQuests",
    args: [BigInt(currentPage * pageSize), BigInt(pageSize)],
  });

  // Questions are now fetched individually in QuestionCard component

  // Load answered questions from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const answered = new Set<string>();
      rootQuests?.forEach(questHash => {
        if (hasAnswered(questHash.toString())) {
          answered.add(questHash.toString());
        }
      });
      setAnsweredQuestions(answered);
    }
  }, [rootQuests]);

  const totalPages = totalRootQuests ? Math.ceil(Number(totalRootQuests) / pageSize) : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-2">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Decentralized Quiz</h1>
          <p className="text-lg text-base-content/70">
            Answer questions and prove your knowledge with zero-knowledge proofs
          </p>
        </div>

        {!rootQuests || rootQuests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h2 className="text-2xl font-semibold mb-2">No questions found</h2>
            <p className="text-base-content/70 mb-6">Be the first to create a question for the community!</p>
            <Link href="/quiz/create" className="btn btn-primary">
              Create First Question
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-8">
              {rootQuests.map(questHash => {
                const isAnswered = answeredQuestions.has(questHash.toString());

                return (
                  <QuestionCard key={questHash.toString()} questHash={questHash.toString()} isAnswered={isAnswered} />
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>

                <span className="text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>

                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface QuestionCardProps {
  questHash: string;
  isAnswered: boolean;
}

function QuestionCard({ questHash, isAnswered }: QuestionCardProps) {
  const { data: questionText } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(questHash)],
  });

  return (
    <Link href={`/quiz/question/${questHash}`}>
      <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-base-300">
        <div className="card-body">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="card-title text-lg">{questionText || "Loading question..."}</h3>
              <p className="text-sm text-base-content/60 mt-1">ID: {questHash.slice(0, 10)}...</p>
            </div>

            {isAnswered && (
              <div className="flex items-center gap-2 text-success">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">Answered</span>
              </div>
            )}
          </div>

          <div className="card-actions justify-end mt-4">
            <div className="badge badge-outline">Root Question</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
