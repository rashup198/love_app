import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router'; // ✅ ADD THIS

export default function AuthScreen() {
  const router = useRouter(); // ✅ ADD THIS
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // ✅ ADD THIS — prevents double-tap

  const onContinue = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;
    if (!emailAddress || !emailAddress.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn.create({ identifier: emailAddress, strategy: 'email_code' });
      setAuthMode('signin');
      setPendingVerification(true);
    } catch (err: any) {
      if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        try {
          await signUp.create({ emailAddress });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setAuthMode('signup');
          setPendingVerification(true);
        } catch (signupErr: any) {
          Alert.alert('Error', signupErr.errors?.[0]?.message || 'Failed to sign up.');
        }
      } else {
        Alert.alert('Error', err.errors?.[0]?.message || 'Failed to send login code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;
    if (isVerified) return; // ✅ Hard guard — silently ignore if already verified
    if (code.length < 6) return Alert.alert('Invalid Code', 'Please enter a 6-digit code.');

    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        const result = await signUp.attemptEmailAddressVerification({ code });

        if (result.status === 'complete') {
          setIsVerified(true); // ✅ Lock the button immediately
          await setSignUpActive({ session: result.createdSessionId }); // ✅ Use result directly, not signUp state
          router.replace('/(app)'); // ✅ Navigate AFTER setActive resolves
        } else {
          // status is 'missing_requirements' or similar — log for debugging
          console.warn('Unexpected signup status:', result.status);
          console.warn('Missing Fields:', result.missingFields);
          console.warn('Unverified Fields:', result.unverifiedFields);
          Alert.alert('Verification Incomplete', `Clerk requires additional fields: ${result.missingFields?.join(', ')}. Please update your Clerk Dashboard settings to only require Email.`);
          setIsLoading(false);
        }

      } else {
        const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });

        if (result.status === 'complete') {
          setIsVerified(true); // ✅ Lock the button immediately
          await setSignInActive({ session: result.createdSessionId }); // ✅ Use result directly
          router.replace('/(app)'); // ✅ Navigate AFTER setActive resolves
        } else {
          console.warn('Unexpected signin status:', result.status);
          Alert.alert('Verification Failed', 'Unable to complete sign in. Please try again.');
          setIsLoading(false);
        }
      }

    } catch (err: any) {
      const code = err.errors?.[0]?.code;

      if (code === 'verification_already_verified') {
        // ✅ This means setActive already ran — just navigate
        setIsVerified(true);
        router.replace('/(app)');
        return; // Don't touch isLoading — component is unmounting
      }

      Alert.alert('Error', err.errors?.[0]?.message || 'Invalid code.');
      setIsLoading(false); // ✅ Only reset on real errors
    }
    // ✅ No finally block — we intentionally keep spinner on success until navigation completes
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Confirm it's you</Text>
          <Text style={styles.subtitle}>
            Enter the code sent to{'\n'}
            <Text style={styles.emailText}>{emailAddress}</Text>
          </Text>

          <TextInput
            style={styles.inputCode}
            placeholder="000000"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            editable={!isLoading && !isVerified} // ✅ Lock input after verified
            textAlign="center"
          />

          {/* ✅ Button is disabled AND visually locked after first success */}
          <TouchableOpacity
            style={[styles.button, (isLoading || isVerified) && styles.buttonDisabled]}
            onPress={onVerify}
            disabled={isLoading || isVerified}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Verify & Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPendingVerification(false)}
            disabled={isLoading}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Lovora</Text>
        <Text style={styles.subtitle}>Enter your email to sign in or create an account</Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={emailAddress}
          onChangeText={setEmailAddress}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onContinue}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0A1A' },
  formContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 42, fontWeight: '800', color: '#E8567F', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#AAA', marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  emailText: { color: '#E8567F', fontWeight: '600' },
  input: { backgroundColor: '#1E162D', borderRadius: 12, padding: 16, fontSize: 16, color: '#FFF', borderWidth: 1, borderColor: '#302444', marginBottom: 20 },
  inputCode: { backgroundColor: '#1E162D', borderRadius: 12, padding: 16, fontSize: 32, letterSpacing: 8, color: '#FFF', borderWidth: 1, borderColor: '#E8567F', marginBottom: 24 },
  button: { backgroundColor: '#E8567F', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 20, padding: 10, alignItems: 'center' },
  backButtonText: { color: '#888', fontSize: 14 },
});