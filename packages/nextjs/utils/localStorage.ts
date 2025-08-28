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

const ANSWERS_KEY = "quiz_answers";
const QUESTIONS_KEY = "quiz_questions";

/**
 * Get all stored answers from localStorage
 */
export function getStoredAnswers(): StoredAnswer[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(ANSWERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading stored answers:", error);
    return [];
  }
}

/**
 * Save an answer to localStorage
 */
export function saveAnswer(answerHash: string, question: string, answer: string): void {
  if (typeof window === "undefined") return;

  try {
    const answers = getStoredAnswers();
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

    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  } catch (error) {
    console.error("Error saving answer:", error);
  }
}

/**
 * Check if user has answered a specific question
 */
export function hasAnswered(answerHash: string): boolean {
  const answers = getStoredAnswers();
  return answers.some(a => a.answerHash === answerHash);
}

/**
 * Mark answer as submitted to contract
 */
export function markAnswerSubmitted(answerHash: string, blockNumber: number): void {
  if (typeof window === "undefined") return;

  try {
    const answers = getStoredAnswers();
    const answerIndex = answers.findIndex(a => a.answerHash === answerHash);

    if (answerIndex >= 0) {
      answers[answerIndex].submittedToContract = true;
      answers[answerIndex].blockNumber = blockNumber;
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    }
  } catch (error) {
    console.error("Error marking answer as submitted:", error);
  }
}

/**
 * Get pending checkins (answers not submitted to contract)
 */
export function getPendingCheckins(): StoredAnswer[] {
  return getStoredAnswers().filter(a => !a.submittedToContract);
}

/**
 * Get all stored questions from localStorage
 */
export function getStoredQuestions(): StoredQuestion[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(QUESTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading stored questions:", error);
    return [];
  }
}

/**
 * Save a question to localStorage
 */
export function saveQuestion(answerHash: string, question: string, answer: string): void {
  if (typeof window === "undefined") return;

  try {
    const questions = getStoredQuestions();
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

    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error("Error saving question:", error);
  }
}

/**
 * Mark question as submitted to contract
 */
export function markQuestionSubmitted(answerHash: string): void {
  if (typeof window === "undefined") return;

  try {
    const questions = getStoredQuestions();
    const questionIndex = questions.findIndex(q => q.answerHash === answerHash);

    if (questionIndex >= 0) {
      questions[questionIndex].submitted = true;
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
    }
  } catch (error) {
    console.error("Error marking question as submitted:", error);
  }
}

/**
 * Check if user has this question stored locally
 */
export function hasQuestionStored(answerHash: string): boolean {
  const questions = getStoredQuestions();
  return questions.some(q => q.answerHash === answerHash);
}
