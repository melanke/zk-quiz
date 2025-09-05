"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { Textarea } from "~~/components/ui/textarea";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  createDependentAnswer,
  getAnswerStatus,
  hasQuestionStored,
  markAnswerSubmitted,
  markQuestionSubmitted,
  saveAnswer,
  saveQuestion,
} from "~~/utils/localStorage";
import { poseidonHashBigInt, strToBigInt } from "~~/utils/zk";

// Removed stringToBytes32 function as questions are now stored as strings

function CreateQuestionContent() {
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dependencyHash = searchParams.get("dependency");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerHash, setAnswerHash] = useState<string>("");
  const [questionExists, setQuestionExists] = useState(false);
  const [alreadyStored, setAlreadyStored] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dependencyAnswerStatus, setDependencyAnswerStatus] = useState<
    "not_answered" | "pending_submission" | "submitted" | "loading"
  >("loading");

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

  // Get dependency question if creating a dependent question
  const { data: dependencyQuestion } = useScaffoldReadContract({
    contractName: "Quiz",
    functionName: "questQuestions",
    args: [BigInt(dependencyHash || "0")],
    query: {
      enabled: !!dependencyHash,
    },
  });

  // Auto-calculate hash with debounce when answer changes
  useEffect(() => {
    // Show "Checking..." immediately when user types
    if (answer.trim()) {
      setIsChecking(true);
    } else {
      setIsChecking(false);
      setAnswerHash("");
      setQuestionExists(false);
      setAlreadyStored(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!answer.trim()) {
        setIsChecking(false);
        setAnswerHash("");
        setQuestionExists(false);
        setAlreadyStored(false);
        return;
      }

      setIsCalculating(true);

      try {
        let finalAnswer = answer.trim();

        // If this is a dependent question, concatenate with dependency answer
        if (dependencyHash) {
          try {
            finalAnswer = createDependentAnswer(dependencyHash, answer.trim(), address || "");
          } catch (error) {
            console.error("CREATE: Error creating dependent answer:", error);
            setVerificationResult({
              success: false,
              message: "You must answer the dependency question first before creating a dependent question.",
            });
            setIsCalculating(false);
            setIsChecking(false);
            return;
          }
        }

        // Convert final answer to BigInt and hash it
        const answerBigInt = strToBigInt(finalAnswer);
        const hashedAnswer = await poseidonHashBigInt(answerBigInt);
        const hashString = hashedAnswer.toString();

        setAnswerHash(hashString);

        // Check if already stored locally
        const stored = address ? hasQuestionStored(hashString, address) : false;
        setAlreadyStored(stored);

        // The useScaffoldReadContract will automatically check if it exists in contract
      } catch (error) {
        console.error("Error calculating hash:", error);
        toast.error("Error calculating answer hash.");
      } finally {
        setIsCalculating(false);
        setIsChecking(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [answer, address, dependencyHash]);

  // Check dependency answer status
  useEffect(() => {
    if (dependencyHash && address) {
      const status = getAnswerStatus(dependencyHash, address);
      setDependencyAnswerStatus(status);
    } else {
      setDependencyAnswerStatus("loading");
    }
  }, [dependencyHash, address]);

  // Check if question exists in contract when answerHash changes
  useEffect(() => {
    if (existingQuestion) {
      setQuestionExists(true);
      // If exists and not stored locally, save it
      if (!alreadyStored && question && answer && address) {
        saveQuestion(answerHash, question, answer, address);
        setAlreadyStored(true);
      }
    } else {
      setQuestionExists(false);
    }
  }, [existingQuestion, alreadyStored, question, answer, answerHash, address]);

  const handleSubmitQuestion = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!question.trim() || !answer.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!answerHash) {
      toast.error("Please wait for hash calculation to complete.");
      return;
    }

    if (questionExists) {
      toast.error("This question already exists in the contract!");
      return;
    }

    // Check if dependency question has been answered and submitted
    if (dependencyHash && dependencyAnswerStatus !== "submitted") {
      if (dependencyAnswerStatus === "not_answered") {
        toast.error("You must answer the dependency question first before creating a dependent question.");
        return;
      } else if (dependencyAnswerStatus === "pending_submission") {
        toast.error(
          "You must submit your answer to the dependency question to the contract first before creating a dependent question.",
        );
        return;
      } else if (dependencyAnswerStatus === "loading") {
        toast.error("Please wait while we check the dependency status.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Submit to contract
      // Use dependencyHash if provided, otherwise 0 for root quest
      const dependency = dependencyHash ? BigInt(dependencyHash) : 0n;
      await write({
        functionName: "createQuest",
        args: [question.trim(), BigInt(answerHash), dependency],
      });

      // Save to localStorage
      saveQuestion(answerHash, question.trim(), answer.trim(), address);
      markQuestionSubmitted(answerHash, address);

      // Automatically save the answer knowledge (mark as answered locally)
      saveAnswer(answerHash, question.trim(), answer.trim(), address);

      // Mark that the answer was submitted to the contract
      // Use current timestamp as approximation (the contract will emit the actual block number)
      const blockNumber = Date.now(); // Use timestamp as fallback since txResult doesn't have blockNumber
      markAnswerSubmitted(answerHash, Number(blockNumber), address);

      toast.success("Question created successfully! Your answer knowledge has been automatically saved.");
      router.push("/quiz");
    } catch (error) {
      console.error("Error submitting question:", error);
      toast.error("Error submitting question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    answerHash &&
    !questionExists &&
    question.trim() &&
    answer.trim() &&
    answer.length <= 15 &&
    !isSubmitting &&
    !isCalculating &&
    !isChecking &&
    (dependencyHash ? dependencyAnswerStatus === "submitted" : true);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to quiz
          </Link>
        </Button>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {dependencyHash ? "Create Dependent Question" : "Create New Question"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Dependency Info */}
          {dependencyHash && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400">🔗</span>
                <h3 className="font-semibold text-gray-800 dark:text-blue-300">Creating Dependent Question</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-blue-400 mb-3">This question will depend on:</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {dependencyQuestion || "Loading dependency..."}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Your answer will be automatically concatenated with the dependency answer when submitted.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Question Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Textarea
                placeholder="Enter your question here..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                rows={3}
              />
              <div className="text-xs text-muted-foreground">{question.length} characters</div>
            </div>

            {/* Answer Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Answer</label>
              <Input
                type="text"
                placeholder="Enter the correct answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <div className={`text-xs ${answer.length > 15 ? "text-red-500" : "text-muted-foreground"}`}>
                  {answer.length}/15 characters
                </div>
                {isChecking && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Checking...
                  </div>
                )}
              </div>
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <Alert variant={verificationResult.success ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{verificationResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Error Alert for Duplicates */}
            {questionExists && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <h3 className="font-bold">Question already exists!</h3>
                    <p>This answer has already been used in another question in the contract.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Dependency Status Loading */}
            {dependencyHash && dependencyAnswerStatus === "loading" && (
              <Alert variant="default">
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking dependency status...</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Dependency Warning - Only show when there are issues and not loading */}
            {dependencyHash && dependencyAnswerStatus !== "submitted" && dependencyAnswerStatus !== "loading" && (
              <Alert
                variant={dependencyAnswerStatus === "not_answered" ? "destructive" : "default"}
                className={
                  dependencyAnswerStatus === "pending_submission"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                    : ""
                }
              >
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <p className="font-semibold m-0">
                        {dependencyAnswerStatus === "not_answered"
                          ? "Dependency Question Not Answered"
                          : "Dependency Answer Not Submitted"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm flex-1 m-0">
                        {dependencyAnswerStatus === "not_answered"
                          ? "You must answer the dependency question first before creating a dependent question."
                          : "You must submit your answer to the contract before creating a dependent question."}
                      </p>
                      <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                        <Link href={`/quiz/question/${dependencyHash}`}>
                          {dependencyAnswerStatus === "not_answered" ? "Answer Question" : "View Question"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="border-t pt-6">
              <Button className="w-full" onClick={handleSubmitQuestion} disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting question...
                  </>
                ) : (
                  "Submit Question to Contract"
                )}
              </Button>
            </div>

            {/* Help Text */}
            {!address && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Connect your wallet to submit the question.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateQuestionContent />
    </Suspense>
  );
}
