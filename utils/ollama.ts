import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'hue';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Make a simple request to Ollama
 */
export async function ollamaRequest(
  prompt: string,
  options: Partial<OllamaRequest['options']> = {}
): Promise<string> {
  try {
    const requestBody: OllamaRequest = {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...options
      }
    };

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.response;
  } catch (error) {
    console.error('Error making Ollama request:', error);
    throw error;
  }
}

/**
 * Stream a response from Ollama
 */
export async function* ollamaStream(
  prompt: string,
  options: Partial<OllamaRequest['options']> = {}
): AsyncGenerator<string, void, unknown> {
  try {
    const requestBody: OllamaRequest = {
      model: OLLAMA_MODEL,
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...options
      }
    };

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama stream request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaStreamResponse = JSON.parse(line);
              yield data.response;
              
              if (data.done) {
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse Ollama stream line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Error streaming from Ollama:', error);
    throw error;
  }
}

/**
 * Check if Ollama is running and the model is available
 */
export async function checkOllamaStatus(): Promise<{
  isRunning: boolean;
  modelAvailable: boolean;
  error?: string;
}> {
  try {
    // Check if Ollama is running
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.ok) {
      return {
        isRunning: false,
        modelAvailable: false,
        error: `Ollama is not responding: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json() as { models?: any[] };
    const models = data.models || [];
    const modelAvailable = models.some((model: any) => model.name === OLLAMA_MODEL);

    return {
      isRunning: true,
      modelAvailable,
      error: modelAvailable ? undefined : `Model '${OLLAMA_MODEL}' not found. Available models: ${models.map((m: any) => m.name).join(', ')}`
    };
  } catch (error) {
    return {
      isRunning: false,
      modelAvailable: false,
      error: `Failed to connect to Ollama: ${error}`
    };
  }
}

/**
 * Pull a model from Ollama
 */
export async function pullModel(modelName: string = OLLAMA_MODEL): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status} ${response.statusText}`);
    }

    // Wait for the pull to complete
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.status === 'success') {
                return true;
              }
            } catch (parseError) {
              // Continue reading
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return true;
  } catch (error) {
    console.error('Error pulling model:', error);
    return false;
  }
} 