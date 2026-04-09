import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Slot, useRouter, useSegments } from 'expo-router';
import api from '../src/api/client';
import useAppStore from '../src/store/useAuthStore';

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

const CLERK_PUBLISHABLE_KEY = "pk_test_ZXZvbHZlZC1ibG93ZmlzaC02LmNsZXJrLmFjY291bnRzLmRldiQ";

function InitialLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const fetchUserData = useAppStore((s) => s.fetchUserData);
  const isHydrated = useAppStore((s) => s.isHydrated);

  useEffect(() => {
    if (isSignedIn) {
      getToken().then((token) => {
        api.setToken(token);
        fetchUserData();
      });
    } else if (isLoaded && !isSignedIn) {
      api.setToken(null);
      useAppStore.getState().clearAuth();
    }
  }, [isSignedIn, isLoaded, getToken, fetchUserData]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && isHydrated) {
      if (inAuthGroup) {
        router.replace('/(app)');
      }
    } else if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isSignedIn, isHydrated, segments, isLoaded]);

  if (!isLoaded || (isSignedIn && !isHydrated)) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Lovora</Text>
        <ActivityIndicator size="large" color="#E8567F" style={styles.splashSpinner} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Lovora</Text>
        <Text style={{ color: '#E8567F', textAlign: 'center', margin: 20 }}>
          Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={Platform.OS === 'web' ? undefined : tokenCache}>
      <InitialLayout />
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
  splashSpinner: {
    marginTop: 20,
  },
});
