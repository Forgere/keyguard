import { OpenAI } from 'openai';

export interface IntentResult {
  service: 'cloudflare' | 'vercel' | 'supabase' | 'unknown';
  action: string;
  resource?: string;
  permissions: string[];
  reasoning: string;
}

export class IntentParser {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI(); // 使用环境变量中的配置
  }

  async parse(prompt: string): Promise<IntentResult> {
    const systemPrompt = `
      You are a security expert for KeyGuard. Your task is to parse a user's natural language request into a structured permission scope for cloud providers.
      Supported services: cloudflare, vercel, supabase.
      
      Output format (JSON):
      {
        "service": "cloudflare" | "vercel" | "supabase",
        "action": "short_action_name",
        "resource": "specific_resource_identifier_if_any",
        "permissions": ["list_of_required_scopes"],
        "reasoning": "brief explanation of why these permissions were chosen"
      }
      
      Example:
      User: "I want the agent to be able to read R2 bucket 'my-data'"
      Output: {
        "service": "cloudflare",
        "action": "read_r2",
        "resource": "my-data",
        "permissions": ["r2_bucket_read"],
        "reasoning": "User requested read access to a specific R2 bucket."
      }
    `;

    const response = await this.client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Failed to parse intent: Empty response from LLM");
    
    return JSON.parse(content) as IntentResult;
  }
}
