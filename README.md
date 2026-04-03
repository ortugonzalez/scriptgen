# ScriptGen 🎬

Convertí videos virales de YouTube, TikTok e Instagram en guiones adaptados a tu canal.

## Stack

- **Frontend**: React + Tailwind → Deploy en Vercel
- **Backend**: Node.js + Express → Deploy en Railway
- **IA**: Groq (Whisper + LLaMA 3.3 70B) — gratis
- **Scraping YouTube**: YouTube Data API v3 — gratis
- **Scraping TikTok/Instagram**: Apify — free tier

---

## Setup local

### 1. Clonar y preparar

```bash
git clone <tu-repo>
cd scriptgen
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# → Completá el .env con tus keys
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app corre en `http://localhost:5173`

---

## Variables de entorno (backend)

| Variable | Dónde conseguirla |
|---|---|
| `YOUTUBE_API_KEY` | console.cloud.google.com → YouTube Data API v3 |
| `APIFY_API_TOKEN` | apify.com → Settings → Integrations |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `FRONTEND_URL` | URL de tu app en Vercel (para CORS) |

---

## Deploy

### Railway (backend)

1. Subí el código a GitHub
2. En railway.app → New Project → Deploy from GitHub
3. Seleccioná la carpeta `/backend`
4. Agregá las variables de entorno en Railway dashboard
5. Copiá la URL que te da Railway

### Vercel (frontend)

1. En vercel.com → New Project → importá desde GitHub
2. Seleccioná la carpeta `/frontend`
3. Agregá `VITE_API_URL` = URL de tu Railway
4. Actualizá `vercel.json` con la URL de Railway
5. Deploy

---

## Cómo funciona

```
Usuario escribe "@tonyrobbins"
    ↓
Backend busca en YouTube / TikTok / Instagram
    ↓
Se muestran los videos más virales
    ↓
Usuario elige un video + cuenta sobre su canal
    ↓
Backend descarga audio (yt-dlp)
    ↓
Groq Whisper transcribe el audio
    ↓
Groq LLaMA extrae ideas clave
    ↓
Groq LLaMA genera guión adaptado al canal
    ↓
Usuario edita / regenera / copia el guión
```
