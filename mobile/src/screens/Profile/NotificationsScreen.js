import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../config/theme';
import { notificationService } from '../../services/notificationService';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import MiniPlayer from '../../components/Player/MiniPlayer';
import CreateNotificationModal from '../../components/Common/CreateNotificationModal';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  const { showSuccess, showError } = useAlert();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getNotifications();
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      showError('Lỗi', 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

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

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }

    // Navigate based on notification type and data
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'new_song':
        if (data.song_id) {
          // Navigate to song or artist detail
          if (data.artist_id) {
            navigation.navigate('ArtistDetail', { artistId: data.artist_id });
          }
        }
        break;
      case 'revenue':
        // If it's artist_membership revenue, navigate to artist detail
        if (data.type === 'artist_membership' && data.artist_id) {
          navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        }
        break;
      case 'spend':
        // If it's artist_membership spend, navigate to artist detail
        if (data.type === 'artist_membership' && data.artist_id) {
          navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        } else {
          navigation.navigate('Wallet');
        }
        break;
      case 'new_follower':
        if (data.artist_id) {
          navigation.navigate('ArtistDetail', { artistId: data.artist_id });
        }
        break;
      case 'withdrawal_approved':
      case 'withdrawal_rejected':
        navigation.navigate('ArtistWithdrawals', { artistId: data.artist_id });
        break;
      case 'deposit_approved':
      case 'deposit_rejected':
        navigation.navigate('TransactionHistory');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_song':
        return { name: 'musical-note', color: COLORS.primary };
      case 'new_follower':
        return { name: 'person-add', color: COLORS.success };
      case 'new_comment':
        return { name: 'chatbubble', color: COLORS.info };
      case 'withdrawal_approved':
        return { name: 'checkmark-circle', color: COLORS.success };
      case 'withdrawal_rejected':
        return { name: 'close-circle', color: COLORS.error };
      case 'deposit_approved':
        return { name: 'checkmark-circle', color: COLORS.success };
      case 'deposit_rejected':
        return { name: 'close-circle', color: COLORS.error };
      case 'premium_expiring':
        return { name: 'time', color: COLORS.warning };
      case 'revenue':
        return { name: 'cash', color: COLORS.success };
      case 'spend':
        return { name: 'wallet', color: COLORS.warning };
      case 'system':
        return { name: 'information-circle', color: COLORS.primary };
      default:
        return { name: 'notifications', color: COLORS.textSecondary };
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
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getGroupKey = (type) => {
    switch (type) {
      case 'new_song':
      case 'new_album':
        return 'music';
      case 'new_follower':
      case 'new_comment':
        return 'social';
      case 'withdrawal_approved':
      case 'withdrawal_rejected':
      case 'deposit_approved':
      case 'deposit_rejected':
      case 'revenue':
      case 'spend':
      case 'artist_membership':
        return 'wallet';
      case 'premium_expiring':
      case 'system':
      default:
        return 'system';
    }
  };

  const getGroupTitle = (key) => {
    switch (key) {
      case 'music': return 'Âm nhạc';
      case 'social': return 'Tương tác';
      case 'wallet': return 'Giao dịch & Ví';
      case 'system': return 'Hệ thống';
      default: return 'Khác';
    }
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderNotificationItem = (item) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        key={item.notification_id}
        style={[
          styles.notificationItem,
          !item.is_read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item.notification_id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={!item.is_read ? [icon.color + '30', icon.color + '15'] : [icon.color + '20', icon.color + '10']}
          style={styles.iconContainer}
        >
          <Ionicons name={icon.name} size={26} color={icon.color} />
        </LinearGradient>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>

        {!item.is_read && (
          <View style={styles.unreadBadge}>
            <View style={styles.unreadDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);
  
  const groupedReadNotifications = readNotifications.reduce((acc, curr) => {
    const key = getGroupKey(curr.type);
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  // Sort groups to ensure consistent order (e.g., System, Wallet, Social, Music)
  const groupOrder = ['system', 'wallet', 'social', 'music'];
  const sortedGroupKeys = Object.keys(groupedReadNotifications).sort((a, b) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <View style={styles.container}>
      {/* Admin Create Notification Button */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.white} />
          <Text style={styles.createButtonText}>Tạo thông báo</Text>
        </TouchableOpacity>
      )}

      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
          <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Unread Section */}
        {unreadNotifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chưa đọc</Text>
            {unreadNotifications.map(item => renderNotificationItem(item))}
          </View>
        )}

        {/* Read Groups */}
        {sortedGroupKeys.map(key => {
          const items = groupedReadNotifications[key];
          if (!items || items.length === 0) return null;
          
          const isExpanded = expandedGroups.has(key);
          const displayItems = isExpanded ? items : items.slice(0, 3);
          
          return (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionTitle}>{getGroupTitle(key)}</Text>
              {displayItems.map(item => renderNotificationItem(item))}
              
              {items.length > 3 && (
                <TouchableOpacity 
                  style={styles.expandButton}
                  onPress={() => toggleGroup(key)}
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded ? 'Thu gọn' : `Xem tất cả (${items.length})`}
                  </Text>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {notifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={80} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Create Notification Modal */}
      <CreateNotificationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadNotifications();
        }}
      />
      
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  markAllText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    marginTop: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius + 4,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: COLORS.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowOpacity: 0.25,
    elevation: 5,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  notificationTitle: {
    color: COLORS.text,
    fontSize: SIZES.md + 1,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  notificationMessage: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm + 1,
    lineHeight: 22,
    marginBottom: 6,
  },
  notificationTime: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs + 1,
    fontWeight: '500',
  },
  unreadBadge: {
    marginLeft: 8,
    marginTop: 2,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 4,
  },
  expandButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});

export default NotificationsScreen;

