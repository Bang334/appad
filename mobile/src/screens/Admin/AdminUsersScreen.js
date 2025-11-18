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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';

const AdminUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (reset = true) => {
    if (reset) setPage(1);
    setLoading(true);
    try {
      // Use admin API for real data
      const response = await adminService.getAllUsers(20, reset ? 0 : (page - 1) * 20, searchQuery);
      if (reset) {
        setUsers(response.data || []);
      } else {
        setUsers(prev => [...prev, ...(response.data || [])]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to mock data if API fails
      const mockUsers = [
        {
          user_id: 1,
          username: 'admin_user',
          email: 'admin@example.com',
          role: 'admin',
          is_banned: false,
        },
        {
          user_id: 2,
          username: 'john_doe',
          email: 'john@example.com',
          role: 'user',
          is_banned: false,
        },
        {
          user_id: 3,
          username: 'jane_smith',
          email: 'jane@example.com',
          role: 'user',
          is_banned: true,
        },
        {
          user_id: 4,
          username: 'bob_wilson',
          email: 'bob@example.com',
          role: 'user',
          is_banned: false,
        },
        {
          user_id: 5,
          username: 'alice_brown',
          email: 'alice@example.com',
          role: 'user',
          is_banned: false,
        },
      ];

      // Filter by search query if provided
      const filteredUsers = searchQuery 
        ? mockUsers.filter(user => 
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : mockUsers;

      if (reset) {
        setUsers(filteredUsers);
      } else {
        setUsers(prev => [...prev, ...filteredUsers]);
      }
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
    setTimeout(() => loadUsers(), 500); // Debounce search
  };

  const handleBanUser = async (user) => {
    Alert.alert(
      'Cấm người dùng',
      `Bạn có chắc muốn cấm người dùng "${user.username}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Cấm',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.banUser(user.user_id);
              Alert.alert('Thành công', 'Đã cấm người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể cấm người dùng');
            }
          }
        }
      ]
    );
  };

  const handleUnbanUser = async (user) => {
    Alert.alert(
      'Bỏ cấm người dùng',
      `Bạn có chắc muốn bỏ cấm người dùng "${user.username}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bỏ cấm',
          onPress: async () => {
            try {
              await adminService.unbanUser(user.user_id);
              Alert.alert('Thành công', 'Đã bỏ cấm người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể bỏ cấm người dùng');
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

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <Text style={styles.userRole}>
              {item.role === 'admin' ? '👑 Admin' : '👤 User'}
            </Text>
            <Text style={[
              styles.userStatus,
              { color: item.is_banned ? COLORS.error : COLORS.success }
            ]}>
              {item.is_banned ? '🚫 Bị cấm' : '✅ Hoạt động'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
        {item.is_banned ? (
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminAddUser')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
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

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
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
});

export default AdminUsersScreen;
