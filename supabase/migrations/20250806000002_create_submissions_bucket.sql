-- Create the submissions bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions',
    'submissions',
    true,
    10485760, -- 10MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the submissions bucket
-- Allow public uploads to submissions bucket (with file type and size restrictions)
CREATE POLICY "Allow public uploads to submissions bucket" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'submissions' 
        AND (storage.foldername(name))[1] = 'submissions'
    );

-- Allow public read access to submissions bucket
CREATE POLICY "Allow public read access to submissions bucket" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'submissions'
    );

-- Only allow service role to delete from submissions bucket
CREATE POLICY "Allow service role to delete from submissions bucket" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'submissions' 
        AND auth.role() = 'service_role'
    );