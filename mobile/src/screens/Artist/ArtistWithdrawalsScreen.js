import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';

const ArtistWithdrawalsScreen = ({ route }) => {
  const { artistId } = route.params;
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWithdrawals = async () => {
    try {
      const response = await artistService.getWithdrawals(artistId);
      if (response.success) {
        setWithdrawals(response.data);
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
    }, [artistId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
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
    if (!status) return 'N/A';
    switch (String(status).toLowerCase()) {
      case 'completed':
        return 'Hoàn thành';
      case 'pending':
        return 'Chờ duyệt';
      case 'processing':
        return 'Đang xử lý';
      case 'rejected':
        return 'Từ chối';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return String(status) || 'N/A';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'processing':
        return 'sync';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const formatted = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return formatted || 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  const renderWithdrawal = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={styles.withdrawalItem}>
        <View style={[styles.statusIcon, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name={statusIcon} size={28} color={statusColor} />
        </View>

        <View style={styles.withdrawalInfo}>
          <View style={styles.withdrawalHeader}>
            <Text style={styles.amount}>
              {String(parseFloat(item.amount || 0).toLocaleString('vi-VN') || '0')}đ
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(item.status || '')}
              </Text>
            </View>
          </View>

          {(item.bank_name || item.bank_account) && (
            <Text style={styles.bankInfo}>
              {item.bank_name && item.bank_account 
                ? `${item.bank_name} - ${item.bank_account}`
                : (item.bank_name || item.bank_account)}
            </Text>
          )}

          {item.fee && parseFloat(item.fee) > 0 ? (
            <Text style={styles.fee}>
              Phí: -{String(parseFloat(item.fee || 0).toLocaleString('vi-VN') || '0')}đ
            </Text>
          ) : null}

          <Text style={styles.actualAmount}>
            Thực nhận: {String(parseFloat(item.actual_amount || item.amount || 0).toLocaleString('vi-VN') || '0')}đ
          </Text>

          {item.artist_note && String(item.artist_note).trim() ? (
            <Text style={styles.note} numberOfLines={2}>
              Ghi chú: {String(item.artist_note).trim()}
            </Text>
          ) : null}

          {item.admin_note && String(item.admin_note).trim() ? (
            <Text style={styles.adminNote} numberOfLines={2}>
              Admin: {String(item.admin_note).trim()}
            </Text>
          ) : null}

          <View style={styles.dates}>
            <Text style={styles.dateText}>Yêu cầu: {formatDate(item.requested_at)}</Text>
            {item.processed_at && (
              <Text style={styles.dateText}>Xử lý: {formatDate(item.processed_at)}</Text>
            )}
          </View>
        </View>
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

  if (withdrawals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền nào</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={withdrawals}
        renderItem={renderWithdrawal}
        keyExtractor={(item, index) => `withdrawal-${item.withdrawal_id || item.transaction_id || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
  withdrawalItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankInfo: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  fee: {
    fontSize: 13,
    color: '#EF5350',
    marginBottom: 4,
  },
  actualAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  adminNote: {
    fontSize: 13,
    color: '#FFA726',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dates: {
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});

export default ArtistWithdrawalsScreen;

