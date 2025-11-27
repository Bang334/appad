import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';

const HelpScreen = ({ navigation }) => {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (index) => {
    setExpandedItems({
      ...expandedItems,
      [index]: !expandedItems[index],
    });
  };

  const faqs = [
    {
      question: 'Làm thế nào để tạo playlist?',
      answer: 'Bạn có thể tạo playlist bằng cách:\n1. Nhấn nút ba chấm (⋮) khi đang phát nhạc\n2. Chọn "Tạo playlist mới"\n3. Nhập tên playlist và nhấn "Tạo"\n4. Bài hát sẽ được thêm vào playlist mới'
    },
    {
      question: 'Làm thế nào để tìm kiếm bài hát?',
      answer: 'Để tìm kiếm bài hát:\n1. Chuyển đến tab "Tìm kiếm"\n2. Nhập tên bài hát, nghệ sĩ hoặc album\n3. Kết quả sẽ hiển thị tự động\n4. Nhấn vào bài hát để phát'
    },
    {
      question: 'Làm thế nào để thêm bài hát vào playlist?',
      answer: 'Để thêm bài hát vào playlist:\n1. Phát bài hát bạn muốn thêm\n2. Nhấn nút ba chấm (⋮) ở góc trên bên phải\n3. Chọn playlist muốn thêm\n4. Hoặc tạo playlist mới'
    },
    {
      question: 'Tại sao không thể phát nhạc?',
      answer: 'Có thể do các nguyên nhân sau:\n• Kết nối internet không ổn định\n• File nhạc bị lỗi\n• Ứng dụng cần được cập nhật\n• Vấn đề với tài khoản người dùng'
    },
    {
      question: 'Làm thế nào để xem lời bài hát?',
      answer: 'Để xem lời bài hát:\n1. Phát bài hát bất kỳ\n2. Nhấn vào biểu tượng tài liệu (📄) ở dưới\n3. Lời bài hát sẽ hiển thị\n4. Cuộn xuống để xem toàn bộ lời'
    },
    {
      question: 'Làm thế nào để đổi mật khẩu?',
      answer: 'Để đổi mật khẩu:\n1. Vào "Cá nhân" → "Chỉnh sửa hồ sơ"\n2. Nhấn "Thay đổi mật khẩu"\n3. Nhập mật khẩu hiện tại và mật khẩu mới\n4. Xác nhận và lưu thay đổi'
    },
    {
      question: 'Làm thế nào để sắp xếp lại thứ tự bài hát trong playlist?',
      answer: 'Để sắp xếp lại thứ tự bài hát trong playlist:\n1. Mở playlist bạn muốn chỉnh sửa\n2. Nhấn và giữ vào biểu tượng 3 gạch ngang (☰) bên trái bài hát\n3. Kéo bài hát lên hoặc xuống đến vị trí mong muốn\n4. Thả tay để xác nhận\n5. Thứ tự sẽ tự động được lưu lại'
    }
  ];

  const contactMethods = [
    {
      icon: 'mail-outline',
      title: 'Email hỗ trợ',
      subtitle: 'support@musicapp.com',
      onPress: () => Linking.openURL('mailto:support@musicapp.com')
    },
    {
      icon: 'chatbubble-outline',
      title: 'Chat trực tuyến',
      subtitle: 'Hỗ trợ 24/7',
      onPress: () => Alert.alert('Chat', 'Tính năng chat sẽ sớm có mặt')
    },
    {
      icon: 'call-outline',
      title: 'Hotline',
      subtitle: '1900-xxxx',
      onPress: () => Linking.openURL('tel:1900123456')
    }
  ];

  const FAQItem = ({ item, index }) => (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => toggleExpanded(index)}
      >
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <Ionicons
          name={expandedItems[index] ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
      {expandedItems[index] && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );

  const ContactItem = ({ item }) => (
    <TouchableOpacity style={styles.contactItem} onPress={item.onPress}>
      <View style={styles.contactLeft}>
        <Ionicons name={item.icon} size={24} color={COLORS.primary} />
        <View style={styles.contactText}>
          <Text style={styles.contactTitle}>{item.title}</Text>
          <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Trợ giúp & Hỗ trợ</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.intro}>
        <Ionicons name="help-circle" size={48} color={COLORS.primary} />
        <Text style={styles.introTitle}>Chúng tôi ở đây để giúp bạn!</Text>
        <Text style={styles.introText}>
          Tìm câu trả lời cho các câu hỏi thường gặp hoặc liên hệ với chúng tôi để được hỗ trợ.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
        {faqs.map((item, index) => (
          <FAQItem key={index} item={item} index={index} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liên hệ hỗ trợ</Text>
        {contactMethods.map((item, index) => (
          <ContactItem key={index} item={item} />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Không tìm thấy câu trả lời? Hãy liên hệ với chúng tôi!
        </Text>
      </View>
      </ScrollView>
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for MiniPlayer
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  intro: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: SIZES.padding,
  },
  introTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  faqAnswerText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  footer: {
    padding: SIZES.padding * 2,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
});

export default HelpScreen;
