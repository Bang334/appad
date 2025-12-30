import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { walletService } from '../../services/walletService';
import { useAlert } from '../../context/AlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PremiumScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showPurchaseSuccess, showError, showWarning, showInfo } = useAlert();
  
  const PREMIUM_PRICE = 99000;

  const fetchPremiumStatus = async () => {
    try {
      const [statusRes, balanceRes] = await Promise.all([
        premiumService.checkStatus(),
        walletService.getBalance(),
      ]);
      
      if (statusRes.success) {
        setPremiumStatus(statusRes.data);
      }
      
      if (balanceRes.success) {
        setBalance(Number(balanceRes.data.balance || 0));
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPremiumStatus();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPremiumStatus();
  };

  const handleSubscribe = async () => {
    // Check balance first
    if (balance < PREMIUM_PRICE) {
      const needed = PREMIUM_PRICE - balance;
      showWarning(
        'Số dư không đủ',
        `Bạn cần thêm ${needed.toLocaleString('vi-VN')}đ để đăng ký Premium. Bạn có muốn nạp tiền không?`,
        {
          buttons: [
            {
              text: 'Hủy',
              onPress: () => {},
            },
            {
              text: 'Nạp tiền',
              onPress: () => navigation.navigate('Wallet'),
            },
          ],
        }
      );
      return;
    }

    showInfo(
      'Đăng ký Premium',
      `Bạn có muốn đăng ký gói Premium 30 ngày với giá ${PREMIUM_PRICE.toLocaleString('vi-VN')}đ?`,
      {
        buttons: [
          {
            text: 'Hủy',
            onPress: () => {},
          },
          {
            text: 'Đăng ký',
            onPress: async () => {
              setSubscribing(true);
              try {
                const response = await premiumService.subscribe(30);
                if (response.success) {
                  showPurchaseSuccess(
                    'Đăng ký Premium thành công!',
                    response.data.new_balance,
                    () => {
                      fetchPremiumStatus();
                    }
                  );
                }
              } catch (error) {
                const message = error.response?.data?.message || 'Có lỗi xảy ra';
                
                // Check if insufficient balance
                if (error.response?.data?.data?.needed) {
                  const needed = error.response.data.data.needed;
                  showWarning(
                    'Số dư không đủ',
                    `Bạn cần thêm ${needed.toLocaleString('vi-VN')}đ. Bạn có muốn nạp tiền không?`,
                    {
                      buttons: [
                        {
                          text: 'Hủy',
                          onPress: () => {},
                        },
                        {
                          text: 'Nạp tiền',
                          onPress: () => navigation.navigate('Wallet'),
                        },
                      ],
                    }
                  );
                } else {
                  showError('Lỗi', message);
                }
              } finally {
                setSubscribing(false);
              }
            },
            closeOnPress: false,
          },
        ],
      }
    );
  };

  const handleCancel = async () => {
    showWarning(
      'Hủy Premium',
      'Bạn có chắc muốn hủy gói Premium?',
      {
        buttons: [
          {
            text: 'Không',
            onPress: () => {},
          },
          {
            text: 'Có',
            onPress: async () => {
              try {
                const response = await premiumService.cancel();
                if (response.success) {
                  showInfo('Thành công', 'Đã hủy gói Premium', {
                    buttons: [
                      {
                        text: 'OK',
                        onPress: () => {
                          fetchPremiumStatus();
                        },
                      },
                    ],
                  });
                }
              } catch (error) {
                const message = error.response?.data?.message || 'Có lỗi xảy ra';
                showError('Lỗi', message);
              }
            },
            closeOnPress: false,
          },
        ],
      }
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPremium = premiumStatus?.is_premium;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Ionicons name="star" size={80} color="#FFD700" />
        <Text style={styles.title}>Premium</Text>
        <Text style={styles.subtitle}>
          Nghe không giới hạn tất cả bài hát Premium
        </Text>
      </View>

      {isPremium ? (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            <Text style={styles.statusTitle}>Bạn đang là thành viên Premium</Text>
          </View>
          {premiumStatus.premium_expiry && (
            <Text style={styles.expiryText}>
              Hết hạn: {formatDate(premiumStatus.premium_expiry)}
            </Text>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Hủy Premium</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.subscribeCard}>
          <Text style={styles.priceTitle}>Gói Premium 30 ngày</Text>
          <Text style={styles.price}>{PREMIUM_PRICE.toLocaleString('vi-VN')}đ</Text>
          
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Số dư ví:</Text>
            <Text style={[
              styles.balanceValue,
              { color: balance >= PREMIUM_PRICE ? '#4CAF50' : '#EF5350' }
            ]}>
              {parseFloat(balance).toLocaleString('vi-VN')}đ
            </Text>
          </View>

          {balance < PREMIUM_PRICE && (
            <TouchableOpacity
              style={styles.topUpHint}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Ionicons name="wallet" size={16} color={COLORS.primary} />
              <Text style={styles.topUpHintText}>
                Nạp thêm {(PREMIUM_PRICE - balance).toLocaleString('vi-VN')}đ
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>Đăng ký ngay</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Đặc quyền Premium</Text>
        
        <View style={styles.feature}>
          <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Nghe không giới hạn</Text>
            <Text style={styles.featureDescription}>
              Truy cập tất cả bài hát Premium trong thư viện
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <Ionicons name="download" size={24} color={COLORS.primary} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Chất lượng cao</Text>
            <Text style={styles.featureDescription}>
              Nghe nhạc với chất lượng âm thanh tốt nhất
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <Ionicons name="time" size={24} color={COLORS.primary} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Không quảng cáo</Text>
            <Text style={styles.featureDescription}>
              Trải nghiệm nghe nhạc không bị gián đoạn
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.purchaseSection}>
        <TouchableOpacity
          style={styles.purchaseHistoryButton}
          onPress={() => navigation.navigate('PurchaseHistory')}
        >
          <Ionicons name="receipt" size={20} color={COLORS.primary} />
          <Text style={styles.purchaseHistoryText}>Lịch sử mua hàng</Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={styles.membershipButton}
          onPress={() => navigation.navigate('UserMembership')}
        >
          <Ionicons name="people" size={20} color={COLORS.accent} />
          <Text style={styles.membershipButtonText}>Hội viên của tôi</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  expiryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  subscribeCard: {
    backgroundColor: COLORS.card,
    margin: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  priceTitle: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 8,
  },
  price: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 24,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    width: '100%',
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topUpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  topUpHintText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  featureText: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  purchaseSection: {
    padding: 20,
    gap: 12,
  },
  purchaseHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  purchaseHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  purchasedSongsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  purchasedSongsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  membershipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  membershipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 8,
  },
});

export default PremiumScreen;

