import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../config/theme';
import { walletService } from '../../services/walletService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const WalletScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [balanceRes, transactionsRes, statsRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(20, 0),
        walletService.getStatistics(),
      ]);

      if (balanceRes.success) {
        setBalance(balanceRes.data.balance);
      }

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data);
      }

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return { name: 'arrow-down-circle', color: '#4CAF50' };
      case 'purchase':
        return { name: 'musical-note', color: COLORS.primary };
      case 'subscription':
        return { name: 'star', color: '#FFD700' };
      default:
        return { name: 'swap-horizontal', color: COLORS.textSecondary };
    }
  };

  const getTransactionSign = (type) => {
    return type === 'deposit' ? '+' : '-';
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
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description || 'Giao dịch'}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
          <Text style={[styles.transactionStatus, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'deposit' ? '#4CAF50' : COLORS.text },
          ]}
        >
          {sign}{parseFloat(item.amount).toLocaleString('vi-VN')}đ
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

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.balanceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.balanceLabel}>Số dư ví</Text>
        <Text style={styles.balanceAmount}>
          {parseFloat(balance).toLocaleString('vi-VN')}đ
        </Text>
        
        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => navigation.navigate('TopUp')}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.topUpButtonText}>Nạp tiền</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Statistics */}
      {statistics && (
        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          style={styles.statsContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Đã nạp</Text>
            <Text style={[styles.statValue, { color: '#FFF' }]}>
              {parseFloat(statistics.total_deposited || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Đã chi</Text>
            <Text style={[styles.statValue, { color: '#FFF' }]}>
              {parseFloat((statistics.total_spent || 0) + (statistics.total_subscription || 0)).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* Transactions */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Lịch sử giao dịch</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.viewAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => `transaction-${item.transaction_id}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.transactionsList, { paddingBottom: 100 }]}
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
  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  transactionsList: {
    paddingHorizontal: 16,
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
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
});

export default WalletScreen;

