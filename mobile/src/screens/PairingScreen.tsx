import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import api from '../api/client';
import useAuthStore from '../store/useAuthStore';
import type { Couple } from '../types';

type ScreenState = 'loading' | 'ready' | 'submitting';

interface InviteCodeResponse {
  inviteCode: string;
}

interface JoinCoupleResponse {
  coupleId: string;
  partnerId: string;
  status: string;
  currentStreak: number;
  createdAt: string;
}

const CODE_MIN_LENGTH = 6;
const CODE_MAX_LENGTH = 8;
const CODE_PATTERN = /^[A-Z0-9]+$/;

const ALREADY_IN_COUPLE_PATTERNS = [
  'already in a couple',
  'already paired',
  'conflict',
];

function isAlreadyInCoupleError(message: string): boolean {
  const lower = message.toLowerCase();
  return ALREADY_IN_COUPLE_PATTERNS.some((p) => lower.includes(p));
}

export default function PairingScreen() {
  const user = useAuthStore((s) => s.user);
  const setCouple = useAuthStore((s) => s.setCouple);
  const fetchUserData = useAuthStore((s) => s.fetchUserData);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [codeLoadError, setCodeLoadError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const isSubmitting = screenState === 'submitting';
  const submitLockRef = useRef(false);

  const fetchInviteCode = useCallback(async () => {
    setCodeLoadError(null);
    try {
      const result = await api.post<InviteCodeResponse>('/couples/invite-code');
      setInviteCode(result.inviteCode);
    } catch (err: any) {
      const msg = err.message || 'Failed to load invite code';
      // If backend says "already in a couple", re-hydrate store so AppIndex navigates away
      if (isAlreadyInCoupleError(msg)) {
        console.log('PairingScreen: already in couple, re-fetching user data...');
        await fetchUserData();
        return;
      }
      setCodeLoadError(msg);
    }
  }, [fetchUserData]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (user?.inviteCode) {
        setInviteCode(user.inviteCode);
      } else {
        await fetchInviteCode();
      }
      if (mounted) setScreenState('ready');
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.inviteCode, fetchInviteCode]);

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [inviteCode]);

  const validateCode = useCallback(
    (code: string): string | null => {
      if (code.length < CODE_MIN_LENGTH || code.length > CODE_MAX_LENGTH) {
        return `Invite code must be ${CODE_MIN_LENGTH}–${CODE_MAX_LENGTH} characters`;
      }
      if (!CODE_PATTERN.test(code)) {
        return 'Invite code must be uppercase letters and numbers only';
      }
      if (code === inviteCode) {
        return "You can't use your own invite code";
      }
      return null;
    },
    [inviteCode],
  );

  const handleJoinCouple = useCallback(async () => {
    const trimmedCode = partnerCode.trim().toUpperCase();

    const validationError = validateCode(trimmedCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;

    Keyboard.dismiss();
    setError(null);
    setScreenState('submitting');

    try {
      const result = await api.post<JoinCoupleResponse>('/couples/join', {
        inviteCode: trimmedCode,
      });

      const couple: Couple = {
        id: result.coupleId,
        status: result.status,
        partner: {
          id: result.partnerId,
          displayName: null,
          avatarUrl: null,
        },
        currentStreak: result.currentStreak,
        longestStreak: 0,
        totalInteractions: 0,
        createdAt: result.createdAt,
      };

      // Immediately update store — AppIndex will swap to DailyPromptScreen
      setCouple(couple);
    } catch (err: any) {
      const msg = err.message || 'Failed to join couple';
      // If already paired (race condition), just re-hydrate
      if (isAlreadyInCoupleError(msg)) {
        await fetchUserData();
        return;
      }
      setError(msg);
      setScreenState('ready');
    } finally {
      submitLockRef.current = false;
    }
  }, [partnerCode, validateCode, setCouple, fetchUserData]);

  // --- Loading state ---
  if (screenState === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8567F" />
        <Text style={styles.loadingText}>Setting up your invite code…</Text>
      </View>
    );
  }

  const canSubmit = partnerCode.trim().length >= CODE_MIN_LENGTH && !isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Connect with your partner</Text>
        <Text style={styles.subtitle}>
          Share your invite code or enter your partner's code to start your
          journey together.
        </Text>

        {/* --- Your Invite Code --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your invite code</Text>
          {inviteCode ? (
            <TouchableOpacity
              style={styles.codeContainer}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Text style={styles.codeText}>{inviteCode}</Text>
              <Text style={styles.copyHint}>
                {codeCopied ? '✓ Copied!' : 'Tap to copy'}
              </Text>
            </TouchableOpacity>
          ) : codeLoadError ? (
            <View style={styles.codeErrorContainer}>
              <Text style={styles.codeErrorText}>{codeLoadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchInviteCode}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.codeContainer}>
              <ActivityIndicator size="small" color="#E8567F" />
            </View>
          )}
        </View>

        {/* --- Divider --- */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* --- Partner Code Entry --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter partner's code</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="e.g. AB3X7K9P"
            placeholderTextColor="#555"
            value={partnerCode}
            onChangeText={(text) => {
              setPartnerCode(text.toUpperCase());
              if (error) setError(null);
            }}
            maxLength={CODE_MAX_LENGTH}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isSubmitting}
            returnKeyType="go"
            onSubmitEditing={canSubmit ? handleJoinCouple : undefined}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.joinButton, !canSubmit && styles.joinButtonDisabled]}
            onPress={handleJoinCouple}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.joinButtonText}>Join Couple</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0A1A',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F0A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#888',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    lineHeight: 22,
    marginBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8567F',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: '#1A1228',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A1F3D',
    minHeight: 80,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  copyHint: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
  },
  codeErrorContainer: {
    backgroundColor: '#1A1228',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D1F2A',
  },
  codeErrorText: {
    fontSize: 14,
    color: '#E85050',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2A1F3D',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#E8567F',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A1F3D',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1A1228',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#2A1F3D',
  },
  inputError: {
    borderColor: '#E85050',
  },
  errorText: {
    fontSize: 13,
    color: '#E85050',
    marginTop: 8,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#E8567F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  joinButtonDisabled: {
    opacity: 0.45,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
