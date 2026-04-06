// ---------------------------------------------------------------------------
// Core domain models — aligned with backend Prisma schema
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  isOnboarded: boolean;
  coupleId: string | null;
  inviteCode: string | null;
}

export interface Couple {
  id: string;
  status: string;
  partner: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  currentStreak: number;
  longestStreak: number;
  totalInteractions: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Daily question / answer — matches ContentService.getDailyQuestion response
// ---------------------------------------------------------------------------

export interface DailyQuestion {
  status: 'OK' | 'NO_COUPLE';
  message?: string;
  dailyQuestionId: string;
  assignedDate: string;
  questionStatus: string;
  question: {
    id: string;
    text: string;
    category: string;
  };
  currentUser: {
    hasAnswered: boolean;
    answerId: string | null;
  };
  partner: {
    hasAnswered: boolean;
  };
  isRevealed: boolean;
  answers: Answer[];
}

export interface Answer {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface AnswerResult {
  status: 'WAITING_FOR_PARTNER' | 'REVEALED';
  answerId: string;
  answers?: Answer[];
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Socket event payloads
// ---------------------------------------------------------------------------

export interface PartnerAnsweredPayload {
  questionId: string;
  bothAnswered: boolean;
  timestamp: number;
}

export interface AnswersRevealedPayload {
  questionId: string;
  timestamp: number;
}
