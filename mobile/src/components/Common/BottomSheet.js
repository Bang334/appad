import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BottomSheet = ({ visible, onClose, title, message, options = [] }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.sheet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Title */}
                {title && (
                  <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                  </View>
                )}

                {/* Message */}
                {message && (
                  <Text style={styles.message}>{message}</Text>
                )}

                {/* Options */}
                <View style={styles.optionsContainer}>
                  {options.map((option, index) => {
                    const isDestructive = option.style === 'destructive';
                    const isCancel = option.style === 'cancel';

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.option,
                          isCancel && styles.cancelOption,
                        ]}
                        onPress={() => {
                          handleClose();
                          setTimeout(() => {
                            if (option.onPress) option.onPress();
                          }, 300);
                        }}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={
                            isDestructive
                              ? ['#DC2626', '#991B1B']
                              : isCancel
                              ? ['#374151', '#1F2937']
                              : ['#2563EB', '#1E40AF']
                          }
                          style={styles.optionGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {option.icon && (
                            <Ionicons
                              name={option.icon}
                              size={22}
                              color={COLORS.white}
                              style={styles.optionIcon}
                            />
                          )}
                          <Text
                            style={[
                              styles.optionText,
                              isCancel && styles.cancelText,
                            ]}
                          >
                            {option.text}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  sheet: {
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: SIZES.padding,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  message: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  cancelOption: {
    marginTop: 4,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  optionIcon: {
    marginRight: 4,
  },
  optionText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  cancelText: {
    color: '#E5E7EB',
  },
});

export default BottomSheet;
