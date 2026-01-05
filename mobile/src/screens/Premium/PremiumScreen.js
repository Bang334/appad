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
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PremiumScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showPurchaseSuccess, showError, showWarning, showInfo } = useAlert();
  const { refreshUser } = useAuth();
  
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
                    async () => {
                      await refreshUser();
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
                        onPress: async () => {
                          await refreshUser();
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={styles.background}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Section */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 30) }]}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.iconBackground}
            >
              <Ionicons name="diamond" size={40} color="#FFF" />
            </LinearGradient>
            <View style={styles.haloEffect} />
          </View>
          
          <Text style={styles.title}>Premium Access</Text>
          <Text style={styles.subtitle}>
            Nâng tầm trải nghiệm âm nhạc của bạn
          </Text>
        </View>

        {/* Status / Subscribe Card */}
        {isPremium ? (
          <LinearGradient
            colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
            style={styles.statusCard}
          >
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
            
            <View style={styles.statusContent}>
              <View style={styles.statusIconWrapper}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              </View>
              <Text style={styles.statusTitle}>Thành viên Premium</Text>
              
              {premiumStatus.premium_expiry && (
                <View style={styles.expiryContainer}>
                  <Text style={styles.expiryLabel}>Hết hạn ngày</Text>
                  <Text style={styles.expiryDate}>
                    {formatDate(premiumStatus.premium_expiry)}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Hủy tự động gia hạn</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.cardContainer}>
             <LinearGradient
               colors={['#333333', '#111111']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={styles.subscribeCard}
             >
               <View style={styles.bestValueBadge}>
                 <Text style={styles.bestValueText}>POPULAR</Text>
               </View>

               <Text style={styles.planName}>Gói 1 Tháng</Text>
               <View style={styles.priceContainer}>
                 <Text style={styles.currency}>₫</Text>
                 <Text style={styles.price}>{PREMIUM_PRICE.toLocaleString('vi-VN')}</Text>
               </View>
               <Text style={styles.planDuration}>Mở khóa toàn bộ tính năng</Text>

               <View style={styles.divider} />

               {/* Balance Info */}
               <View style={styles.balanceContainer}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Số dư ví:</Text>
                    <Text style={[
                      styles.balanceValue,
                      { color: balance >= PREMIUM_PRICE ? '#4CAF50' : '#EF5350' }
                    ]}>
                      {parseFloat(balance).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  
                  {balance < PREMIUM_PRICE && (
                    <TouchableOpacity
                      style={styles.quickTopUp}
                      onPress={() => navigation.navigate('Wallet')}
                    >
                      <Text style={styles.quickTopUpText}>
                        Nạp thêm {(PREMIUM_PRICE - balance).toLocaleString('vi-VN')}đ
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
               </View>

               <TouchableOpacity
                 style={styles.subscribeButton}
                 onPress={handleSubscribe}
                 disabled={subscribing}
               >
                 <LinearGradient
                   colors={['#FFD700', '#FFA500']}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 0 }}
                   style={styles.subscribeGradient}
                 >
                   {subscribing ? (
                     <ActivityIndicator color="#000" />
                   ) : (
                     <Text style={styles.subscribeButtonText}>ĐĂNG KÝ NGAY</Text>
                   )}
                 </LinearGradient>
               </TouchableOpacity>
               
               <Text style={styles.termText}>Tự động gia hạn. Hủy bất cứ lúc nào.</Text>
             </LinearGradient>
          </View>
        )}

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionHeader}>Quyền lợi đặc biệt</Text>
          
          <View style={styles.featureGrid}>
             <View style={styles.featureItem}>
               <View style={[styles.featureIconBox, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                 <Ionicons name="musical-notes" size={24} color="#FF453A" />
               </View>
               <View style={styles.featureInfo}>
                 <Text style={styles.featureTitle}>Kho nhạc Premium</Text>
                 <Text style={styles.featureDesc}>Truy cập không giới hạn hàng triệu bài hát bản quyền.</Text>
               </View>
             </View>

             <View style={styles.featureItem}>
               <View style={[styles.featureIconBox, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                 <Ionicons name="pulse" size={24} color="#0A84FF" />
               </View>
               <View style={styles.featureInfo}>
                 <Text style={styles.featureTitle}>Chất lượng cao</Text>
                 <Text style={styles.featureDesc}>Trải nghiệm âm thanh Lossless và Hi-Res Audio sắc nét.</Text>
               </View>
             </View>

             <View style={styles.featureItem}>
               <View style={[styles.featureIconBox, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                 <Ionicons name="ban" size={24} color="#30D158" />
               </View>
               <View style={styles.featureInfo}>
                 <Text style={styles.featureTitle}>Không quảng cáo</Text>
                 <Text style={styles.featureDesc}>Tận hưởng âm nhạc liền mạch, không bị làm phiền.</Text>
               </View>
             </View>
             
             <View style={styles.featureItem}>
               <View style={[styles.featureIconBox, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                 <Ionicons name="cloud-download" size={24} color="#BF5AF2" />
               </View>
               <View style={styles.featureInfo}>
                 <Text style={styles.featureTitle}>Nghe Offline</Text>
                 <Text style={styles.featureDesc}>Tải nhạc và nghe mọi lúc mọi nơi không cần mạng.</Text>
               </View>
             </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.quickActions}>
           <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PurchaseHistory')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.actionGradient}
              >
                <Ionicons name="time-outline" size={24} color="#FFF" />
                <Text style={styles.actionText}>Lịch sử giao dịch</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
           </TouchableOpacity>

           <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('UserMembership')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.actionGradient}
              >
                <Ionicons name="ribbon-outline" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Hội viên nghệ sĩ</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
           </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  haloEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  subscribeCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 16,
    right: -30,
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 5,
    transform: [{ rotate: '45deg' }],
  },
  bestValueText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  planName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currency: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    marginRight: 4,
  },
  price: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: 'bold',
  },
  planDuration: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickTopUp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  quickTopUpText: {
    color: '#EF5350',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  termText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  featureGrid: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  quickActions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  // Status Card Styles
  statusCard: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: 20,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusContent: {
    alignItems: 'center',
  },
  statusIconWrapper: {
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  expiryContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  expiryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 4,
  },
  expiryDate: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PremiumScreen;

