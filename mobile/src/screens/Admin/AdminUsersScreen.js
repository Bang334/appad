import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all', 'pending_artist'
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(true, searchQuery);
    }, searchQuery ? 400 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = async (reset = true, query = searchQuery) => {
    if (reset) setPage(1);
    setLoading(true);
    setLoadError('');
    try {
      const response = await adminService.getAllUsers(100, 0, query);
      if (reset) {
        setUsers(response.data || []);
      } else {
        setUsers(prev => [...prev, ...(response.data || [])]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      if (reset) {
        setUsers([]);
      }
      setLoadError('Không thể tải danh sách người dùng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleBanUser = async (user) => {
    const isPendingArtist = user.is_banned === 2;
    const title = isPendingArtist ? 'Từ chối yêu cầu' : 'Cấm người dùng';
    const message = isPendingArtist 
      ? `Bạn có chắc muốn từ chối yêu cầu làm nghệ sĩ của "${user.username}"? Tài khoản sẽ trở về trạng thái người dùng bình thường.`
      : `Bạn có chắc muốn cấm người dùng "${user.username}"?`;
    const confirmText = isPendingArtist ? 'Từ chối' : 'Cấm';

    Alert.alert(
      title,
      message,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: confirmText,
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.banUser(user.user_id);
              Alert.alert('Thành công', isPendingArtist ? 'Đã từ chối yêu cầu' : 'Đã cấm người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Thao tác thất bại');
            }
          }
        }
      ]
    );
  };

  const handleUnbanUser = async (user) => {
    const isPendingArtist = user.is_banned === 2;
    const title = isPendingArtist ? 'Chấp nhận yêu cầu' : 'Bỏ cấm người dùng';
    const message = isPendingArtist
      ? `Chấp nhận yêu cầu làm nghệ sĩ của "${user.username}"?`
      : `Bạn có chắc muốn bỏ cấm người dùng "${user.username}"?`;
    const confirmText = isPendingArtist ? 'Chấp nhận' : 'Bỏ cấm';

    Alert.alert(
      title,
      message,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: confirmText,
          onPress: async () => {
            try {
              await adminService.unbanUser(user.user_id);
              Alert.alert('Thành công', isPendingArtist ? 'Đã chấp nhận yêu cầu' : 'Đã bỏ cấm người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Thao tác thất bại');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (user) => {
    Alert.alert(
      'Xóa người dùng',
      `Bạn có chắc muốn xóa người dùng "${user.username}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteUser(user.user_id);
              Alert.alert('Thành công', 'Đã xóa người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa người dùng');
            }
          }
        }
      ]
    );
  };

  const getFilteredUsers = () => {
    if (filter === 'pending_artist') {
      return users.filter(u => u.is_banned === 2);
    }
    return users;
  };

  const renderUserItem = ({ item }) => {
    const isPendingArtist = item.is_banned === 2;
    
    return (
      <View style={styles.userItem}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image 
                source={{ uri: item.avatar_url }} 
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {item.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {item.artist_id && (
              <View style={styles.artistBadge}>
                <Ionicons name="musical-notes" size={12} color={COLORS.white} />
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.username}</Text>
              {item.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield" size={12} color={COLORS.warning} />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
              {item.artist_id && (
                <View style={styles.artistLabel}>
                  <Ionicons name="musical-notes" size={12} color={COLORS.primary} />
                  <Text style={styles.artistLabelText}>Artist</Text>
                </View>
              )}
              {isPendingArtist && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time" size={12} color={COLORS.info} />
                  <Text style={styles.pendingBadgeText}>Chờ duyệt</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userRole}>
                {item.role === 'admin' ? 'Admin' : item.role === 'artist' ? 'Artist' : 'User'}
              </Text>
              <Text style={[
                styles.userStatus,
                { color: item.is_banned === 1 ? COLORS.error : item.is_banned === 2 ? COLORS.info : COLORS.success }
              ]}>
                {item.is_banned === 1 ? 'Bị cấm' : item.is_banned === 2 ? 'Chờ duyệt Artist' : 'Hoạt động'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          {isPendingArtist ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.unbanButton]}
                onPress={() => handleUnbanUser(item)}
              >
                <Ionicons name="checkmark" size={20} color={COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.banButton]}
                onPress={() => handleBanUser(item)}
              >
                <Ionicons name="close" size={20} color={COLORS.warning} />
              </TouchableOpacity>
            </>
          ) : item.is_banned ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.unbanButton]}
              onPress={() => handleUnbanUser(item)}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.banButton]}
              onPress={() => handleBanUser(item)}
            >
              <Ionicons name="ban" size={20} color={COLORS.warning} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(item)}
          >
            <Ionicons name="trash" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quản lý người dùng</Text>
        <View style={styles.addButton} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm người dùng..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'pending_artist' && styles.activeFilterTab]}
          onPress={() => setFilter('pending_artist')}
        >
          <Text style={[styles.filterText, filter === 'pending_artist' && styles.activeFilterText]}>
            Yêu cầu Artist
            {users.filter(u => u.is_banned === 2).length > 0 && (
              <Text style={{ color: COLORS.primary }}> ({users.filter(u => u.is_banned === 2).length})</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredUsers()}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={loadError ? 'cloud-offline-outline' : 'people-outline'}
                size={48}
                color={COLORS.textSecondary}
              />
              <Text
                style={styles.emptyText}
                accessibilityRole={loadError ? 'alert' : undefined}
              >
                {loadError || 'Không tìm thấy người dùng nào'}
              </Text>
              {loadError ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => loadUsers(true, searchQuery)}
                  accessibilityRole="button"
                  accessibilityLabel="Thử tải lại danh sách người dùng"
                >
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  listContainer: {
    padding: SIZES.padding,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  artistBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 8,
  },
  userName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  adminBadgeText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  artistLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  artistLabelText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  userEmail: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  userRole: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  userStatus: {
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banButton: {
    backgroundColor: COLORS.warning + '20',
  },
  unbanButton: {
    backgroundColor: COLORS.success + '20',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  pendingBadgeText: {
    color: COLORS.info,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 8,
    gap: 12,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.primary,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 96,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});

export default AdminUsersScreen;
