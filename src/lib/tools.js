/**
 * Tool registry — every AI tool is a config entry rendered by <ToolShell>.
 * Adding a new tool = adding one object here. `fields` describe the form;
 * `buildPrompt(values)` produces the user message; `system` sets the persona.
 */
import {
  Share2, Clapperboard, Megaphone, Palette, Recycle, Gauge, CalendarDays,
  Lightbulb, Crosshair, MessagesSquare, Coins, BookMarked, Sparkles,
} from 'lucide-react'

const PLATFORMS = ['X (Twitter)', 'Instagram', 'TikTok', 'Facebook', 'WhatsApp', 'LinkedIn']
const TONES = ['Energetic', 'Professional', 'Funny', 'Inspirational', 'Educational', 'Bold/Controversial']
const GOALS = ['Grow followers', 'Drive sales', 'Build authority', 'Get engagement', 'Promote a product']

const BASE_PERSONA = `You are CreatorForge, an elite content strategist for Nigerian creators, hustlers, students and small businesses. You understand local context (naira pricing, WhatsApp culture, NG trends) and global best practice. Output clean, well-structured Markdown. Be specific and actionable — no fluff.`

export const TOOLS = [
  {
    id: 'post-generator',
    name: 'Post Generator',
    tagline: 'One topic → optimized posts for every platform',
    icon: Share2,
    color: 'from-indigo-500 to-blue-500',
    fields: [
      { key: 'topic', label: 'Topic or idea', type: 'text', placeholder: 'e.g. How I grew my thrift business with WhatsApp status', required: true },
      { key: 'goal', label: 'Goal', type: 'select', options: GOALS },
      { key: 'platforms', label: 'Platforms', type: 'multi', options: PLATFORMS },
      { key: 'tone', label: 'Tone', type: 'select', options: TONES },
    ],
    system: BASE_PERSONA + ' You write scroll-stopping, platform-native posts with strong hooks, correct formatting per platform, and clear CTAs.',
    buildPrompt: (v) =>
      `Topic: ${v.topic}\nGoal: ${v.goal}\nTone: ${v.tone}\nCreate optimized posts for: ${(v.platforms?.length ? v.platforms : PLATFORMS).join(', ')}.\nFor each platform: use a "## Platform" heading, platform-native format (threads for X, hashtags for IG/TikTok, hook-first for TikTok, professional for LinkedIn, personal broadcast style for WhatsApp), and a clear CTA.`,
  },
  {
    id: 'yt-script',
    name: 'YouTube Scripter',
    tagline: 'Full scripts with hooks, timestamps & CTAs',
    icon: Clapperboard,
    color: 'from-red-500 to-orange-500',
    fields: [
      { key: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. 5 side hustles for Nigerian students in 2026', required: true },
      { key: 'length', label: 'Target length', type: 'select', options: ['Short (under 60s)', '5 minutes', '10 minutes', '15+ minutes'] },
      { key: 'tone', label: 'Style', type: 'select', options: TONES },
    ],
    system: BASE_PERSONA + ' You write complete YouTube scripts: retention-engineered hook, timestamped sections, b-roll/visual cues, pattern interrupts, and a strong CTA.',
    buildPrompt: (v) =>
      `Topic: ${v.topic}\nLength: ${v.length}\nStyle: ${v.tone}\nWrite the full script with timestamps, spoken lines, [VISUAL] cues, and end-screen CTA.`,
  },
  {
    id: 'ad-generator',
    name: 'Ad Studio',
    tagline: 'Meta & TikTok ad scripts and captions that convert',
    icon: Megaphone,
    color: 'from-amber-500 to-yellow-500',
    fields: [
      { key: 'topic', label: 'Product / offer', type: 'text', placeholder: 'e.g. Online baking class, ₦15,000, starts next month', required: true },
      { key: 'platform', label: 'Ad platform', type: 'select', options: ['Meta (FB + IG)', 'TikTok', 'Both'] },
      { key: 'audience', label: 'Target audience', type: 'text', placeholder: 'e.g. Young mums in Lagos, 24–40' },
    ],
    system: BASE_PERSONA + ' You are a direct-response copywriter. Write ads with pain-point hooks, benefit stacks, social proof, urgency, and platform-compliant claims.',
    buildPrompt: (v) =>
      `Product/offer: ${v.topic}\nPlatform: ${v.platform}\nAudience: ${v.audience || 'general Nigerian audience'}\nWrite: primary text (2 variants), headline options, description, and a 15s video ad script with timed beats.`,
  },
  {
    id: 'design-prompts',
    name: 'Design Prompter',
    tagline: 'Prompts for Canva, Midjourney & carousels',
    icon: Palette,
    color: 'from-pink-500 to-rose-500',
    fields: [
      { key: 'topic', label: 'What are you designing for?', type: 'text', placeholder: 'e.g. IG carousel about saving money as a student', required: true },
      { key: 'style', label: 'Visual style', type: 'select', options: ['Premium/minimal', 'Bold/colorful', 'Corporate/clean', 'Playful/fun', 'Luxury/dark'] },
    ],
    system: BASE_PERSONA + ' You produce ready-to-paste image-generation prompts (Midjourney/DALL-E) and detailed Canva design briefs with palette hex codes, fonts, and per-slide layouts.',
    buildPrompt: (v) => `Design goal: ${v.topic}\nStyle: ${v.style}\nGive: 2 Midjourney prompts, 1 DALL-E prompt, a Canva brief (slide-by-slide if carousel), color palette hex codes, and font pairings.`,
    // Copy-ready gallery rendered under the tool
    examples: [
      { title: 'Premium product shot', prompt: 'Studio photograph of [product] on a floating glass pedestal, deep navy backdrop, single warm rim light, subtle purple gradient glow, ultra sharp, 8k commercial photography --ar 4:5' },
      { title: 'Bold IG carousel cover', prompt: 'Flat design illustration, giant bold headline space, vibrant purple-to-indigo gradient background, 3D floating icons around the edges, dribbble trending, clean negative space --ar 4:5' },
      { title: 'Luxury dark branding', prompt: 'Minimal luxury brand visual, matte black background, gold and violet accent lines, embossed logo space in center, cinematic soft light from above, premium editorial style --ar 1:1' },
      { title: 'Naija street energy', prompt: 'Vibrant Lagos street scene illustration, danfo yellow accents with purple dusk sky, energetic young entrepreneur with phone, bold comic shading, poster style --ar 9:16' },
      { title: 'Clean tutorial thumbnail', prompt: 'YouTube thumbnail layout, excited presenter on right third, big contrasting text area left, blurred desk setup background, saturated indigo/purple palette, high CTR style, 4k --ar 16:9' },
      { title: 'Food that sells', prompt: 'Overhead food photography of [dish], steam rising, rich colors, rustic dark wood table, soft natural window light, garnish details in focus, appetizing commercial style --ar 4:5' },
    ],
  },
  {
    id: 'repurposer',
    name: 'Repurposing Engine',
    tagline: 'Long-form → shorts, threads & carousels',
    icon: Recycle,
    color: 'from-emerald-500 to-teal-500',
    fields: [
      { key: 'topic', label: 'Paste your long-form content', type: 'textarea', placeholder: 'Paste a blog post, video script, or newsletter…', required: true },
      { key: 'formats', label: 'Output formats', type: 'multi', options: ['X thread', 'IG carousel', 'Shorts/Reels script', 'WhatsApp broadcast', 'LinkedIn post'] },
    ],
    system: BASE_PERSONA + ' You repurpose long-form content into platform-native short formats while preserving the core insight and adding fresh hooks per format.',
    buildPrompt: (v) => `Source content:\n"""\n${v.topic}\n"""\nRepurpose into: ${(v.formats?.length ? v.formats : ['X thread', 'IG carousel', 'Shorts/Reels script']).join(', ')}. Use a "## Format" heading per output.`,
  },
  {
    id: 'viral-score',
    name: 'Viral Score',
    tagline: 'Score your draft & get an optimized rewrite',
    icon: Gauge,
    color: 'from-violet-500 to-purple-500',
    special: 'viral',
    fields: [
      { key: 'topic', label: 'Paste your draft post', type: 'textarea', placeholder: 'Paste the post you want scored…', required: true },
      { key: 'platform', label: 'Platform', type: 'select', options: PLATFORMS },
    ],
    improveSystem: BASE_PERSONA + ' You are a viral-content editor. Rewrite the given draft into its strongest possible version for the platform: sharper hook, curiosity gap, one command CTA, platform-native formatting. Output only the rewritten post as plain text — no commentary.',
    system: BASE_PERSONA + ' You are a viral-content analyst. Respond ONLY with valid JSON, no markdown fences, matching: {"score": number 0-100, "verdict": string, "breakdown": [{"label": string, "score": number, "note": string}] (exactly 5 items: Hook strength, Emotional trigger, Clarity & flow, CTA, Platform fit), "improvements": [3 strings], "rewritten": string}.',
    buildPrompt: (v) => `Platform: ${v.platform}\nDraft:\n"""\n${v.topic}\n"""\nAnalyze and return the JSON.`,
  },
  {
    id: 'calendar',
    name: 'Content Calendar',
    tagline: '30-day niche-based content plan',
    icon: CalendarDays,
    color: 'from-sky-500 to-cyan-500',
    special: 'calendar',
    fields: [
      { key: 'topic', label: 'Your niche', type: 'text', placeholder: 'e.g. Personal finance for young Nigerians', required: true },
      { key: 'goal', label: 'Primary goal', type: 'select', options: GOALS },
      { key: 'frequency', label: 'Posting frequency', type: 'select', options: ['Daily', '5x per week', '3x per week'] },
    ],
    system: BASE_PERSONA + ' You build 30-day content calendars. Respond ONLY with valid JSON, no markdown fences, matching: {"weeks":[{"theme": string, "days":[{"day": number 1-30, "idea": string (under 12 words), "format": one of "Post"|"Video"|"Carousel"|"Story"|"Thread"|"Rest"}]}]} — exactly 4 weeks covering days 1-28, every day present (use format "Rest" on non-posting days).',
    buildPrompt: (v) => `Niche: ${v.topic}\nGoal: ${v.goal}\nFrequency: ${v.frequency}\nBuild the 30-day calendar JSON.`,
  },
  {
    id: 'trends',
    name: 'Idea & Trend Lab',
    tagline: 'Fresh ideas and trending angles for your niche',
    icon: Lightbulb,
    color: 'from-yellow-400 to-amber-500',
    fields: [
      { key: 'topic', label: 'Your niche', type: 'text', placeholder: 'e.g. Tech skills / fashion / food content', required: true },
    ],
    system: BASE_PERSONA + ' You generate trend-aware content ideas: current format trends, 10 specific ready-to-film ideas, and one differentiating angle to own.',
    buildPrompt: (v) => `Niche: ${v.topic}\nGive: 4 trending formats working now (with why), 10 specific content ideas, and one strategic angle to own in this niche.`,
  },
  {
    id: 'competitor',
    name: 'Competitor Analyzer',
    tagline: 'Learn from top accounts, find your edge',
    icon: Crosshair,
    color: 'from-slate-500 to-slate-400',
    fields: [
      { key: 'handle', label: 'Competitor handle (optional)', type: 'text', placeholder: 'e.g. @fitfam_ng on TikTok' },
      { key: 'topic', label: 'Niche or competitor description', type: 'text', placeholder: 'e.g. Top fitness creators on Nigerian TikTok', required: true },
    ],
    system: BASE_PERSONA + ' You analyze competitive landscapes: what top accounts do well, exploitable gaps, and a concrete counter-strategy. When a specific handle is given, structure the analysis around what an account like that typically does in this niche.',
    buildPrompt: (v) => `${v.handle ? `Competitor handle: ${v.handle}\n` : ''}Analyze: ${v.topic}\nGive: what top accounts do well (patterns), 3 exploitable content gaps, and a 3-move counter-strategy I can start this week.`,
  },
  {
    id: 'engagement',
    name: 'Engagement Helper',
    tagline: 'Smart replies, comments & DM scripts',
    icon: MessagesSquare,
    color: 'from-blue-500 to-indigo-400',
    fields: [
      { key: 'link', label: 'Post URL (optional)', type: 'text', placeholder: 'e.g. https://x.com/you/status/… or IG post link' },
      { key: 'topic', label: 'Describe the post or what you need', type: 'textarea', placeholder: 'e.g. My post about starting a POS business got 40 comments — help me reply, or: write a DM to pitch a collab', required: true },
    ],
    system: BASE_PERSONA + ' You write engagement copy: community-building replies, value-add comments for bigger accounts, collab DM openers, and graceful negativity handling.',
    buildPrompt: (v) => `${v.link ? `Post link: ${v.link}\n` : ''}Context: ${v.topic}\nProvide paste-ready replies/comments/DMs appropriate to this context, with brief notes on when to use each.`,
  },
  {
    id: 'monetization',
    name: 'Monetization Ideas',
    tagline: 'Turn your content into income streams',
    icon: Coins,
    color: 'from-green-500 to-emerald-400',
    fields: [
      { key: 'topic', label: 'Your niche & audience size', type: 'text', placeholder: 'e.g. Cooking content, 3k IG followers, mostly students', required: true },
      { key: 'contentType', label: 'Your main content type', type: 'select', options: ['Short videos (TikTok/Reels)', 'Long videos (YouTube)', 'Posts & threads', 'Carousels & graphics', 'Live streams', 'Mixed'] },
    ],
    system: BASE_PERSONA + ' You design monetization playbooks ranked by speed-to-first-naira, with realistic naira pricing and a concrete this-week action. Tailor streams to the creator\'s main content format.',
    buildPrompt: (v) => `Situation: ${v.topic}\nMain content type: ${v.contentType}\nGive a ranked monetization playbook (6 streams max) tailored to this content type, with naira pricing, effort level, and one specific action to take this week.`,
  },
  {
    id: 'templates',
    name: 'Templates Library',
    tagline: 'Your saved hooks, formats & frameworks',
    icon: BookMarked,
    color: 'from-fuchsia-500 to-pink-500',
    special: 'library',
  },
  {
    id: 'strategist',
    name: 'AI Strategist',
    tagline: 'Chat with your niche-aware content coach',
    icon: Sparkles,
    color: 'from-brand-500 to-accent-500',
    special: 'chat',
    system: BASE_PERSONA + ' You are a conversational strategist. Give focused, opinionated advice; end each reply with a next step or a sharpening question. Keep replies under 250 words unless asked for a full plan.',
  },
]

export const getTool = (id) => TOOLS.find((t) => t.id === id)
