// ═══════════════════════════════════════════════════════════
// BIU Smart App — navigation/index.js
// ═══════════════════════════════════════════════════════════
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './ref';

import SplashScreen         from '../screens/SplashScreen';
import LoginScreen          from '../screens/LoginScreen';
import BiometricLoginScreen from '../screens/BiometricLoginScreen';
import StaffHomeScreen      from '../screens/staff/StaffHomeScreen';
import BuildingSelectScreen from '../screens/staff/BuildingSelectScreen';
import MapScreen            from '../screens/staff/MapScreen';
import AbetScreen           from '../screens/staff/AbetScreen';
import TeamScreen           from '../screens/staff/TeamScreen';
import StudentHomeScreen    from '../screens/student/StudentHomeScreen';
import QRScannerScreen      from '../screens/student/QRScannerScreen';
import ScheduleScreen       from '../screens/student/ScheduleScreen';
import NotificationsScreen  from '../screens/student/NotificationsScreen';

const Stack = createNativeStackNavigator();

export { navigationRef, navigateTo } from './ref';

export default function AppNavigation() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Splash"  component={SplashScreen} />
        <Stack.Screen name="Login"   component={LoginScreen} />
        <Stack.Screen
          name="BiometricLogin"
          component={BiometricLoginScreen}
          options={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />

        {/* Staff */}
        <Stack.Screen name="StaffHome"      component={StaffHomeScreen} />
        <Stack.Screen
          name="BuildingSelect"
          component={BuildingSelectScreen}
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Map"  component={MapScreen} />
        <Stack.Screen
          name="TeamScreen"
          component={TeamScreen}
          options={{
            headerShown: true,
            title: 'Jamoa holati',
            headerTintColor: '#028090',
            headerStyle: { backgroundColor: '#F8FAFC' },
            headerShadowVisible: false,
            statusBarStyle: 'dark',
          }}
        />
        <Stack.Screen name="Abet" component={AbetScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />

        {/* Student */}
        <Stack.Screen name="StudentHome"   component={StudentHomeScreen} />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Schedule"      component={ScheduleScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}