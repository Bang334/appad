import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { usePlayer, usePlayerProgress } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import Slider from '@react-native-community/slider';

const MiniPlayer = ({ bottomOffset }) => {
  const insets = useSafeAreaInsets();
  
  const baseTabBarHeight = 56;
  const safeAreaBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 10 : 8);
  
  const calculatedBottom = bottomOffset !== undefined 
    ? bottomOffset + safeAreaBottom + 8
    : baseTabBarHeight + safeAreaBottom + 8;

  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const { currentSong, isPlaying, togglePlayPause, playNext, playPrevious, stopPlayer, seekTo } = usePlayer();
  const { position, duration } = usePlayerProgress();

  useEffect(() => {
    if (user && user.is_premium != 1) {
      const refreshProfile = async () => {
        try {
          const response = await userService.getProfile();
          if (response.success && response.data) {
            // Only update if there's a change to avoid infinite loops
            if (response.data.is_premium != user.is_premium) {
              updateUser(response.data);
            }
          }
        } catch (error) {
          // Silent fail
        }
      };
      refreshProfile();
    }
  }, [user?.user_id]);

  // Check premium status from multiple sources
  const isUserPremiumSub = user?.is_premium == 1; 
  const isArtistMember = user?.is_membership == 1;
  const isPremiumSong = currentSong?.is_premium == 1 || currentSong?.album_is_premium == 1;
  
  const isPremiumContent = isUserPremiumSub || isArtistMember || isPremiumSong;

  // Debug log to check premium status
  useEffect(() => {
    if (user) {
      console.log('💎 Player Premium Debug:', {
        username: user.username,
        is_premium_sub: user.is_premium,
        is_artist_member: user.is_membership,
        is_premium_song: currentSong?.is_premium,
        final_is_premium_content: isPremiumContent
      });
    }
  }, [user, currentSong, isPremiumContent]);

  // Use player duration if available, otherwise fallback to song duration from database
  const displayDuration = useMemo(() => {
    if (duration > 0) {
      return duration; // Use player duration (in milliseconds)
    }
    // Fallback to song duration from database
    if (currentSong?.duration) {
      // Convert to milliseconds if needed (duration could be in seconds or milliseconds)
      const songDuration = currentSong.duration > 10000 
        ? currentSong.duration // Already in milliseconds
        : currentSong.duration * 1000; // Convert seconds to milliseconds
      return songDuration;
    }
    return 0;
  }, [duration, currentSong?.duration]);

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Animation values
  const playButtonScale = React.useRef(new Animated.Value(1)).current;
  const haloScale = React.useRef(new Animated.Value(1)).current;
  const haloOpacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnimation = React.useRef(null);
  const haloAnimation = React.useRef(null);

  useEffect(() => {
    if (isPlaying && !isCollapsed) {
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(playButtonScale, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(playButtonScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      
      haloAnimation.current = Animated.loop(
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 2.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(haloOpacity, {
              toValue: 0.5,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseAnimation.current.start();
      haloAnimation.current.start();
    } else {
      if (pulseAnimation.current) pulseAnimation.current.stop();
      if (haloAnimation.current) haloAnimation.current.stop();
      
      Animated.parallel([
        Animated.timing(playButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (pulseAnimation.current) pulseAnimation.current.stop();
      if (haloAnimation.current) haloAnimation.current.stop();
    };
  }, [isPlaying, isCollapsed]);

  // Optimize progress calculation
  const progress = useMemo(() => {
    return displayDuration > 0 ? Math.min(position / displayDuration, 1) : 0;
  }, [position, displayDuration]);

  const openFullPlayer = () => {
    navigation.navigate('FullPlayer');
  };

  const handleClose = () => {
    stopPlayer();
  };

  const handleCollapse = () => {
    setIsCollapsed(true);
  };

  const handleExpand = () => {
    setIsCollapsed(false);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.round((ms || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  if (isCollapsed) {
    return (
      <TouchableOpacity
        style={[
          styles.collapsedContainer, 
          { bottom: calculatedBottom + 20 },
          isPremiumContent && {
            borderColor: COLORS.warning,
            backgroundColor: '#2d2201',
            borderWidth: 1.5,
          }
        ]}
        onPress={handleExpand}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={24} color={isPremiumContent ? COLORS.warning : COLORS.primary} />
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
        />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container, 
        { bottom: calculatedBottom },
        isPremiumContent && styles.premiumContainer
      ]}
    >
      {isPremiumContent && (
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}
      <View style={styles.contentRow}>
        {/* Close Button - Top Right Overlay */}
        <TouchableOpacity 
          onPress={handleClose} 
          style={[styles.closeButton, isPremiumContent && styles.premiumActionButton]}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Ionicons name="close" size={18} color={isPremiumContent ? COLORS.warning : COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Collapse Button - Bottom Right Overlay */}
        <TouchableOpacity 
          onPress={handleCollapse} 
          style={[styles.collapseButton, isPremiumContent && styles.premiumActionButton]}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Ionicons name="chevron-forward" size={18} color={isPremiumContent ? COLORS.warning : COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={openFullPlayer} 
          style={styles.songInfo}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: currentSong.cover_url || 'https://via.placeholder.com/50' }}
            style={[styles.cover, isPremiumContent && { borderColor: COLORS.warning, borderWidth: 1.5 }]}
          />
          
          <View style={styles.info}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[styles.title, isPremiumContent && { color: COLORS.warning }]} numberOfLines={1}>
                {currentSong.title}
              </Text>
            </View>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist_name || 'Unknown Artist'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <LinearGradient
              colors={isPremiumContent ? ['#332200', '#554400', '#332200'] : ['#222', '#444', '#222']}
              style={styles.smallControlGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.shineOverlay} />
              <Ionicons 
                 name="play-skip-back" 
                 size={20} 
                 color={isPremiumContent ? COLORS.warning : COLORS.textSecondary} 
              />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playButtonContainer} hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}>
            <Animated.View style={[
              styles.halo,
              {
                transform: [{ scale: haloScale }],
                opacity: haloOpacity,
                backgroundColor: isPremiumContent ? COLORS.warning : COLORS.primary,
              }
            ]} />
            
            <Animated.View style={{ transform: [{ scale: playButtonScale }] }}>
              <LinearGradient
                colors={isPremiumContent ? ['#ea580c', '#fdba74', '#f97316'] : ['#8b5cf6', '#d8b4fe', '#ec4899']}
                style={[styles.playButtonGradient, isPremiumContent && styles.premiumPlayButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.shineOverlay} />
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={22}
                  color={isPremiumContent ? '#000' : COLORS.white}
                />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={playNext} style={styles.controlButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <LinearGradient
              colors={isPremiumContent ? ['#332200', '#554400', '#332200'] : ['#222', '#444', '#222']}
              style={styles.smallControlGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.shineOverlay} />
              <Ionicons 
                name="play-skip-forward" 
                size={20} 
                color={isPremiumContent ? COLORS.warning : COLORS.textSecondary} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={displayDuration || 1}
          value={position}
          minimumTrackTintColor={isPremiumContent ? COLORS.warning : COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={isPremiumContent ? COLORS.warning : COLORS.primary}
          onSlidingComplete={seekTo}
        />
        <View style={styles.progressTimes}>
          <Text style={styles.progressTime}>{formatTime(position)}</Text>
          <Text style={styles.progressTime}>{formatTime(displayDuration)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 100,  
    position: 'absolute',
    left: 5,
    right: 5,
    paddingVertical: 10,
    paddingHorizontal: SIZES.padding,
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    gap: 8,
  },
  premiumContainer: {
    borderColor: COLORS.warning,
    borderWidth: 1.5,
    shadowColor: COLORS.warning,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  collapsedContainer: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#050505',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -25,
    right: -5,
    zIndex: 10,
    padding: 4,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  collapseButton: {
    position: 'absolute',
    top: 20,
    right: -5,
    zIndex: 10,
    padding: 4,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  premiumActionButton: {
    backgroundColor: '#2d2201',
    borderColor: COLORS.warning,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 55,
    height: 55,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  progressWrapper: {
    width: '100%',
    marginTop: 0,
    position: 'relative',
    top: -10,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    top: -5,
  },
  progressTime: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 40,
  },
  controlButton: {
    padding: 6,
  },
  playButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPlayButton: {
    shadowColor: COLORS.warning,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  smallControlGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    height: '50%', // Upper half shine
    opacity: 0.5,
  },
});

export default React.memo(MiniPlayer);
