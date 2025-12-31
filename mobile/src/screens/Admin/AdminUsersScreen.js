import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminUsersScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, artists: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(route.params?.filter || 'all'); // 'all', 'pending_artist', 'artist'

  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (reset = true) => {
    setLoading(true);
    try {
      const response = await adminService.getAllUsers(100, 0, searchQuery);
      const allUsers = response.data || [];
      setUsers(allUsers);
      
      // Calculate basic stats for the display
      setStats({
        total: allUsers.length,
        artists: allUsers.filter(u => u.role === 'artist').length,
        pending: allUsers.filter(u => u.is_banned === 2).length,
      });
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBanUser = async (user) => {
    const isPendingArtist = user.is_banned === 2;
    Alert.alert(
      isPendingArtist ? 'Từ chối yêu cầu' : 'Cấm người dùng',
      isPendingArtist 
        ? `Từ chối yêu cầu làm nghệ sĩ của "${user.username}"?`
        : `Bạn có chắc muốn cấm người dùng "${user.username}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isPendingArtist ? 'Từ chối' : 'Cấm',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.banUser(user.user_id);
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
    Alert.alert(
      isPendingArtist ? 'Chấp nhận nghệ sĩ' : 'Bỏ cấm người dùng',
      isPendingArtist
        ? `Chấp nhận yêu cầu làm nghệ sĩ của "${user.username}"?`
        : `Bỏ cấm cho "${user.username}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isPendingArtist ? 'Chấp nhận' : 'Bỏ cấm',
          onPress: async () => {
            try {
              await adminService.unbanUser(user.user_id);
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
      'Xóa vĩnh viễn',
      `Xóa tài khoản "${user.username}"? Mọi dữ liệu sẽ biến mất.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteUser(user.user_id);
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
    if (filter === 'artist') {
      return users.filter(u => u.role === 'artist');
    }
    if (filter === 'banned') {
      return users.filter(u => u.is_banned === 1);
    }
    return users;
  };

  const renderUserItem = ({ item }) => {
    const isPendingArtist = item.is_banned === 2;
    const isBanned = item.is_banned === 1;
    const isArtist = item.role === 'artist';
    const isAdmin = item.role === 'admin';
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userMain}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={isArtist ? ['#8B5CF6', '#7C3AED'] : isAdmin ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#2563EB']}
              style={styles.avatarGradient}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
              )}
            </LinearGradient>
            {(isAdmin || isArtist) && (
              <View style={[styles.roleBadge, { backgroundColor: isAdmin ? COLORS.warning : COLORS.primary }]}>
                <Ionicons name={isAdmin ? "shield-checkmark" : "musical-notes"} size={10} color="#FFF" />
              </View>
            )}
          </View>
          
          <View style={styles.userMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.username}</Text>
              {isBanned && (
                <View style={styles.bannedTag}>
                  <Text style={styles.tagText}>Banned</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.typeBadge, { backgroundColor: COLORS.surface }]}>
                <Ionicons 
                  name={isAdmin ? "shield-outline" : isArtist ? "mic-outline" : "person-outline"} 
                  size={12} 
                  color={COLORS.textSecondary} 
                />
                <Text style={styles.typeText}>
                  {isAdmin ? 'Quản trị' : isArtist ? 'Nghệ sĩ' : 'Người dùng'}
                </Text>
              </View>
              
              <View style={[
                styles.statusPill, 
                { backgroundColor: (isBanned ? COLORS.error : isPendingArtist ? COLORS.info : COLORS.success) + '15' }
              ]}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: isBanned ? COLORS.error : isPendingArtist ? COLORS.info : COLORS.success }
                ]} />
                <Text style={[
                  styles.statusLabel, 
                  { color: isBanned ? COLORS.error : isPendingArtist ? COLORS.info : COLORS.success }
                ]}>
                  {isBanned ? 'Bị cấm' : isPendingArtist ? 'Yêu cầu duyệt' : 'Hoạt động'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isPendingArtist ? (
            <View style={styles.pendingActions}>
              <TouchableOpacity 
                style={[styles.btnAction, styles.btnApprove]}
                onPress={() => handleUnbanUser(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.btnActionText}>Phê duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnAction, styles.btnReject]}
                onPress={() => handleBanUser(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={18} color="#FFF" />
                <Text style={styles.btnActionText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.normalActions}>
              {!isAdmin && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { borderColor: isBanned ? COLORS.success : COLORS.error }]}
                  onPress={() => isBanned ? handleUnbanUser(item) : handleBanUser(item)}
                >
                  <Ionicons 
                    name={isBanned ? "unlock-outline" : "ban-outline"} 
                    size={18} 
                    color={isBanned ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[styles.actionBtnText, { color: isBanned ? COLORS.success : COLORS.error }]}>
                    {isBanned ? 'Mở khóa' : 'Khóa'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {!isAdmin && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { borderColor: COLORS.textDisabled, borderStyle: 'dashed' }]}
                  onPress={() => handleDeleteUser(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Xóa</Text>
                </TouchableOpacity>
              )}

              {isAdmin && (
                <View style={styles.adminStatus}>
                  <Ionicons name="checkmark-done" size={16} color={COLORS.success} />
                  <Text style={styles.adminStatusText}>Tài khoản hệ thống</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const StatCard = ({ icon, label, value, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderHeaderComponent = () => (
    <View style={styles.listHeader}>
      <View style={styles.statsRow}>
        <StatCard icon="people" label="Tổng số" value={stats.total} color={COLORS.info} />
        <StatCard icon="mic" label="Nghệ sĩ" value={stats.artists} color={COLORS.primary} />
        <StatCard icon="time" label="Chờ duyệt" value={stats.pending} color={COLORS.warning} />
      </View>
      
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>DANH SÁCH CHI TIẾT</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{getFilteredUsers().length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={[COLORS.backgroundSecondary, COLORS.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QUẢN LÝ NGƯỜI DÙNG</Text>
          <TouchableOpacity 
            style={[styles.backBtn, styles.addBtn]} 
            onPress={() => navigation.navigate('AdminAddUser')}
          >
            <Ionicons name="person-add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              placeholder="Tìm theo tên hoặc email..."
              placeholderTextColor={COLORS.textDisabled}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending_artist', label: 'Yêu cầu Artist' },
              { id: 'artist', label: 'Nghệ sĩ' },
              { id: 'banned', label: 'Đã khóa' },
            ].map(t => (
              <TouchableOpacity 
                key={t.id}
                style={[styles.tab, filter === t.id && styles.activeTab]}
                onPress={() => setFilter(t.id)}
              >
                <Text style={[styles.tabText, filter === t.id && styles.activeTabText]}>
                  {t.label} {t.id === 'pending_artist' && stats.pending > 0 && `(${stats.pending})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {loading && users.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredUsers()}
          renderItem={renderUserItem}
          ListHeaderComponent={renderHeaderComponent}
          keyExtractor={(item) => item.user_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={60} color={COLORS.textDisabled} />
              </View>
              <Text style={styles.emptyText}>Không tìm thấy người dùng nào</Text>
              <TouchableOpacity style={styles.reloadBtn} onPress={onRefresh}>
                <Text style={styles.reloadBtnText}>Tải lại danh sách</Text>
              </TouchableOpacity>
            </View>
          }
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
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingLeft: 10,
    fontSize: 14,
  },
  tabsContainer: {
    height: 40,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  activeTab: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  listHeader: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.small,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  sectionBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.small,
  },
  userMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  userMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFF',
  },
  bannedTag: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  typeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 16,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  btnApprove: {
    backgroundColor: COLORS.success,
  },
  btnReject: {
    backgroundColor: COLORS.error,
  },
  btnActionText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  normalActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  adminStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: COLORS.success + '10',
    borderRadius: 14,
  },
  adminStatusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  emptyText: {
    color: COLORS.textDisabled,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  reloadBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  reloadBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default AdminUsersScreen;

