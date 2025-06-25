import readline from 'readline';
import { ollamaRequest } from './utils/ollama';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SERVER_URL = 'http://localhost:3000';
const USER_ID = 'cli-user'; // You can change this or make it configurable

// Configuration: Set to false for offline mode (direct Ollama), true for server mode (with logging)
const USE_SERVER = true;

async function chatWithServer(message: string): Promise<string> {
  try {
    const response = await fetch(`${SERVER_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId: USER_ID,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as { response: string };
    return data.response;
  } catch (error) {
    console.error('Error communicating with server:', error);
    return 'Sorry, I\'m having trouble connecting to the server.';
  }
}

async function chatDirect(message: string): Promise<string> {
  try {
    const reply = await ollamaRequest(message);
    return reply.trim();
  } catch (error) {
    console.error('Error communicating with Ollama:', error);
    return 'Sorry, I\'m having trouble connecting to Ollama.';
  }
}

async function main() {
  console.log('Start chatting with Hue! (type "exit" to quit)');
  
  if (USE_SERVER) {
    console.log(`✅ Server mode: Using server at ${SERVER_URL}`);
    console.log(`📝 Conversations will be logged to Supabase`);
    console.log(`👤 User ID: ${USER_ID}`);
  } else {
    console.log(`🔌 Offline mode: Direct connection to Ollama`);
    console.log(`📝 Conversations will NOT be logged`);
  }
  
  while (true) {
    await new Promise<void>((resolve) => {
      rl.question('You: ', async (input) => {
        if (input.trim().toLowerCase() === 'exit') {
          rl.close();
          process.exit(0);
        }
        try {
          const reply = USE_SERVER ? await chatWithServer(input) : await chatDirect(input);
          console.log('Hue:', reply.trim());
        } catch (err) {
          console.error('Error:', err);
        }
        resolve();
      });
    });
  }
}

main(); 