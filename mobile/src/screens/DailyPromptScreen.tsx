import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import api from '../api/client';
import useAuthStore, { selectCoupleId } from '../store/useAuthStore';
import useSocket from '../hooks/useSocket';
import type { DailyQuestion, AnswerResult } from '../types';

// ---------------------------------------------------------------------------
// Screen status model
// ---------------------------------------------------------------------------
type ScreenPhase =
  | 'loading'       // Fetching today's question
  | 'no_couple'     // User has no couple yet
  | 'no_question'   // Backend returned no question
  | 'answering'     // Waiting for user to type their answer
  | 'submitting'    // POST in progress
  | 'waiting'       // Submitted, waiting for partner
  | 'revealed'      // Both answered — show both
  | 'error';        // Network / server failure

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DailyPromptScreen() {
  const { getToken } = useAuth();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const coupleId = useAuthStore(selectCoupleId);

  const [phase, setPhase] = useState<ScreenPhase>('loading');
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const submitLockRef = useRef(false);

  // -----------------------------------------------------------------------
  // Fetch daily question
  // -----------------------------------------------------------------------
  const fetchDailyQuestion = useCallback(async () => {
    try {
      const data = await api.get<DailyQuestion>('/content/daily');

      if (data.status === 'NO_COUPLE') {
        setPhase('no_couple');
        setDailyQuestion(null);
        return;
      }

      if (!data.question) {
        setPhase('no_question');
        setDailyQuestion(null);
        return;
      }

      setDailyQuestion(data);

      if (data.isRevealed && data.answers.length >= 2) {
        setPhase('revealed');
      } else if (data.currentUser.hasAnswered) {
        setPhase('waiting');
      } else {
        setPhase('answering');
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load today's question");
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    fetchDailyQuestion();
  }, [fetchDailyQuestion]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDailyQuestion();
    setRefreshing(false);
  }, [fetchDailyQuestion]);

  // -----------------------------------------------------------------------
  // Submit answer
  // -----------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    const trimmed = answerText.trim();
    if (!trimmed || !dailyQuestion) return;
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    Keyboard.dismiss();
    setPhase('submitting');
    setError(null);

    try {
      const result = await api.post<AnswerResult>('/interactions/answers', {
        dailyQuestionId: dailyQuestion.dailyQuestionId,
        text: trimmed,
      });

      if (result.status === 'REVEALED' && result.answers) {
        setDailyQuestion((prev) =>
          prev
            ? {
              ...prev,
              isRevealed: true,
              currentUser: { hasAnswered: true, answerId: result.answerId },
              partner: { hasAnswered: true },
              answers: result.answers!,
            }
            : prev,
        );
        setPhase('revealed');
      } else {
        setDailyQuestion((prev) =>
          prev
            ? {
              ...prev,
              currentUser: { hasAnswered: true, answerId: result.answerId },
            }
            : prev,
        );
        setPhase('waiting');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
      setPhase('answering');
    } finally {
      submitLockRef.current = false;
    }
  }, [answerText, dailyQuestion]);

  // -----------------------------------------------------------------------
  // Socket — real-time partner events
  // -----------------------------------------------------------------------
  const handlePartnerAnswered = useCallback(
    (data: { questionId: string; bothAnswered: boolean; answers?: any[] }) => {
      if (!dailyQuestion || dailyQuestion.dailyQuestionId !== data.questionId) return;

      if (data.bothAnswered && data.answers) {
        setDailyQuestion((prev) =>
          prev
            ? {
              ...prev,
              isRevealed: true,
              partner: { hasAnswered: true },
              answers: data.answers!,
            }
            : prev,
        );
        setPhase('revealed');
      } else {
        setDailyQuestion((prev) =>
          prev ? { ...prev, partner: { hasAnswered: true } } : prev,
        );
      }
    },
    [dailyQuestion],
  );

  const handleAnswersRevealed = useCallback(() => {
    fetchDailyQuestion();
  }, [fetchDailyQuestion]);

  useSocket({
    coupleId,
    tokenProvider: () => getToken(),
    onPartnerAnswered: handlePartnerAnswered,
    onAnswersRevealed: handleAnswersRevealed,
    onReconnect: fetchDailyQuestion,
    enabled: !!coupleId,
  });

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const renderLoading = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#E8567F" />
      <Text style={styles.loadingText}>Loading today&apos;s question...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centered}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchDailyQuestion}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoCouple = () => (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>💕</Text>
      <Text style={styles.emptyTitle}>No partner yet</Text>
      <Text style={styles.emptySubtitle}>
        Pair with your partner to start your daily questions.
      </Text>
    </View>
  );

  const renderNoQuestion = () => (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>No question today</Text>
      <Text style={styles.emptySubtitle}>
        Check back soon — new questions are added regularly.
      </Text>
    </View>
  );

  const renderAnswerInput = () => {
    const isSubmitting = phase === 'submitting';
    const canSubmit = answerText.trim().length > 0 && !isSubmitting;

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderQuestionCard()}

          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>Your answer</Text>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here…"
              placeholderTextColor="#555"
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              maxLength={1000}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {answerText.length}/1000
            </Text>

            {error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Answer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderWaiting = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#E8567F"
          colors={['#E8567F']}
        />
      }
    >
      {renderQuestionCard()}

      <View style={styles.waitingCard}>
        <ActivityIndicator size="small" color="#E8567F" style={styles.waitingSpinner} />
        <Text style={styles.waitingTitle}>Waiting for your partner…</Text>
        <Text style={styles.waitingSubtitle}>
          You will see both answers once your partner responds.
          {'\n'}Pull down to refresh.
        </Text>
      </View>

      <View style={styles.yourAnswerPreview}>
        <Text style={styles.previewLabel}>Your answer</Text>
        <Text style={styles.previewText}>
          {findUserAnswer()?.text ?? answerText}
        </Text>
      </View>
    </ScrollView>
  );

  const renderRevealed = () => {
    const userAnswer = findUserAnswer();
    const partnerAnswer = findPartnerAnswer();

    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E8567F"
            colors={['#E8567F']}
          />
        }
      >
        {renderQuestionCard()}

        <View style={styles.revealedHeader}>
          <Text style={styles.revealedTitle}>Both answers are in! 🎉</Text>
        </View>

        {/* User's answer */}
        <View style={[styles.answerCard, styles.answerCardUser]}>
          <Text style={styles.answerCardLabel}>You</Text>
          <Text style={styles.answerCardText}>{userAnswer?.text ?? '—'}</Text>
          {userAnswer?.createdAt ? (
            <Text style={styles.answerCardTime}>
              {formatTime(userAnswer.createdAt)}
            </Text>
          ) : null}
        </View>

        {/* Partner's answer */}
        <View style={[styles.answerCard, styles.answerCardPartner]}>
          <Text style={styles.answerCardLabel}>Partner</Text>
          <Text style={styles.answerCardText}>{partnerAnswer?.text ?? '—'}</Text>
          {partnerAnswer?.createdAt ? (
            <Text style={styles.answerCardTime}>
              {formatTime(partnerAnswer.createdAt)}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  const renderQuestionCard = () => {
    if (!dailyQuestion?.question) return null;

    const categoryLabel = formatCategory(dailyQuestion.question.category);

    return (
      <View style={styles.questionCard}>
        <View style={styles.questionMeta}>
          <Text style={styles.questionBadge}>{categoryLabel}</Text>
          <Text style={styles.questionDate}>
            {formatDate(dailyQuestion.assignedDate)}
          </Text>
        </View>
        <Text style={styles.questionText}>{dailyQuestion.question.text}</Text>
      </View>
    );
  };

  // -----------------------------------------------------------------------
  // Data helpers
  // -----------------------------------------------------------------------
  const findUserAnswer = () =>
    dailyQuestion?.answers.find((a) => a.userId === userId) ?? null;

  const findPartnerAnswer = () =>
    dailyQuestion?.answers.find((a) => a.userId !== userId) ?? null;

  // -----------------------------------------------------------------------
  // Phase router
  // -----------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {phase === 'loading' && renderLoading()}
      {phase === 'error' && renderError()}
      {phase === 'no_couple' && renderNoCouple()}
      {phase === 'no_question' && renderNoQuestion()}
      {(phase === 'answering' || phase === 'submitting') && renderAnswerInput()}
      {phase === 'waiting' && renderWaiting()}
      {phase === 'revealed' && renderRevealed()}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function formatCategory(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F0A1A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Loading
  loadingText: {
    marginTop: 16,
    color: '#888',
    fontSize: 14,
  },

  // Error
  errorIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#E8567F',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Empty states
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Question card
  questionCard: {
    backgroundColor: '#1A1228',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A1F3D',
  },
  questionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E8567F',
    backgroundColor: 'rgba(232, 86, 127, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionDate: {
    fontSize: 12,
    color: '#666',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },

  // Answer input
  answerSection: {
    marginBottom: 24,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8567F',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  answerInput: {
    backgroundColor: '#1A1228',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#2A1F3D',
  },
  charCount: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    marginTop: 6,
  },
  inlineError: {
    fontSize: 13,
    color: '#E85050',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#E8567F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Waiting state
  waitingCard: {
    backgroundColor: '#1A1228',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A1F3D',
  },
  waitingSpinner: {
    marginBottom: 12,
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Your answer preview (in waiting state)
  yourAnswerPreview: {
    backgroundColor: '#1A1228',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A1F3D',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 15,
    color: '#CCC',
    lineHeight: 22,
  },

  // Revealed state
  revealedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revealedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  answerCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  answerCardUser: {
    backgroundColor: 'rgba(232, 86, 127, 0.08)',
    borderColor: 'rgba(232, 86, 127, 0.25)',
  },
  answerCardPartner: {
    backgroundColor: 'rgba(110, 86, 232, 0.08)',
    borderColor: 'rgba(110, 86, 232, 0.25)',
  },
  answerCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  answerCardText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  answerCardTime: {
    fontSize: 11,
    color: '#555',
    marginTop: 10,
    textAlign: 'right',
  },
});
