"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { hasAnswered } from "~~/utils/localStorage";

// Removed bytes32ToString function as questions are now stored as strings

export default function QuizHome() {
  const router = useRouter();
  const { address: connectedAddress, isConnecting } = useAccount();
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Redirect based on connection status
  useEffect(() => {
    if (!isConnecting) {
      if (!connectedAddress) {
        // Not connected, redirect to home
        router.push("/");
      }
    }
  }, [connectedAddress, isConnecting, router]);

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
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
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
          <p className="text-lg text-muted-foreground">
            Answer questions and prove your knowledge with zero-knowledge proofs
          </p>
        </div>

        {!rootQuests || rootQuests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h2 className="text-2xl font-semibold mb-2">No questions found</h2>
            <p className="text-muted-foreground mb-6">Be the first to create a question for the community!</p>
            <Button asChild>
              <Link href="/quiz/create">Create First Question</Link>
            </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
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
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{questionText || "Loading question..."}</CardTitle>
              <CardDescription className="mt-1">Do you know the answer?</CardDescription>
            </div>

            {isAnswered && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Answered</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardFooter className="pt-0">
          <Badge variant="outline">Root Question</Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}
