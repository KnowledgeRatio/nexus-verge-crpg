import { createHash } from 'crypto';

export async function generateImage(prompt, options = {}) {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const model = process.env.AZURE_FOUNDRY_MODEL || 'MAI-Image-2e';

  if (!endpoint || !apiKey) {
    throw new Error('AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY must be set');
  }

  // MAI image generation API — returns base64 PNG directly
  const url = `${endpoint}/mai/v1/images/generations`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      width: options.width || 1024,
      height: options.height || 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Azure API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);

  return Buffer.from(b64, 'base64');
}

export function promptHash(prompt) {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 8);
}
