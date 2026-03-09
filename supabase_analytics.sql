-- Analytics table to track user interactions with tactical intel
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id TEXT,
  action_type TEXT NOT NULL, -- 'click', 'view_intel', 'region_select'
  region TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Users can only insert their own data (or anonymized if no user_id)
-- Admins can view all analytics
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous and user inserts" ON public.event_analytics 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" ON public.event_analytics 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to increment event hot score based on clicks
CREATE OR REPLACE FUNCTION public.increment_hot_score()
RETURNS trigger AS $$
BEGIN
  IF NEW.action_type = 'click' AND NEW.event_id IS NOT NULL THEN
    -- If using a local cache for news, this update might not reflect immediately 
    -- but it's good practice for when we move events to Supabase fully
    UPDATE public.events 
    SET hot_score = hot_score + 1 
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_analytics_insert
  AFTER INSERT ON public.event_analytics
  FOR EACH ROW EXECUTE PROCEDURE public.increment_hot_score();
