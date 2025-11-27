import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminWithdrawalsScreen = ({ navigation }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending'); // all, pending, completed, rejected

  const fetchWithdrawals = async () => {
    try {
      const response = await adminService.getAllWithdrawals({
        status: filter === 'all' ? undefined : filter,
      });
      if (response.success) {
        setWithdrawals(response.data.withdrawals);
        setStats(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWithdrawals();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
  };

  const handleApprove = (withdrawal) => {
    Alert.alert(
      'Xác nhận duyệt',
      `Duyệt yêu cầu rút ${parseFloat(withdrawal.amount).toLocaleString('vi-VN')}đ cho ${withdrawal.artist_name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              const response = await adminService.approveWithdrawal(withdrawal.withdrawal_id);
              if (response.success) {
                Alert.alert('Thành công', 'Đã duyệt yêu cầu rút tiền');
                fetchWithdrawals();
              }
            } catch (error) {
              const message = error.response?.data?.message || 'Có lỗi xảy ra';
              Alert.alert('Lỗi', message);
            }
          },
        },
      ]
    );
  };

  const handleReject = (withdrawal) => {
    Alert.prompt(
      'Từ chối yêu cầu',
      'Nhập lý do từ chối:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const response = await adminService.rejectWithdrawal(withdrawal.withdrawal_id, reason);
              if (response.success) {
                Alert.alert('Thành công', 'Đã từ chối yêu cầu');
                fetchWithdrawals();
              }
            } catch (error) {
              const message = error.response?.data?.message || 'Có lỗi xảy ra';
              Alert.alert('Lỗi', message);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFA726';
      case 'processing':
        return '#2196F3';
      case 'rejected':
        return '#EF5350';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'pending':
        return 'Chờ duyệt';
      case 'processing':
        return 'Đang xử lý';
      case 'rejected':
        return 'Từ chối';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const renderWithdrawal = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isPending = item.status === 'pending';

    return (
      <View style={styles.withdrawalCard}>
        <View style={styles.withdrawalHeader}>
          <View>
            <Text style={styles.artistName}>{item.artist_name}</Text>
            <Text style={styles.amount}>
              {parseFloat(item.amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {(item.bank_name || item.bank_account) && (
          <View style={styles.infoRow}>
            <Ionicons name="card" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              {`${item.bank_name || ''}${item.bank_name && item.bank_account ? ' - ' : ''}${item.bank_account || ''}`}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.bank_account_name}</Text>
        </View>

        {item.artist_note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Ghi chú:</Text>
            <Text style={styles.noteText}>{item.artist_note}</Text>
          </View>
        )}

        {item.admin_note && (
          <View style={[styles.noteBox, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.noteLabel, { color: '#FFA726' }]}>Admin:</Text>
            <Text style={styles.noteText}>{item.admin_note}</Text>
          </View>
        )}

        <Text style={styles.date}>Yêu cầu: {formatDate(item.requested_at)}</Text>
        {item.processed_at && (
          <Text style={styles.date}>Xử lý: {formatDate(item.processed_at)}</Text>
        )}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Duyệt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
            >
              <Ionicons name="close" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['pending', 'completed', 'rejected', 'all'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tất cả' : getStatusText(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tổng cộng</Text>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statAmount}>
              {parseFloat(stats.total_completed_amount || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Chờ duyệt</Text>
            <Text style={styles.statValue}>{stats.pending || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hoàn thành</Text>
            <Text style={styles.statValue}>{stats.completed || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đã hủy</Text>
            <Text style={styles.statValue}>{stats.cancelled || 0}</Text>
          </View>
        </View>
      )}

      {withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Không có yêu cầu nào</Text>
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          renderItem={renderWithdrawal}
          keyExtractor={(item, index) => `withdrawal-${item.withdrawal_id || item.transaction_id || index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: '#FFF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  statAmount: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  withdrawalCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  noteBox: {
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.text,
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#EF5350',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default AdminWithdrawalsScreen;

