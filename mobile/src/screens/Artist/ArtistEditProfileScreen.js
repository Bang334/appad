import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';

const ArtistEditProfileScreen = ({ route, navigation }) => {
  const { artistId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [artist, setArtist] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    country: '',
    image_url: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadArtistData();
  }, []);

  const loadArtistData = async () => {
    try {
      setLoading(true);
      const response = await artistService.getArtistById(artistId);
      if (response.success && response.data) {
        setArtist(response.data);
        setFormData({
          name: response.data.name || '',
          bio: response.data.bio || '',
          country: response.data.country || '',
          image_url: response.data.image_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading artist:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin nghệ sĩ');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };



  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nghệ sĩ');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = formData.image_url;

      if (selectedImage) {
        console.log('[EditProfile] Uploading image...');
        try {
          const uploadRes = await artistService.uploadCoverFile(artistId, selectedImage);
          if (uploadRes && uploadRes.data && uploadRes.data.url) {
            imageUrl = uploadRes.data.url;
            console.log('[EditProfile] Image uploaded:', imageUrl);
          } else {
             throw new Error('Upload failed, no URL returned');
          }
        } catch (uploadError) {
          console.error('[EditProfile] Upload failed:', uploadError);
          Alert.alert('Lỗi', 'Không thể tải lên ảnh. Vui lòng thử lại.');
          setSaving(false);
          return;
        }
      }

      // Step 2: Update profile with JSON data
      const updateData = {
        name: formData.name.trim(),
        bio: formData.bio.trim() || null,
        country: formData.country.trim() || null,
        image_url: imageUrl || null,
      };

      console.log('[EditProfile] Sending JSON update:', updateData);
      
      const response = await artistService.updateProfile(artistId, updateData);
      
      console.log('[EditProfile] Response:', response);

      if (response.success) {
        Alert.alert('Thành công', 'Đã cập nhật hồ sơ', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể cập nhật hồ sơ');
      }
    } catch (error) {
      console.error('[EditProfile] Save error:', error);
      Alert.alert('Lỗi', 'Không thể lưu thông tin hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const displayImage = selectedImage?.uri || formData.image_url;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="person" size={60} color={COLORS.textSecondary} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={24} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Chạm để thay đổi ảnh</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên nghệ sĩ *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Nhập tên nghệ sĩ"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quốc gia</Text>
            <TextInput
              style={styles.input}
              value={formData.country}
              onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
              placeholder="Nhập quốc gia"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tiểu sử</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Viết vài dòng giới thiệu về bạn..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  imageHint: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  bioInput: {
    height: 120,
    paddingTop: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default ArtistEditProfileScreen;
