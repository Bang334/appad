import { StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from './theme';

export const GlobalStyles = StyleSheet.create({
  // Layouts
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: SIZES.md,
  },

  // Sections
  section: {
    marginVertical: 16,
    marginRight: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Trending / Carousel Items
  trendingItem: {
    width: 112,
    marginLeft: SIZES.padding,
  },
  trendingImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  trendingImage: {
    width: 112,
    height: 112,
    borderRadius: SIZES.borderRadius,
  },
  trendingPlayingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  trendingArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },

  // Song Items (List View)
  songItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 380,
    marginBottom: 4,
    marginLeft: 3,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    gap: 12,
  },
  songItemActive: {
    borderColor: COLORS.primary,
  },
  songContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  // Song Inner Elements
  coverContainer: {
    position: 'relative',
    marginRight: 12,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
    minWidth: 150,
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  
  // Meta Info
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#CBD5F5',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  metaSeparator: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
    marginHorizontal: 4,
  },
  ratingText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  playButton: {
    padding: 4,
  },
  addButton: {
    padding: 8,
    marginRight: SIZES.padding,
  },

  // Badges
  premiumBadge: {
    marginLeft: 6,
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  purchasedText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
  },
  albumPremiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
  },
  albumSongCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  albumSongCountText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
});
