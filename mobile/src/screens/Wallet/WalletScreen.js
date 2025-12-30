import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../config/theme';
import { walletService } from '../../services/walletService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const WalletScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();

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
        return { name: 'add-circle-outline', color: '#10b981', label: 'Nạp tiền' };
      case 'revenue':
        return { name: 'cash-outline', color: '#10b981', label: 'Doanh thu' };
      case 'purchase':
        return { name: 'cart-outline', color: COLORS.primary, label: 'Mua sắm' };
      case 'subscription':
        return { name: 'star-outline', color: '#f59e0b', label: 'Gói Hội viên' };
      default:
        return { name: 'swap-horizontal-outline', color: COLORS.textSecondary, label: 'Giao dịch' };
    }
  };

  const getTransactionSign = (type) => {
    return (type === 'deposit' || type === 'revenue') ? '+' : '-';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Thành công';
      case 'pending':
        return 'Chờ duyệt';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const renderTransaction = ({ item, index }) => {
    const icon = getTransactionIcon(item.type);
    const sign = getTransactionSign(item.type);
    const isPositive = item.type === 'deposit' || item.type === 'revenue';

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description || icon.label}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isPositive ? '#10b981' : COLORS.text },
            ]}
          >
            {sign}{parseFloat(item.amount).toLocaleString('vi-VN')}đ
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Wallet Card */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <LinearGradient
          colors={['#8b5cf6', '#6366f1']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardInfo}>
            <View>
              <Text style={styles.balanceLabel}>SỐ DƯ HIỆN TẠI</Text>
              <Text style={styles.balanceAmount}>
                {parseFloat(balance).toLocaleString('vi-VN')}
                <Text style={styles.currency}> đ</Text>
              </Text>
            </View>
            <Ionicons name="card-outline" size={40} color="rgba(255,255,255,0.7)" />
          </View>
          
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.topUpButton}
              onPress={() => navigation.navigate('TopUp')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={styles.topUpGradient}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.topUpButtonText}>Nạp tiền</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
      {/* Statistics */}
      {statistics && (
        <View style={[styles.statsWrapper, { paddingTop: insets.top - 20 }]}>
          <Text style={styles.sectionTitle}>Thống kê chi tiêu</Text>
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#10b98120', '#10b98110']}
              style={styles.statCard}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="arrow-down-circle-outline" size={24} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Đã nạp</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>
                {parseFloat(statistics.total_deposited || 0).toLocaleString('vi-VN')}đ
              </Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['#ef444420', '#ef444410']}
              style={styles.statCard}
            >
              <View style={[styles.statIconBadge, { backgroundColor: '#ef444415' }]}>
                <Ionicons name="arrow-up-circle-outline" size={24} color="#ef4444" />
              </View>
              <Text style={styles.statLabel}>Đã chi</Text>
              <Text style={[styles.statValue, { color: '#dc2626' }]}>
                {parseFloat((statistics.total_spent || 0) + (statistics.total_subscription || 0)).toLocaleString('vi-VN')}đ
              </Text>
            </LinearGradient>
          </View>
        </View>
      )}

      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.viewAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => `transaction-${item.transaction_id}`}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Chưa có lịch sử giao dịch</Text>
          </View>
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
  scrollContent: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingTop: 10,
  },
  balanceCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 24,
    height: 200,
    justifyContent: 'space-between',
    ...SHADOWS.large,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  topUpButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  topUpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  topUpButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statsWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#10b98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginRight: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 16,
  },
});

export default WalletScreen;


