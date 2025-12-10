import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaskfcndzmjyeyzgmzrx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhc2tmY25kem1qeWV5emdtenJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTYxMTYsImV4cCI6MjA4MDgzMjExNn0.RQreFUZP8_lI9kCT0lT1aXMBbJCF7YnexL-SYro--Rw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
