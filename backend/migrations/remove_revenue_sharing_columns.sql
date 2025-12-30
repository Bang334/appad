-- Migration: Remove unnecessary columns from revenue_sharing table and allow artist_id to be NULL
-- Date: 2024
-- Description: 
-- 1. Remove platform_percentage, calculation_period, stream_count, listen_duration, is_paid_to_artist, paid_at
-- 2. Allow artist_id to be NULL (for premium subscriptions that don't have a specific artist)

-- Remove columns from revenue_sharing table
ALTER TABLE revenue_sharing
DROP COLUMN IF EXISTS platform_percentage,
DROP COLUMN IF EXISTS calculation_period,
DROP COLUMN IF EXISTS stream_count,
DROP COLUMN IF EXISTS listen_duration,
DROP COLUMN IF EXISTS is_paid_to_artist,
DROP COLUMN IF EXISTS paid_at;

-- Allow artist_id to be NULL (for premium subscriptions)
ALTER TABLE revenue_sharing
MODIFY COLUMN artist_id int DEFAULT NULL;

