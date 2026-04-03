import Groq from "groq-sdk";
import axios from "axios";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

async function getTranscript(videoUrl, platform, videoMeta) {
  console.log("Obteniendo transcripcion para: " + videoUrl + " [" + platform + "]");

  if (platform === "youtube") {
    try {
      const res = await axios.post(
        "https://api.apify.com/v2/acts/trisecode~yt-transcript/run-sync-get-dataset-items?token=" + APIFY_TOKEN,
        { videoUrl: videoUrl },
        { timeout: 60000 }
      );
      const data = res.data?.[0];
      console.log("Apify yt-transcript keys:", data ? Object.keys(data) : "empty");
      if (data?.transcript) return typeof data.transcript === "string" ? data.transcript : JSON.stringify(data.transcript);
      if (data?.text) return data.text;
      if (data?.description) return "Titulo: " + (data.title || "") + "\n\n" + data.description;
      if (Array.isArray(data?.captions)) return data.captions.map(c => c.text).join(" ");
    } catch (e) {
      console.log("trisecode actor fallo:", e.message);
    }
    if (process.env.YOUTUBE_API_KEY) {
      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
      if (ytMatch) {
        const ytRes = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
          params: { part: "snippet", id: ytMatch[1], key: process.env.YOUTUBE_API_KEY }
        });
        const snippet = ytRes.data.items?.[0]?.snippet;
        if (snippet) return "Titulo: " + snippet.title + "\n\nDescripcion: " + snippet.description;
      }
    }
    throw new Error("No se pudo obtener transcripcion de YouTube");
  }

  if (platform === "tiktok" || platform === "instagram") {
    const caption = videoMeta?.description || videoMeta?.title || "";
    if (caption.length > 20) {
      return "Caption del video: " + caption;
    }
    throw new Error("Este video no tiene suficiente texto para generar un guion. Proba con un video de YouTube.");
  }

  throw new Error("Plataforma no soportada: " + platform);
}

async function filterAndExtractIdeas(transcription, videoMeta) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Analiza este contenido de un video viral. Responde SOLO con JSON valido sin markdown:{\"tema_principal\":\"frase\",\"ideas_clave\":[\"idea1\",\"idea2\"],\"estructura\":\"hook, desarrollo, CTA\",\"por_que_viral\":\"razon\",\"angulo_original\":\"diferencial\",\"sugerencias_mejora\":[\"sug1\",\"sug2\"]}" },
      { role: "user", content: "Titulo: " + videoMeta.title + "\nPlataforma: " + videoMeta.platform + "\nViews: " + videoMeta.views + "\n\nContenido:\n" + transcription }
    ],
    temperature: 0.3
  });
  const raw = completion.choices[0].message.content;
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { tema_principal: "No detectado", ideas_clave: [], estructura: raw }; }
}

async function generateScript(transcription, ideas, videoMeta, userBrief) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Sos un experto en contenido para redes sociales. Escribi un guion nuevo inspirado en un video viral.\nReglas: tono casual, 30-90 segundos, hook en las primeras 3 palabras, termina con pregunta.\nFormato:\n[HOOK]\n...\n[DESARROLLO]\n...\n[CIERRE + PREGUNTA]\n..." },
      { role: "user", content: "VIDEO:\nTitulo: " + videoMeta.title + "\nPor que viral: " + (ideas.por_que_viral||"No detectado") + "\nIdeas: " + (ideas.ideas_clave?.join(", ")||"No detectadas") + "\n\nCONTENIDO:\n" + transcription + "\n\nMI CANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience }
    ],
    temperature: 0.7
  });
  return completion.choices[0].message.content;
}

async function regenerateScript(currentScript, instructions, userBrief) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Editor de contenido. Aplica los cambios manteniendo el estilo del creador." },
      { role: "user", content: "GUION:\n" + currentScript + "\n\nCAMBIOS:\n" + instructions + "\n\nCANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience }
    ],
    temperature: 0.7
  });
  return completion.choices[0].message.content;
}

export async function analyzeVideo(req, res) {
  const { videoUrl, videoMeta, userBrief, mode, currentScript, instructions } = req.body;
  if (mode === "regenerate") {
    if (!currentScript || !instructions) return res.status(400).json({ error: "Faltan datos" });
    try { return res.json({ script: await regenerateScript(currentScript, instructions, userBrief) }); }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }
  if (!videoUrl || !userBrief) return res.status(400).json({ error: "Faltan datos" });
  try {
    const transcription = await getTranscript(videoUrl, videoMeta?.platform, videoMeta);
    const ideas = await filterAndExtractIdeas(transcription, videoMeta);
    const script = await generateScript(transcription, ideas, videoMeta, userBrief);
    res.json({ transcription, ideas, script });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
