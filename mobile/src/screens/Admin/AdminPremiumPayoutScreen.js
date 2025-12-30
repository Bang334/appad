import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminPremiumPayoutScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('payout'); // 'payout' or 'history'
  
  // Payout tab state
  const [loading, setLoading] = useState(false);
  const [payoutData, setPayoutData] = useState(null);
  const [applying, setApplying] = useState(false);

  // History tab state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutBatches, setPayoutBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeTab === 'payout') {
      handleCalculate();
    } else {
      fetchPayoutHistory();
    }
  }, [activeTab]);

  // ==== PAYOUT TAB FUNCTIONS ====
  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await adminService.calculatePremiumPayout();
      if (res.success) {
        setPayoutData(res.data);
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể tính toán doanh thu');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPayout = () => {
    if (!payoutData || payoutData.artist_shares.length === 0) return;

    Alert.alert(
      'Xác nhận phát lương',
      `Bạn có chắc chắn muốn phát lương ${Math.floor(payoutData.total_pool).toLocaleString('vi-VN')}đ cho ${payoutData.artist_shares.length} nghệ sĩ không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xác nhận', 
          onPress: async () => {
            setApplying(true);
            try {
              const res = await adminService.applyPremiumPayout(payoutData);
              if (res.success) {
                Alert.alert('Thành công', 'Đã cấp phát lương thành công cho tất cả nghệ sĩ!');
                setPayoutData(null);
                fetchPayoutHistory(); // Refresh history
                handleCalculate(); // Refresh payout calculation
              } else {
                Alert.alert('Lỗi', res.message || 'Hệ thống gặp lỗi khi phát lương');
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Lỗi', 'Không thể hoàn tất giao dịch');
            } finally {
              setApplying(false);
            }
          }
        }
      ]
    );
  };

  // ==== HISTORY TAB FUNCTIONS ====
  const fetchPayoutHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await adminService.getPayoutHistory();
      if (res.success) {
        setPayoutBatches(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'history') {
      fetchPayoutHistory();
    } else {
      handleCalculate();
      setRefreshing(false);
    }
  }, [activeTab]);

  const openBatchDetails = async (batch) => {
    setSelectedBatch(batch);
    setModalVisible(true);
    setDetailsLoading(true);
    try {
      const res = await adminService.getPayoutBatchDetails(batch.batch_time);
      if (res.success && res.data) {
        // New response structure has { data: { artists: [...], period_start, period_end, ... } }
        setBatchDetails(res.data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==== RENDER FUNCTIONS ====
  const renderArtistItem = ({ item }) => (
    <View style={styles.artistCard}>
      <View style={styles.artistInfo}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.artist_name?.charAt(0) || '?'}</Text>
        </View>
        <View style={styles.nameSection}>
          <Text style={styles.artistName}>{item.artist_name}</Text>
          <View style={styles.detailStatsRow}>
            <Text style={styles.detailStatText}>{item.streams || 0} lượt nghe</Text>
            <Text style={styles.detailStatDivider}>•</Text>
            <Text style={styles.detailStatText}>
              {Math.floor(item.duration / 60)}p {item.duration % 60}s
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.detailRight}>
        <Text style={[styles.detailAmount, { color: COLORS.success }]}>
          {Math.floor(item.revenue || 0).toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.detailPercentage}>{item.percentage}%</Text>
      </View>
    </View>
  );

  const renderBatchItem = ({ item }) => (
    <TouchableOpacity style={styles.batchCard} onPress={() => openBatchDetails(item)}>
      <View style={styles.batchHeader}>
        <View style={styles.batchIconContainer}>
          <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.batchInfo}>
          <Text style={styles.batchTime}>{formatDate(item.actual_time)}</Text>
          <Text style={styles.batchArtists}>{item.artist_count} nghệ sĩ</Text>
        </View>
        <View style={styles.batchAmount}>
          <Text style={styles.amountValue}>
            {Math.floor(item.total_paid).toLocaleString('vi-VN')}đ
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailItem = ({ item }) => (
    <View style={styles.detailCard}>
      <View style={styles.detailArtist}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.artistImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.artist_name?.charAt(0) || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.detailArtistName}>{item.artist_name}</Text>
          <View style={styles.detailStatsRow}>
            <Text style={styles.detailStatText}>{item.streams || 0} lượt nghe</Text>
            <Text style={styles.detailStatDivider}>•</Text>
            <Text style={styles.detailStatText}>{item.duration_text || '0s'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.detailRight}>
        <Text style={styles.detailAmount}>
          {Math.floor(item.amount || 0).toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.detailPercentage}>{item.percentage}%</Text>
      </View>
    </View>
  );

  const renderPayoutTab = () => (
    <ScrollView 
      style={styles.content}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {loading && !payoutData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tính toán phân bổ doanh thu...</Text>
        </View>
      ) : !payoutData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={COLORS.textDisabled} />
          <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleCalculate}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {payoutData.start_date && (
            <View style={styles.periodBadge}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.periodText}>
                Kỳ: {new Date(payoutData.start_date).toLocaleDateString('vi-VN')} - {new Date(payoutData.end_date).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          )}

          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng quỹ lương</Text>
              <Text style={styles.summaryValue}>
                {Math.floor(payoutData.total_pool).toLocaleString('vi-VN')}đ
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng thời lượng</Text>
              <Text style={styles.summaryValue}>
                {Math.floor(payoutData.total_duration / 60).toLocaleString('vi-VN')}p
              </Text>
            </View>
          </View>

          <Text style={styles.listTitle}>CHI TIẾT PHÂN PHỐI THEO THỜI LƯỢNG</Text>
          
          {payoutData.artist_shares.length === 0 ? (
            <Text style={styles.noData}>Không có dữ liệu phát nhạc Premium mới để tính lương.</Text>
          ) : (
            <>
              {payoutData.artist_shares.map((item, index) => (
                <View key={index}>{renderArtistItem({ item })}</View>
              ))}

              <TouchableOpacity 
                style={styles.payNowBtn}
                onPress={handleApplyPayout}
                disabled={applying}
              >
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  style={styles.payNowGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {applying ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.payNowText}>Xác nhận phát lương ngay</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <>
      {historyLoading && payoutBatches.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : payoutBatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textDisabled} />
          <Text style={styles.emptyTitle}>Chưa có lịch sử phát lương</Text>
        </View>
      ) : (
        <FlatList
          data={payoutBatches}
          keyExtractor={(item, index) => `${item.batch_time}-${index}`}
          renderItem={renderBatchItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}

      {/* Batch Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đợt phát lương</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedBatch && (
              <View style={styles.modalSummary}>
                <Text style={styles.modalDate}>{formatDate(selectedBatch.actual_time)}</Text>
                <Text style={styles.modalTotal}>
                  Tổng: {Math.floor(selectedBatch.total_paid).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            )}

            {detailsLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : batchDetails ? (
              <>
                {/* Period info */}
                {batchDetails.period_start && (
                  <View style={styles.periodInfoCard}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.periodInfoText}>
                      Kỳ: {batchDetails.period_start} → {batchDetails.period_end}
                    </Text>
                  </View>
                )}

                {/* Summary stats */}
                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatValue}>{batchDetails.artist_count || 0}</Text>
                    <Text style={styles.modalStatLabel}>Nghệ sĩ</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatValue}>
                      {Math.floor(batchDetails.total_paid || 0).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.modalStatLabel}>Tổng phát</Text>
                  </View>
                </View>

                {/* Artists list */}
                <Text style={styles.artistListTitle}>DANH SÁCH NGHỆ SĨ</Text>
                <FlatList
                  data={batchDetails.artists || []}
                  keyExtractor={(item, idx) => item.artist_id?.toString() || idx.toString()}
                  renderItem={renderDetailItem}
                  style={{ flex: 1 }}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
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
          <Text style={styles.headerTitle}>QUẢN LÝ LƯƠNG PREMIUM</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'payout' && styles.tabItemActive]}
            onPress={() => setActiveTab('payout')}
          >
            <Ionicons name="wallet-outline" size={18} color={activeTab === 'payout' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'payout' && styles.tabTextActive]}>Phát lương</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="time-outline" size={18} color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Lịch sử</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {activeTab === 'payout' ? renderPayoutTab() : renderHistoryTab()}

      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 10,
  },
  listTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  artistCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameSection: {
    flex: 1,
  },
  artistName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  revenueSection: {
    alignItems: 'flex-end',
  },
  revenueValue: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  durationText: {
    color: COLORS.textDisabled,
    fontSize: 11,
  },
  noData: {
    color: COLORS.textDisabled,
    textAlign: 'center',
    marginTop: 20,
  },
  payNowBtn: {
    marginTop: 20,
    borderRadius: 15,
    height: 60,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  payNowGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payNowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // History tab styles
  batchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  batchInfo: {
    flex: 1,
  },
  batchTime: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  batchArtists: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  batchAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountValue: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '85%',
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  modalDate: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  modalTotal: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  artistImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  detailArtist: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailArtistName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  detailStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailStatText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  detailStatDivider: {
    color: COLORS.textDisabled,
    fontSize: 11,
    marginHorizontal: 4,
  },
  detailRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  detailAmount: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailPercentage: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  periodInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  periodInfoText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 10,
  },
  artistListTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
});

export default AdminPremiumPayoutScreen;
