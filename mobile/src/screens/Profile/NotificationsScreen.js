import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../config/theme';
import { notificationService } from '../../services/notificationService';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import CreateNotificationModal from '../../components/Common/CreateNotificationModal';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useAlert();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPremium = user?.is_premium == 1;

  // Synchronize unread count to parent TabNavigator
  useEffect(() => {
    if (typeof onUnreadCountChange === 'function') {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getNotifications();
      if (response.success) {
        const serverUnread = response.data.unread_count || 0;
        setNotifications(response.data.notifications || []);
        setUnreadCount(serverUnread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      showError('Lỗi', 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadCountChange, showError]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.notification_id === notificationId
            ? { ...notif, is_read: 1 }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: 1 }))
        );
        setUnreadCount(0);
        showSuccess('Thành công', 'Đã đánh dấu tất cả là đã đọc');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Lỗi', 'Không thể đánh dấu tất cả');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Xóa thông báo',
      'Bạn có chắc muốn xóa thông báo này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notificationId);
              setNotifications(prev =>
                prev.filter(notif => notif.notification_id !== notificationId)
              );
              showSuccess('Thành công', 'Đã xóa thông báo');
            } catch (error) {
              console.error('Error deleting notification:', error);
              showError('Lỗi', 'Không thể xóa thông báo');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      'Xóa tất cả',
      'Bạn có chắc muốn xóa toàn bộ thông báo? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteAll();
              setNotifications([]);
              setUnreadCount(0);
              showSuccess('Thành công', 'Đã xóa toàn bộ thông báo');
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              showError('Lỗi', 'Không thể xóa thông báo');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }

    const data = notification.data || {};
    
    switch (notification.type) {
      case 'new_song':
        if (data.artist_id) navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        break;
      case 'revenue':
      case 'spend':
        if (data.type === 'artist_membership' && data.artist_id) {
          navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        } else {
          navigation.navigate('Wallet');
        }
        break;
      case 'new_follower':
        if (data.artist_id) navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        break;
      case 'withdrawal_approved':
      case 'withdrawal_rejected':
        navigation.navigate('ArtistWithdrawals', { artistId: data.artist_id });
        break;
      case 'deposit_approved':
      case 'deposit_rejected':
        navigation.navigate('TransactionHistory');
        break;
      case 'system':
        if (data.action === 'approve_deposit') navigation.navigate('AdminTransactions');
        else if (data.action === 'approve_withdrawal') navigation.navigate('AdminWithdrawals');
        else if (data.action === 'approve_artist') navigation.navigate('AdminUsers');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_song': return { name: 'musical-note', color: '#A78BFA', bg: ['#A78BFA15', '#A78BFA30'] };
      case 'new_follower': return { name: 'person-add', color: '#34D399', bg: ['#34D39915', '#34D39930'] };
      case 'withdrawal_approved':
      case 'deposit_approved': return { name: 'checkmark-circle-outline', color: '#34D399', bg: ['#34D39915', '#34D39930'] };
      case 'withdrawal_rejected':
      case 'deposit_rejected': return { name: 'alert-circle-outline', color: '#F87171', bg: ['#F8717115', '#F8717130'] };
      case 'revenue': return { name: 'cash-outline', color: '#34D399', bg: ['#34D39915', '#34D39930'] };
      case 'spend': return { name: 'wallet-outline', color: '#FBBF24', bg: ['#FBBF2415', '#FBBF2430'] };
      case 'system': return { name: 'shield-outline', color: '#60A5FA', bg: ['#60A5FA15', '#60A5FA30'] };
      default: return { name: 'notifications-outline', color: '#94A3B8', bg: ['#94A3B815', '#94A3B830'] };
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes}p trước`;
    if (hours < 24) return `${hours}h trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const renderNotificationItem = (item) => {
    const icon = getNotificationIcon(item.type);
    const data = item.data || {};
    const imageUrl = data.cover_url || data.image || data.avatar_url;
    
    return (
      <TouchableOpacity
        key={item.notification_id}
        style={[styles.itemCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item.notification_id)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.iconBox, { backgroundColor: COLORS.surface }]}
          />
        ) : (
          <LinearGradient
            colors={icon.bg}
            style={styles.iconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon.name} size={24} color={icon.color} />
          </LinearGradient>
        )}
        
        <View style={styles.itemContent}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#000000', '#000000']} style={StyleSheet.absoluteFill} />
      
      {/* Custom Header Area */}
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 30) }]}>
        {/* Absolute Centered Title */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 25, pointerEvents: 'none' }]}>
            <View style={{ alignItems: 'center' }}>
              <Text 
                numberOfLines={1}
                allowFontScaling={false}
                style={{ 
                  fontSize: 16, 
                  fontWeight: '700', 
                  color: isPremium ? COLORS.warning : COLORS.text, 
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  textShadowColor: isPremium ? 'rgba(245, 158, 11, 0.5)' : undefined,
                  textShadowOffset: isPremium ? { width: 0, height: 0 } : undefined,
                  textShadowRadius: isPremium ? 10 : 0,
                }}
              >
                THÔNG BÁO
              </Text>
              {isPremium && (
                <View style={{ 
                  marginTop: 4,
                  width: 24,
                  height: 2,
                  backgroundColor: COLORS.warning,
                  borderRadius: 1,
                  shadowColor: COLORS.warning,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 5,
                }} />
              )}
            </View>
        </View>

        {/* Spacer to push buttons to right */}
        <View style={{ flex: 1 }} />

        <View style={styles.actionRow}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
              <Ionicons name="checkmark-done" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleDeleteAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.plusButton}>
              <LinearGradient colors={[COLORS.primary, '#8B5CF6']} style={styles.plusGradient}>
                <Ionicons name="add" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollBody, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {notifications.length > 0 ? (
          notifications.map(item => renderNotificationItem(item))
        ) : (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={60} color="rgba(255,255,255,0.05)" />
            </View>
            <Text style={styles.emptyText}>Hộp thư đang trống</Text>
            <Text style={styles.emptySubText}>Tất cả thông báo của bạn sẽ xuất hiện tại đây</Text>
          </View>
        )}
      </ScrollView>

      <CreateNotificationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadNotifications}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
    position: 'relative',
    top: -10,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    top: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  plusGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: '#FFF',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    shadowColor: COLORS.primary,
    shadowRadius: 6,
    shadowOpacity: 0.8,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(NotificationsScreen);
