import Groq from "groq-sdk";
import axios from "axios";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

function normalizeYouTubeUrl(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return match ? "https://www.youtube.com/watch?v=" + match[1] : url;
}

async function getTranscript(videoUrl, platform, videoMeta) {
  console.log("Obteniendo transcripcion para: " + videoUrl + " [" + platform + "]");
  if (platform === "youtube") {
    const normalizedUrl = normalizeYouTubeUrl(videoUrl);
    try {
      const res = await axios.post(
        "https://api.apify.com/v2/acts/trisecode~yt-transcript/run-sync-get-dataset-items?token=" + APIFY_TOKEN,
        { videoUrl: normalizedUrl },
        { timeout: 60000 }
      );
      const data = res.data?.[0];
      console.log("Apify keys:", data ? Object.keys(data) : "empty");
      if (data?.transcript && typeof data.transcript === "string" && data.transcript.length > 50) return data.transcript;
      if (Array.isArray(data?.transcript)) return data.transcript.map(t => t.text || t).join(" ");
      if (Array.isArray(data?.captions)) return data.captions.map(c => c.text).join(" ");
      if (data?.text && data.text.length > 50) return data.text;
    } catch (e) { console.log("trisecode fallo:", e.message); }
    if (process.env.YOUTUBE_API_KEY) {
      const ytMatch = normalizeYouTubeUrl(videoUrl).match(/watch\?v=([^&]+)/);
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
    if (caption.length > 20) return "Caption del video: " + caption;
    throw new Error("Este video no tiene suficiente texto. Proba con un video de YouTube.");
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
  const estilo = userBrief.estilo || "casual y directo";
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Sos un creador de contenido experto en redes sociales.\n\nTu estilo de comunicacion es: " + estilo + "\n\nReglas ESTRICTAS:\n- Respeta el estilo de comunicacion al pie de la letra\n- Hook impactante en las primeras 3-5 palabras que pare el scroll\n- Tono crudo y honesto, como si lo dijera un amigo\n- Sin palabras rebuscadas, sin sonar a IA\n- Video corto: maximo 60-90 segundos\n- Termina SIEMPRE con una pregunta personal y directa al espectador\n- NO copies el video original, RE-INTERPRETALO\n\nFormato de salida:\n[HOOK]\n...\n\n[DESARROLLO]\n...\n\n[CIERRE + PREGUNTA]\n..." },
      { role: "user", content: "VIDEO VIRAL:\nTitulo: " + videoMeta.title + "\nPor que funciono: " + (ideas.por_que_viral||"engagement emocional") + "\nIdeas clave: " + (ideas.ideas_clave?.join(", ")||"No detectadas") + "\n\nCONTENIDO ORIGINAL:\n" + transcription + "\n\nMI CANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience + "\n\nEscribi el guion." }
    ],
    temperature: 0.8
  });
  return completion.choices[0].message.content;
}

async function regenerateScript(currentScript, instructions, userBrief) {
  const estilo = userBrief.estilo || "casual y directo";
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Sos un editor de contenido. Aplica los cambios pedidos manteniendo este estilo de comunicacion: " + estilo + ". Sin formalismos, sin sonar a IA." },
      { role: "user", content: "GUION ACTUAL:\n" + currentScript + "\n\nCAMBIOS PEDIDOS:\n" + instructions + "\n\nMI CANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience + "\n\nReescribi el guion." }
    ],
    temperature: 0.8
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
