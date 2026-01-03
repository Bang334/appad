import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../config/theme';

const { width } = Dimensions.get('window');

const ContinueListeningModal = ({ visible, onContinue }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1F1F1F', '#121212']}
            style={styles.gradientBackground}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                 <Ionicons name="moon" size={40} color={COLORS.primary} />
              </View>
              
              <Text style={styles.title}>Bạn vẫn đang nghe chứ?</Text>
              <Text style={styles.message}>
                Nhạc đã dừng sau 30 phút nghe liên tiếp.
              </Text>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={onContinue}
                activeOpacity={0.8}
              >
                <LinearGradient
                   colors={[COLORS.primary, COLORS.secondary]}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 0 }}
                   style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Tiếp tục phát</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradientBackground: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(236, 72, 153, 0.1)', // Primary opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  continueButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ContinueListeningModal;
