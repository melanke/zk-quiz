"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, ChevronDown, Loader2, X } from "lucide-react";
import { Address } from "~~/components/scaffold-eth";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Avatar, AvatarFallback } from "~~/components/ui/avatar";
import { Badge } from "~~/components/ui/badge";
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
import { getSavedAnswer, hasAnswered, saveAnswer } from "~~/utils/localStorage";
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
  const [isChecking, setIsChecking] = useState(false);
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
    const answered = hasAnswered(questHash);
    setIsAnswered(answered);

    // If already answered, load the saved answer
    if (answered) {
      const savedAnswer = getSavedAnswer(questHash);
      if (savedAnswer) {
        setAnswer(savedAnswer);
        setVerificationResult({
          success: true,
          message: "Correct answer! Saved to localStorage. You can submit it to the contract later.",
        });
      }
    }
  }, [questHash]);

  // Auto-verify answer with debounce when answer changes
  useEffect(() => {
    // Don't verify if already answered
    if (isAnswered) {
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
        setIsChecking(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [answer, questHash, questionText, isAnswered]);

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
            {isAnswered && (
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle className="w-4 h-4 mr-1" />
                Answered
              </Badge>
            )}
          </div>
          <CardDescription>Do you know the answer?</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Answer Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your answer:</label>
              <Textarea
                placeholder="Enter your answer here..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={isVerifying || isAnswered}
                rows={3}
              />
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
              {getSortedCheckIns().map((checkIn, index) => (
                <div
                  key={`${checkIn.user}-${checkIn.blockNumber}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs">{index + 1}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Address address={checkIn.user} />
                      <p className="text-sm text-muted-foreground">
                        Block #{checkIn.blockNumber}
                        {checkIn.timestamp && (
                          <span className="ml-2">• {new Date(checkIn.timestamp * 1000).toLocaleString()}</span>
                        )}
                      </p>
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
