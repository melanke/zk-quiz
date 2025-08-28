"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Address } from "~~/components/scaffold-eth";
import { Avatar, AvatarFallback } from "~~/components/ui/avatar";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~~/components/ui/tabs";
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
        <Button variant="ghost" size="sm" asChild>
          <Link href="/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to quiz
          </Link>
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">👤</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">User Profile</CardTitle>
              <Address address={userAddress} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Questions Answered</div>
              <div className="text-2xl font-bold text-primary">{answeredQuestions.length}</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Questions Created</div>
              <div className="text-2xl font-bold text-secondary">{createdQuestions.length}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as "answered" | "created")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="answered">Questions Answered ({answeredQuestions.length})</TabsTrigger>
          <TabsTrigger value="created">Questions Created ({createdQuestions.length})</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="answered">
              <CardTitle className="mb-4">Questions Answered</CardTitle>
              {sortedAnswered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
            </TabsContent>

            <TabsContent value="created">
              <CardTitle className="mb-4">Questions Created</CardTitle>
              {sortedCreated.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

interface QuestionCardProps {
  event: ProfileEvent;
}

function AnsweredQuestionCard({ event }: QuestionCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
              Answered
            </Badge>
            <span className="text-sm text-muted-foreground">Block #{event.blockNumber}</span>
            {event.timestamp && (
              <span className="text-sm text-muted-foreground">
                • {new Date(event.timestamp * 1000).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">Hash: {event.answerHash.slice(0, 20)}...</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/quiz/question/${event.answerHash}`}>View question</Link>
        </Button>
      </div>
    </div>
  );
}

function CreatedQuestionCard({ event }: QuestionCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default">Created</Badge>
            <span className="text-sm text-muted-foreground">Block #{event.blockNumber}</span>
            {event.timestamp && (
              <span className="text-sm text-muted-foreground">
                • {new Date(event.timestamp * 1000).toLocaleString()}
              </span>
            )}
          </div>
          {event.question && <h3 className="font-medium mb-2">{event.question}</h3>}
          <p className="text-sm text-muted-foreground mb-2">Hash: {event.answerHash.slice(0, 20)}...</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/quiz/question/${event.answerHash}`}>View question</Link>
        </Button>
      </div>
    </div>
  );
}
