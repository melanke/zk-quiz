"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getPendingCheckins, markAnswerSubmitted } from "~~/utils/localStorage";
import { generateProof, strToBigInt } from "~~/utils/zk";

export const QuizActions = () => {
  const { address } = useAccount();
  // const router = useRouter(); // Commented out as it's not being used
  const [pendingCount, setPendingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync: writeQuestGraph } = useScaffoldWriteContract({
    contractName: "Quiz",
  });

  // Update pending count
  useEffect(() => {
    const updatePendingCount = () => {
      const pending = getPendingCheckins();
      setPendingCount(pending.length);
    };

    updatePendingCount();

    // Update every 2 seconds to catch localStorage changes
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitCheckins = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const pendingCheckins = getPendingCheckins();
    if (pendingCheckins.length === 0) {
      toast.warning("No pending check-ins.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit each check-in individually for now
      // In a real implementation, you might want to batch these
      for (const checkin of pendingCheckins) {
        try {
          const answerBigInt = strToBigInt(checkin.answer);
          const userAddressBigInt = BigInt(address);

          const args = [answerBigInt.toString(), userAddressBigInt.toString(), checkin.answerHash];

          const proof = await generateProof<3>("AnswerVerifier", args);

          // Submit to contract
          await writeQuestGraph({
            functionName: "checkInQuest",
            args: [proof.proof, proof?.inputs],
          });

          // Mark as submitted in localStorage
          // Note: In production, you'd wait for the transaction to be confirmed
          // and get the actual block number
          markAnswerSubmitted(checkin.answerHash, 0);

          console.log(`Check-in submitted for question ${checkin.answerHash.slice(0, 10)}...`);

          toast.success(`${pendingCheckins.length} check-ins submitted successfully!`);
          setPendingCount(0);
        } catch (error) {
          console.error(`Error submitting check-in for ${checkin.answerHash}:`, error);
          // Don't break the loop, continue with other check-ins
        }
      }
    } catch (error) {
      console.error("Error submitting check-ins:", error);
      toast.error("Error submitting check-ins. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return null; // Don't show quiz actions if not connected
  }

  return (
    <div className="flex items-center gap-2">
      {/* Pending checkins indicator */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            {pendingCount} of {pendingCount} pending checkins
          </Badge>
          <Button size="sm" onClick={handleSubmitCheckins} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Checkins"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
