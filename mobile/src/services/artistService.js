import api from '../config/api';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const artistService = {
  // Get artist by ID
  getArtistById: async (artistId) => {
    const response = await api.get(`/artists/${artistId}`);
    return response.data;
  },

  // Get all artists
  getArtists: async () => {
    const response = await api.get('/artists');
    return response.data;
  },

  // Get artist albums
  getArtistAlbums: async (artistId) => {
    const response = await api.get(`/albums/artist/${artistId}`);
    return response.data;
  },

  // Get artist songs
  getArtistSongs: async (artistId) => {
    const response = await api.get(`/songs/artist/${artistId}`);
    return response.data;
  },

  // Get artist dashboard (wallet + stats)
  getDashboard: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/dashboard`);
    return response.data;
  },

  // Get artist balance
  getBalance: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/balance`);
    return response.data;
  },

  // Get revenue history
  getRevenueHistory: async (artistId, params = {}) => {
    const { limit = 50, offset = 0, period, share_type, is_paid } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(period && { period }),
      ...(share_type && { share_type }),
      ...(is_paid !== undefined && { is_paid }),
    }).toString();

    const response = await api.get(`/artists/${artistId}/revenue?${queryParams}`);
    return response.data;
  },

  // Get revenue statistics (overview, top songs, charts)
  getRevenueStats: async (artistId, params = {}) => {
    const { period = 'all', start_date, end_date } = params;
    const queryParams = new URLSearchParams({
      period,
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
    }).toString();

    const response = await api.get(`/artists/${artistId}/revenue/stats?${queryParams}`);
    return response.data;
  },

  // Request withdrawal
  requestWithdrawal: async (artistId, amount, artistNote = '') => {
    const response = await api.post(`/artists/${artistId}/withdraw`, {
      amount,
      artist_note: artistNote,
    });
    return response.data;
  },

  // Get withdrawal history
  getWithdrawals: async (artistId, params = {}) => {
    const { limit = 50, offset = 0, status } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(status && { status }),
    }).toString();

    const response = await api.get(`/artists/${artistId}/withdrawals?${queryParams}`);
    return response.data;
  },

  // Update bank info
  updateBankInfo: async (artistId, bankInfo) => {
    const response = await api.put(`/artists/${artistId}/bank-info`, bankInfo);
    return response.data;
  },

  // Update artist profile (JSON only, image handled via uploadCoverFile)
  updateProfile: async (artistId, profileData) => {
    // Send JSON data directly
    const response = await api.put(`/artists/${artistId}/profile`, profileData);
    return response.data;
  },

  // Songs management
  getMySongs: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/songs`);
    return response.data;
  },

  // Upload helper methods
  uploadSongFile: async (artistId, file) => {
    try {
      const formData = new FormData();
      // Handle both file object or uri string (backward compatibility)
      const fileUri = file.uri || file;
      const fileName = file.name || fileUri.split('/').pop() || 'song.mp3';
      const fileType = file.mimeType || 'audio/mpeg';
      
      formData.append('song', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      // Sử dụng axios giống như adminService để đảm bảo đồng bộ
      const response = await api.post(`/artists/${artistId}/upload-song`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // Tăng timeout lên 120s cho Cloudinary
        transformRequest: (data, headers) => {
          return data; // Bảo vệ FormData khỏi bị serialize
        },
      });

      return response.data;
    } catch (error) {
      console.error('Upload song error:', error);
      throw error;
    }
  },

  uploadCoverFile: async (artistId, file) => {
    try {
      const formData = new FormData();
      const fileUri = file.uri || file;
      const fileName = file.name || fileUri.split('/').pop() || 'cover.jpg';
      const fileType = file.mimeType || 'image/jpeg';
      
      formData.append('cover', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      const response = await api.post(`/artists/${artistId}/upload-cover`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60s cho ảnh
        transformRequest: (data, headers) => {
          return data;
        },
      });

      return response.data;
    } catch (error) {
      console.error('Upload cover error:', error);
      throw error;
    }
  },

  createSong: async (artistId, songData, files = null) => {
    // If files are provided, upload them first
    let finalSongData = { ...songData };
    
    if (files) {
      try {
        if (files.audio) {
          console.log('📤 Uploading audio file separately...');
          console.log('📤 Uploading audio file separately...');
          const audioRes = await artistService.uploadSongFile(artistId, files.audio);
          finalSongData.file_url = audioRes.data.url;
          if (audioRes.data.duration) {
            finalSongData.duration = Math.round(audioRes.data.duration);
          }
        }
        
        if (files.cover) {
          console.log('📤 Uploading cover file separately...');
          console.log('📤 Uploading cover file separately...');
          const coverRes = await artistService.uploadCoverFile(artistId, files.cover);
          finalSongData.cover_url = coverRes.data.url;
        }
      } catch (error) {
        console.error('Upload file error:', error);
        throw error;
      }
    }

    console.log('📤 Creating song with data:', finalSongData);
    
    // Send JSON data
    const response = await api.post(`/artists/${artistId}/songs`, finalSongData);
    return response.data;
  },

  updateSong: async (artistId, songId, songData, files = null) => {
    // Giữ logic giống createSong: upload file riêng, sau đó chỉ gửi JSON
    let finalSongData = { ...songData };

    if (files) {
      try {
        if (files.audio) {
          console.log('📤 [updateSong] Uploading new audio file...');
          console.log('📤 [updateSong] Uploading new audio file...');
          const audioRes = await artistService.uploadSongFile(artistId, files.audio);
          finalSongData.file_url = audioRes.data.url;
          if (audioRes.data.duration) {
            finalSongData.duration = Math.round(audioRes.data.duration);
          }
        }

        if (files.cover) {
          console.log('📤 [updateSong] Uploading new cover file...');
          console.log('📤 [updateSong] Uploading new cover file...');
          const coverRes = await artistService.uploadCoverFile(artistId, files.cover);
          finalSongData.cover_url = coverRes.data.url;
        }
      } catch (error) {
        console.error('[updateSong] Upload file error:', error);
        throw error;
      }
    }

    console.log('📤 [updateSong] Updating song with data:', finalSongData);

    const response = await api.put(`/artists/${artistId}/songs/${songId}`, finalSongData);
    return response.data;
  },

  deleteSong: async (artistId, songId) => {
    const response = await api.delete(`/artists/${artistId}/songs/${songId}`);
    return response.data;
  },

  // Albums management
  getMyAlbums: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/albums`);
    return response.data;
  },

  createAlbum: async (artistId, albumData, files = null) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(albumData).forEach(key => {
      if (albumData[key] !== null && albumData[key] !== undefined) {
        formData.append(key, albumData[key].toString());
      }
    });

    // Add files
    if (files && files.cover) {
      formData.append('cover', {
        uri: files.cover.uri,
        type: files.cover.type || 'image/jpeg',
        name: files.cover.name || 'cover.jpg',
      });
    }

    const response = await api.post(`/artists/${artistId}/albums`, formData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data, headers) => {
        return data;
      },
    });
    return response.data;
    return response.data;
  },

  updateAlbum: async (artistId, albumId, albumData, files = null) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(albumData).forEach(key => {
      if (albumData[key] !== null && albumData[key] !== undefined) {
        formData.append(key, albumData[key].toString());
      }
    });

    // Add files
    if (files && files.cover) {
      formData.append('cover', {
        uri: files.cover.uri,
        type: files.cover.type || 'image/jpeg',
        name: files.cover.name || 'cover.jpg',
      });
    }

    const response = await api.put(`/artists/${artistId}/albums/${albumId}`, formData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data, headers) => {
        return data;
      },
    });
    return response.data;
    return response.data;
  },

  deleteAlbum: async (artistId, albumId) => {
    const response = await api.delete(`/artists/${artistId}/albums/${albumId}`);
    return response.data;
  },

  // Artist Membership
  subscribeMembership: async (artistId, durationDays) => {
    try {
      const response = await api.post(`/artists/${artistId}/membership/subscribe`, {
        duration_days: durationDays,
      });
      return response.data;
    } catch (error) {
      console.error('[artistService] Error subscribing membership:', {
        artistId,
        durationDays,
        error: error.response?.data || error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Return error in same format as success response
      return {
        success: false,
        message: error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký hội viên',
        data: error.response?.data?.data || null
      };
    }
  },

  getMembershipStatus: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/membership/status`);
    return response.data;
  },

  cancelMembership: async (artistId) => {
    const response = await api.post(`/artists/${artistId}/membership/cancel`);
    return response.data;
  },

  getMembers: async (artistId, params = {}) => {
    const { limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
    }).toString();
    const response = await api.get(`/artists/${artistId}/membership/members?${queryParams}`);
    return response.data;
  },

  updateMembershipPrice: async (artistId, membershipPrice, membershipDurationDays) => {
    const response = await api.put(`/artists/${artistId}/membership/price`, {
      membership_price: membershipPrice,
      membership_duration_days: membershipDurationDays,
    });
    return response.data;
  },
};
