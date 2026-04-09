import React from 'react';
import useAuthStore, { selectHasCouple } from '../../src/store/useAuthStore';
import PairingScreen from '../../src/screens/PairingScreen';
import DailyPromptScreen from '../../src/screens/DailyPromptScreen';

export default function AppIndex() {
  const hasCouple = useAuthStore(selectHasCouple);
  
  if (!hasCouple) {
    return <PairingScreen />;
  }
  return <DailyPromptScreen />;
}
