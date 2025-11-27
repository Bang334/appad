import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminMembershipScreen = ({ navigation }) => {
  const { showError } = useAlert();
  
  const [memberships, setMemberships] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const [membershipsRes, statsRes] = await Promise.all([
        adminService.getAllMemberships({
          limit: 20,
          offset: (pageNum - 1) * 20,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchText || undefined,
        }),
        adminService.getMembershipStats(),
      ]);
      
      if (membershipsRes.success) {
        if (reset || pageNum === 1) {
          setMemberships(membershipsRes.data.memberships || []);
        } else {
          setMemberships(prev => [...prev, ...(membershipsRes.data.memberships || [])]);
        }
        setTotal(membershipsRes.data.total || 0);
      }
      
      if (statsRes.success) {
        setStats(statsRes.data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching membership data:', error);
      showError('Lỗi', 'Không thể tải dữ liệu hội viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(1, true);
    }, [filterStatus])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== '') {
        fetchData(1, true);
      } else {
        fetchData(1, true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchData(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && memberships.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return COLORS.success;
      case 'expired':
        return COLORS.textSecondary;
      case 'cancelled':
        return '#EF5350';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'expired':
        return 'Hết hạn';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const renderMembershipItem = ({ item }) => (
    <TouchableOpacity
      style={styles.membershipCard}
      onPress={() => {
        // Navigate to user or artist detail if needed
      }}
    >
      <View style={styles.membershipHeader}>
        <View style={styles.membershipInfo}>
          <Text style={styles.memberName}>
            {item.full_name || item.username || 'Người dùng'}
          </Text>
          <Text style={styles.artistName}>{item.artist_name}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.membershipDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>
            {item.price_paid?.toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            {formatDate(item.start_date)} - {formatDate(item.expiry_date)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && memberships.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý hội viên</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{stats.active_members || 0}</Text>
              <Text style={styles.statLabel}>Đang hoạt động</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color={COLORS.success} />
              <Text style={styles.statValue}>
                {(stats.total_revenue || 0).toLocaleString('vi-VN')}đ
              </Text>
              <Text style={styles.statLabel}>Tổng doanh thu</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="list" size={32} color={COLORS.accent} />
              <Text style={styles.statValue}>{stats.total_memberships || 0}</Text>
              <Text style={styles.statLabel}>Tổng hội viên</Text>
            </View>
          </View>
        )}

        {/* Search and Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên, email, artist..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtons}>
            {['all', 'active', 'expired', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => {
                  setFilterStatus(status);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status === 'all' ? 'Tất cả' : getStatusText(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Memberships List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Danh sách hội viên ({total})
          </Text>
          {memberships.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Không có hội viên nào</Text>
            </View>
          ) : (
            <FlatList
              data={memberships}
              renderItem={renderMembershipItem}
              keyExtractor={(item) => item.membership_id.toString()}
              scrollEnabled={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </ScrollView>
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.padding,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    marginHorizontal: SIZES.padding,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  listSection: {
    marginHorizontal: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  membershipCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 12,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  membershipInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  membershipDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default AdminMembershipScreen;

