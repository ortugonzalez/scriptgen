import { useState } from 'react'
import { searchChannel, analyzeVideo, regenerateScript } from './api.js'

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconYouTube = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const IconTikTok = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
)

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
)

// ─── PLATFORM CONFIG ─────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'youtube', label: 'YouTube Shorts', Icon: IconYouTube, color: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', Icon: IconTikTok, color: '#00F2EA' },
  { id: 'instagram', label: 'Instagram Reels', Icon: IconInstagram, color: '#E1306C' }
]

// ─── FORMAT VIEWS ─────────────────────────────────────────────────────────────
function formatViews(n) {
  if (!n) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toString()
}

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all duration-300
            ${i < current ? 'bg-accent text-white' : i === current ? 'bg-accent text-white ring-4 ring-accent/20' : 'bg-card text-muted border border-border'}
          `}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-body hidden sm:block ${i === current ? 'text-bright' : 'text-muted'}`}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px ${i < current ? 'bg-accent' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── VIDEO CARD ───────────────────────────────────────────────────────────────
function VideoCard({ video, onSelect }) {
  const platform = PLATFORMS.find(p => p.id === video.platform)
  return (
    <button
      onClick={() => onSelect(video)}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/50 transition-all duration-300 hover:-translate-y-1 hover:glow-accent text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface overflow-hidden">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted text-4xl">🎬</span>
          </div>
        )}
        {/* Platform badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm"
          style={{ backgroundColor: `${platform?.color}CC` }}
        >
          {platform && <platform.Icon />}
          <span>{platform?.label}</span>
        </div>
        {/* Views badge */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-mono px-2 py-1 rounded-full">
          👁 {formatViews(video.views)}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-bright font-display font-semibold text-sm line-clamp-2 mb-2">
          {video.title}
        </p>
        <div className="flex items-center gap-2">
          {video.channelThumb && (
            <img src={video.channelThumb} alt="" className="w-5 h-5 rounded-full" />
          )}
          <span className="text-muted text-xs">{video.channelTitle}</span>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </button>
  )
}

// ─── PROCESSING STEPPER ───────────────────────────────────────────────────────
function ProcessingStepper({ step }) {
  const steps = [
    { label: 'Descargando audio', icon: '⬇️' },
    { label: 'Transcribiendo con Whisper', icon: '🎙️' },
    { label: 'Extrayendo ideas clave', icon: '💡' },
    { label: 'Generando tu guión', icon: '✍️' }
  ]

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
          i === step ? 'bg-accent/10 border border-accent/30' :
          i < step ? 'opacity-50' : 'opacity-30'
        }`}>
          <span className="text-xl">{s.icon}</span>
          <span className={`text-sm font-body ${i === step ? 'text-bright' : 'text-muted'}`}>
            {s.label}
          </span>
          {i < step && <span className="ml-auto text-accent text-sm">✓</span>}
          {i === step && (
            <div className="ml-auto flex gap-1">
              {[0,1,2].map(d => (
                <div key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('search') // search | results | brief | processing | output
  const [username, setUsername] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube'])
  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [userBrief, setUserBrief] = useState({ niche: '', tone: '', audience: '' })
  const [processingStep, setProcessingStep] = useState(0)
  const [result, setResult] = useState(null)
  const [editedScript, setEditedScript] = useState('')
  const [regenInstructions, setRegenInstructions] = useState('')
  const [showTranscription, setShowTranscription] = useState(false)
  const [showIdeas, setShowIdeas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Toggle platform
  function togglePlatform(id) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // Search
  async function handleSearch(e) {
    e.preventDefault()
    if (!username.trim() || !selectedPlatforms.length) return
    setLoading(true)
    setError('')
    try {
      const data = await searchChannel({ username: username.trim(), platforms: selectedPlatforms })
      setVideos(data.videos)
      setScreen('results')
      if (Object.keys(data.errors).length) {
        setError(`Algunas plataformas tuvieron errores: ${Object.entries(data.errors).map(([k,v]) => `${k}: ${v}`).join(', ')}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Select video → go to brief
  function handleSelectVideo(video) {
    setSelectedVideo(video)
    setScreen('brief')
  }

  // Analyze
  async function handleAnalyze(e) {
    e.preventDefault()
    if (!userBrief.niche || !userBrief.tone || !userBrief.audience) return
    setScreen('processing')
    setProcessingStep(0)
    setError('')

    // Simulate step progression
    const stepTimer = setInterval(() => {
      setProcessingStep(prev => Math.min(prev + 1, 3))
    }, 8000)

    try {
      const data = await analyzeVideo({
        videoUrl: selectedVideo.url,
        videoMeta: selectedVideo,
        userBrief
      })
      clearInterval(stepTimer)
      setProcessingStep(4)
      setResult(data)
      setEditedScript(data.script)
      setTimeout(() => setScreen('output'), 500)
    } catch (err) {
      clearInterval(stepTimer)
      setError(err.message)
      setScreen('brief')
    }
  }

  // Regenerate
  async function handleRegenerate() {
    if (!regenInstructions.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await regenerateScript({
        currentScript: editedScript,
        instructions: regenInstructions,
        userBrief
      })
      setEditedScript(data.script)
      setRegenInstructions('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Copy
  function handleCopy() {
    navigator.clipboard.writeText(editedScript)
  }

  // Reset
  function handleReset() {
    setScreen('search')
    setUsername('')
    setVideos([])
    setSelectedVideo(null)
    setResult(null)
    setEditedScript('')
    setError('')
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <button onClick={handleReset} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold font-mono group-hover:scale-110 transition-transform">
            SG
          </div>
          <span className="font-display font-bold text-bright text-lg">ScriptGen</span>
        </button>
        <span className="text-muted text-xs font-mono hidden sm:block">
          Convertí videos virales en tu contenido
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* ── SCREEN: SEARCH ── */}
        {screen === 'search' && (
          <div className="animate-fade-up">
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 text-accent text-xs font-mono mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
                Powered by Groq Whisper + LLaMA 3.3
              </div>
              <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-bright mb-4 leading-tight">
                Espiá a los mejores.<br />
                <span className="text-accent">Superalos.</span>
              </h1>
              <p className="text-muted text-lg font-body max-w-lg mx-auto">
                Ingresá un perfil, elegí un video viral, y la IA transcribe, analiza y te escribe tu propio guión.
              </p>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Platform selector */}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-3">
                  Plataformas
                </label>
                <div className="flex gap-3 flex-wrap">
                  {PLATFORMS.map(({ id, label, Icon, color }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePlatform(id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-body transition-all duration-200 ${
                        selectedPlatforms.includes(id)
                          ? 'border-accent bg-accent/10 text-bright'
                          : 'border-border bg-card text-muted hover:border-muted'
                      }`}
                    >
                      <span style={{ color: selectedPlatforms.includes(id) ? color : undefined }}>
                        <Icon />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username input */}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-3">
                  Nombre de usuario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="tonyrobbins"
                    className="w-full bg-card border border-border rounded-2xl pl-9 pr-4 py-4 text-bright font-body text-lg placeholder:text-muted focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-accent-hot/10 border border-accent-hot/30 rounded-xl p-4 text-accent-hot text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedPlatforms.length}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-bold text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </span>
                ) : 'Buscar videos virales →'}
              </button>
            </form>

            {/* How it works */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { n: '01', label: 'Buscás un perfil', icon: '🔍' },
                { n: '02', label: 'Elegís un video viral', icon: '🎬' },
                { n: '03', label: 'Contás de qué trata tu canal', icon: '📝' },
                { n: '04', label: 'Recibís tu guión listo', icon: '✨' }
              ].map(({ n, label, icon }) => (
                <div key={n} className="bg-card border border-border rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="font-mono text-xs text-accent mb-1">{n}</div>
                  <div className="text-sm text-bright font-body">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN: RESULTS ── */}
        {screen === 'results' && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <button onClick={() => setScreen('search')} className="text-muted text-sm hover:text-bright transition-colors mb-2 flex items-center gap-1">
                  ← Volver
                </button>
                <h2 className="font-display text-3xl font-bold text-bright">
                  Videos virales de <span className="text-accent">@{username}</span>
                </h2>
                <p className="text-muted text-sm mt-1">{videos.length} videos encontrados · Elegí uno para analizar</p>
              </div>
            </div>

            {error && (
              <div className="bg-accent-hot/10 border border-accent-hot/30 rounded-xl p-4 text-accent-hot text-sm mb-6">
                ⚠️ {error}
              </div>
            )}

            {videos.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted text-lg">No encontramos videos para ese perfil.</p>
                <button onClick={() => setScreen('search')} className="mt-4 text-accent hover:underline text-sm">
                  Intentar con otro nombre
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video, i) => (
                  <VideoCard key={`${video.platform}-${video.id}-${i}`} video={video} onSelect={handleSelectVideo} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCREEN: BRIEF ── */}
        {screen === 'brief' && (
          <div className="animate-fade-up max-w-2xl mx-auto">
            <button onClick={() => setScreen('results')} className="text-muted text-sm hover:text-bright transition-colors mb-6 flex items-center gap-1">
              ← Volver a resultados
            </button>

            {/* Selected video preview */}
            <div className="flex gap-4 bg-card border border-border rounded-2xl p-4 mb-8">
              {selectedVideo?.thumbnail && (
                <img src={selectedVideo.thumbnail} alt="" className="w-24 h-16 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-bright font-display font-semibold text-sm line-clamp-2">{selectedVideo?.title}</p>
                <p className="text-muted text-xs mt-1">👁 {formatViews(selectedVideo?.views)} views · {selectedVideo?.platform}</p>
              </div>
            </div>

            <h2 className="font-display text-3xl font-bold text-bright mb-2">
              Contanos sobre tu canal
            </h2>
            <p className="text-muted mb-8">La IA adapta el guión a tu estilo y audiencia.</p>

            <form onSubmit={handleAnalyze} className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">
                  ¿De qué trata tu canal?
                </label>
                <input
                  type="text"
                  value={userBrief.niche}
                  onChange={e => setUserBrief(p => ({...p, niche: e.target.value}))}
                  placeholder="ej: desarrollo personal, productividad y hábitos"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-bright font-body placeholder:text-muted focus:border-accent transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">
                  ¿Cuál es tu tono?
                </label>
                <input
                  type="text"
                  value={userBrief.tone}
                  onChange={e => setUserBrief(p => ({...p, tone: e.target.value}))}
                  placeholder="ej: casual y directo, sin rodeos"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-bright font-body placeholder:text-muted focus:border-accent transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">
                  ¿Quién es tu audiencia?
                </label>
                <input
                  type="text"
                  value={userBrief.audience}
                  onChange={e => setUserBrief(p => ({...p, audience: e.target.value}))}
                  placeholder="ej: jóvenes de 20-35 años que quieren mejorar su vida"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-bright font-body placeholder:text-muted focus:border-accent transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="bg-accent-hot/10 border border-accent-hot/30 rounded-xl p-4 text-accent-hot text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white font-display font-bold text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                Generar guión ✨
              </button>
            </form>
          </div>
        )}

        {/* ── SCREEN: PROCESSING ── */}
        {screen === 'processing' && (
          <div className="animate-fade-up max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl animate-bounce">🤖</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-bright mb-2">Procesando el video</h2>
            <p className="text-muted mb-10">Esto puede tardar entre 30 segundos y 2 minutos dependiendo del video.</p>
            <div className="bg-card border border-border rounded-2xl p-6">
              <ProcessingStepper step={processingStep} />
            </div>
          </div>
        )}

        {/* ── SCREEN: OUTPUT ── */}
        {screen === 'output' && result && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold text-bright">Tu guión está listo</h2>
                <p className="text-muted text-sm mt-1">Editalo directo acá o regenerá con instrucciones</p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-muted hover:text-bright transition-colors border border-border px-4 py-2 rounded-xl"
              >
                ← Nuevo análisis
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main: Script editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-card border border-accent/30 rounded-2xl overflow-hidden glow-accent">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <span className="text-xs font-mono text-accent uppercase tracking-wider">Tu guión</span>
                    <button
                      onClick={handleCopy}
                      className="text-xs bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-lg transition-colors font-mono"
                    >
                      Copiar
                    </button>
                  </div>
                  <textarea
                    value={editedScript}
                    onChange={e => setEditedScript(e.target.value)}
                    className="w-full bg-transparent px-5 py-4 text-bright font-body text-sm leading-relaxed resize-none focus:outline-none min-h-[400px]"
                    spellCheck={false}
                  />
                </div>

                {/* Regenerate */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-3">
                    ¿Querés cambiar algo?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={regenInstructions}
                      onChange={e => setRegenInstructions(e.target.value)}
                      placeholder="ej: hacelo más corto, cambiá el hook, agregá más energía..."
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-bright font-body text-sm placeholder:text-muted focus:border-accent transition-colors"
                      onKeyDown={e => e.key === 'Enter' && handleRegenerate()}
                    />
                    <button
                      onClick={handleRegenerate}
                      disabled={loading || !regenInstructions.trim()}
                      className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-body text-sm px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                    >
                      {loading ? '...' : 'Regenerar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar: Insights */}
              <div className="space-y-4">
                {/* Video ref */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Video analizado</p>
                  {selectedVideo?.thumbnail && (
                    <img src={selectedVideo.thumbnail} alt="" className="w-full aspect-video object-cover rounded-xl mb-3" />
                  )}
                  <p className="text-bright text-sm font-display font-semibold line-clamp-2">{selectedVideo?.title}</p>
                  <p className="text-muted text-xs mt-1">👁 {formatViews(selectedVideo?.views)} views</p>
                </div>

                {/* Ideas */}
                {result.ideas && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowIdeas(!showIdeas)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
                    >
                      <span className="text-xs font-mono text-muted uppercase tracking-wider">Ideas clave</span>
                      <span className="text-muted text-xs">{showIdeas ? '▲' : '▼'}</span>
                    </button>
                    {showIdeas && (
                      <div className="px-4 pb-4 space-y-2">
                        <p className="text-bright text-xs">{result.ideas.tema_principal}</p>
                        {result.ideas.ideas_clave?.map((idea, i) => (
                          <div key={i} className="flex gap-2 text-xs text-muted">
                            <span className="text-accent">→</span>
                            <span>{idea}</span>
                          </div>
                        ))}
                        {result.ideas.por_que_viral && (
                          <div className="mt-3 p-3 bg-accent/5 rounded-xl border border-accent/10">
                            <p className="text-xs text-accent font-mono mb-1">Por qué fue viral</p>
                            <p className="text-xs text-muted">{result.ideas.por_que_viral}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Transcription */}
                {result.transcription && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowTranscription(!showTranscription)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
                    >
                      <span className="text-xs font-mono text-muted uppercase tracking-wider">Transcripción original</span>
                      <span className="text-muted text-xs">{showTranscription ? '▲' : '▼'}</span>
                    </button>
                    {showTranscription && (
                      <div className="px-4 pb-4">
                        <p className="text-muted text-xs leading-relaxed font-mono">{result.transcription}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
