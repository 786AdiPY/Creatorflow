import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://shdkzoofnxsdxllmlumn.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGt6b29mbnhzZHhsbG1sdW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDE4ODMsImV4cCI6MjEwMjQ3Nzg4M30.RUKdTg6IKuF4wj4dfiZ2g5J4GS2FyV4vLarx7yLgvzI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
