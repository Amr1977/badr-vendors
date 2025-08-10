-- =====================================================
-- DROP OLD SCHEMA - BADR VENDORS MICROSERVICE
-- Use this script to clean up old tables before applying new schema
-- =====================================================

-- Drop all triggers first (if they exist)
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors CASCADE;
DROP TRIGGER IF EXISTS update_vendor_branches_updated_at ON vendor_branches CASCADE;
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items CASCADE;
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers CASCADE;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews CASCADE;
DROP TRIGGER IF EXISTS update_review_replies_updated_at ON review_replies CASCADE;
DROP TRIGGER IF EXISTS update_vendor_operating_hours_updated_at ON vendor_operating_hours CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS review_likes CASCADE;
DROP TABLE IF EXISTS review_replies CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS vendor_branches CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining objects that might exist
DROP TABLE IF EXISTS business_hours_template CASCADE;
DROP TABLE IF EXISTS vendor_operating_hours CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS schema_version CASCADE;

-- Drop any sequences that might have been created
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS roles_id_seq CASCADE;
DROP SEQUENCE IF EXISTS vendors_id_seq CASCADE;
DROP SEQUENCE IF EXISTS vendor_branches_id_seq CASCADE;
DROP SEQUENCE IF EXISTS menu_items_id_seq CASCADE;
DROP SEQUENCE IF EXISTS offers_id_seq CASCADE;
DROP SEQUENCE IF EXISTS favorites_id_seq CASCADE;
DROP SEQUENCE IF EXISTS reviews_id_seq CASCADE;
DROP SEQUENCE IF EXISTS review_replies_id_seq CASCADE;
DROP SEQUENCE IF EXISTS review_likes_id_seq CASCADE;
DROP SEQUENCE IF EXISTS business_hours_template_id_seq CASCADE;
DROP SEQUENCE IF EXISTS vendor_operating_hours_id_seq CASCADE;
DROP SEQUENCE IF EXISTS menu_categories_id_seq CASCADE;
DROP SEQUENCE IF EXISTS schema_version_id_seq CASCADE;

-- Drop any indexes that might exist
DROP INDEX IF EXISTS idx_users_email CASCADE;
DROP INDEX IF EXISTS idx_users_phone CASCADE;
DROP INDEX IF EXISTS idx_users_active CASCADE;
DROP INDEX IF EXISTS idx_users_verified CASCADE;
DROP INDEX IF EXISTS idx_vendors_user_id CASCADE;
DROP INDEX IF EXISTS idx_vendors_status CASCADE;
DROP INDEX IF EXISTS idx_vendors_active CASCADE;
DROP INDEX IF EXISTS idx_vendors_commercial_reg CASCADE;
DROP INDEX IF EXISTS idx_branches_vendor_id CASCADE;
DROP INDEX IF EXISTS idx_branches_location CASCADE;
DROP INDEX IF EXISTS idx_branches_active CASCADE;
DROP INDEX IF EXISTS idx_menu_items_branch_id CASCADE;
DROP INDEX IF EXISTS idx_menu_items_category CASCADE;
DROP INDEX IF EXISTS idx_menu_items_price CASCADE;
DROP INDEX IF EXISTS idx_menu_items_available CASCADE;
DROP INDEX IF EXISTS idx_menu_items_search CASCADE;
DROP INDEX IF EXISTS idx_offers_branch_id CASCADE;
DROP INDEX IF EXISTS idx_offers_dates CASCADE;
DROP INDEX IF EXISTS idx_offers_active CASCADE;
DROP INDEX IF EXISTS idx_offers_discount CASCADE;
DROP INDEX IF EXISTS idx_reviews_user_id CASCADE;
DROP INDEX IF EXISTS idx_reviews_branch_id CASCADE;
DROP INDEX IF EXISTS idx_reviews_rating CASCADE;
DROP INDEX IF EXISTS idx_reviews_type CASCADE;
DROP INDEX IF EXISTS idx_reviews_created CASCADE;
DROP INDEX IF EXISTS idx_favorites_user_id CASCADE;
DROP INDEX IF EXISTS idx_favorites_type CASCADE;

-- Clean up any remaining objects
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any remaining tables that might exist
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop any remaining sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop any remaining functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;

-- Reset the database to a clean state
SELECT 'Old schema dropped successfully! Database is now clean and ready for new schema.' as status;
