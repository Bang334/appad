import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminTransactionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchTransactions = async () => {
    try {
      const response = await adminService.getAllTransactions({
        type: 'deposit',
        status: filter === 'all' ? undefined : filter,
      });
      if (response.success) setTransactions(response.data);

      const countResponse = await adminService.getPendingDepositsCount();
      if (countResponse.success) setPendingCount(countResponse.data.count);
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
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const handleApprove = (transaction) => {
    Alert.alert(
      'Phê duyệt giao dịch',
      `Xác nhận cộng ${parseFloat(transaction.amount).toLocaleString('vi-VN')}đ cho ${transaction.username || 'User'}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              const response = await adminService.approveDeposit(transaction.transaction_id);
              if (response.success) {
                Alert.alert('Thành công', 'Đã cộng tiền vào tài khoản');
                fetchTransactions();
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể phê duyệt giao dịch');
            }
          },
        },
      ]
    );
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập lý do');
    try {
      const response = await adminService.rejectDeposit(selectedTransaction.transaction_id, rejectReason.trim());
      if (response.success) {
        Alert.alert('Thành công', 'Đã từ chối giao dịch');
        setShowRejectModal(false);
        fetchTransactions();
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Thao tác không thành công');
    }
  };

  const renderTransaction = ({ item }) => {
    const isPending = item.status === 'pending';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userSection}>
            <View style={styles.userIcon}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.userName} numberOfLines={1}>{item.full_name || item.username || item.email}</Text>
              <Text style={styles.emailText} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>
          <View style={[styles.statusTag, { backgroundColor: isPending ? COLORS.warning + '20' : item.status === 'completed' ? COLORS.success + '20' : COLORS.error + '20' }]}>
            <Text style={[styles.statusTabText, { color: isPending ? COLORS.warning : item.status === 'completed' ? COLORS.success : COLORS.error }]}>
              {item.status === 'pending' ? 'Chờ duyệt' : item.status === 'completed' ? 'Thành công' : 'Đã hủy'}
            </Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Số tiền nạp:</Text>
          <Text style={styles.amountValue}>{parseFloat(item.amount).toLocaleString('vi-VN')}đ</Text>
        </View>

        {item.description && (
          <View style={styles.descBox}>
            <Text style={styles.descText}>{item.description}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>📅 {new Date(item.created_at).toLocaleString('vi-VN')}</Text>
          {item.reference_code && <Text style={styles.refText}>Ref: {item.reference_code}</Text>}
        </View>

        {isPending && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnApprove]} onPress={() => handleApprove(item)}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.btnText}>Duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnReject]} onPress={() => { setSelectedTransaction(item); setShowRejectModal(true); }}>
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
          <Text style={styles.headerTitle}>DUYỆT NẠP TIỀN</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[
            { id: 'pending', label: 'Chờ duyệt', icon: 'time-outline' },
            { id: 'completed', label: 'Đã duyệt', icon: 'checkmark-done-outline' },
            { id: 'cancelled', label: 'Đã hủy', icon: 'close-outline' },
            { id: 'all', label: 'Tất cả', icon: 'list-outline' }
          ].map(f => (
            <TouchableOpacity 
              key={f.id} 
              style={[styles.tab, filter === f.id && styles.activeTab]}
              onPress={() => setFilter(f.id)}
            >
              <Ionicons name={f.icon} size={16} color={filter === f.id ? COLORS.primary : COLORS.textDisabled} />
              <Text style={[styles.tabText, filter === f.id && styles.activeTabText]}>{f.label}</Text>
              {f.id === 'pending' && pendingCount > 0 && (
                <View style={styles.countBadge}><Text style={styles.countText}>{pendingCount}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && transactions.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.transaction_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Không tìm thấy giao dịch nào</Text>
            </View>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Từ chối nạp tiền</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lý do từ chối..."
              placeholderTextColor={COLORS.textDisabled}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnReject} onPress={confirmReject}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  tabs: { paddingHorizontal: 16, gap: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
  activeTab: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: COLORS.primary },
  countBadge: { backgroundColor: COLORS.error, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  list: { padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.divider },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  userSection: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  userIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  emailText: { fontSize: 12, color: COLORS.textDisabled },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTabText: { fontSize: 11, fontWeight: 'bold' },
  amountSection: { marginBottom: 12 },
  amountLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  descBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 10, marginBottom: 12 },
  descText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginBottom: 16 },
  dateText: { fontSize: 11, color: COLORS.textDisabled },
  refText: { fontSize: 11, color: COLORS.textDisabled, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  btnApprove: { backgroundColor: COLORS.success },
  btnReject: { backgroundColor: COLORS.error },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 16, color: COLORS.textDisabled, fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#FFF', minHeight: 100, textAlignVertical: 'top', marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modalBtnReject: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.error, alignItems: 'center' },
  modalBtnText: { fontWeight: 'bold', color: COLORS.textSecondary },
});

export default AdminTransactionsScreen;

