import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { songService } from '../services/songService';
import { premiumService } from '../services/premiumService';
import PremiumAccessModal from '../components/Common/PremiumAccessModal';
import SongPurchaseModal from '../components/Common/SongPurchaseModal';

const PlayerContext = createContext();
const PlayerProgressContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const usePlayerProgress = () => {
  const context = useContext(PlayerProgressContext);
  if (!context) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumSong, setPremiumSong] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSong, setPurchaseSong] = useState(null);
  
  // Sleep Timer State
  const [sleepTimerTarget, setSleepTimerTarget] = useState(null);
  const sleepTimerRef = useRef(null);
  const playerRef = useRef(null);
  
  // Refs
  const isRepeatRef = useRef(false);
  const isShuffleRef = useRef(false);
  const originalPlaylistRef = useRef([]);
  
  // Playback tracking refs
  const playStartTimeRef = useRef(null); // When current playback started
  const accumulatedDurationRef = useRef(0); // Total ms listened (handles pause/resume)
  const lastRecordedSongRef = useRef(null); // Track last song to avoid duplicate records
  const playlistRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const playbackRequestIdRef = useRef(0); // Track playback requests to prevent race conditions
  const currentSongRef = useRef(null); // Ref to track current song (won't be lost on state updates)
  const lastDidFinishRef = useRef(false);
  const isSeekingRef = useRef(false); // Prevent false finish detection during seek
  const lastSeekedPositionRef = useRef(null); // Track last seeked position to validate updates
  const lastUpdatedPositionRef = useRef(0); // Track last updated position to avoid unnecessary updates

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Configure audio mode on mount
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();

    // Cleanup on unmount
    return () => {
      console.log('⚠️ [PlayerProvider] UNMOUNT - skip cleanup to keep player alive');
      // INTENTIONAL: Do not remove player here to avoid random stop when navigating
      // if (playerRef.current) {
      //   playerRef.current.remove();
      //   playerRef.current = null;
      // }
    };
  }, []);

  // Record listening data helper - restored for internal logic consistency
  const recordListeningData = async () => {
    // USE REF to avoid stale state
    const song = currentSongRef.current;
    if (!song) return;
    
    try {
      let totalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        totalDuration += (Date.now() - playStartTimeRef.current);
      }
      const durationSeconds = Math.floor(totalDuration / 1000);
      
      const songDurationSeconds = Math.floor((duration || song.duration || 0) / 1000);
      const listenPercentage = songDurationSeconds > 0 ? durationSeconds / songDurationSeconds : 0;
      const isCompleted = listenPercentage >= 0.9;
      
      console.log('🎵 [recordListeningData] Manual record', {
        songId: song.song_id,
        durationSeconds,
        isCompleted
      });
      
      await songService.playSong(song.song_id, durationSeconds, isCompleted);
      
      // Reset tracking
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
    } catch (error) {
      console.error('❌ Error recording listening data:', error);
    }
  };

  const handlePlaybackFinished = useCallback(async () => {
    const finishedSong = currentSongRef.current;
    let finalDuration = accumulatedDurationRef.current;
    if (playStartTimeRef.current) {
      const finalPlayDuration = Date.now() - playStartTimeRef.current;
      finalDuration += finalPlayDuration;
    }
    const finalDurationSeconds = Math.floor(finalDuration / 1000);
    
    // Get actual song duration
    const actualSongDurationMs = duration;
    const actualSongDurationSeconds = Math.floor(actualSongDurationMs / 1000);
    
    let songDurationSeconds = actualSongDurationSeconds;
    if (songDurationSeconds === 0) {
      const songDuration = finishedSong?.duration || 0;
      if (songDuration > 10000) {
        songDurationSeconds = Math.floor(songDuration / 1000);
      } else if (songDuration > 0) {
        songDurationSeconds = songDuration;
      }
    }
    
    console.log('🎵 [AUTO-FINISH] Song finished automatically', {
      finishedSongId: finishedSong?.song_id,
      finishedSongTitle: finishedSong?.title,
      finalDurationSeconds: finalDurationSeconds,
      songDurationSeconds: songDurationSeconds,
    });
    
    // Update accumulatedDurationRef
    if (playStartTimeRef.current) {
      accumulatedDurationRef.current = finalDuration;
      playStartTimeRef.current = null;
    }
    
    const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
    const isCompleted = listenPercentage >= 0.9;
    
      if (isRepeatRef.current) {
        // Repeat current song
        if (finishedSong && finalDurationSeconds > 0) {
          songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
            .then(result => {
              console.log('🎵 [AUTO-FINISH] History recorded for repeated song:', result);
            })
            .catch(err => {
              console.error('❌ [AUTO-FINISH] Error recording history for repeated song:', err);
            });
        }
        
        // Reset and replay
        if (playerRef.current) {
          try {
            playStartTimeRef.current = Date.now();
            accumulatedDurationRef.current = 0;
            await playerRef.current.setPositionAsync(0);
            await playerRef.current.playAsync();
          } catch (error) {
            console.error('Error repeating song:', error);
          }
        }
    } else {
      // Record history for finished song BEFORE calling playNext
      if (finishedSong && finalDurationSeconds > 0) {
        songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
          .then(result => {
            console.log('🎵 [AUTO-FINISH] History recorded result:', result);
          })
          .catch(err => {
            console.error('❌ [AUTO-FINISH] Error recording history:', err);
          });
      }
      
      // Now play next song
      console.log('🎵 [AUTO-FINISH] Calling playNext()');
      playNext();
    }
  }, [duration]);

  const setupPlayerStatusListener = useCallback((sound) => {
    // Set playback status update callback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status || !status.isLoaded) {
        return;
      }
      
      // Skip processing if currently seeking to avoid false finish detection
      if (isSeekingRef.current) {
        return;
      }
      
      // Update position (expo-av uses milliseconds)
      if (status.positionMillis !== undefined) {
        const newPosition = status.positionMillis;
        
        if (isSeekingRef.current) {
          return;
        }
        
        // Only update if position changed significantly (more than 100ms) to avoid unnecessary updates
        const positionDiff = Math.abs(newPosition - lastUpdatedPositionRef.current);
        if (positionDiff < 100 && lastUpdatedPositionRef.current > 0) {
          return; // Skip if change is too small
        }
        
        // After seeking, validate position updates to prevent stale data
        if (lastSeekedPositionRef.current !== null) {
          const seekedPos = lastSeekedPositionRef.current;
          const diff = Math.abs(newPosition - seekedPos);
          
          // If position is way behind seeked position (more than 5 seconds), it's stale data
          // Keep position at seeked value and reject
          if (newPosition < seekedPos - 5000) {
            setPosition(seekedPos); // Force position to stay at seeked value
            lastUpdatedPositionRef.current = seekedPos;
            return;
          }
          
          // If position is close enough (within 5 seconds), accept it and clear tracking
          if (diff <= 5000) {
            setPosition(newPosition);
            lastUpdatedPositionRef.current = newPosition;
            lastSeekedPositionRef.current = null; // Clear tracking once we get a valid update
            return;
          }
          
          // If position is ahead of seeked position, it might be valid (player continued playing)
          // But if it's way ahead, keep at seeked position
          if (newPosition > seekedPos + 5000) {
            setPosition(seekedPos);
            lastUpdatedPositionRef.current = seekedPos;
            return;
          }
        }
        
        // Normal position update when not seeking
        setPosition(newPosition);
        lastUpdatedPositionRef.current = newPosition;
      }
      
      // Get duration from song model (stored in seconds in database)
      const song = currentSongRef.current;
      if (song?.duration) {
        // Duration from database is in seconds, convert to milliseconds
        const songDurationMs = song.duration * 1000;
        setDuration(songDurationMs);
      }
      
      // Update playing state
      setIsPlaying(status.isPlaying || false);
      
      // Get song duration for finish detection
      // Prefer actual duration from audio status if available, otherwise fallback to DB
      const audioDurationMs = status.durationMillis || 0;
      const dbDurationMs = (song?.duration || 0) * 1000;
      const targetDurationMs = audioDurationMs > 0 ? audioDurationMs : dbDurationMs;
      
      // Handle playback finished - use didJustFinish or check if at end
      
      // Determine if we are effectively at the end (within 1s)
      // Use 1500ms threshold to be safe with 1000ms update interval
      const isAtEnd = targetDurationMs > 0 && 
                     status.positionMillis >= targetDurationMs - 1500;

      if (status.didJustFinish && !lastDidFinishRef.current) {
        console.log('🎵 [Player] didJustFinish fired');
        lastDidFinishRef.current = true;
        handlePlaybackFinished();
      } else if (isAtEnd && !lastDidFinishRef.current) {
          // Manual finish detection
          // This catches cases where didJustFinish doesn't fire but we are at the end
          // EVEN IF isPlaying is true (stuck at end)
          console.log('🎵 [Player] Manual finish detection triggered', {
            position: status.positionMillis,
            duration: targetDurationMs,
            isPlaying: status.isPlaying
          });
          lastDidFinishRef.current = true;
          handlePlaybackFinished();
      } else if (!isAtEnd && status.isPlaying) {
        // Reset flag ONLY if we are playing and NOT at the end
        // This prevents re-firing while validly playing comfortably in the middle
        lastDidFinishRef.current = false;
      }
    });
  }, [handlePlaybackFinished]);

  const checkSongAccess = async (song) => {
    // 1. Check for unreleased album (local check for speed)
    if (song.album_release_date && new Date(song.album_release_date) > new Date()) {
      return { hasAccess: false, reason: 'Album not yet released' };
    }

    // 2. Check if it's a premium album song (local check)
    // If it's a premium album and NOT a premium song (meaning it's a free song in a paid album)
    // we still need to check access via backend unless we already know user has access.
    // However, if song.is_premium is 0 and album_is_premium is 0, it's definitely free.
    if ((!song.is_premium || song.is_premium === 0) && (!song.album_is_premium || song.album_is_premium === 0)) {
      return { hasAccess: true };
    }

    // 3. Backend check for premium songs or premium album songs
    try {
      const response = await premiumService.checkSongAccess(song.song_id);
      if (response.success && response.data) {
        return response.data;
      }
      return { hasAccess: false, reason: 'Cannot check access' };
    } catch (error) {
      console.error('Error checking song access:', error);
      // If error, assume no access for premium songs/albums
      return { hasAccess: false, reason: 'Error checking access' };
    }
  };

  const playSong = async (song, songList = null, index = 0, playlistData = null) => {
    await playSongInternal(song, songList, index, playlistData, false);
  };

  const togglePlayPause = async () => {
    if (!playerRef.current) return;

    try {
      const status = await playerRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      
      if (status.isPlaying) {
        // Pausing - accumulate current play duration
        if (playStartTimeRef.current) {
          const playDuration = Date.now() - playStartTimeRef.current;
          accumulatedDurationRef.current += playDuration;

          playStartTimeRef.current = null;
        }
        await playerRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // Resuming - start new play session
        playStartTimeRef.current = Date.now();

        await playerRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Helper function to stop current song immediately and consolidate duration
  const stopCurrentSong = async () => {
    try {
      // Consolidate duration immediately
      if (playStartTimeRef.current) {
        const playDuration = Date.now() - playStartTimeRef.current;
        accumulatedDurationRef.current += playDuration;
        playStartTimeRef.current = null;
      }

      setPosition(0);
      setIsPlaying(false);
      // Removed setCurrentSong(null) to preserve state for history recording in playSongInternal
      
      if (playerRef.current) {
        try {
          await playerRef.current.pauseAsync();
        } catch (e) {
          console.error('Error pausing in stopCurrentSong:', e);
        }
      }
    } catch (error) {
      console.error('Error stopping current song:', error);
    }
  };

  // Helper function to find and play next accessible song (internal, skips access check in playSong)
  const playNextAccessibleSong = async (songList, startIndex = -1, skipAccessCheck = false) => {
    if (songList.length === 0) return;
    
    // Stop current song immediately
    await stopCurrentSong();
    
    const startIdx = startIndex >= 0 ? startIndex : currentIndex;
    let attempts = 0;
    const maxAttempts = songList.length;
    
    while (attempts < maxAttempts) {
      let nextIndex;
      if (isShuffleRef.current) {
        // Shuffle mode: pick random song
        if (songList.length > 1) {
          // Avoid playing the same song
          let randomIdx;
          do {
            randomIdx = Math.floor(Math.random() * songList.length);
          } while (randomIdx === startIdx);
          nextIndex = randomIdx;
        } else {
          nextIndex = 0;
        }
      } else {
        // Normal mode: play next song in order
        nextIndex = (startIdx + attempts + 1) % songList.length;
      }
      
      const nextSong = songList[nextIndex];
      
      // Check access unless we're already skipping it
      if (!skipAccessCheck) {
        const accessInfo = await checkSongAccess(nextSong);
        if (!accessInfo.hasAccess) {
          attempts++;
          continue;
        }
      }
      
      // Play the song (with access check disabled to avoid infinite loop)
      await playSongInternal(nextSong, songList, nextIndex, null, true);
      return;
    }
    
    console.warn('No accessible songs found in playlist');
  };

  // Internal playSong function that can skip access check
  const playSongInternal = async (song, songList = null, index = 0, playlistData = null, skipAccessCheck = false) => {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++playbackRequestIdRef.current;
    
    try {
      // 1. Calculate duration for the current (old) song BEFORE resetting refs
      let finalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        finalDuration += (Date.now() - playStartTimeRef.current);
      }
      const finalDurationSeconds = Math.floor(finalDuration / 1000);
      
      // 2. Capture old song from REF to ensure we have the latest data even if state is stale
      const oldSong = currentSongRef.current; // CHANGED FROM currentSong TO currentSongRef.current
      const oldPlayer = playerRef.current;
      
      console.log('🎵 [playSongInternal] Calculating duration for old song', {
        oldSongId: oldSong?.song_id,
        oldSongTitle: oldSong?.title,
        newSongId: song.song_id,
        newSongTitle: song.title,
        finalDuration: finalDuration,
        finalDurationSeconds: finalDurationSeconds,
      });

      // 3. Reset UI and Refs IMMEDIATELY
      setPosition(0);
      setIsPlaying(false);
      
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
      lastDidFinishRef.current = false;
      lastUpdatedPositionRef.current = 0;

      // 4. Process old song cleanup and recording in BACKGROUND
      (async () => {
        try {
          // Release old player
          if (oldPlayer) {
            try {
              await oldPlayer.unloadAsync();
            } catch (e) {
              console.error('Error unloading old player:', e);
            }
          }
          
          // Record history if we had a song and it's different
          if (oldSong && oldSong.song_id !== song.song_id) {
             const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
             const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
             const isCompleted = listenPercentage >= 0.9;
             
             console.log('🎵 [playSongInternal] Recording history for old song', {
               oldSongId: oldSong.song_id,
               finalDurationSeconds: finalDurationSeconds,
               isCompleted: isCompleted,
             });
             
             await songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted);
          } else {
            console.log('🎵 [playSongInternal] Skipping history record', {
              hasOldSong: !!oldSong,
              oldSongId: oldSong?.song_id,
              isSameSong: oldSong?.song_id === song.song_id,
            });
          }
        } catch (err) {
          console.error('❌ [playSongInternal] Background cleanup error:', err);
        }
      })();
      
      // 5. Check access before playing (unless skipped)
      if (!skipAccessCheck) {
        const accessInfo = await checkSongAccess(song);
        if (!accessInfo.hasAccess) {
          if (accessInfo.reason === 'Album not yet released') {
             const releaseDate = song.album_release_date ? new Date(song.album_release_date) : null;
             const formattedDate = releaseDate ? releaseDate.toLocaleString('vi-VN', {
               hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
             }) : 'Trong tương lai';
             
             Alert.alert(
               '🎵 Sắp ra mắt',
               `Bài hát "${song.title}" thuộc album chưa phát hành.\n\n⏰ Dự kiến: ${formattedDate}`,
               [{ text: 'Đã hiểu' }]
             );
          } else {
            // Show premium access modal
            setPremiumSong(song);
            setShowPremiumModal(true);
          }
          return;
        }
      }

      // Reset playback tracking for new song
      playStartTimeRef.current = Date.now();
      accumulatedDurationRef.current = 0;


      // Check if playing from album and if new song is from different album
      const isPlayingAlbum = await AsyncStorage.getItem('isPlayingAlbum');
      const currentAlbumId = await AsyncStorage.getItem('currentAlbumId');
      
      if (isPlayingAlbum === '1' && currentAlbumId) {
        // If new song is not from the same album, reset flag
        if (song.album_id?.toString() !== currentAlbumId) {
          await AsyncStorage.setItem('isPlayingAlbum', '0');
          await AsyncStorage.removeItem('currentAlbumId');
        }
      }

      // Check if playing from playlist and if new song is from different playlist
      const isPlayingPlaylist = await AsyncStorage.getItem('isPlayingPlaylist');
      const currentPlaylistId = await AsyncStorage.getItem('currentPlaylistId');
      
      if (isPlayingPlaylist === '1' && currentPlaylistId) {
        // Check if the song is from the same playlist
        let isFromSamePlaylist = false;
        
        // If playlistData is provided, check playlist_id
        if (playlistData?.playlist_id) {
          isFromSamePlaylist = playlistData.playlist_id.toString() === currentPlaylistId;
        }
        
        // If not from same playlist and songList is provided, check if song is in the list
        if (!isFromSamePlaylist && songList) {
          const songInList = songList.some(s => s.song_id === song.song_id);
          if (songInList) {
            // Song is in the provided list, assume it's from the same playlist
            isFromSamePlaylist = true;
          }
        }
        
        // If not from same playlist, reset flag
        if (!isFromSamePlaylist) {
          await AsyncStorage.setItem('isPlayingPlaylist', '0');
          await AsyncStorage.removeItem('currentPlaylistId');
        }
      }

      // Update currentSong immediately with full song data
      setCurrentSong(song);
      setIsPlaying(false); // Set to false first, will be set to true after sound loads
      
      // Set duration from song model (stored in seconds in database)
      if (song.duration) {
        const songDurationMs = song.duration * 1000; // Convert seconds to milliseconds
        setDuration(songDurationMs);
      }
      
      // Create history record immediately (with 0 duration)
      // This ensures the song appears in history even if user listens for a short time
      songService.playSong(song.song_id, 0, false).catch(err => console.error('Error creating history record:', err));

      // Check if a new request has started while we were processing
      if (requestId !== playbackRequestIdRef.current) {
        return;
      }

      // Create new player with the song source
      console.log('🎵 [playSongInternal] Creating new player for:', song.title);
      
      // 6. Load Sound (expo-av)
      console.log('🎵 [expo-av] Loading:', song.title);
      
      let uri = song.file_url;
      // AUTO-FIX: Convert AAC to MP3 via Cloudinary for better seeking on Android
      // Android MediaPlayer struggles with seeking streamed AAC files.
      // Cloudinary can transcode on-the-fly by simply changing the extension.
      if (typeof uri === 'string' && uri.includes('cloudinary.com') && uri.toLowerCase().endsWith('.aac')) {
         console.log('🎵 [fix-aac] Detected AAC on Cloudinary. Requesting MP3 version for seek stability.');
         uri = uri.replace(/\.aac$/i, '.mp3');
      }

      // Create sound with progress update interval
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: uri },
        { 
          shouldPlay: false,
          progressUpdateIntervalMillis: 1000, // Update every second
        }
      );
      
      playerRef.current = newSound;
      console.log('🎵 [playSongInternal] playerRef.current SET:', !!playerRef.current);
      
      // Setup status listener AFTER creating the sound
      setupPlayerStatusListener(newSound);
      
      // Check if a new request has started while we were loading
      if (requestId !== playbackRequestIdRef.current) {
        await newSound.unloadAsync();
        return;
      }
      
      // Play the sound
      await newSound.playAsync();
      setIsPlaying(true);

      if (songList) {
        // Filter out premium songs user doesn't have access to (async, but we'll do it in background)
        // For now, save all songs but check access when playing
        originalPlaylistRef.current = [...songList];
        
        // If shuffle is enabled, create a shuffled copy
        if (isShuffleRef.current) {
          const shuffled = [...songList].sort(() => Math.random() - 0.5);
          const shuffledIndex = shuffled.findIndex(s => s.song_id === song.song_id);
          setPlaylist(shuffled);
          setCurrentIndex(shuffledIndex >= 0 ? shuffledIndex : 0);
        } else {
          setPlaylist(songList);
          setCurrentIndex(index);
        }
      }

      if (playlistData) {
        setCurrentPlaylist(playlistData);
      } else {
        setCurrentPlaylist(null);
      }

      // Refresh song data after a delay to get updated listen_count and rating from backend
      // (Only updates after user has listened >50% of the song)
      setTimeout(() => {
        refreshCurrentSong(song.song_id);
      }, 1500);
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const playNext = async () => {
    // Use playlist from ref to avoid stale state in callbacks
    const currentPlaylist = playlistRef.current.length > 0 ? playlistRef.current : originalPlaylistRef.current;
    if (currentPlaylist.length === 0) {
      console.warn('No playlist available for next song');
      return;
    }
    
    // Use currentIndex from ref
    const idx = currentIndexRef.current >= 0 ? currentIndexRef.current : 0;
    await playNextAccessibleSong(currentPlaylist, idx);
  };

  const toggleRepeat = () => {
    setIsRepeat(prev => {
      const newValue = !prev;
      isRepeatRef.current = newValue;

      // If enabling repeat, disable shuffle
      if (newValue && isShuffleRef.current) {
        setIsShuffle(false);
        isShuffleRef.current = false;

         // Restore original playlist order (same logic as disabling shuffle)
         if (originalPlaylistRef.current.length > 0) {
            const currentSongId = currentSongRef.current?.song_id;
            const originalIndex = originalPlaylistRef.current.findIndex(s => s.song_id === currentSongId);
            setPlaylist(originalPlaylistRef.current);
            setCurrentIndex(originalIndex >= 0 ? originalIndex : 0);
          }
      }
      return newValue;
    });
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => {
      const newValue = !prev;
      isShuffleRef.current = newValue;
      
      if (playlist.length === 0) return newValue;
      
      // If enabling shuffle, shuffle the current playlist
      if (newValue) {
        // Save original if not already saved
        if (originalPlaylistRef.current.length === 0) {
          originalPlaylistRef.current = [...playlist];
        }
        
        const shuffled = [...playlist].sort(() => Math.random() - 0.5);
        // Find current song in shuffled list
        const currentSongId = currentSong?.song_id;
        const shuffledIndex = shuffled.findIndex(s => s.song_id === currentSongId);
        if (shuffledIndex >= 0) {
          setPlaylist(shuffled);
          setCurrentIndex(shuffledIndex);
        } else {
          setPlaylist(shuffled);
          setCurrentIndex(0);
        }
      } else {
        // If disabling shuffle, restore original order
        if (originalPlaylistRef.current.length > 0) {
          const currentSongId = currentSong?.song_id;
          const originalIndex = originalPlaylistRef.current.findIndex(s => s.song_id === currentSongId);
          setPlaylist(originalPlaylistRef.current);
          setCurrentIndex(originalIndex >= 0 ? originalIndex : 0);
        }
      }

      // If enabling shuffle, disable repeat
      if (newValue && isRepeatRef.current) {
        setIsRepeat(false);
        isRepeatRef.current = false;
      }
      
      return newValue;
    });
  };

  const playPrevious = async () => {
    const currentPlaylist = playlistRef.current.length > 0 ? playlistRef.current : originalPlaylistRef.current;
    if (currentPlaylist.length === 0) return;
    
    // Stop current song immediately
    await stopCurrentSong();
    
    let attempts = 0;
    const maxAttempts = currentPlaylist.length;
    
    while (attempts < maxAttempts) {
      let prevIndex;
      if (isShuffleRef.current) {
        // Shuffle mode: pick random song
        if (currentPlaylist.length > 1) {
          let randomIdx;
          do {
            randomIdx = Math.floor(Math.random() * currentPlaylist.length);
          } while (randomIdx === currentIndexRef.current);
          prevIndex = randomIdx;
        } else {
          prevIndex = 0;
        }
      } else {
        // Normal mode: play previous song in order
        const baseIndex = currentIndexRef.current === 0 ? currentPlaylist.length - 1 : currentIndexRef.current - 1;
        prevIndex = (baseIndex - attempts + currentPlaylist.length) % currentPlaylist.length;
      }
      
      const prevSong = currentPlaylist[prevIndex];
      const accessInfo = await checkSongAccess(prevSong);
      
      if (accessInfo.hasAccess) {
        await playSongInternal(prevSong, currentPlaylist, prevIndex, null, true);
        return;
      }
      
      attempts++;
    }
    
    console.warn('No accessible songs found in playlist');
  };

  const seekTo = async (value) => {
    console.log('🎯 [seekTo] ===== START SEEK =====');
    console.log('🎯 [seekTo] Input value:', value, 'ms');
    console.log('🎯 [seekTo] Current position state:', position, 'ms');
    console.log('🎯 [seekTo] Current isPlaying:', isPlaying);
    
    if (!playerRef.current) {
      console.log('❌ [seekTo] No player ref, returning');
      return;
    }

    try {
      // Set seeking flag to prevent position updates and false finish detection
      isSeekingRef.current = true;
      console.log('🎯 [seekTo] Seeking flag set to true');
      
      // Get duration from database (currentSong.duration)
      const songDuration = currentSongRef.current?.duration || 0;
      console.log('🎯 [seekTo] Song duration from DB:', songDuration);
      
      // Convert to milliseconds if stored in seconds (duration < 10000 means it's in seconds)
      const durationMs = songDuration > 10000 ? songDuration : songDuration * 1000;
      const durationSeconds = durationMs / 1000;
      console.log('🎯 [seekTo] Duration in ms:', durationMs, 'Duration in seconds:', durationSeconds);
      
      // expo-av setPositionAsync uses MILLISECONDS, slider also uses MILLISECONDS
      const valueMs = Math.floor(value);
      console.log('🎯 [seekTo] Value in ms:', valueMs);
      
      // Validate seek position
      if (durationSeconds <= 0) {
        console.log('❌ [seekTo] No duration in database, cannot seek');
        isSeekingRef.current = false;
        return;
      }
      
      // Clamp seek position to valid range (in milliseconds)
      const clampedValueMs = Math.max(0, Math.min(valueMs, durationMs - 500));
      console.log('🎯 [seekTo] Clamped value (ms):', clampedValueMs);
      
      // Store seeked position for validation
      lastSeekedPositionRef.current = clampedValueMs;
      
      // Get current playing state
      const status = await playerRef.current.getStatusAsync();
      const wasPlaying = status.isLoaded && status.isPlaying;
      console.log('🎯 [seekTo] Was playing before seek:', wasPlaying);
      
      // Pause before seeking to prevent stale position updates
      if (wasPlaying) {
        console.log('🎯 [seekTo] Pausing player...');
        await playerRef.current.pauseAsync();
        setIsPlaying(false);
        console.log('🎯 [seekTo] Player paused');
      }
      
      // Seek to position (expo-av uses milliseconds)
      console.log('🎯 [seekTo] Calling playerRef.current.setPositionAsync(', clampedValueMs, 'ms)');
      await playerRef.current.setPositionAsync(clampedValueMs);
      console.log('🎯 [seekTo] Seek command completed');
      
      // Update position immediately
      console.log('🎯 [seekTo] Setting position state to:', clampedValueMs, 'ms');
      setPosition(clampedValueMs);
      
      // Resume playback if it was playing before
      if (wasPlaying) {
        console.log('🎯 [seekTo] Resuming playback...');
        await playerRef.current.playAsync();
        setIsPlaying(true);
        console.log('🎯 [seekTo] Playback resumed');
      }
      
      // Reset seeking flag after a short delay to allow player to stabilize
      // Keep lastSeekedPositionRef for validation - it will be cleared when we get a valid update
      setTimeout(() => {
        console.log('🎯 [seekTo] Resetting seeking flag after 300ms');
        isSeekingRef.current = false;
        console.log('🎯 [seekTo] ===== END SEEK =====');
      }, 300);
    } catch (error) {
      console.error('❌ [seekTo] Error seeking:', error);
      console.error('❌ [seekTo] Error stack:', error.stack);
      isSeekingRef.current = false;
    }
  };

  // stopPlayer Function - FIXED with REF usage
  const stopPlayer = async () => {
    try {
      // 1. Pause and unload player immediately
      const oldPlayer = playerRef.current;
      if (oldPlayer) {
        try {
          await oldPlayer.pauseAsync();
          await oldPlayer.unloadAsync();
        } catch (e) {
          console.error('Error stopping player:', e);
        }
      }

      // 2. Calculate final duration
      // USE REF to ensure we get the song even if state is cleared/stale
      const oldSong = currentSongRef.current; 
      
      let finalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        finalDuration += (Date.now() - playStartTimeRef.current);
      }
      const finalDurationSeconds = Math.floor(finalDuration / 1000);
      
      // 3. Record listening history IMMEDIATELY
      if (oldSong) {
        const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
        const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
        const isCompleted = listenPercentage >= 0.9;
        
        console.log('🎵 [stopPlayer] Saving history', {
          song: oldSong.title,
          duration: finalDurationSeconds,
          completed: isCompleted
        });
        
        songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted)
          .catch(err => console.error('❌ Error saving history in stopPlayer:', err));
      }

      // 4. Reset UI and cleanup
      setCurrentSong(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setPlaylist([]);
      setCurrentIndex(-1);
      setCurrentPlaylist(null);
      
      // Reset tracking refs
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
      lastRecordedSongRef.current = null;
      console.log('⚠️ [stopPlayer] Setting playerRef.current = null');
      playerRef.current = null;
      
      // Player already unloaded above, no additional cleanup needed
      
      // Remove flags
      AsyncStorage.setItem('isPlayingAlbum', '0').catch(() => {});
      AsyncStorage.removeItem('currentAlbumId').catch(() => {});
      AsyncStorage.setItem('isPlayingPlaylist', '0').catch(() => {});
      AsyncStorage.removeItem('currentPlaylistId').catch(() => {});

    } catch (error) {
      console.error('Error stopping player:', error);
    }
  };

  const refreshCurrentSong = async (songId = null) => {
    const idToRefresh = songId || currentSong?.song_id;
    if (!idToRefresh) return;
    
    try {
      const response = await songService.getSongById(idToRefresh);
      if (response.success && response.data) {
        setCurrentSong((prev) => {
          // Only update if this is still the current song
          if (prev?.song_id === idToRefresh) {
            return {
              ...prev,
              ...response.data,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error refreshing song:', error);
    }
  };

  // Move song in playlist to new position
  const moveSongInPlaylist = (fromIndex, toIndex) => {
    if (!playlist || playlist.length === 0) return;
    if (fromIndex < 0 || fromIndex >= playlist.length) return;
    if (toIndex < 0 || toIndex >= playlist.length) return;
    if (fromIndex === toIndex) return;

    const newPlaylist = [...playlist];
    const [movedSong] = newPlaylist.splice(fromIndex, 1);
    newPlaylist.splice(toIndex, 0, movedSong);

    // Update current index if needed
    let newCurrentIndex = currentIndex;
    if (currentIndex === fromIndex) {
      newCurrentIndex = toIndex;
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      newCurrentIndex = currentIndex - 1;
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      newCurrentIndex = currentIndex + 1;
    }

    setPlaylist(newPlaylist);
    setCurrentIndex(newCurrentIndex);
    originalPlaylistRef.current = newPlaylist;
  };

  const handlePurchaseSong = () => {
    setShowPremiumModal(false);
    setPurchaseSong(premiumSong);
    setShowPurchaseModal(true);
  };

  const handleSubscribePremium = () => {
    setShowPremiumModal(false);
    // Navigation will be handled by the modal using useNavigation
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    setPurchaseSong(null);
    // Retry playing the song after purchase
    if (premiumSong) {
      playSongInternal(premiumSong, null, 0, null, true);
    }
  };

  // Sleep Timer Logic
  const startSleepTimer = (minutes) => {
    // Clear existing timer if any
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }

    if (minutes <= 0) {
      setSleepTimerTarget(null);
      return;
    }

    const durationMs = minutes * 60 * 1000;
    const targetTime = Date.now() + durationMs;
    
    setSleepTimerTarget(targetTime);
    
    console.log(`⏰ [SleepTimer] Set for ${minutes} minutes. Ends at: ${new Date(targetTime).toLocaleTimeString()}`);

    sleepTimerRef.current = setTimeout(async () => {
      console.log('⏰ [SleepTimer] Time up! Pausing player.');
      // Stop timer first
      setSleepTimerTarget(null);
      
      // PAUSE instead of STOP
      if (playerRef.current) {
         try {
           const status = await playerRef.current.getStatusAsync();
           if (status.isPlaying) {
             // Use togglePlayPause logic but force pause
             if (playStartTimeRef.current) {
                const playDuration = Date.now() - playStartTimeRef.current;
                accumulatedDurationRef.current += playDuration;
                playStartTimeRef.current = null;
             }
             await playerRef.current.pauseAsync();
             setIsPlaying(false);
           }
         } catch (e) {
           console.error('Error pausing in Sleep Timer:', e);
         }
      }
      // Do NOT call stopPlayer() to keep UI state
      // stopPlayer(); 
    }, durationMs);
  };

  const cancelSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerTarget(null);
    console.log('⏰ [SleepTimer] Cancelled');
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  // Optimize Context Values
  // Main player state (excluding fast-changing progress)
  const playerState = React.useMemo(() => ({
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    currentPlaylist,
    isRepeat,
    isShuffle,
    showPremiumModal,
    premiumSong,
    showPurchaseModal,
    purchaseSong,
    sleepTimerTarget,
  }), [
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    currentPlaylist,
    isRepeat,
    isShuffle,
    showPremiumModal,
    premiumSong,
    showPurchaseModal,
    purchaseSong,
    sleepTimerTarget,
  ]);

  // Progress state (updates every second)
  const playerProgress = React.useMemo(() => ({
    position,
    duration,
  }), [position, duration]);

  // Update playlist with new order (e.g. from drag and drop)
  const updatePlaylist = (newPlaylist) => {
    if (!newPlaylist || !Array.isArray(newPlaylist)) return;
    
    // Update playlist state and refs
    setPlaylist(newPlaylist);
    originalPlaylistRef.current = [...newPlaylist];
    playlistRef.current = newPlaylist;
    
    // Update current index to match new position of current song
    if (currentSongRef.current) {
      const newIndex = newPlaylist.findIndex(s => s.song_id === currentSongRef.current.song_id);
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
        currentIndexRef.current = newIndex;
      }
    }
  };

  const playerActions = React.useMemo(() => ({
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    stopPlayer,
    refreshCurrentSong,
    moveSongInPlaylist,
    updatePlaylist,
    setShowPremiumModal,
    setShowPurchaseModal,
    startSleepTimer,
    cancelSleepTimer,
  }), []); // Actions should be stable

  const contextValue = React.useMemo(() => ({
    ...playerState,
    ...playerActions,
  }), [playerState, playerActions]);

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerProgressContext.Provider value={playerProgress}>
        {children}
        <PremiumAccessModal
          visible={showPremiumModal}
          song={premiumSong}
          onClose={() => {
            setShowPremiumModal(false);
            setPremiumSong(null);
          }}
          onPurchaseSong={handlePurchaseSong}
          onSubscribePremium={handleSubscribePremium}
          playSong={playSong}
        />
        <SongPurchaseModal
          visible={showPurchaseModal}
          song={purchaseSong}
          onClose={() => {
            setShowPurchaseModal(false);
            setPurchaseSong(null);
          }}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
};
