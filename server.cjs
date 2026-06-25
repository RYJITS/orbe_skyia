const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const centralEnvPath = 'D:\\00_Cerveau_IA\\API\\env.Local';
const port = Number(process.env.PORT || process.env.HOSTINGER_PORT || 3000);
const defaultFrenchAggressiveVoiceId = 'a7c07cdc-1c35-4d87-a938-c610a654f600'; // Marie - Angry

const fallbackModels = [
  { id: 'mistral-small-latest', name: 'Mistral Small', cost: 0, category: 'standard', provider: 'mistral', isFree: true },
  { id: 'mistral-medium-latest', name: 'Mistral Medium', cost: 1, category: 'premium', provider: 'mistral' },
  { id: 'mistral-large-latest', name: 'Mistral Large', cost: 2, category: 'premium', provider: 'mistral' },
  { id: 'codestral-latest', name: 'Codestral', cost: 1, category: 'premium', provider: 'mistral' },
  { id: 'devstral-latest', name: 'Devstral', cost: 1, category: 'premium', provider: 'mistral' },
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const requestBuckets = new Map();

function readEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return acc;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) acc[key] = value;
      return acc;
    }, {});
}

const localEnv = {
  ...readEnvFile(path.join(rootDir, '.env')),
  ...readEnvFile(path.join(rootDir, '.env.local')),
  ...readEnvFile(centralEnvPath),
};

function getEnv(name, aliases = []) {
  const keys = [name, ...aliases];
  for (const key of keys) {
    const value = process.env[key] || localEnv[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_500_000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req, res) {
  const key = clientIp(req);
  const now = Date.now();
  const windowMs = 60_000;
  const limit = Number(getEnv('SKYIA_RATE_LIMIT_PER_MINUTE', ['RATE_LIMIT_PER_MINUTE']) || 30);
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > windowMs) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > limit) {
    sendJson(res, 429, { error: 'Rate limit exceeded', retryAfterSeconds: Math.ceil((bucket.start + windowMs - now) / 1000) });
    return false;
  }
  return true;
}

function resolveMistralModel(requested) {
  const defaultModel = getEnv('SKYIA_MISTRAL_MODEL', ['MISTRAL_MODEL']) || 'mistral-small-latest';
  const model = typeof requested === 'string' ? requested.trim() : '';
  if (!model) return defaultModel;
  if (/^(mistral|ministral|codestral|devstral|magistral)[\w.-]*$/i.test(model)) return model;
  return defaultModel;
}

function resolveSpeechModel(requested) {
  const defaultModel = getEnv('SKYIA_VOXTRAL_TTS_MODEL', ['VOXTRAL_TTS_MODEL', 'MISTRAL_TTS_MODEL']) || 'voxtral-mini-tts-2603';
  const model = typeof requested === 'string' ? requested.trim() : '';
  if (!model) return defaultModel;
  if (/^voxtral[\w.-]*tts[\w.-]*$/i.test(model)) return model;
  return defaultModel;
}

function cleanSpeechText(input) {
  return String(input || '')
    .replace(/```\s*json[\s\S]*?```/gi, '')
    .replace(/[*#_`~>\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-24)
    .map((message) => {
      const role = message?.role === 'assistant' || message?.role === 'system' ? message.role : 'user';
      const content = typeof message?.content === 'string'
        ? message.content.slice(0, 12000)
        : '';
      return { role, content };
    })
    .filter((message) => message.content.trim() !== '');
}

async function handleModels(req, res) {
  const apiKey = getEnv('MISTRAL_API_KEY', ['MISTRAL_AI_API_KEY', 'MISTRALAI_API_KEY', 'MISTRAL.API_KEY']);
  if (!apiKey) {
    sendJson(res, 200, { models: fallbackModels, source: 'fallback', configured: false });
    return;
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`Mistral models error ${response.status}`);
    const payload = await response.json();
    const models = Array.isArray(payload.data)
      ? payload.data
        .filter((model) => typeof model.id === 'string' && /(mistral|ministral|codestral|devstral|magistral)/i.test(model.id))
        .map((model) => ({
          id: model.id,
          name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
          cost: /large/i.test(model.id) ? 2 : /small|tiny|mini|ministral/i.test(model.id) ? 0 : 1,
          category: /large|medium|codestral|devstral|magistral/i.test(model.id) ? 'premium' : 'standard',
          provider: 'mistral',
          isFree: /small|tiny|mini|ministral/i.test(model.id),
        }))
      : [];
    sendJson(res, 200, { models: models.length ? models : fallbackModels, source: 'mistral', configured: true });
  } catch (error) {
    sendJson(res, 200, { models: fallbackModels, source: 'fallback', configured: true, warning: error.message });
  }
}

async function handleChat(req, res) {
  if (!checkRateLimit(req, res)) return;

  const apiKey = getEnv('MISTRAL_API_KEY', ['MISTRAL_AI_API_KEY', 'MISTRALAI_API_KEY', 'MISTRAL.API_KEY']);
  if (!apiKey) {
    sendJson(res, 500, { error: 'MISTRAL_API_KEY is not configured on the server.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const messages = normalizeMessages(payload.messages);
  if (messages.length === 0) {
    sendJson(res, 400, { error: 'Missing messages.' });
    return;
  }

  const stream = payload.stream !== false;
  const mistralPayload = {
    model: resolveMistralModel(payload.model),
    messages,
    stream,
    temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.7,
    top_p: typeof payload.top_p === 'number' ? payload.top_p : undefined,
    max_tokens: Number(payload.max_completion_tokens || payload.max_tokens || 900),
  };

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(mistralPayload),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      sendJson(res, upstream.status, {
        error: `Mistral API error ${upstream.status}`,
        detail: errorText.slice(0, 2000),
        provider: 'mistral',
      });
      return;
    }

    if (!stream) {
      const json = await upstream.json();
      sendJson(res, 200, json);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    for await (const chunk of upstream.body) {
      res.write(Buffer.from(chunk));
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 500, { error: error.message || 'Mistral proxy failed', provider: 'mistral' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Mistral proxy failed' })}\n\n`);
      res.end();
    }
  }
}

async function getFallbackVoiceId(apiKey) {
  const configured = getEnv('SKYIA_VOXTRAL_VOICE_ID', ['VOXTRAL_VOICE_ID', 'MISTRAL_VOICE_ID']);
  if (configured) return configured;

  try {
    const response = await fetch('https://api.mistral.ai/v1/audio/voices?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return '';
    const payload = await response.json();
    const voices = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.voices)
          ? payload.voices
          : [];
    const preferred = selectPreferredVoice(voices);
    return typeof preferred?.id === 'string' ? preferred.id : '';
  } catch {
    return defaultFrenchAggressiveVoiceId;
  }
}

function voiceProfileText(voice) {
  const languages = Array.isArray(voice.languages) ? voice.languages.join(' ') : '';
  const tags = Array.isArray(voice.tags) ? voice.tags.join(' ') : '';
  return `${voice.name || ''} ${voice.gender || ''} ${languages} ${tags}`.toLowerCase();
}

function selectPreferredVoice(voices) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return { id: defaultFrenchAggressiveVoiceId };
  }

  const ranked = voices
    .filter((voice) => typeof voice?.id === 'string')
    .map((voice) => {
      const profile = voiceProfileText(voice);
      const isFrench = /\bfr(_fr)?\b|french|francais/.test(profile);
      const isMale = /\bmale\b|oliver|paul/.test(profile) && !/\bfemale\b/.test(profile);
      const isCold = /neutral|calm|even|low|hollow|hushed|measured|firm|steady|composed|decisive/.test(profile);
      const isAggressive = /angry|frustrated|gruff|raw|intense|forceful|edgy|snappy|fierce|sharp/.test(profile);
      const isHot = /happy|excited|cheerful|bouncy|sunny|radiant|vibrant/.test(profile);
      let score = 0;
      if (isFrench && isAggressive) score += 3200;
      else if (isFrench && isMale) score += 2400;
      else if (isMale && isAggressive) score += 1800;
      else if (isMale) score += 900;
      else if (isFrench) score += 650;
      if (isAggressive) score += 620;
      if (isCold) score += 160;
      if (voice.id === defaultFrenchAggressiveVoiceId) score += 320;
      if (isHot) score -= 450;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || voices.find((voice) => voice.id === defaultFrenchAggressiveVoiceId) || voices[0];
}

async function handleSpeech(req, res) {
  if (!checkRateLimit(req, res)) return;

  const apiKey = getEnv('MISTRAL_API_KEY', ['MISTRAL_AI_API_KEY', 'MISTRALAI_API_KEY', 'MISTRAL.API_KEY']);
  if (!apiKey) {
    sendJson(res, 500, { error: 'MISTRAL_API_KEY is not configured on the server.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const input = cleanSpeechText(payload.text || payload.input);
  if (!input) {
    sendJson(res, 400, { error: 'Missing speech text.' });
    return;
  }

  const voiceId = typeof payload.voice_id === 'string' && payload.voice_id.trim()
    ? payload.voice_id.trim()
    : await getFallbackVoiceId(apiKey);

  if (!voiceId) {
    sendJson(res, 428, {
      error: 'Voxtral voice_id missing. Configure SKYIA_VOXTRAL_VOICE_ID or VOXTRAL_VOICE_ID on the server.',
      provider: 'mistral',
    });
    return;
  }

  const format = ['mp3', 'wav', 'opus', 'flac'].includes(String(payload.response_format || '').toLowerCase())
    ? String(payload.response_format).toLowerCase()
    : 'mp3';

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: resolveSpeechModel(payload.model),
        input,
        voice_id: voiceId,
        response_format: format,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      sendJson(res, upstream.status, {
        error: `Voxtral TTS error ${upstream.status}`,
        detail: errorText.slice(0, 2000),
        provider: 'mistral',
      });
      return;
    }

    const json = await upstream.json();
    const audioData = json.audio_data || json.audioData || json.data?.audio_data;
    if (!audioData || typeof audioData !== 'string') {
      sendJson(res, 502, { error: 'Voxtral TTS response did not include audio_data.', provider: 'mistral' });
      return;
    }

    const audioBuffer = Buffer.from(audioData, 'base64');
    const contentTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      opus: 'audio/ogg; codecs=opus',
      flac: 'audio/flac',
    };
    res.writeHead(200, {
      'Content-Type': contentTypes[format] || 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Skyia-TTS': 'voxtral',
      'X-Skyia-TTS-Voice': voiceId,
    });
    res.end(audioBuffer);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Voxtral TTS proxy failed', provider: 'mistral' });
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';
  let filePath = path.normalize(path.join(distDir, pathname));

  if (!filePath.startsWith(distDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'Build output missing. Run npm run build first.' });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.url === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      provider: 'mistral',
      configured: Boolean(getEnv('MISTRAL_API_KEY', ['MISTRAL_AI_API_KEY', 'MISTRALAI_API_KEY', 'MISTRAL.API_KEY'])),
    });
    return;
  }

  if (req.url && req.url.startsWith('/api/models') && req.method === 'GET') {
    await handleModels(req, res);
    return;
  }

  if (req.url && req.url.startsWith('/api/chat') && req.method === 'POST') {
    await handleChat(req, res);
    return;
  }

  if (req.url && req.url.startsWith('/api/speech') && req.method === 'POST') {
    await handleSpeech(req, res);
    return;
  }

  if (req.url && req.url.startsWith('/api/')) {
    sendJson(res, 404, { error: 'API route not found' });
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Skyia Orbe Hostinger server listening on port ${port}`);
});
