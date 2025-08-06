-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_name TEXT NOT NULL,
    description TEXT NOT NULL,
    social_media_links JSONB DEFAULT '{}',
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT 'image/jpeg',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- Create index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow public to read all submissions (for potential future public gallery)
CREATE POLICY "Enable read access for all users" ON public.submissions
    FOR SELECT USING (true);

-- Only allow inserts via server (service role key)
CREATE POLICY "Enable insert for service role only" ON public.submissions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only allow updates via server (service role key) 
CREATE POLICY "Enable update for service role only" ON public.submissions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Only allow deletes via server (service role key)
CREATE POLICY "Enable delete for service role only" ON public.submissions
    FOR DELETE USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();