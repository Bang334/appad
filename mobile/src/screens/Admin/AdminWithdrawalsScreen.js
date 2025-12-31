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
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminWithdrawalsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');

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
      'Duyệt rút tiền',
      `Xác nhận chuyển ${parseFloat(withdrawal.amount).toLocaleString('vi-VN')}đ cho nghệ sĩ ${withdrawal.artist_name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              const response = await adminService.approveWithdrawal(withdrawal.withdrawal_id);
              if (response.success) {
                Alert.alert('Thành công', 'Đã duyệt yêu cầu rút tiền');
                fetchWithdrawals();
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Thao tác không thành công');
            }
          },
        },
      ]
    );
  };

  const handleReject = (withdrawal) => {
    Alert.prompt(
      'Từ chối rút tiền',
      'Nhập lý do từ chối để thông báo cho nghệ sĩ:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason) return Alert.alert('Lỗi', 'Vui lòng nhập lý do');
            try {
              const response = await adminService.rejectWithdrawal(withdrawal.withdrawal_id, reason);
              if (response.success) {
                Alert.alert('Thành công', 'Đã từ chối yêu cầu');
                fetchWithdrawals();
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Thao tác không thành công');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderWithdrawal = ({ item }) => {
    const isPending = item.status === 'pending';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.artistBox}>
            <View style={styles.artistIcon}>
              <Ionicons name="mic-outline" size={20} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.artistName}>{item.artist_name}</Text>
              <Text style={styles.bankName}>{item.bank_name || 'Ngân hàng chưa cập nhật'}</Text>
            </View>
          </View>
          <View style={[styles.statusTag, { backgroundColor: isPending ? COLORS.warning + '15' : item.status === 'completed' ? COLORS.success + '15' : COLORS.error + '15' }]}>
            <Text style={[styles.statusTabText, { color: isPending ? COLORS.warning : item.status === 'completed' ? COLORS.success : COLORS.error }]}>
              {item.status === 'pending' ? 'Chờ duyệt' : item.status === 'completed' ? 'Hoàn thành' : 'Từ chối'}
            </Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Số tiền yêu cầu:</Text>
          <Text style={styles.amountValue}>{parseFloat(item.amount).toLocaleString('vi-VN')}đ</Text>
        </View>

        <View style={styles.bankDetailBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tên TK:</Text>
            <Text style={styles.detailValue}>{item.bank_account_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số TK:</Text>
            <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '900' }]}>{item.bank_account}</Text>
          </View>
        </View>

        {item.artist_note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Nghệ sĩ nhắn: </Text>
            <Text style={styles.noteText}>{item.artist_note}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>📅 {new Date(item.requested_at).toLocaleString('vi-VN')}</Text>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btnAction, styles.btnApprove]} onPress={() => handleApprove(item)}>
              <Ionicons name="checkmark-done" size={18} color="#FFF" />
              <Text style={styles.btnText}>Duyệt rút</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAction, styles.btnReject]} onPress={() => handleReject(item)}>
              <Ionicons name="close-circle" size={18} color="#FFF" />
              <Text style={styles.btnText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DUYỆT RÚT TIỀN</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{stats?.pending || 0}</Text>
            <Text style={styles.summaryLab}>Chờ duyệt</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{parseFloat(stats?.total_completed_amount || 0).toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.summaryLab}>Đã giải ngân</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'completed', label: 'Hoàn thành' },
            { id: 'rejected', label: 'Từ chối' },
            { id: 'all', label: 'Tất cả' }
          ].map(f => (
            <TouchableOpacity 
              key={f.id} 
              style={[styles.tab, filter === f.id && styles.activeTab]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.tabText, filter === f.id && styles.activeTabText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && withdrawals.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={withdrawals}
          renderItem={renderWithdrawal}
          keyExtractor={(item, index) => (item.withdrawal_id || index).toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Không có yêu cầu rút tiền nào</Text>
            </View>
          }
        />
      )}
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  summaryLab: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 24, backgroundColor: COLORS.divider },
  tabs: { paddingHorizontal: 16, gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.surface },
  activeTab: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: COLORS.primary },
  list: { padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.divider },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  artistBox: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  artistIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary + '15', justifyContent: 'center', alignItems: 'center' },
  artistName: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  bankName: { fontSize: 12, color: COLORS.textDisabled },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTabText: { fontSize: 11, fontWeight: 'bold' },
  amountBox: { marginBottom: 16 },
  amountLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  bankDetailBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 12, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: COLORS.textDisabled },
  detailValue: { fontSize: 13, color: '#FFF' },
  noteBox: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  noteLabel: { fontSize: 12, color: COLORS.secondary, fontWeight: 'bold' },
  noteText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  cardFooter: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginBottom: 16 },
  dateText: { fontSize: 11, color: COLORS.textDisabled },
  actions: { flexDirection: 'row', gap: 12 },
  btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  btnApprove: { backgroundColor: COLORS.success },
  btnReject: { backgroundColor: COLORS.error },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 16, color: COLORS.textDisabled, fontSize: 14 },
});

export default AdminWithdrawalsScreen;

