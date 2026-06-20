import { createHash } from 'crypto';

export async function generateImage(prompt, options = {}) {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const provider = process.env.AZURE_PROVIDER || 'foundry';

  if (!endpoint || !apiKey) {
    throw new Error('AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY must be set');
  }

  const { url, body } = provider === 'openai'
    ? buildOpenAIRequest(endpoint, prompt, options)
    : buildFoundryRequest(endpoint, prompt, options);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure API ${response.status}: ${text}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);

  return Buffer.from(b64, 'base64');
}

function buildFoundryRequest(endpoint, prompt, options) {
  const model = process.env.AZURE_FOUNDRY_MODEL || 'MAI-Image-2e';
  const supportsNegativePrompt = model.endsWith('2e');
  // 2.5/2.5-flash: drop negative entirely — appending it as "Avoid: ..." triggers content
  // safety false-positives when combined with long prompts. Art direction in the positive
  // prompt is sufficient. 2e: send as proper negative_prompt field.
  return {
    url: `${endpoint}/mai/v1/images/generations`,
    body: {
      model,
      prompt,
      ...(supportsNegativePrompt && options.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
      width: options.width || 1024,
      height: options.height || 1024,
    },
  };
}

function buildOpenAIRequest(endpoint, prompt, options) {
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'dall-e-3';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const size = `${options.width || 1024}x${options.height || 1024}`;
  return {
    url: `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`,
    body: {
      prompt,
      n: 1,
      size,
      quality: 'hd',
      response_format: 'b64_json',
    },
  };
}

export function promptHash(prompt) {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 8);
}
