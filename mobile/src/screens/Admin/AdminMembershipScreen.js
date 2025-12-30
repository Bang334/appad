import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminMembershipScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [memberships, setMemberships] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      const [membershipsRes, statsRes] = await Promise.all([
        adminService.getAllMemberships({
          limit: 100,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchText || undefined,
        }),
        adminService.getMembershipStats(),
      ]);
      
      if (membershipsRes.success) {
        setMemberships(membershipsRes.data.memberships || []);
        setTotal(membershipsRes.data.total || 0);
      }
      if (statsRes.success) setStats(statsRes.data.stats || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [filterStatus])
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item }) => {
    const isActive = item.status === 'active';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userBox}>
            <View style={styles.userIcon}>
              <Ionicons name="star" size={20} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.userName} numberOfLines={1}>{item.full_name || item.username || 'Hội viên'}</Text>
              <Text style={styles.planText}>Gói: {item.artist_name || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.statusTag, { backgroundColor: isActive ? COLORS.success + '15' : COLORS.error + '15' }]}>
            <Text style={[styles.statusTabText, { color: isActive ? COLORS.success : COLORS.error }]}>
              {isActive ? 'Đang hoạt động' : 'Hết hạn'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{parseInt(item.price_paid || 0).toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {new Date(item.start_date).toLocaleDateString('vi-VN')} - {new Date(item.expiry_date).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
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
          <Text style={styles.headerTitle}>QUẢN LÝ HỘI VIÊN</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.statsSummary}>
          <View style={styles.sumBox}>
            <Text style={styles.sumVal}>{stats?.active_members || 0}</Text>
            <Text style={styles.sumLab}>Đang hoạt động</Text>
          </View>
          <View style={styles.sumDivider} />
          <View style={styles.sumBox}>
            <Text style={styles.sumVal}>{(stats?.total_revenue || 0).toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.sumLab}>Doanh thu</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textDisabled} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm hội viên..."
            placeholderTextColor={COLORS.textDisabled}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {['all', 'active', 'expired'].map(s => (
          <TouchableOpacity 
            key={s} 
            style={[styles.filterBtn, filterStatus === s && styles.activeFilter]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.activeFilterText]}>
              {s === 'all' ? 'Tất cả' : s === 'active' ? 'Hoạt động' : 'Hết hạn'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && memberships.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={memberships}
          renderItem={renderItem}
          keyExtractor={(item, index) => (item.membership_id || index).toString()}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Không tìm thấy hội viên nào</Text>
            </View>
          }
        />
      )}
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  statsSummary: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20 },
  sumBox: { flex: 1, alignItems: 'center' },
  sumVal: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  sumLab: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  sumDivider: { width: 1, height: 30, backgroundColor: COLORS.divider },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, paddingHorizontal: 16, borderRadius: 14, height: 46, borderWidth: 1, borderColor: COLORS.divider },
  searchInput: { flex: 1, color: '#FFF', paddingLeft: 10, fontSize: 14 },
  filterRow: { flexDirection: 'row', padding: 16, gap: 10 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center' },
  activeFilter: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: 'bold' },
  activeFilterText: { color: COLORS.primary },
  list: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.divider, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  userBox: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  userIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.warning + '15', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  planText: { fontSize: 12, color: COLORS.textDisabled, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTabText: { fontSize: 11, fontWeight: 'bold' },
  cardDetails: { gap: 10, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 13, color: COLORS.textSecondary },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 16, color: COLORS.textDisabled, fontSize: 14 },
});

export default AdminMembershipScreen;
