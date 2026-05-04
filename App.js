// ═══════════════════════════════════════════════════════════
// BIU Smart App — App.js
// EXPO versiyasi — bu faylni loyiha root ga qo'ying
// ═══════════════════════════════════════════════════════════
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigation from './navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}