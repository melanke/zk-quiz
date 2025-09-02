"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, ChevronDown, Eye, EyeOff, Loader2, Plus, X } from "lucide-react";
import { useAccount } from "wagmi";
import { AnsweredBadge } from "~~/components/quiz/AnsweredBadge";
import { Address } from "~~/components/scaffold-eth";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { Textarea } from "~~/components/ui/textarea";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { createDependentAnswer, getSavedAnswer, hasAnswered, saveAnswer } from "~~/utils/localStorage";
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
  const { address } = useAccount();

  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAnswer, setShowAnswer] = useState(false);

  // Get question data
  const { data: questionText } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(questHash)],
  });

  // Get quest dependency
  const { data: questDependency } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questDependency",
    args: [BigInt(questHash)],
  });

  // Get dependent questions count
  const { data: childrenCount } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "childrenCount",
    args: [BigInt(questHash)],
  });

  // Get dependent questions list
  const { data: dependentQuests } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "listQuestsByDependency",
    args: [BigInt(questHash), 0n, 50n], // Get first 50 dependent questions
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
    if (!address) {
      setIsAnswered(false);
      setAnswer("");
      setVerificationResult(null);
      return;
    }

    const answered = hasAnswered(questHash, address);
    setIsAnswered(answered);

    // If already answered, load the saved answer
    if (answered) {
      const savedAnswer = getSavedAnswer(questHash, address);
      if (savedAnswer) {
        setAnswer(savedAnswer);
        setVerificationResult({
          success: true,
          message: "Correct answer! Saved to localStorage. You can submit it to the contract later.",
        });
      }
    }
  }, [questHash, address]);

  // Helper function to check if there's a valid dependency
  const hasDependency =
    questDependency !== undefined &&
    questDependency !== null &&
    questDependency !== 0n &&
    questDependency.toString() !== "0";

  // Check if dependency is answered (if it exists)
  const isDependencyAnswered = hasDependency
    ? address
      ? hasAnswered(questDependency.toString(), address)
      : false
    : true; // If no dependency, consider it "answered"

  // Auto-verify answer with debounce when answer changes
  useEffect(() => {
    // Don't verify if already answered, no address, or dependency not answered
    if (isAnswered || !address || !isDependencyAnswered) {
      return;
    }

    // Show "Checking..." immediately when user types
    if (answer.trim()) {
      setIsChecking(true);
      setVerificationResult(null);
    } else {
      setIsChecking(false);
      setVerificationResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!answer.trim()) {
        setIsChecking(false);
        setVerificationResult(null);
        return;
      }

      setIsVerifying(true);

      try {
        let finalAnswer = answer.trim();

        // If this question has a dependency, concatenate answers
        if (hasDependency) {
          try {
            finalAnswer = createDependentAnswer(questDependency.toString(), answer.trim(), address);
          } catch (error) {
            console.error("Error creating dependent answer:", error);
            setVerificationResult({
              success: false,
              message: "You must answer the dependency question first before answering this one.",
            });
            setIsVerifying(false);
            setIsChecking(false);
            return;
          }
        }

        // Convert final answer to BigInt and hash it
        const answerBigInt = strToBigInt(finalAnswer);
        const hashedAnswer = await poseidonHashBigInt(answerBigInt);

        // Check if the hash matches the quest hash
        if (hashedAnswer.toString() === questHash) {
          // Save to localStorage (save the user's part of the answer, not the concatenated version)
          saveAnswer(questHash, questionText || "", answer.trim(), address);
          setIsAnswered(true);
          setVerificationResult({
            success: true,
            message: hasDependency
              ? "Correct answer! Your answer was concatenated with the dependency. Saved to localStorage."
              : "Correct answer! Saved to localStorage. You can submit it to the contract later.",
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
        setIsChecking(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [answer, questHash, questionText, isAnswered, address, hasDependency, isDependencyAnswered, questDependency]);

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
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      {/* Question Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">{questionText}</CardTitle>
            <AnsweredBadge questHash={questHash} />
          </div>
          <CardDescription>Do you know the answer?</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show dependency info if this question has a dependency */}
          {hasDependency && <DependencyInfo dependencyHash={questDependency.toString()} />}

          {/* Answer Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your answer:</label>
              <div className="relative">
                <Textarea
                  placeholder={
                    !isDependencyAnswered ? "Answer the dependency question first..." : "Enter your answer here..."
                  }
                  value={isAnswered && !showAnswer ? "•".repeat(answer.length) : answer}
                  onChange={e => setAnswer(e.target.value)}
                  disabled={isVerifying || isAnswered || !isDependencyAnswered}
                  rows={3}
                />
                {isAnswered && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => setShowAnswer(!showAnswer)}
                  >
                    {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {isChecking && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Checking...
                </div>
              )}
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <Alert variant={verificationResult.success ? "default" : "destructive"}>
                {verificationResult.success ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                <AlertDescription>{verificationResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dependent Questions List */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Dependent Questions ({childrenCount ? childrenCount.toString() : "0"})</CardTitle>
              <CardDescription>Questions that build upon this one</CardDescription>
            </div>
            {isAnswered && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/quiz/create?dependency=${questHash}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Question
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isAnswered ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">🔒</div>
              {childrenCount && childrenCount.toString() !== "0" ? (
                <div>
                  <p>Answer this question first to see dependent questions.</p>
                  <p className="text-sm mt-1">There are {childrenCount.toString()} dependent questions waiting.</p>
                </div>
              ) : (
                <div>
                  <p>No dependent questions yet.</p>
                  <p className="text-sm mt-1">Answer this question and be the first to create one!</p>
                </div>
              )}
            </div>
          ) : dependentQuests && dependentQuests.length > 0 ? (
            <div className="space-y-3">
              {dependentQuests.map(depHash => (
                <DependentQuestionCard key={depHash.toString()} questionHash={depHash.toString()} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">📝</div>
              <p>No dependent questions yet.</p>
              <p className="text-sm mt-1">Be the first to create one!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-ins List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Who answered this question</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort by date {sortOrder === "desc" ? "↓" : "↑"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOrder("desc")}>Most recent first</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("asc")}>Oldest first</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {getSortedCheckIns().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">🤷‍♂️</div>
              <p>Nobody has answered this question yet.</p>
              <p className="text-sm mt-1">Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getSortedCheckIns().map(checkIn => (
                <div
                  key={`${checkIn.user}-${checkIn.blockNumber}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Address address={checkIn.user} />
                      <div className="text-sm text-muted-foreground">
                        Block #{checkIn.blockNumber}
                        {checkIn.timestamp && (
                          <span className="ml-2">• {new Date(checkIn.timestamp * 1000).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/quiz/profile/${checkIn.user}`}>View profile</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Component to show dependency information
function DependencyInfo({ dependencyHash }: { dependencyHash: string }) {
  const { address } = useAccount();
  const { data: dependencyQuestion } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(dependencyHash)],
  });

  // Check if dependency has been answered
  const isDependencyAnswered = address ? hasAnswered(dependencyHash, address) : false;

  if (isDependencyAnswered) {
    // Compact layout when dependency is already answered
    return (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🔗</span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Depends on: <span className="font-medium">{dependencyQuestion || "Loading..."}</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/quiz/question/${dependencyHash}`}>View</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Full layout when dependency is not answered
  return (
    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-orange-600">🔗</span>
        <h3 className="font-semibold text-orange-700 dark:text-orange-300">Dependency Required</h3>
      </div>
      <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">This question depends on:</p>
      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
        <p className="font-medium">{dependencyQuestion || "Loading dependency..."}</p>
        <div className="mt-2">
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
            ⚠️ You must answer this dependency question first.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quiz/question/${dependencyHash}`}>Answer dependency first</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Component to show dependent question cards
function DependentQuestionCard({ questionHash }: { questionHash: string }) {
  const { data: questionText } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(questionHash)],
  });

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="font-medium mb-2">{questionText || "Loading question..."}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center">
              <span className="mr-1">🔗</span>
              Depends on this question
            </span>
            <AnsweredBadge questHash={questionHash} />
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/quiz/question/${questionHash}`}>View Question</Link>
        </Button>
      </div>
    </div>
  );
}
