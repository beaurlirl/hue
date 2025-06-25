# Hue Agent

A helpful AI assistant with persistent memory built with Ollama and Supabase.

## Features

- 🤖 **AI Assistant**: Powered by Ollama with customizable models
- 🧠 **Persistent Memory**: Stores conversations and user preferences in Supabase
- 💬 **Conversational**: Maintains context across conversations
- 🔄 **Streaming Support**: Real-time response streaming
- 📊 **Memory Management**: Store, recall, and manage user memories
- 🏥 **Health Monitoring**: Built-in health checks and status monitoring

## Project Structure

```
hue-agent/
├── Modelfile                 # Defines Hue's system prompt and base model
├── package.json              # Node project with express + supabase
├── env.example               # Environment variables template
├── server.ts                 # Express server to handle API requests
├── supabase.ts               # Supabase client init
├── persona.ts                # Hue's system prompt & persona settings
├── memory.ts                 # Supabase memory functions (log, recall, etc.)
└── utils/
    └── ollama.ts             # Ollama request/streaming interface
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Ollama](https://ollama.ai/) installed and running
- [Supabase](https://supabase.com/) account and project

## Setup

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo>
   cd hue-agent
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Ollama Configuration
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=hue

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. **Create the Hue model in Ollama**
   ```bash
   ollama create hue -f Modelfile
   ```

4. **Initialize the database**
   ```bash
   npm run dev
   ```
   
   Then make a POST request to `/init` to create the necessary tables.

5. **Start the server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
```http
GET /health
```

### Chat
```http
POST /chat
Content-Type: application/json

{
  "message": "Hello, Hue!",
  "userId": "user123",
  "stream": false
}
```

### Memory Management

#### Get all memories for a user
```http
GET /memories/:userId
```

#### Store a memory
```http
POST /memories/:userId
Content-Type: application/json

{
  "key": "favorite_color",
  "value": "blue"
}
```

#### Get a specific memory
```http
GET /memories/:userId/:key
```

#### Delete a memory
```http
DELETE /memories/:userId/:key
```

### Conversation History

#### Get recent conversations
```http
GET /conversations/:userId?limit=10
```

#### Search conversations
```http
GET /conversations/:userId?search=keyword&limit=5
```

#### Get conversation stats
```http
GET /conversations/:userId/stats
```

### Ollama Management

#### Check Ollama status
```http
GET /ollama/status
```

#### Pull a model
```http
POST /ollama/pull
Content-Type: application/json

{
  "model": "llama3.2:3b"
}
```

## Usage Examples

### Basic Chat
```javascript
const response = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What's my favorite color?",
    userId: "user123"
  })
});

const data = await response.json();
console.log(data.response);
```

### Streaming Chat
```javascript
const response = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Tell me a story",
    userId: "user123",
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  process.stdout.write(chunk);
}
```

### Store Memory
```javascript
await fetch('http://localhost:3000/memories/user123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: "preferences",
    value: JSON.stringify({ theme: "dark", language: "en" })
  })
});
```

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run build` - Build TypeScript to JavaScript
- `npm test` - Run tests (when implemented)

### Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model name to use (default: hue)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Memories Table
```sql
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 