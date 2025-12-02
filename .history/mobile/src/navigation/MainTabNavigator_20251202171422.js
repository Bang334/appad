import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../config/theme';
import { notificationService } from '../services/notificationService';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import LibraryScreen from '../screens/Library/LibraryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import NotificationsScreen from '../screens/Profile/NotificationsScreen';
import FullPlayerScreen from '../screens/Player/FullPlayerScreen';
import PlaylistDetailScreen from '../screens/Playlist/PlaylistDetailScreen';
import ArtistDetailScreen from '../screens/Artist/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/Album/AlbumDetailScreen';
import GenreDetailScreen from '../screens/Genre/GenreDetailScreen';
import HistoryScreen from '../screens/History/HistoryScreen';

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
import AdminMembershipScreen from '../screens/Admin/AdminMembershipScreen';
import AdminAlbumsScreen from '../screens/Admin/AdminAlbumsScreen';
import AdminAlbumDetailScreen from '../screens/Admin/AdminAlbumDetailScreen';
import AdminEditAlbumScreen from '../screens/Admin/AdminEditAlbumScreen';
import AdminAnalyticsScreen from '../screens/Admin/AdminAnalyticsScreen';
import AdminEditSongScreen from '../screens/Admin/AdminEditSongScreen';
import AdminWithdrawalsScreen from '../screens/Admin/AdminWithdrawalsScreen';
import AdminTransactionsScreen from '../screens/Admin/AdminTransactionsScreen';

// Premium Screens
import PremiumScreen from '../screens/Premium/PremiumScreen';
import PurchasedSongsScreen from '../screens/Premium/PurchasedSongsScreen';
import PurchaseHistoryScreen from '../screens/Premium/PurchaseHistoryScreen';
import UserMembershipScreen from '../screens/Premium/UserMembershipScreen';

// Wallet Screens
import WalletScreen from '../screens/Wallet/WalletScreen';
import TopUpScreen from '../screens/Wallet/TopUpScreen';
import TransactionHistoryScreen from '../screens/Wallet/TransactionHistoryScreen';

// Artist Management Screens
import ArtistDashboardScreen from '../screens/Artist/ArtistDashboardScreen';
import ArtistRevenueScreen from '../screens/Artist/ArtistRevenueScreen';
import ArtistWithdrawScreen from '../screens/Artist/ArtistWithdrawScreen';
import ArtistWithdrawalsScreen from '../screens/Artist/ArtistWithdrawalsScreen';
import ArtistBankInfoScreen from '../screens/Artist/ArtistBankInfoScreen';
import ArtistSongsScreen from '../screens/Artist/ArtistSongsScreen';
import ArtistAlbumsScreen from '../screens/Artist/ArtistAlbumsScreen';
import ArtistMembershipScreen from '../screens/Artist/ArtistMembershipScreen';

import ArtistEditSongScreen from '../screens/Artist/ArtistEditSongScreen';
import ArtistEditAlbumScreen from '../screens/Artist/ArtistEditAlbumScreen';

// Player Component
import MiniPlayer from '../components/Player/MiniPlayer';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      // Don't log 401 errors (user not logged in or token expired)
      if (error.response?.status !== 401) {
        console.error('Error fetching unread count:', error);
      }
      // Reset count to 0 if unauthorized
      if (error.response?.status === 401) {
        setUnreadCount(0);
      }
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
            } else if (route.name === 'Notifications') {
              iconName = focused ? 'notifications' : 'notifications-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            // Show badge for notifications
            if (route.name === 'Notifications' && unreadCount > 0) {
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                </View>
              );
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: '#050505',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
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
          name="Notifications"
          options={{ 
            title: 'Thông báo',
            tabBarLabel: 'Thông báo',
          }}
        >
          {(props) => (
            <NotificationsScreen
              {...props}
              onUnreadCountChange={setUnreadCount}
            />
          )}
        </Tab.Screen>
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
        name="GenreDetail" 
        component={GenreDetailScreen}
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
        name="History" 
        component={HistoryScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
          title: 'Lịch sử nghe nhạc',
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
        name="RegisterArtist" 
        component={require('../screens/Profile/RegisterArtistScreen').default}
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
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Premium',
          }}
        />
        <Stack.Screen
          name="PurchasedSongs"
          component={PurchasedSongsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Bài hát đã mua',
          }}
        />
        <Stack.Screen
          name="PurchaseHistory"
          component={PurchaseHistoryScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Lịch sử mua hàng',
          }}
        />
        <Stack.Screen
          name="UserMembership"
          component={UserMembershipScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Ví của tôi',
          }}
        />
        <Stack.Screen
          name="TopUp"
          component={TopUpScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Nạp tiền',
          }}
        />
        <Stack.Screen
          name="TransactionHistory"
          component={TransactionHistoryScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Lịch sử giao dịch',
          }}
        />
        <Stack.Screen
          name="ArtistDashboard"
          component={ArtistDashboardScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Artist Dashboard',
          }}
        />
        <Stack.Screen
          name="ArtistRevenue"
          component={ArtistRevenueScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Doanh thu',
          }}
        />
        <Stack.Screen
          name="ArtistWithdraw"
          component={ArtistWithdrawScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Rút tiền',
          }}
        />
        <Stack.Screen
          name="ArtistWithdrawals"
          component={ArtistWithdrawalsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Lịch sử rút tiền',
          }}
        />
        <Stack.Screen
          name="ArtistBankInfo"
          component={ArtistBankInfoScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Thông tin ngân hàng',
          }}
        />
        <Stack.Screen
          name="ArtistSongs"
          component={ArtistSongsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ArtistAlbums"
          component={ArtistAlbumsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ArtistEditSong"
          component={ArtistEditSongScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ArtistEditAlbum"
          component={ArtistEditAlbumScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ArtistMembership"
          component={ArtistMembershipScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AdminWithdrawals"
          component={AdminWithdrawalsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Quản lý rút tiền',
          }}
        />
        <Stack.Screen
          name="AdminTransactions"
          component={AdminTransactionsScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
            headerShown: true,
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            title: 'Quản lý nạp tiền',
          }}
        />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainTabNavigator;

