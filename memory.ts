import { supabase, Conversation, Memory } from './supabase';

// Memory management functions for Hue

/**
 * Log a conversation to memory
 */
export async function logConversation(
  userId: string,
  message: string,
  response: string,
  metadata?: Record<string, any>
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        message,
        response,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging conversation:', error);
    return null;
  }
}

/**
 * Recall recent conversations for a user
 */
export async function recallRecentConversations(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error recalling conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error recalling conversations:', error);
    return [];
  }
}

/**
 * Store a memory for a user
 */
export async function storeMemory(
  userId: string,
  key: string,
  value: string
): Promise<Memory | null> {
  try {
    const { data, error } = await supabase
      .from('memories')
      .upsert({
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing memory:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error storing memory:', error);
    return null;
  }
}

/**
 * Recall a specific memory for a user
 */
export async function recallMemory(
  userId: string,
  key: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .single();

    if (error) {
      console.error('Error recalling memory:', error);
      return null;
    }

    return data?.value || null;
  } catch (error) {
    console.error('Error recalling memory:', error);
    return null;
  }
}

/**
 * Recall all memories for a user
 */
export async function recallAllMemories(userId: string): Promise<Memory[]> {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error recalling all memories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error recalling all memories:', error);
    return [];
  }
}

/**
 * Delete a memory for a user
 */
export async function deleteMemory(
  userId: string,
  key: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId)
      .eq('key', key);

    if (error) {
      console.error('Error deleting memory:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting memory:', error);
    return false;
  }
}

/**
 * Search conversations by content
 */
export async function searchConversations(
  userId: string,
  query: string,
  limit: number = 5
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .or(`message.ilike.%${query}%,response.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error searching conversations:', error);
    return [];
  }
}

/**
 * Get conversation statistics for a user
 */
export async function getConversationStats(userId: string): Promise<{
  totalConversations: number;
  firstConversation: string | null;
  lastConversation: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        firstConversation: null,
        lastConversation: null
      };
    }

    const conversations = data || [];
    return {
      totalConversations: conversations.length,
      firstConversation: conversations[0]?.created_at || null,
      lastConversation: conversations[conversations.length - 1]?.created_at || null
    };
  } catch (error) {
    console.error('Error getting conversation stats:', error);
    return {
      totalConversations: 0,
      firstConversation: null,
      lastConversation: null
    };
  }
} 