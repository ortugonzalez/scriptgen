import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Groq from 'groq-sdk';
import FormData from 'form-data';
import axios from 'axios';

const execAsync = promisify(exec);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── DOWNLOAD AUDIO ──────────────────────────────────────────────────────────
async function downloadAudio(videoUrl) {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `scriptgen_${Date.now()}.mp3`);

  try {
    // Try yt-dlp first (handles YouTube, TikTok, Instagram)
    await execAsync(
  `/usr/local/bin/yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${videoUrl}"`,
      { timeout: 120000 }
    );
    return outputPath;
  } catch (err) {
    throw new Error(`No se pudo descargar el audio: ${err.message}`);
  }
}

// ─── TRANSCRIBE ──────────────────────────────────────────────────────────────
async function transcribeAudio(audioPath) {
  const audioStream = fs.createReadStream(audioPath);

  const transcription = await groq.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-large-v3',
    response_format: 'text',
    language: 'es'
  });

  return typeof transcription === 'string' ? transcription : transcription.text;
}

// ─── FILTER & EXTRACT IDEAS ──────────────────────────────────────────────────
async function filterAndExtractIdeas(transcription, videoMeta) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Recibís la transcripción de un video viral de redes sociales.
Tu tarea es analizarlo y extraer lo más valioso.

Respondé SOLO con un JSON válido, sin markdown, sin explicaciones:
{
  "tema_principal": "de qué trata el video en una frase",
  "ideas_clave": ["idea 1", "idea 2", "idea 3"],
  "estructura": "cómo está estructurado el video (hook, desarrollo, CTA)",
  "por_que_viral": "por qué crees que funcionó bien",
  "angulo_original": "qué lo hace diferente o memorable",
  "sugerencias_mejora": ["sugerencia 1", "sugerencia 2"]
}`
      },
      {
        role: 'user',
        content: `Título del video: ${videoMeta.title}\nPlataforma: ${videoMeta.platform}\nViews: ${videoMeta.views?.toLocaleString()}\n\nTranscripción:\n${transcription}`
      }
    ],
    temperature: 0.3
  });

  const raw = completion.choices[0].message.content;
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { tema_principal: 'No detectado', ideas_clave: [], estructura: raw };
  }
}

// ─── GENERATE SCRIPT ─────────────────────────────────────────────────────────
async function generateScript(transcription, ideas, videoMeta, userBrief) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Sos un experto en creación de contenido para redes sociales.
Tu tarea es escribir un guión nuevo y original inspirado en un video viral, adaptado al estilo del creador.

Reglas:
- Tono casual y directo, sin adornos ni lenguaje poético
- El guión debe funcionar para video corto (30-90 segundos)
- Empezá con un hook poderoso en las primeras 3 palabras
- Terminá con una pregunta al oyente relacionada con el tema del video
- No copies el video original, inspirate en él
- Usá el tono y estilo que te indica el creador

Formato de salida:
[HOOK]
...

[DESARROLLO]
...

[CIERRE + PREGUNTA]
...`
      },
      {
        role: 'user',
        content: `VIDEO ORIGINAL:
Título: ${videoMeta.title}
Plataforma: ${videoMeta.platform}
Por qué fue viral: ${ideas.por_que_viral || 'No detectado'}
Ideas clave: ${ideas.ideas_clave?.join(', ') || 'No detectadas'}

TRANSCRIPCIÓN ORIGINAL:
${transcription}

MI CANAL:
Nicho: ${userBrief.niche}
Tono: ${userBrief.tone}
Audiencia: ${userBrief.audience}

Escribí un guión nuevo para mi canal basado en este video.`
      }
    ],
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

// ─── REGENERATE SCRIPT ───────────────────────────────────────────────────────
async function regenerateScript(currentScript, instructions, userBrief) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Sos un editor de contenido para redes sociales. Recibís un guión existente y una instrucción de cambio. Aplicá los cambios manteniendo el estilo del creador.`
      },
      {
        role: 'user',
        content: `GUIÓN ACTUAL:
${currentScript}

INSTRUCCIONES DE CAMBIO:
${instructions}

MI CANAL:
Nicho: ${userBrief.niche}
Tono: ${userBrief.tone}
Audiencia: ${userBrief.audience}

Reescribí el guión aplicando los cambios pedidos.`
      }
    ],
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
export async function analyzeVideo(req, res) {
  const { videoUrl, videoMeta, userBrief, mode, currentScript, instructions } = req.body;

  // Mode: regenerate (no need to download again)
  if (mode === 'regenerate') {
    if (!currentScript || !instructions) {
      return res.status(400).json({ error: 'Faltan datos para regenerar' });
    }
    const newScript = await regenerateScript(currentScript, instructions, userBrief);
    return res.json({ script: newScript });
  }

  // Mode: analyze (full pipeline)
  if (!videoUrl || !userBrief) {
    return res.status(400).json({ error: 'Faltan datos para analizar' });
  }

  let audioPath = null;

  try {
    // Step 1: Download
    res.write && res.flush;
    audioPath = await downloadAudio(videoUrl);

    // Step 2: Transcribe
    const transcription = await transcribeAudio(audioPath);

    // Step 3: Extract ideas
    const ideas = await filterAndExtractIdeas(transcription, videoMeta);

    // Step 4: Generate script
    const script = await generateScript(transcription, ideas, videoMeta, userBrief);

    res.json({
      transcription,
      ideas,
      script
    });

  } catch (error) {
    console.error('Error en pipeline:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup temp file
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
}
