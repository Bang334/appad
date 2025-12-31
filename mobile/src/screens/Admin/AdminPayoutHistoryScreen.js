import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../config/theme';
import adminService from '../../services/adminService';


const AdminPayoutHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutBatches, setPayoutBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchPayoutHistory = async () => {
    try {
      const res = await adminService.getPayoutHistory();
      if (res.success) {
        setPayoutBatches(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayoutHistory();
  }, []);

  const openBatchDetails = async (batch) => {
    setSelectedBatch(batch);
    setModalVisible(true);
    setDetailsLoading(true);
    try {
      const res = await adminService.getPayoutBatchDetails(batch.batch_time);
      if (res.success) {
        setBatchDetails(res.data || []);
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

  const renderBatchItem = ({ item }) => (
    <TouchableOpacity
      style={styles.batchCard}
      onPress={() => openBatchDetails(item)}
    >
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
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.artist_name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.detailArtistName}>{item.artist_name}</Text>
      </View>
      <Text style={styles.detailAmount}>
        {Math.floor(item.artist_share).toLocaleString('vi-VN')}đ
      </Text>
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
          <Text style={styles.headerTitle}>LỊCH SỬ PHÁT LƯƠNG</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {loading ? (
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
            ) : (
              <FlatList
                data={batchDetails}
                keyExtractor={(item) => item.sharing_id?.toString()}
                renderItem={renderDetailItem}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>
      </Modal>

      
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
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.2,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '80%',
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  detailArtist: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailArtistName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  detailAmount: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default AdminPayoutHistoryScreen;

