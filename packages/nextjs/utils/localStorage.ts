/**
 * Types for localStorage management
 */
export interface StoredAnswer {
  answerHash: string;
  question: string;
  answer: string;
  blockNumber?: number;
  submittedToContract?: boolean;
}

export interface StoredQuestion {
  answerHash: string;
  question: string;
  answer: string;
  submitted?: boolean;
}

const ANSWERS_KEY_PREFIX = "quiz_answers_";
const QUESTIONS_KEY_PREFIX = "quiz_questions_";

/**
 * Get localStorage key for answers for a specific address
 */
function getAnswersKey(address: string): string {
  return `${ANSWERS_KEY_PREFIX}${address.toLowerCase()}`;
}

/**
 * Get localStorage key for questions for a specific address
 */
function getQuestionsKey(address: string): string {
  return `${QUESTIONS_KEY_PREFIX}${address.toLowerCase()}`;
}

/**
 * Get all stored answers from localStorage for a specific address
 */
export function getStoredAnswers(address?: string): StoredAnswer[] {
  if (typeof window === "undefined" || !address) return [];

  try {
    const stored = localStorage.getItem(getAnswersKey(address));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading stored answers:", error);
    return [];
  }
}

/**
 * Save an answer to localStorage for a specific address
 */
export function saveAnswer(answerHash: string, question: string, answer: string, address: string): void {
  if (typeof window === "undefined" || !address) return;

  try {
    const answers = getStoredAnswers(address);
    const existingIndex = answers.findIndex(a => a.answerHash === answerHash);

    const newAnswer: StoredAnswer = {
      answerHash,
      question,
      answer,
      submittedToContract: false,
    };

    if (existingIndex >= 0) {
      answers[existingIndex] = newAnswer;
    } else {
      answers.push(newAnswer);
    }

    localStorage.setItem(getAnswersKey(address), JSON.stringify(answers));
  } catch (error) {
    console.error("Error saving answer:", error);
  }
}

/**
 * Check if user has answered a specific question
 */
export function hasAnswered(answerHash: string, address: string): boolean {
  const answers = getStoredAnswers(address);
  return answers.some(a => a.answerHash === answerHash);
}

/**
 * Get answer status for a specific question
 * @returns "not_answered" | "pending_submission" | "submitted"
 */
export function getAnswerStatus(
  answerHash: string,
  address: string,
): "not_answered" | "pending_submission" | "submitted" {
  const answers = getStoredAnswers(address);
  const answer = answers.find(a => a.answerHash === answerHash);

  if (!answer) {
    return "not_answered";
  }

  if (answer.submittedToContract) {
    return "submitted";
  }

  return "pending_submission";
}

/**
 * Get saved answer for a specific question
 */
export function getSavedAnswer(answerHash: string, address: string): string | null {
  const answers = getStoredAnswers(address);
  const answer = answers.find(a => a.answerHash === answerHash);
  return answer ? answer.answer : null;
}

/**
 * Mark answer as submitted to contract
 */
export function markAnswerSubmitted(answerHash: string, blockNumber: number, address: string): void {
  if (typeof window === "undefined" || !address) return;

  try {
    const answers = getStoredAnswers(address);
    const answerIndex = answers.findIndex(a => a.answerHash === answerHash);

    if (answerIndex >= 0) {
      answers[answerIndex].submittedToContract = true;
      answers[answerIndex].blockNumber = blockNumber;
      localStorage.setItem(getAnswersKey(address), JSON.stringify(answers));
    }
  } catch (error) {
    console.error("Error marking answer as submitted:", error);
  }
}

/**
 * Get pending checkins (answers not submitted to contract)
 */
export function getPendingCheckins(address: string): StoredAnswer[] {
  return getStoredAnswers(address).filter(a => !a.submittedToContract);
}

/**
 * Get all stored questions from localStorage for a specific address
 */
export function getStoredQuestions(address: string): StoredQuestion[] {
  if (typeof window === "undefined" || !address) return [];

  try {
    const stored = localStorage.getItem(getQuestionsKey(address));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading stored questions:", error);
    return [];
  }
}

/**
 * Save a question to localStorage for a specific address
 */
export function saveQuestion(answerHash: string, question: string, answer: string, address: string): void {
  if (typeof window === "undefined" || !address) return;

  try {
    const questions = getStoredQuestions(address);
    const existingIndex = questions.findIndex(q => q.answerHash === answerHash);

    const newQuestion: StoredQuestion = {
      answerHash,
      question,
      answer,
      submitted: false,
    };

    if (existingIndex >= 0) {
      questions[existingIndex] = newQuestion;
    } else {
      questions.push(newQuestion);
    }

    localStorage.setItem(getQuestionsKey(address), JSON.stringify(questions));
  } catch (error) {
    console.error("Error saving question:", error);
  }
}

/**
 * Mark question as submitted to contract
 */
export function markQuestionSubmitted(answerHash: string, address: string): void {
  if (typeof window === "undefined" || !address) return;

  try {
    const questions = getStoredQuestions(address);
    const questionIndex = questions.findIndex(q => q.answerHash === answerHash);

    if (questionIndex >= 0) {
      questions[questionIndex].submitted = true;
      localStorage.setItem(getQuestionsKey(address), JSON.stringify(questions));
    }
  } catch (error) {
    console.error("Error marking question as submitted:", error);
  }
}

/**
 * Check if user has this question stored locally
 */
export function hasQuestionStored(answerHash: string, address: string): boolean {
  const questions = getStoredQuestions(address);
  return questions.some(q => q.answerHash === answerHash);
}

/**
 * Get the direct dependency answer for a given question
 * This is used to concatenate answers for dependent questions
 */
export function getDependencyAnswer(answerHash: string, address: string): string | null {
  const answers = getStoredAnswers(address);
  const answer = answers.find(a => a.answerHash === answerHash);
  return answer ? answer.answer : null;
}

/**
 * Create concatenated answer for dependent questions
 * @param dependencyHash - Hash of the dependency question
 * @param newAnswer - New answer to concatenate
 * @param address - User address
 * @returns Concatenated answer (dependencyAnswer + newAnswer)
 */
export function createDependentAnswer(dependencyHash: string, newAnswer: string, address: string): string {
  const dependencyAnswer = getDependencyAnswer(dependencyHash, address);
  if (!dependencyAnswer) {
    throw new Error("Dependency answer not found. You must answer the dependency question first.");
  }
  return dependencyAnswer + newAnswer;
}
