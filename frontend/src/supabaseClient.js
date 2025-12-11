import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dhcswkonpypbrmzmqeca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY3N3a29ucHlwYnJtem1xZWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQ5MjIsImV4cCI6MjA4MDg0MDkyMn0.UC0RlrXpisTV8Epc37BwI68JXkkzQehZ5ItdfuuEnjI'


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
