"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { encodeFunctionData } from "viem";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";
import { createDependentAnswer, getPendingCheckins, markAnswerSubmitted } from "~~/utils/localStorage";
import { generateProof, strToBigInt } from "~~/utils/zk";

export const QuizActions = ({ className }: { className?: string }) => {
  const { address } = useAccount();
  // const router = useRouter(); // Commented out as it's not being used
  const [pendingCount, setPendingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync: writeQuestGraph } = useScaffoldWriteContract({
    contractName: "Quiz",
  });

  // Get the Quiz contract instance with full ABI
  const { data: quizContract } = useScaffoldContract({
    contractName: "Quiz",
  });

  // Helper function to get dependency for a question
  const getDependencyForQuestion = async (answerHash: string): Promise<string | null> => {
    try {
      if (!quizContract) return null;

      const dependency = await quizContract.read.questDependency([BigInt(answerHash)]);
      return dependency && dependency.toString() !== "0" ? dependency.toString() : null;
    } catch (error) {
      console.error("Error getting dependency:", error);
      return null;
    }
  };

  // Update pending count
  useEffect(() => {
    const updatePendingCount = () => {
      if (!address) {
        setPendingCount(0);
        return;
      }
      const pending = getPendingCheckins(address);
      setPendingCount(pending.length);
    };

    updatePendingCount();

    // Update every 2 seconds to catch localStorage changes
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, [address]);

  const handleSubmitCheckins = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!quizContract) {
      toast.error("Contract not loaded yet. Please try again in a moment.");
      return;
    }

    const pendingCheckins = getPendingCheckins(address);
    if (pendingCheckins.length === 0) {
      toast.warning("No pending answers.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate proofs for all pending check-ins
      const proofPromises = pendingCheckins.map(async checkin => {
        // Check if this question has a dependency and get the correct final answer
        let finalAnswer = checkin.answer;

        const dependency = await getDependencyForQuestion(checkin.answerHash);
        if (dependency) {
          try {
            // This is a dependent question, concatenate answers
            finalAnswer = createDependentAnswer(dependency, checkin.answer, address);
            console.log(`SUBMISSION: Dependent answer for ${checkin.answerHash}: ${finalAnswer}`);
          } catch (error) {
            console.error("Error creating dependent answer for submission:", error);
            // If we can't concatenate, use the original answer
          }
        }

        const answerBigInt = strToBigInt(finalAnswer);
        const userAddressBigInt = BigInt(address);
        const args = [answerBigInt.toString(), userAddressBigInt.toString(), checkin.answerHash];

        const proof = await generateProof<3>("AnswerVerifier", args);
        return {
          checkin,
          proof: proof.proof,
          inputs: proof.inputs,
        };
      });

      console.log("Generating proofs for all answers...");
      const proofsData = await Promise.all(proofPromises);

      // Encode all the checkInQuest calls for multicall using the contract's ABI
      const encodedCalls = proofsData.map(({ proof, inputs }) =>
        encodeFunctionData({
          abi: quizContract?.abi || [],
          functionName: "checkInQuest",
          args: [proof, inputs],
        }),
      );

      // Submit all check-ins in a single multicall transaction
      console.log(`Submitting ${encodedCalls.length} answers in a single transaction...`);

      await writeQuestGraph({
        functionName: "multicall",
        args: [encodedCalls],
      });

      // Mark all as submitted in localStorage
      proofsData.forEach(({ checkin }) => {
        markAnswerSubmitted(checkin.answerHash, 0, address);
      });

      console.log(`${pendingCheckins.length} answers submitted successfully in batch!`);
      toast.success(`${pendingCheckins.length} answers submitted successfully!`);
      setPendingCount(0);
    } catch (error) {
      console.error("Error submitting answers:", error);
      toast.error("Error submitting answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return null; // Don't show quiz actions if not connected
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Pending checkins indicator */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="text-xs">{pendingCount} pending answers</div>
          <Button size="sm" onClick={handleSubmitCheckins} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Answers"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
