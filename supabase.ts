import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client with anon key for general operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase client with service role key for admin operations
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Database types (you can generate these from your Supabase dashboard)
export interface Conversation {
  id: string;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Memory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// Initialize database tables (run this once to set up your database)
export async function initializeDatabase() {
  try {
    // Create conversations table
    const conversationsResult = await supabaseAdmin?.rpc('create_table_if_not_exists', {
      table_name: 'conversations',
      table_sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
      `
    });

    if (conversationsResult && conversationsResult.error) console.error('Error creating conversations table:', conversationsResult.error);

    // Create memories table
    const memoriesResult = await supabaseAdmin?.rpc('create_table_if_not_exists', {
      table_name: 'memories',
      table_sql: `
        CREATE TABLE IF NOT EXISTS memories (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, key)
        );
        CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
      `
    });

    if (memoriesResult && memoriesResult.error) console.error('Error creating memories table:', memoriesResult.error);

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
} 