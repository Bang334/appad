import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
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
  
  const soundRef = useRef(null);
  // positionInterval removed
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

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    // Configure audio mode for background playback
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Record listening data for current song before switching
  const recordListeningData = async () => {

    
    if (!currentSong) {
      return;
    }
    
    try {
      // Calculate total duration listened using our tracked time
      let totalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        const currentPlayDuration = Date.now() - playStartTimeRef.current;
        totalDuration += currentPlayDuration;
      }
      
      // Convert to seconds
      const durationSeconds = Math.floor(totalDuration / 1000);
      
      console.log('🎵 [recordListeningData] Recording listening data', {
        songId: currentSong.song_id,
        songTitle: currentSong.title,
        accumulatedDurationRef: accumulatedDurationRef.current,
        playStartTimeRef: playStartTimeRef.current,
        totalDuration: totalDuration,
        durationSeconds: durationSeconds,
      });
      
      // We now record even short listens (backend handles the count increment logic)
      // The backend will only increment listen_count if percentage > 50%
      // But it will always update total_duration and history record
      
      // Calculate listen percentage
      const songDurationSeconds = Math.floor((duration || currentSong.duration || 0) / 1000);
      const listenPercentage = songDurationSeconds > 0 ? durationSeconds / songDurationSeconds : 0;
      
      // Determine if completed (>=90% of song duration)
      const isCompleted = listenPercentage >= 0.9;
      
      console.log('🎵 [recordListeningData] Sending to backend', {
        songId: currentSong.song_id,
        durationSeconds: durationSeconds,
        songDurationSeconds: songDurationSeconds,
        listenPercentage: listenPercentage,
        isCompleted: isCompleted,
      });
      
      // Send to backend
      const result = await songService.playSong(currentSong.song_id, durationSeconds, isCompleted);
      
      console.log('🎵 [recordListeningData] Backend response:', result);
      
      // Reset tracking (allow same song to be tracked again if user replays it)
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
    } catch (error) {
      console.error('❌ Error recording listening data:', error);
    }
  };

  const checkSongAccess = async (song) => {
    // If not premium song, everyone can access
    if (!song.is_premium || song.is_premium === 0) {
      return { hasAccess: true };
    }

    try {
      const response = await premiumService.checkSongAccess(song.song_id);
      if (response.success && response.data) {
        return response.data;
      }
      return { hasAccess: false, reason: 'Cannot check access' };
    } catch (error) {
      console.error('Error checking song access:', error);
      // If error, assume no access for premium songs
      return { hasAccess: false, reason: 'Error checking access' };
    }
  };

  const playSong = async (song, songList = null, index = 0, playlistData = null) => {
    await playSongInternal(song, songList, index, playlistData, false);
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        // Pausing - accumulate current play duration
        if (playStartTimeRef.current) {
          const playDuration = Date.now() - playStartTimeRef.current;
          accumulatedDurationRef.current += playDuration;

          playStartTimeRef.current = null;
        }
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // Resuming - start new play session
        playStartTimeRef.current = Date.now();

        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Helper function to stop current song immediately
  const stopCurrentSong = async () => {
    try {
      setPosition(0);
      setIsPlaying(false);
      
      if (soundRef.current) {
        const sound = soundRef.current;
        soundRef.current = null;
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
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
        nextIndex = Math.floor(Math.random() * songList.length);
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
      
      console.log('🎵 [playSongInternal] Calculating duration for old song', {
        oldSongId: currentSong?.song_id,
        oldSongTitle: currentSong?.title,
        newSongId: song.song_id,
        newSongTitle: song.title,
        accumulatedDurationRef: accumulatedDurationRef.current,
        playStartTimeRef: playStartTimeRef.current,
        finalDuration: finalDuration,
        finalDurationSeconds: finalDurationSeconds,
      });
      
      // 2. Capture old song and sound for background processing
      const oldSong = currentSong;
      const oldSound = soundRef.current;
      
      // 3. Reset UI and Refs IMMEDIATELY
      setPosition(0);
      setIsPlaying(false);
      
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
      soundRef.current = null; // Detach old sound immediately

      // 4. Process old song cleanup and recording in BACKGROUND (Fire and Forget)
      (async () => {
        try {
          // Unload old sound
          if (oldSound) {
            await oldSound.unloadAsync();
          }
          
          // Record history if we had a song and it's different
          if (oldSong && oldSong.song_id !== song.song_id) {
             const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
             const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
             const isCompleted = listenPercentage >= 0.9;
             
             console.log('🎵 [playSongInternal] Recording history for old song', {
               oldSongId: oldSong.song_id,
               oldSongTitle: oldSong.title,
               finalDurationSeconds: finalDurationSeconds,
               songDurationSeconds: songDurationSeconds,
               listenPercentage: listenPercentage,
               isCompleted: isCompleted,
             });
             
             const result = await songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted);
             console.log('🎵 [playSongInternal] History recorded result:', result);
          } else {
            console.log('🎵 [playSongInternal] Skipping history record', {
              hasOldSong: !!oldSong,
              oldSongId: oldSong?.song_id,
              newSongId: song.song_id,
              isSameSong: oldSong?.song_id === song.song_id,
            });
          }
        } catch (err) {
          console.error('❌ [playSongInternal] Background cleanup error:', err);
        }
      })();
      
      // 5. Continue loading new song immediately
      
      // Check access before playing (unless skipped)
      if (!skipAccessCheck) {
        const accessInfo = await checkSongAccess(song);
        if (!accessInfo.hasAccess) {
          // Show premium access modal
          setPremiumSong(song);
          setShowPremiumModal(true);
          return;
        }
      }

      // Stop current song if playing (already handled above, but keeping for safety/cleanup of any new sound that might have crept in, though unlikely with requestId check)
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
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
      
      // Create history record immediately (with 0 duration)
      // This ensures the song appears in history even if user listens for a short time
      songService.playSong(song.song_id, 0, false).catch(err => console.error('Error creating history record:', err));

      // Load new song
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.file_url },
        { shouldPlay: true }
      );

      // Check if a new request has started while we were loading
      if (requestId !== playbackRequestIdRef.current) {
        // A new request has started, so unload this sound immediately and don't update state
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
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

      // Get duration
      const status = await sound.getStatusAsync();
      setDuration(status.durationMillis || 0);

      // Update position
      // startPositionTracking(); // Removed in favor of setOnPlaybackStatusUpdate

      // Set progress update interval to 1 second
      await sound.setProgressUpdateIntervalAsync(1000);

      // Handle playback status
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
        }

        if (status.didJustFinish) {
          // CRITICAL: Use currentSongRef instead of currentSong state
          // because state might have been reset by playSongInternal before this callback runs
          const finishedSong = currentSongRef.current;
          let finalDuration = accumulatedDurationRef.current;
          if (playStartTimeRef.current) {
            const finalPlayDuration = Date.now() - playStartTimeRef.current;
            finalDuration += finalPlayDuration;
          }
          const finalDurationSeconds = Math.floor(finalDuration / 1000);
          
          // Get actual song duration from sound status (most accurate)
          // status.durationMillis is in milliseconds, convert to seconds
          const actualSongDurationMs = status.durationMillis || 0;
          const actualSongDurationSeconds = Math.floor(actualSongDurationMs / 1000);
          
          // Fallback: use finishedSong.duration or duration state if sound status doesn't have it
          let songDurationSeconds = actualSongDurationSeconds;
          if (songDurationSeconds === 0) {
            // Try to get from finishedSong.duration (could be in seconds or milliseconds)
            const songDuration = finishedSong?.duration || 0;
            if (songDuration > 10000) {
              // Likely in milliseconds
              songDurationSeconds = Math.floor(songDuration / 1000);
            } else if (songDuration > 0) {
              // Likely in seconds
              songDurationSeconds = songDuration;
            } else {
              // Last fallback: use duration state
              songDurationSeconds = Math.floor((duration || 0) / 1000);
            }
          }
          
          console.log('🎵 [AUTO-FINISH] Song finished automatically', {
            finishedSongId: finishedSong?.song_id,
            finishedSongTitle: finishedSong?.title,
            currentSongState: currentSong?.song_id,
            currentSongRef: currentSongRef.current?.song_id,
            playStartTimeRef: playStartTimeRef.current,
            accumulatedDurationBefore: accumulatedDurationRef.current,
            finalDuration: finalDuration,
            finalDurationSeconds: finalDurationSeconds,
            actualSongDurationMs: actualSongDurationMs,
            actualSongDurationSeconds: actualSongDurationSeconds,
            songDurationSeconds: songDurationSeconds,
          });
          
          // Update accumulatedDurationRef for potential use in playSongInternal
          if (playStartTimeRef.current) {
            accumulatedDurationRef.current = finalDuration;
            playStartTimeRef.current = null;
          }
          
          // Calculate listen percentage and completion status
          const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
          const isCompleted = listenPercentage >= 0.9;
          
          if (isRepeatRef.current) {
            // Repeat current song - record duration first, then reset and replay
            // Use captured finishedSong and finalDuration instead of recordListeningData()
            // because currentSong state might have been reset
            if (finishedSong && finalDurationSeconds > 0) {
              console.log('🎵 [AUTO-FINISH] Recording history for repeated song', {
                finishedSongId: finishedSong.song_id,
                finishedSongTitle: finishedSong.title,
                finalDurationSeconds: finalDurationSeconds,
                songDurationSeconds: songDurationSeconds,
                listenPercentage: listenPercentage,
                isCompleted: isCompleted,
              });
              
              // Record in background (fire and forget) so it doesn't block replay
              songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
                .then(result => {
                  console.log('🎵 [AUTO-FINISH] History recorded for repeated song:', result);
                })
                .catch(err => {
                  console.error('❌ [AUTO-FINISH] Error recording history for repeated song:', err);
                });
            }
            
            // Reset and replay
            if (soundRef.current) {
              try {
                playStartTimeRef.current = Date.now();
                accumulatedDurationRef.current = 0;
                await soundRef.current.setPositionAsync(0);
                await soundRef.current.playAsync();
              } catch (error) {
                console.error('Error repeating song:', error);
              }
            }
          } else {
            // Record history for finished song BEFORE calling playNext
            // This ensures we have the song data before it gets reset
            if (finishedSong && finalDurationSeconds > 0) {
              console.log('🎵 [AUTO-FINISH] Recording history for finished song BEFORE playNext', {
                finishedSongId: finishedSong.song_id,
                finishedSongTitle: finishedSong.title,
                finalDurationSeconds: finalDurationSeconds,
                songDurationSeconds: songDurationSeconds,
                listenPercentage: listenPercentage,
                isCompleted: isCompleted,
              });
              
              // Record in background (fire and forget) so it doesn't block playNext
              songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
                .then(result => {
                  console.log('🎵 [AUTO-FINISH] History recorded result:', result);
                })
                .catch(err => {
                  console.error('❌ [AUTO-FINISH] Error recording history:', err);
                });
            } else {
              console.log('🎵 [AUTO-FINISH] Skipping history record', {
                hasFinishedSong: !!finishedSong,
                finalDurationSeconds: finalDurationSeconds,
              });
            }
            
            // Now play next song
            console.log('🎵 [AUTO-FINISH] Calling playNext()');
            playNext();
          }
        }
      });

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
        prevIndex = Math.floor(Math.random() * currentPlaylist.length);
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
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(value);
      setPosition(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // startPositionTracking and stopPositionTracking removed

  const stopPlayer = async () => {
    try {
      // 1. Capture data for background recording BEFORE resetting
      const oldSong = currentSong;
      let finalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        finalDuration += (Date.now() - playStartTimeRef.current);
      }
      const finalDurationSeconds = Math.floor(finalDuration / 1000);
      const oldSound = soundRef.current;
      
      // 2. Reset UI IMMEDIATELY (no await)
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
      soundRef.current = null;
      
      // 3. Process cleanup and recording in BACKGROUND (Fire and Forget)
      (async () => {
        try {
          // Record listening data in background
          if (oldSong) {
            const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
            const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
            const isCompleted = listenPercentage >= 0.9;
            
            await songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted);
          }
          
          // Unload old sound
          if (oldSound) {
            await oldSound.stopAsync().catch(() => {});
            await oldSound.unloadAsync().catch(() => {});
          }
          
          // Reset flags
          await AsyncStorage.setItem('isPlayingAlbum', '0').catch(() => {});
          await AsyncStorage.removeItem('currentAlbumId').catch(() => {});
          await AsyncStorage.setItem('isPlayingPlaylist', '0').catch(() => {});
          await AsyncStorage.removeItem('currentPlaylistId').catch(() => {});
        } catch (err) {
          console.error('Background cleanup error:', err);
        }
      })();
    } catch (error) {
      console.error('Error stopping player:', error);
    }
  };

  // Refresh current song data from API
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
      setPremiumSong(null);
    }
  };

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
  ]);

  // Progress state (updates every second)
  const playerProgress = React.useMemo(() => ({
    position,
    duration,
  }), [position, duration]);

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
    setShowPremiumModal,
    setShowPurchaseModal,
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

