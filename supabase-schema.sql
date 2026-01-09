-- =====================================================
-- RESTAURANT CRM - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- This will create all tables, policies, and seed data
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (User Roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'waiter', 'chef', 'cashier')),
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can read their own profile
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 2. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read products
CREATE POLICY "Authenticated users can view products"
    ON products FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert products
CREATE POLICY "Only admins can insert products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update products
CREATE POLICY "Only admins can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete products
CREATE POLICY "Only admins can delete products"
    ON products FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 3. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'paid')),
    total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view orders
CREATE POLICY "Authenticated users can view orders"
    ON orders FOR SELECT
    TO authenticated
    USING (true);

-- Waiters and admins can create orders
CREATE POLICY "Waiters and admins can create orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('waiter', 'admin')
        )
    );

-- Chefs, cashiers, and admins can update orders
CREATE POLICY "Staff can update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('chef', 'cashier', 'admin')
        )
    );

-- =====================================================
-- 4. ORDER_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view order items
CREATE POLICY "Authenticated users can view order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (true);

-- Waiters and admins can create order items
CREATE POLICY "Waiters and admins can create order items"
    ON order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('waiter', 'admin')
        )
    );

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        'waiter', -- Default role
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. SEED DATA - PRODUCTS
-- =====================================================
INSERT INTO products (name, price, category, stock) VALUES
    ('Hamburguesa Clásica', 12.50, 'Principal', 50),
    ('Hamburguesa Doble', 16.00, 'Principal', 40),
    ('Pizza Margarita', 14.00, 'Principal', 30),
    ('Pizza Pepperoni', 16.50, 'Principal', 30),
    ('Tacos de Pollo', 8.00, 'Principal', 60),
    ('Tacos de Carne', 9.50, 'Principal', 55),
    ('Ensalada César', 7.50, 'Acompañante', 45),
    ('Papas Fritas', 5.00, 'Acompañante', 100),
    ('Aros de Cebolla', 6.00, 'Acompañante', 80),
    ('Alitas Picantes', 11.00, 'Acompañante', 70),
    ('Refresco', 3.00, 'Bebida', 200),
    ('Agua Mineral', 2.00, 'Bebida', 150),
    ('Jugo Natural', 4.50, 'Bebida', 100),
    ('Cerveza', 5.50, 'Bebida', 120),
    ('Café', 2.50, 'Bebida', 180),
    ('Pastel de Chocolate', 6.50, 'Postre', 40),
    ('Helado', 4.00, 'Postre', 60),
    ('Flan', 5.00, 'Postre', 35)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. SEED DATA - TEST USERS (MANUAL SETUP REQUIRED)
-- =====================================================
-- IMPORTANT: You need to create these users manually in Supabase Auth
-- Go to Authentication > Users > Add User
-- 
-- Create the following test users:
-- 
-- 1. ADMIN USER
--    Email: admin@restaurant.com
--    Password: admin123
--    After creating, run this SQL to set role:
--    UPDATE profiles SET role = 'admin', full_name = 'Administrador' WHERE email = 'admin@restaurant.com';
--
-- 2. WAITER USER
--    Email: waiter@restaurant.com
--    Password: waiter123
--    After creating, run this SQL to set role:
--    UPDATE profiles SET role = 'waiter', full_name = 'Mesero Principal' WHERE email = 'waiter@restaurant.com';
--
-- 3. CHEF USER
--    Email: chef@restaurant.com
--    Password: chef123
--    After creating, run this SQL to set role:
--    UPDATE profiles SET role = 'chef', full_name = 'Chef Principal' WHERE email = 'chef@restaurant.com';
--
-- 4. CASHIER USER
--    Email: cashier@restaurant.com
--    Password: cashier123
--    After creating, run this SQL to set role:
--    UPDATE profiles SET role = 'cashier', full_name = 'Cajero Principal' WHERE email = 'cashier@restaurant.com';

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify everything is set up correctly:

-- Check tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check products
-- SELECT COUNT(*) as product_count FROM products;

-- Check profiles
-- SELECT email, role, full_name FROM profiles;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Create the test users in Supabase Auth UI
-- 2. Update their roles using the SQL commands above
-- 3. Add your Supabase credentials to .env.local
-- 4. Test the application!
-- =====================================================
