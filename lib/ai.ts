// Anthropic Messages API クライアント（SDK不使用・fetchのみ）
// 必要な環境変数：ANTHROPIC_API_KEY（必須）、ANTHROPIC_MODEL（任意）

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export function getAIModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAIModel(),
      max_tokens: params.maxTokens ?? 8000,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const block = data?.content?.[0];
  const text = typeof block?.text === 'string' ? block.text : '';
  if (!text) throw new Error('Anthropic API returned empty content');
  return text;
}

export async function callClaudeMessages(params: {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAIModel(),
      max_tokens: params.maxTokens ?? 1024,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const block = data?.content?.[0];
  const text = typeof block?.text === 'string' ? block.text : '';
  if (!text) throw new Error('Anthropic API returned empty content');
  return text;
}

// Claude応答からJSONを取り出す（コードフェンスや前後テキストに頑健）
export function parseJSONFromText<T>(text: string): T {
  let t = text.trim();
  // ```json ... ``` フェンスを除去
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // 最初の { から最後の } までを抽出
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    t = t.slice(start, end + 1);
  }
  return JSON.parse(t) as T;
}
