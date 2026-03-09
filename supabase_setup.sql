-- Consolidation of PulseMap Supabase Schema

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  preferences JSONB DEFAULT '{"regions": [], "defaultRegion": "world", "notifications": {"email": false, "telegram": false}}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. AUTOMATIC PROFILE CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. EVENTS TABLE (Required for analytics triggers)
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  region TEXT,
  lat FLOAT,
  lng FLOAT,
  timestamp TIMESTAMPTZ,
  source_url TEXT,
  hot_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id TEXT,
  action_type TEXT NOT NULL, -- 'click', 'view_intel', 'region_select', 'search'
  region TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Analytics
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to log analytics" ON public.event_analytics 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" ON public.event_analytics 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. ANALYTICS TRIGGER FOR HOT SCORE
CREATE OR REPLACE FUNCTION public.increment_hot_score()
RETURNS trigger AS $$
BEGIN
  IF NEW.action_type = 'click' AND NEW.event_id IS NOT NULL THEN
    UPDATE public.events 
    SET hot_score = hot_score + 1 
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_analytics_insert ON public.event_analytics;
CREATE TRIGGER on_analytics_insert
  AFTER INSERT ON public.event_analytics
  FOR EACH ROW EXECUTE PROCEDURE public.increment_hot_score();
