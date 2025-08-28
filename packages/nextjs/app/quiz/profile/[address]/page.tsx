"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

// Removed bytes32ToString function as questions are now stored as strings

interface ProfileEvent {
  type: "answered" | "created";
  answerHash: string;
  question?: string;
  blockNumber: number;
  timestamp?: number;
  transactionHash: string;
}

export default function ProfilePage() {
  const params = useParams();
  const userAddress = params.address as string;
  const [activeTab, setActiveTab] = useState<"answered" | "created">("answered");

  // Get check-in events (questions answered by this user)
  const { data: checkInEvents } = useScaffoldEventHistory({
    contractName: "Quiz",
    eventName: "CheckedIn",
    filters: { user: userAddress },
    watch: true,
  });

  // Get quest creation events (questions created by this user)
  const { data: questCreatedEvents } = useScaffoldEventHistory({
    contractName: "Quiz",
    eventName: "QuestCreated",
    filters: { creator: userAddress },
    watch: true,
  });

  const answeredQuestions: ProfileEvent[] = (checkInEvents || []).map(event => ({
    type: "answered",
    answerHash: event.args.answerHash?.toString() || "",
    blockNumber: Number(event.args.blockNumber || 0),
    timestamp: (event as any).blockTimestamp || 0,
    transactionHash: event.transactionHash || "",
  }));

  const createdQuestions: ProfileEvent[] = (questCreatedEvents || []).map(event => ({
    type: "created",
    answerHash: event.args.answerHash?.toString() || "",
    question: event.args.question || "",
    blockNumber: Number(event.blockNumber || 0),
    timestamp: (event as any).blockTimestamp || 0,
    transactionHash: event.transactionHash || "",
  }));

  const sortedAnswered = answeredQuestions.sort((a, b) => b.blockNumber - a.blockNumber);
  const sortedCreated = createdQuestions.sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/quiz" className="btn btn-ghost btn-sm">
          ← Back to quiz
        </Link>
      </div>

      {/* Profile Header */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-16">
                <span className="text-xl">👤</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">User Profile</h1>
              <Address address={userAddress} />
            </div>
          </div>

          <div className="stats stats-horizontal shadow mt-4">
            <div className="stat">
              <div className="stat-title">Questions Answered</div>
              <div className="stat-value text-primary">{answeredQuestions.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Questions Created</div>
              <div className="stat-value text-secondary">{createdQuestions.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered mb-6">
        <button
          className={`tab tab-lg ${activeTab === "answered" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("answered")}
        >
          Questions Answered ({answeredQuestions.length})
        </button>
        <button
          className={`tab tab-lg ${activeTab === "created" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("created")}
        >
          Questions Created ({createdQuestions.length})
        </button>
      </div>

      {/* Content */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          {activeTab === "answered" && (
            <div>
              <h2 className="card-title mb-4">Questions Answered</h2>
              {sortedAnswered.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <div className="text-4xl mb-2">🤷‍♂️</div>
                  <p>This user hasn&apos;t answered any questions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedAnswered.map(event => (
                    <AnsweredQuestionCard key={`${event.answerHash}-${event.blockNumber}`} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "created" && (
            <div>
              <h2 className="card-title mb-4">Questions Created</h2>
              {sortedCreated.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <div className="text-4xl mb-2">✏️</div>
                  <p>This user hasn&apos;t created any questions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedCreated.map(event => (
                    <CreatedQuestionCard key={`${event.answerHash}-${event.blockNumber}`} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  event: ProfileEvent;
}

function AnsweredQuestionCard({ event }: QuestionCardProps) {
  return (
    <div className="border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-success badge-sm">Answered</div>
            <span className="text-sm text-base-content/60">Block #{event.blockNumber}</span>
            {event.timestamp && (
              <span className="text-sm text-base-content/60">
                • {new Date(event.timestamp * 1000).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-base-content/70 mb-2">Hash: {event.answerHash.slice(0, 20)}...</p>
        </div>
        <Link href={`/quiz/question/${event.answerHash}`} className="btn btn-ghost btn-xs">
          View question
        </Link>
      </div>
    </div>
  );
}

function CreatedQuestionCard({ event }: QuestionCardProps) {
  return (
    <div className="border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-primary badge-sm">Created</div>
            <span className="text-sm text-base-content/60">Block #{event.blockNumber}</span>
            {event.timestamp && (
              <span className="text-sm text-base-content/60">
                • {new Date(event.timestamp * 1000).toLocaleString()}
              </span>
            )}
          </div>
          {event.question && <h3 className="font-medium mb-2">{event.question}</h3>}
          <p className="text-sm text-base-content/70 mb-2">Hash: {event.answerHash.slice(0, 20)}...</p>
        </div>
        <Link href={`/quiz/question/${event.answerHash}`} className="btn btn-ghost btn-xs">
          View question
        </Link>
      </div>
    </div>
  );
}
