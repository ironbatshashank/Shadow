const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve the HTML from /public
app.use(express.static(path.join(__dirname, 'public')));

// ── Anthropic proxy ──────────────────────────────────────
app.post('/api/anthropic', async (req, res) => {
  const { key, body } = req.body;
  if (!key) return res.status(400).json({ error: { message: 'No API key provided' } });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ── Chat / Vision proxy ──────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { key, body } = req.body;
  if (!key) return res.status(400).json({ error: { message: 'No API key provided' } });
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ── Whisper transcription proxy ──────────────────────────
app.post('/api/whisper', upload.single('file'), async (req, res) => {
  const key = req.body.key;
  if (!key) return res.status(400).json({ error: { message: 'No API key provided' } });
  if (!req.file) return res.status(400).json({ error: { message: 'No audio file received' } });

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'recording.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'text');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        ...form.getHeaders()
      },
      body: form
    });

    if (!r.ok) {
      const err = await r.json();
      return res.status(r.status).json(err);
    }

    const text = await r.text();
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Shadow proxy running at http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT} in Chrome\n`);
});