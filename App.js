// ═══════════════════════════════════════════════════════════
// BIU Smart App — App.js
// EXPO versiyasi — bu faylni loyiha root ga qo'ying
// ═══════════════════════════════════════════════════════════
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigation from './navigation';

export default function App() {
  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}`)
      .then(r => r.json())
      .then(d => console.log('API OK:', d.message))
      .catch(e => console.log('API ERROR:', e.message));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}