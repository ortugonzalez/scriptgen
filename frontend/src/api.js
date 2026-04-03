const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function searchChannel({ username, platforms }) {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, platforms })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error buscando canal');
  return res.json();
}

export async function analyzeVideo({ videoUrl, videoMeta, userBrief }) {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, videoMeta, userBrief })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error analizando video');
  return res.json();
}

export async function regenerateScript({ currentScript, instructions, userBrief }) {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'regenerate', currentScript, instructions, userBrief })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error regenerando');
  return res.json();
}
