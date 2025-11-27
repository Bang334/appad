import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { AlertProvider } from './src/context/AlertContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AlertProvider>
          <NavigationContainer>
            <PlayerProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </PlayerProvider>
          </NavigationContainer>
        </AlertProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

