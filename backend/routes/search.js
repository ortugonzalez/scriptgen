import axios from 'axios';

// ─── YOUTUBE ────────────────────────────────────────────────────────────────
async function searchYouTube(username) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. Find channel by username/handle
  const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: username,
      type: 'channel',
      maxResults: 1,
      key: apiKey
    }
  });

  const items = searchRes.data.items;
  if (!items?.length) return [];

  const channelId = items[0].snippet.channelId;
  const channelTitle = items[0].snippet.channelTitle;
  const channelThumb = items[0].snippet.thumbnails?.default?.url;

  // 2. Get most viewed Shorts (search by channel + #Shorts)
  const videosRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      channelId,
      q: '#Shorts',
      type: 'video',
      videoDuration: 'short',
      order: 'viewCount',
      maxResults: 5,
      key: apiKey
    }
  });

  const videoIds = videosRes.data.items.map(v => v.id.videoId).join(',');

  // 3. Get stats for those videos
  const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics,snippet',
      id: videoIds,
      key: apiKey
    }
  });

  return statsRes.data.items.map(v => ({
    platform: 'youtube',
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    views: parseInt(v.statistics.viewCount || 0),
    likes: parseInt(v.statistics.likeCount || 0),
    channelTitle,
    channelThumb,
    publishedAt: v.snippet.publishedAt
  }));
}

// ─── TIKTOK via Apify ────────────────────────────────────────────────────────
async function searchTikTok(username) {
  const token = process.env.APIFY_API_TOKEN;
  const cleanUsername = username.replace('@', '');

  const res = await axios.post(
    `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      profiles: [cleanUsername],
      resultsPerPage: 5,
      shouldDownloadVideos: false,
      shouldDownloadCovers: true
    },
    { timeout: 60000 }
  );

  return (res.data || []).slice(0, 5).map(v => ({
    platform: 'tiktok',
    id: v.id,
    title: v.text || v.desc || 'Sin título',
    description: v.text || '',
    thumbnail: v.covers?.default || v.cover || '',
    url: v.webVideoUrl || `https://www.tiktok.com/@${cleanUsername}`,
    views: v.playCount || 0,
    likes: v.diggCount || 0,
    channelTitle: v.authorMeta?.name || cleanUsername,
    channelThumb: v.authorMeta?.avatar || '',
    publishedAt: v.createTimeISO || ''
  }));
}

// ─── INSTAGRAM via Apify ─────────────────────────────────────────────────────
async function searchInstagram(username) {
  const token = process.env.APIFY_API_TOKEN;
  const cleanUsername = username.replace('@', '');

  const res = await axios.post(
    `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      username: [cleanUsername],
      resultsLimit: 5
    },
    { timeout: 60000 }
  );

  return (res.data || []).slice(0, 5).map(v => ({
    platform: 'instagram',
    id: v.id,
    title: v.caption || 'Sin título',
    description: v.caption || '',
    thumbnail: v.displayUrl || v.thumbnailUrl || '',
    url: v.url || `https://www.instagram.com/${cleanUsername}`,
    views: v.videoPlayCount || v.playsCount || 0,
    likes: v.likesCount || 0,
    channelTitle: v.ownerUsername || cleanUsername,
    channelThumb: v.ownerProfilePicUrl || '',
    publishedAt: v.timestamp || ''
  }));
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
export async function searchChannel(req, res) {
  const { username, platforms } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Se requiere un nombre de usuario' });
  }

  const selectedPlatforms = platforms || ['youtube'];
  const results = { youtube: [], tiktok: [], instagram: [], errors: {} };

  await Promise.allSettled([
    selectedPlatforms.includes('youtube') &&
      searchYouTube(username)
        .then(r => { results.youtube = r; })
        .catch(e => { results.errors.youtube = e.message; }),

    selectedPlatforms.includes('tiktok') &&
      searchTikTok(username)
        .then(r => { results.tiktok = r; })
        .catch(e => { results.errors.tiktok = e.message; }),

    selectedPlatforms.includes('instagram') &&
      searchInstagram(username)
        .then(r => { results.instagram = r; })
        .catch(e => { results.errors.instagram = e.message; })
  ]);

  const allVideos = [
    ...results.youtube,
    ...results.tiktok,
    ...results.instagram
  ].sort((a, b) => b.views - a.views);

  res.json({
    videos: allVideos,
    errors: results.errors,
    total: allVideos.length
  });
}
