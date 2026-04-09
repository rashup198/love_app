import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useOAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import useAppStore, { selectHasCouple } from './store/useAuthStore';
import PairingScreen from './screens/PairingScreen';
import DailyPromptScreen from './screens/DailyPromptScreen';
import AuthScreen from './screens/AuthScreen';

// ... (keep the rest unchanged until CustomSignIn) ...

import api from './api/client';

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch { }
  },
};

// You need to replace this with the EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY 
const CLERK_PUBLISHABLE_KEY = "pk_test_ZXZvbHZlZC1ibG93ZmlzaC02LmNsZXJrLmFjY291bnRzLmRldiQ" || '';

function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      api.setToken(token);
    })();
  }, [getToken]);

  return <>{children}</>;
}

function InnerApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const fetchUserData = useAppStore((s) => s.fetchUserData);
  const isHydrated = useAppStore((s) => s.isHydrated);
  const hasCouple = useAppStore(selectHasCouple);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserData();
    }
  }, [isSignedIn, fetchUserData]);

  if (!isLoaded || (isSignedIn && !isHydrated)) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Lovora</Text>
        <ActivityIndicator size="large" color="#E8567F" style={styles.splashSpinner} />
      </View>
    );
  }

  if (isSignedIn && isHydrated) {
    if (!hasCouple) {
      return <PairingScreen />;
    }
    return <DailyPromptScreen />;
  }

  return null;
}



export default function App() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Lovora</Text>
        <Text style={{ color: '#E8567F', textAlign: 'center', margin: 20 }}>
          Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={Platform.OS === 'web' ? undefined : tokenCache}>
      <SignedIn>
        <AuthTokenSync>
          <InnerApp />
        </AuthTokenSync>
      </SignedIn>
      <SignedOut>
        <AuthScreen />
      </SignedOut>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0F0A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#E8567F',
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 16,
    color: '#AAA',
  },
  splashSpinner: {
    marginTop: 20,
  },
  button: {
    marginTop: 40,
    backgroundColor: '#E8567F',
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  }
});
