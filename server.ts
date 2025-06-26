import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { supabase, initializeDatabase } from './supabase';
import { 
  logConversation, 
  recallRecentConversations, 
  recallAllMemories,
  storeMemory,
  recallMemory,
  deleteMemory,
  searchConversations,
  getConversationStats
} from './memory';
import { 
  ollamaRequest, 
  ollamaStream, 
  checkOllamaStatus,
  pullModel 
} from './utils/ollama';
import { 
  huePersona, 
  buildMemoryContext, 
  formatResponse,
  conversationStarters,
  errorResponses 
} from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const ollamaStatus = await checkOllamaStatus();
    const supabaseStatus = await supabase.from('conversations').select('count').limit(1);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        ollama: ollamaStatus.isRunning,
        supabase: !supabaseStatus.error,
        model: ollamaStatus.modelAvailable
      },
      ollama: ollamaStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize database
app.post('/init', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, userId, stream = false } = req.body;

    if (!message || !userId) {
      res.status(400).json({
        error: 'Missing required fields: message and userId'
      });
      return;
    }

    // Check Ollama status
    const ollamaStatus = await checkOllamaStatus();
    if (!ollamaStatus.isRunning) {
      res.status(503).json({
        error: 'Ollama is not running',
        details: ollamaStatus.error
      });
      return;
    }

    if (!ollamaStatus.modelAvailable) {
      res.status(503).json({
        error: 'Model not available',
        details: ollamaStatus.error
      });
      return;
    }

    // Recall recent conversations and memories
    const recentConversations = await recallRecentConversations(userId, 5);
    const userMemories = await recallAllMemories(userId);

    // Build context
    const memoryContext = buildMemoryContext(userId, recentConversations, userMemories);
    
    // Construct prompt
    const fullPrompt = `${huePersona.systemPrompt}\n\n${memoryContext}\n\nUser: ${message}\nHue:`;

    if (stream) {
      // Stream response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      let fullResponse = '';
      
      try {
        for await (const chunk of ollamaStream(fullPrompt)) {
          fullResponse += chunk;
          res.write(chunk);
        }
        
        // Log the conversation
        await logConversation(userId, message, fullResponse);
        
        res.end();
        return;
      } catch (streamError) {
        console.error('Stream error:', streamError);
        res.write(`\n\n${errorResponses.modelError}`);
        res.end();
        return;
      }
    } else {
      // Regular response
      const response = await ollamaRequest(fullPrompt);
      const formattedResponse = formatResponse(response);

      // Log the conversation
      await logConversation(userId, message, formattedResponse);

      res.json({
        response: formattedResponse,
        conversationId: 'generated-id',
        timestamp: new Date().toISOString()
      });
      return;
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

// Memory management endpoints
app.get('/memories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const memories = await recallAllMemories(userId);
    res.json({ memories });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve memories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/memories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        error: 'Missing required fields: key and value'
      });
    }

    const memory = await storeMemory(userId, key, value);
    res.json({ memory });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to store memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/memories/:userId/:key', async (req, res) => {
  try {
    const { userId, key } = req.params;
    const value = await recallMemory(userId, key);
    res.json({ key, value });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/memories/:userId/:key', async (req, res) => {
  try {
    const { userId, key } = req.params;
    const success = await deleteMemory(userId, key);
    res.json({ success });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Conversation history endpoints
app.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, search } = req.query;

    let conversations;
    if (search && typeof search === 'string') {
      conversations = await searchConversations(userId, search, Number(limit));
    } else {
      conversations = await recallRecentConversations(userId, Number(limit));
    }

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve conversations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/conversations/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getConversationStats(userId);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve conversation stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ollama management endpoints
app.get('/ollama/status', async (req, res) => {
  try {
    const status = await checkOllamaStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check Ollama status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/ollama/pull', async (req, res) => {
  try {
    const { model } = req.body;
    const success = await pullModel(model);
    res.json({ success });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to pull model',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hue Agent server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
});

export default app; 