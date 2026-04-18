import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import ENV from '../config';

interface SocketEventMap {
  partner_answered: { questionId: string; bothAnswered: boolean; timestamp: number };
  answers_revealed: { questionId: string; timestamp: number };
  partner_typing: { userId: string; timestamp: number };
}

type EventName = keyof SocketEventMap;
type EventHandler<T extends EventName> = (data: SocketEventMap[T]) => void;

interface UseSocketOptions {
  coupleId: string | null;
  tokenProvider?: () => Promise<string | null>;
  onPartnerAnswered?: EventHandler<'partner_answered'>;
  onAnswersRevealed?: EventHandler<'answers_revealed'>;
  onPartnerTyping?: EventHandler<'partner_typing'>;
  enabled?: boolean;
}

export default function useSocket(options: UseSocketOptions) {
  const {
    coupleId,
    tokenProvider,
    onPartnerAnswered,
    onAnswersRevealed,
    onPartnerTyping,
    enabled = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);

  // Stable refs to avoid re-creating socket on handler changes
  const handlersRef = useRef({ onPartnerAnswered, onAnswersRevealed, onPartnerTyping });
  handlersRef.current = { onPartnerAnswered, onAnswersRevealed, onPartnerTyping };

  const tokenProviderRef = useRef(tokenProvider);
  tokenProviderRef.current = tokenProvider;

  const connect = useCallback(async () => {
    if (!coupleId || !enabled || !tokenProviderRef.current) return;
    if (socketRef.current?.connected) return;

    // Get fresh token
    let token: string | null = null;
    try {
      token = await tokenProviderRef.current();
    } catch (e) {
      console.warn('useSocket: failed to get token for socket auth', e);
      return;
    }
    if (!token) return;

    // Clean up any dangling socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(ENV.WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
      timeout: 15_000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinCoupleRoom', { coupleId });
    });

    socket.on('authenticated', () => {
      // Acknowledged — no-op
    });

    socket.on('partner_answered', (data: SocketEventMap['partner_answered']) => {
      handlersRef.current.onPartnerAnswered?.(data);
    });

    socket.on('answers_revealed', (data: SocketEventMap['answers_revealed']) => {
      handlersRef.current.onAnswersRevealed?.(data);
    });

    socket.on('partner_typing', (data: SocketEventMap['partner_typing']) => {
      handlersRef.current.onPartnerTyping?.(data);
    });

    socket.on('error', (err: { message: string }) => {
      if (err.message === 'Invalid or expired token') {
        socket.disconnect();
      }
    });

    socket.io.on('reconnect', () => {
      socket.emit('joinCoupleRoom', { coupleId });
    });
  }, [coupleId, enabled]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Mount / unmount lifecycle
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Reconnect when app returns to foreground
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') {
        connect();
      } else if (state === 'background') {
        disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handler);
    return () => subscription.remove();
  }, [connect, disconnect]);

  const emitTyping = useCallback(() => {
    if (socketRef.current?.connected && coupleId) {
      socketRef.current.emit('typing', { coupleId });
    }
  }, [coupleId]);

  return { disconnect, emitTyping };
}

