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
import { walletService } from '../../services/walletService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await walletService.getTransactions(100, 0);
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return { name: 'arrow-down-circle', color: '#4CAF50' };
      case 'purchase':
        return { name: 'musical-note', color: COLORS.primary };
      case 'subscription':
        return { name: 'star', color: '#FFD700' };
      case 'revenue':
        return { name: 'cash', color: '#4CAF50' };
      default:
        return { name: 'swap-horizontal', color: COLORS.textSecondary };
    }
  };

  const getTransactionSign = (type) => {
    return (type === 'deposit' || type === 'revenue') ? '+' : '-';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFA726';
      case 'cancelled':
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
        return 'Đang chờ';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const renderTransaction = ({ item }) => {
    const icon = getTransactionIcon(item.type);
    const sign = getTransactionSign(item.type);

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={2}>
            {item.description || 'Giao dịch'}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
          <Text style={[styles.transactionStatus, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
          {item.reference_code && (
            <Text style={styles.referenceCode}>Mã: {item.reference_code}</Text>
          )}
        </View>

        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'deposit' ? '#4CAF50' : COLORS.text },
          ]}
        >
          {parseFloat(item.amount).toLocaleString('vi-VN')}đ
        </Text>
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

  if (transactions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
        </View>
        <MiniPlayer bottomOffset={0} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => `transaction-${item.transaction_id}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  referenceCode: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TransactionHistoryScreen;

