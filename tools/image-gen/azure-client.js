import { createHash } from 'crypto';

export async function generateImage(prompt, options = {}) {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const deployment = process.env.AZURE_FOUNDRY_DEPLOYMENT || 'dall-e-3';
  const apiVersion = process.env.AZURE_FOUNDRY_API_VERSION || '2024-02-01';

  if (!endpoint || !apiKey) {
    throw new Error('AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY must be set');
  }

  const url = `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`;

  const generationResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: 1,
      response_format: 'url',
    }),
  });

  if (!generationResponse.ok) {
    const body = await generationResponse.text();
    throw new Error(`Azure API ${generationResponse.status}: ${body}`);
  }

  const data = await generationResponse.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error(`Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to fetch image from Azure CDN: ${imageResponse.status}`);

  return Buffer.from(await imageResponse.arrayBuffer());
}

export function promptHash(prompt) {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 8);
}
