import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import LibraryScreen from '../screens/Library/LibraryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import FullPlayerScreen from '../screens/Player/FullPlayerScreen';
import PlaylistDetailScreen from '../screens/Playlist/PlaylistDetailScreen';
import ArtistDetailScreen from '../screens/Artist/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/Album/AlbumDetailScreen';

// Profile Screens
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/Profile/ChangePasswordScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import HelpScreen from '../screens/Profile/HelpScreen';
import AboutScreen from '../screens/Profile/AboutScreen';

// Admin Screens
import AdminDashboard from '../screens/Admin/AdminDashboard';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminSongsScreen from '../screens/Admin/AdminSongsScreen';
import AdminAlbumsScreen from '../screens/Admin/AdminAlbumsScreen';
import AdminAlbumDetailScreen from '../screens/Admin/AdminAlbumDetailScreen';
import AdminEditAlbumScreen from '../screens/Admin/AdminEditAlbumScreen';
import AdminAnalyticsScreen from '../screens/Admin/AdminAnalyticsScreen';
import AdminEditSongScreen from '../screens/Admin/AdminEditSongScreen';

// Player Component
import MiniPlayer from '../components/Player/MiniPlayer';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Library') {
              iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.card,
            height: 60,
            paddingBottom: 8,
          },
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Trang chủ' }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ title: 'Tìm kiếm' }}
        />
        <Tab.Screen 
          name="Library" 
          component={LibraryScreen}
          options={{ title: 'Thư viện' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Cá nhân' }}
        />
      </Tab.Navigator>
      <MiniPlayer />
    </>
  );
};

const MainTabNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="FullPlayer" 
        component={FullPlayerScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="ArtistDetail" 
        component={ArtistDetailScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AlbumDetail" 
        component={AlbumDetailScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Help" 
        component={HelpScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminSongs" 
        component={AdminSongsScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminAlbums" 
        component={AdminAlbumsScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminAlbumDetail" 
        component={AdminAlbumDetailScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="AdminEditAlbum" 
        component={AdminEditAlbumScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
        <Stack.Screen
          name="AdminAnalytics"
          component={AdminAnalyticsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="AdminEditSong"
          component={AdminEditSongScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
          }}
        />
    </Stack.Navigator>
  );
};

export default MainTabNavigator;

