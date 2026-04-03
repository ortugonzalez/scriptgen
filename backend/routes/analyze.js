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
    console.log("URL normalizada:", normalizedUrl);
    try {
      const res = await axios.post(
        "https://api.apify.com/v2/acts/trisecode~yt-transcript/run-sync-get-dataset-items?token=" + APIFY_TOKEN,
        { videoUrl: normalizedUrl },
        { timeout: 60000 }
      );
      const data = res.data?.[0];
      console.log("Apify yt-transcript keys:", data ? Object.keys(data) : "empty");
      if (data?.transcript && typeof data.transcript === "string" && data.transcript.length > 50) return data.transcript;
      if (Array.isArray(data?.transcript)) return data.transcript.map(t => t.text || t).join(" ");
      if (data?.captions && Array.isArray(data.captions)) return data.captions.map(c => c.text).join(" ");
      if (data?.text && data.text.length > 50) return data.text;
    } catch (e) {
      console.log("trisecode actor fallo:", e.message);
    }
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
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Sos un creador de contenido argentino experto en redes sociales. Tu trabajo es escribir guiones cortos, directos y con mucha personalidad rioplatense.\n\nReglas ESTRICTAS:\n- Habla en argentino: che, boludo, re, posta, dale, ni en pedo, etc.\n- Tono crudo y honesto, como si lo dijera un amigo en un bar\n- Hook impactante en las primeras 3-5 palabras que pare el scroll\n- Desarrollo que conecte emocionalmente con la audiencia\n- Sin palabras rebuscadas, sin sonar a IA, sin ser formal\n- Video corto: maximo 60-90 segundos\n- Termina SIEMPRE con una pregunta personal y directa al espectador\n\nFormato de salida:\n[HOOK]\n...\n\n[DESARROLLO]\n...\n\n[CIERRE + PREGUNTA]\n..." },
      { role: "user", content: "VIDEO VIRAL ANALIZADO:\nTitulo: " + videoMeta.title + "\nPor que funciono: " + (ideas.por_que_viral||"engagement emocional") + "\nIdeas clave: " + (ideas.ideas_clave?.join(", ")||"No detectadas") + "\n\nCONTENIDO ORIGINAL:\n" + transcription + "\n\nMI CANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience + "\n\nEscribi un guion NUEVO inspirado en este video pero con tu voz argentina. NO copies, RE-INTERPRETALO para mi audiencia." }
    ],
    temperature: 0.8
  });
  return completion.choices[0].message.content;
}

async function regenerateScript(currentScript, instructions, userBrief) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Sos un editor de contenido argentino. Aplica los cambios pedidos manteniendo el tono rioplatense y el estilo del creador. Sin formalismos, sin sonar a IA." },
      { role: "user", content: "GUION ACTUAL:\n" + currentScript + "\n\nCAMBIOS PEDIDOS:\n" + instructions + "\n\nMI CANAL:\nNicho: " + userBrief.niche + "\nTono: " + userBrief.tone + "\nAudiencia: " + userBrief.audience + "\n\nReescribi el guion aplicando los cambios." }
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
