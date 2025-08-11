-- =====================================================
-- BADR DELIVERY PLATFORM - VENDORS MICROSERVICE SCHEMA
-- Production-Ready Database Schema v2.0
-- =====================================================

-- Enable UUID extension for better security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================

-- Users table with enhanced security and profile fields
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Stores bcrypt hashed passwords
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_picture VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) >= 2)
);

-- Roles table for user permissions
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB, -- Store permissions as JSON for flexibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- =====================================================
-- VENDOR MANAGEMENT TABLES
-- =====================================================

-- Vendors table with comprehensive business information
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    commercial_registration VARCHAR(255) UNIQUE NOT NULL,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    business_address TEXT,
    business_description TEXT,
    business_hours JSONB, -- Store hours as JSON for flexibility
    payment_methods JSONB, -- Store accepted payment methods
    delivery_radius DECIMAL(8,2), -- Delivery radius in kilometers
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected', 'suspended')),
    approval_date TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_business_phone CHECK (business_phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_business_email CHECK (business_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_delivery_radius CHECK (delivery_radius > 0),
    CONSTRAINT valid_minimum_order CHECK (minimum_order_amount >= 0)
);

-- Vendor branches with location and operational data
CREATE TABLE IF NOT EXISTS vendor_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    business_hours JSONB, -- Store hours as JSON
    is_active BOOLEAN DEFAULT TRUE,
    is_main_branch BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT valid_contact_phone CHECK (contact_phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_contact_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- MENU & OFFER MANAGEMENT TABLES
-- =====================================================

-- Menu categories for better organization
CREATE TABLE IF NOT EXISTS menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon identifier for UI
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items with enhanced details
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES vendor_branches(id) ON DELETE CASCADE,
    category_id INT REFERENCES menu_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2), -- For discounted items
    image_path VARCHAR(255),
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_halal BOOLEAN DEFAULT FALSE,
    allergens JSONB, -- Store allergen information
    nutritional_info JSONB, -- Store nutritional data
    preparation_time INT, -- Preparation time in minutes
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price > 0),
    CONSTRAINT valid_original_price CHECK (original_price IS NULL OR original_price > 0),
    CONSTRAINT valid_preparation_time CHECK (preparation_time IS NULL OR preparation_time > 0)
);

-- Offers and promotions
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES vendor_branches(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_one_get_one', 'free_delivery')),
    discount_value DECIMAL(10,2), -- Percentage or fixed amount
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    maximum_discount DECIMAL(10,2), -- Maximum discount cap
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_limit INT, -- Maximum number of uses
    current_usage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (start_date < end_date),
    CONSTRAINT valid_discount_value CHECK (discount_value > 0),
    CONSTRAINT valid_minimum_order CHECK (minimum_order_amount >= 0),
    CONSTRAINT valid_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0),
    CONSTRAINT valid_current_usage CHECK (current_usage >= 0 AND (usage_limit IS NULL OR current_usage <= usage_limit))
);

-- =====================================================
-- CUSTOMER INTERACTION TABLES
-- =====================================================

-- Customer favorites with flexible entity support
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES vendor_branches(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('branch', 'menu_item', 'offer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one reference type per record
    CONSTRAINT single_favorite_reference CHECK (
        (type = 'branch' AND branch_id IS NOT NULL AND menu_item_id IS NULL AND offer_id IS NULL) OR
        (type = 'menu_item' AND menu_item_id IS NOT NULL AND branch_id IS NULL AND offer_id IS NULL) OR
        (type = 'offer' AND offer_id IS NOT NULL AND branch_id IS NULL AND menu_item_id IS NULL)
    ),
    
    -- Prevent duplicate favorites
    CONSTRAINT unique_favorite UNIQUE (user_id, branch_id, menu_item_id, offer_id, type)
);

-- Reviews and ratings system
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES vendor_branches(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    order_id UUID, -- Reference to order (when order system is implemented)
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('branch', 'menu_item', 'offer', 'overall')),
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Ensure only one reference type per review
    CONSTRAINT single_review_reference CHECK (
        (type = 'branch' AND branch_id IS NOT NULL AND menu_item_id IS NULL AND offer_id IS NULL) OR
        (type = 'menu_item' AND menu_item_id IS NOT NULL AND branch_id IS NULL AND offer_id IS NULL) OR
        (type = 'offer' AND offer_id IS NOT NULL AND branch_id IS NULL AND menu_item_id IS NULL) OR
        (type = 'overall' AND branch_id IS NOT NULL AND menu_item_id IS NULL AND offer_id IS NULL)
    )
);

-- Review replies for vendor/customer responses
CREATE TABLE IF NOT EXISTS review_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_vendor_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Review likes/dislikes
CREATE TABLE IF NOT EXISTS review_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate likes/dislikes
    UNIQUE (review_id, user_id)
);

-- =====================================================
-- OPERATIONAL TABLES
-- =====================================================

-- Business hours template
CREATE TABLE IF NOT EXISTS business_hours_template (
    id SERIAL PRIMARY KEY,
    day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    break_start TIME, -- For lunch breaks
    break_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor operating hours
CREATE TABLE IF NOT EXISTS vendor_operating_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES vendor_branches(id) ON DELETE CASCADE,
    day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    break_start TIME,
    break_end TIME,
    is_override BOOLEAN DEFAULT FALSE, -- Override default template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified) WHERE is_verified = TRUE;

-- Vendor management indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(registration_status);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vendors_commercial_reg ON vendors(commercial_registration);

-- Branch management indexes
CREATE INDEX IF NOT EXISTS idx_branches_vendor_id ON vendor_branches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_branches_location ON vendor_branches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_branches_active ON vendor_branches(is_active) WHERE is_active = TRUE;

-- Menu management indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_branch_id ON menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_price ON menu_items(price);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_menu_items_search ON menu_items(branch_id, name, description);

-- Offer management indexes
CREATE INDEX IF NOT EXISTS idx_offers_branch_id ON offers(branch_id);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_offers_discount ON offers(discount_type, discount_value);

-- Review and rating indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_branch_id ON reviews(branch_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(type);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System administrator with full access', '{"all": true}'),
('vendor', 'Vendor with business management access', '{"vendor_management": true, "menu_management": true, "order_management": true}'),
('customer', 'Customer with ordering and review access', '{"order_placement": true, "reviews": true, "favorites": true}'),
('delivery_partner', 'Delivery partner with order delivery access', '{"order_delivery": true, "route_management": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default menu categories
INSERT INTO menu_categories (name, description, icon, sort_order) VALUES
('Appetizers', 'Starters and small plates', '🍽️', 1),
('Main Course', 'Primary dishes', '🍖', 2),
('Desserts', 'Sweet treats and desserts', '🍰', 3),
('Beverages', 'Drinks and refreshments', '🥤', 4),
('Sides', 'Side dishes and accompaniments', '🥗', 5)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_branches_updated_at BEFORE UPDATE ON vendor_branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_replies_updated_at BEFORE UPDATE ON review_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_operating_hours_updated_at BEFORE UPDATE ON vendor_operating_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCHEMA VERSION TRACKING
-- =====================================================

-- Create schema version table for migration tracking
CREATE TABLE IF NOT EXISTS schema_version (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    checksum VARCHAR(64)
);

-- Insert current schema version
INSERT INTO schema_version (version, description, checksum) VALUES
('2.0.0', 'Production-ready vendors microservice schema with comprehensive features', 'v2.0.0-production-ready')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SCHEMA COMPLETION
-- =====================================================

-- Grant necessary permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON SCHEMA public IS 'Badr Delivery Platform - Vendors Microservice Database Schema v2.0';
COMMENT ON TABLE users IS 'User accounts with enhanced security and profile management';
COMMENT ON TABLE vendors IS 'Vendor business information and registration management';
COMMENT ON TABLE vendor_branches IS 'Vendor branch locations with operational details';
COMMENT ON TABLE menu_items IS 'Menu items with comprehensive food information and categorization';
COMMENT ON TABLE offers IS 'Promotional offers and discounts with flexible discount types';
COMMENT ON TABLE reviews IS 'Customer reviews and ratings for vendors, branches, and menu items';
COMMENT ON TABLE favorites IS 'Customer favorites with flexible entity support';

-- Schema creation completed successfully
SELECT 'Badr Delivery Platform - Vendors Microservice Schema v2.0 created successfully!' as status;