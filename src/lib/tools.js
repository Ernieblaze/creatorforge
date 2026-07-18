/**
 * Tool registry — every AI tool is a config entry rendered by <ToolShell>.
 * Adding a new tool = adding one object here. `fields` describe the form;
 * `buildPrompt(values)` produces the user message; `system` sets the persona.
 */
import {
  Share2, Clapperboard, Megaphone, Palette, Recycle, Gauge, CalendarDays,
  Lightbulb, Crosshair, MessagesSquare, Coins, BookMarked, Sparkles,
  Link2, Radar, Image, MessageCircleReply,
} from 'lucide-react'

const PLATFORMS = ['X (Twitter)', 'Instagram', 'TikTok', 'Facebook', 'WhatsApp', 'LinkedIn']
const TONES = ['Energetic', 'Professional', 'Funny', 'Inspirational', 'Educational', 'Bold/Controversial']
const GOALS = ['Grow followers', 'Drive sales', 'Build authority', 'Get engagement', 'Promote a product']

const BASE_PERSONA = `You are CreatorForge, an elite content strategist and copywriter for Nigerian creators, hustlers, students and small businesses. You understand local context (naira pricing, WhatsApp culture, NG slang and trends) and world-class copy craft. You write scroll-stopping hooks, you know what actually goes viral, and every line earns its place. Output clean, well-structured Markdown. Be specific, concrete and immediately usable — never generic, never filler.

THE GOLDEN RULE when writing posts: you are ghost-writing the FINISHED post the creator will publish, in their voice, speaking directly TO their audience. The reader of the post is the audience, NOT the creator. Never write advice to the creator ("optimize your profile", "use relevant hashtags"), never meta commentary, never instructions — write the actual words that get posted, ready to copy-paste verbatim. Show, don't tell: instead of "share a personal story", TELL the story. Instead of "use a strong hook", WRITE the hook. Generic numbered tip-listicles ("1. Be consistent 2. Engage more") are banned unless the user explicitly asks for a tips-format post — and even then each point must be a specific, non-obvious insight.`

// Per-platform rules the model must obey when a tool writes platform content.
export const PLATFORM_RULES = `PLATFORM PLAYBOOK — obey exactly for every platform you write:
- X (Twitter): ONE powerful standalone tweet (≤280 chars) by default — punchy, opinionated, conversational. Only use a thread when the content genuinely cannot fit one tweet, and then it must read like a story or argument that flows, never a numbered tip-list. 0–2 hashtags maximum.
- Instagram: the FIRST line is the hook (only ~125 characters show before "…more"), so front-load it; caption ≤2,200 characters; conversational and personal, like talking to one follower; 4–6 strategic hashtags mixing broad + niche reach (never a spammy wall); line breaks and tasteful emojis.
- TikTok: give an on-screen hook for the first 2 seconds; caption ≤150 characters; tie into a current trend or sound; 3–4 tight niche hashtags.
- Facebook: short punchy paragraphs; warm community tone; one clear CTA; minimal hashtags.
- WhatsApp: personal broadcast/status voice; short and forward-friendly; emojis welcome; end with a reply prompt (e.g. reply "INFO").
- LinkedIn: a professional hook line then a natural break (~1,300 characters show before "see more"); story-driven; authority tone; 0–3 hashtags.`

// The two response tiers. `credits` is what each generation costs.
export const MODES = {
  basic: { label: 'Basic', credits: 1, blurb: 'One clean, ready-to-post result.' },
  advanced: { label: 'Advanced', credits: 2, blurb: 'Personalized, multi-variant + strategy notes.' },
}

// Output length options (user-selectable; medium is the default).
// `spec` is injected into the user message — explicit numbers are the only
// thing models reliably obey for length.
export const LENGTHS = {
  short: {
    label: 'Short',
    tokens: 500,
    spec: 'SHORT: 30–60 words per post. One idea, maximum punch. On X: a single tweet.',
  },
  medium: {
    label: 'Medium',
    tokens: 1400,
    spec: 'MEDIUM: 100–180 words per post — hook line, 3–5 short paragraphs of substance, CTA. On X: a tight thread of 3–4 tweets. Do NOT stop at 60 words; do NOT exceed 200.',
  },
  detailed: {
    label: 'Detailed',
    tokens: 2600,
    spec: 'DETAILED: 250–400 words per post — hook line, then a developed mini-story or concrete examples with specifics (numbers, scenarios, steps woven into prose), then CTA. On X: a flowing thread of 6–9 tweets. Anything under 250 words is a FAILURE for this setting.',
  },
}

const LENGTH_DIRECTIVE = {
  short: `\n\nLENGTH — Short: obey the word-count target in the request exactly. Tight, punchy, one idea.`,
  medium: `\n\nLENGTH — Medium: obey the word-count target in the request exactly. A full, satisfying post — never a cramped single paragraph, never an essay.`,
  detailed: `\n\nLENGTH — Detailed: obey the word-count target in the request exactly. Go comprehensive with examples and specifics — depth, not padding.`,
}

// Writing-craft rules: rhythm, spacing, structure — what separates premium
// copy from an AI text blob.
const CRAFT_RULES = `\n\nWRITING CRAFT — non-negotiable formatting rules for any post you write:
- The hook is ALWAYS its own line, followed by an empty line. It must stop the scroll: a bold claim, a question, a number, or tension.
- NEVER output a wall of text. Break into short paragraphs of 1–2 lines with blank lines between them. One idea per line/paragraph.
- Vary the rhythm: mix short punchy lines with a longer one. Use questions to pull the reader in. Use "..." or a line break to create pause and suspense where it helps.
- Emojis: use them with intent, not decoration — one to anchor the hook, a few as visual bullets or emphasis (✅ 🔥 💰 👇), never more than ~5 in a post and never two in a row.
- Lists inside a post use emoji or line-break bullets, not "1. 2. 3." numbering.
- The CTA is its own final line, separated by a blank line, and asks for exactly ONE action (reply, follow, share, comment a word).
- Hashtags (when the platform calls for them) go on their own last line, after the CTA.
- Platform character limits ALWAYS override the requested length (e.g. a "detailed" X post becomes a flowing thread of ≤280-char tweets, never one oversized tweet).`

const MODE_DIRECTIVE = {
  basic: `\n\nRESPONSE MODE — Standard: deliver exactly ONE finished, publish-ready piece per requested platform — the complete post itself, written to the audience, good enough to copy-paste and publish untouched. No variants, no explanations, no preamble, no meta commentary.`,
  advanced: `\n\nRESPONSE MODE — ADVANCED (premium, the user spent extra credits, make it worth it): first deliver the ONE best finished, publish-ready post per platform (written to the audience, copy-paste ready). Then, under it, add: 2 alternative hook lines, a strategic hashtag set, a one-line "💡 Why this works", and "⏰ Best time to post". The post itself always comes first and must stand alone; the extras support it. Every line must earn its place — never padded.`,
}

/** Short creator context injected so output is personal, not generic. */
function personalizationBlock(profile) {
  if (!profile) return ''
  const bits = [
    profile.niche && `Niche: ${profile.niche}.`,
    profile.goal && `Their goal: ${profile.goal}.`,
    profile.username && `Their handle: @${profile.username}.`,
    profile.bio && `Bio: ${profile.bio}.`,
  ].filter(Boolean)
  if (!bits.length) return ''
  return `\n\nABOUT THIS CREATOR (background context): ${bits.join(' ')} Write in their natural voice and use their real handle wherever a handle is needed — NEVER placeholders like "@YourHandle", "[your name]" or "[link]". IMPORTANT: the user's topic always takes priority; only weave in their niche where it fits naturally. Do not force niche references or niche hashtags into content about a different subject.`
}

export const TOOLS = [
  {
    id: 'post-generator',
    name: 'Post Generator',
    tagline: 'One topic → optimized posts for every platform',
    icon: Share2,
    color: 'from-indigo-500 to-blue-500',
    platformAware: true,
    fields: [
      { key: 'topic', label: 'Topic or idea', type: 'text', placeholder: 'e.g. How I grew my thrift business with WhatsApp status', required: true },
      { key: 'goal', label: 'Goal', type: 'select', options: GOALS },
      { key: 'platforms', label: 'Platforms', type: 'multi', options: PLATFORMS },
      { key: 'tone', label: 'Tone', type: 'select', options: TONES },
    ],
    system: BASE_PERSONA + ' You write scroll-stopping, platform-native posts with strong hooks, correct formatting per platform, and clear CTAs.',
    buildPrompt: (v) => {
      const platforms = (v.platforms?.length ? v.platforms : PLATFORMS).join(', ')
      return `Topic/idea: ${v.topic}\nGoal: ${v.goal}\nTone: ${v.tone}\nGhost-write the finished post for: ${platforms}. Use a "## Platform" heading for each, follow the PLATFORM PLAYBOOK exactly, speak directly to the audience, and end with one natural CTA that serves the goal.`
    },
  },
  {
    id: 'yt-script',
    name: 'Video Scripter',
    tagline: 'Scripts for YouTube, TikTok, Reels & Shorts',
    icon: Clapperboard,
    color: 'from-red-500 to-orange-500',
    credits: { basic: 2, advanced: 3 }, // long-form scripts = heavy output
    fields: [
      { key: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. 5 side hustles for Nigerian students in 2026', required: true },
      { key: 'platform', label: 'Platform', type: 'select', options: ['YouTube', 'TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook Video'] },
      { key: 'format', label: 'Format', type: 'select', options: ['Short-form (under 60s)', 'Medium (3–5 min)', 'Long-form (8–15+ min)'] },
      { key: 'tone', label: 'Style', type: 'select', options: TONES },
    ],
    system: BASE_PERSONA + ` You write complete, ready-to-film video scripts, adapted to the platform and format:
- Short-form (TikTok/Reels/Shorts): second-by-second pacing — a 0–2s pattern-interrupt hook, fast beats every few seconds, on-screen text cues, a loop-friendly ending or hard CTA. Script timestamps in seconds (0:00–0:03 style).
- Medium: a tight structure — hook, promise, 3–4 delivering sections, CTA. Timestamps in minutes.
- Long-form (YouTube): retention-engineered — cold-open hook, intro promise, chaptered sections with pattern interrupts and open loops between them, mid-roll re-hook, end-screen CTA.
Always include [VISUAL] / [ON-SCREEN TEXT] / [B-ROLL] cues alongside the spoken lines.`,
    buildPrompt: (v) =>
      `Topic: ${v.topic}\nPlatform: ${v.platform}\nFormat: ${v.format}\nStyle: ${v.tone}\nWrite the full ready-to-film script for this platform and format: timestamps, spoken lines, [VISUAL]/[ON-SCREEN TEXT] cues, and the platform-appropriate CTA.`,
  },
  {
    id: 'ad-generator',
    name: 'Ad Studio',
    tagline: 'Meta & TikTok ad scripts and captions that convert',
    icon: Megaphone,
    color: 'from-amber-500 to-yellow-500',
    platformAware: true,
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
    id: 'image-prompts',
    name: 'Image Prompt Generator',
    tagline: '3 pro prompts for Midjourney, Flux & DALL-E',
    icon: Image,
    color: 'from-cyan-500 to-blue-400',
    fields: [
      { key: 'topic', label: 'Describe the image you want', type: 'textarea', placeholder: 'e.g. A young Nigerian entrepreneur working on a laptop in a bright modern café', required: true },
      { key: 'style', label: 'Style', type: 'select', options: ['Realistic photo', 'Cinematic', 'Illustration/flat', '3D render', 'Luxury/editorial', 'Vibrant pop', 'Minimal/clean'] },
      { key: 'mood', label: 'Mood', type: 'select', options: ['Energetic', 'Calm/premium', 'Dramatic', 'Warm/friendly', 'Dark/moody', 'Bright/optimistic'] },
      { key: 'use', label: 'Where will it be used?', type: 'select', options: ['YouTube thumbnail (16:9)', 'Social post (1:1)', 'Story/Reel cover (9:16)', 'Carousel slide (4:5)', 'Website banner (21:9)'] },
    ],
    system: BASE_PERSONA + ` You are an expert image-prompt engineer for Midjourney, Flux and DALL-E. You know each engine's strengths and syntax: Midjourney loves comma-separated visual descriptors + --ar and --style flags; Flux responds to rich natural-language scene descriptions; DALL-E wants clear, complete sentences. Every prompt you write specifies: subject with specific details, environment, lighting, camera/lens or art style, color palette, composition, and the correct aspect ratio for the stated use.`,
    buildPrompt: (v) => {
      const ar = v.use?.match(/\(([^)]+)\)/)?.[1] ?? '1:1'
      return `Image idea: ${v.topic}\nStyle: ${v.style}\nMood: ${v.mood}\nUse case: ${v.use} — aspect ratio ${ar}\nWrite exactly 3 detailed prompts, one per engine, using these headings: "## Midjourney" (end the prompt with --ar ${ar.replace(':', ':')}), "## Flux", "## DALL-E". Each prompt must be a single copy-paste-ready block with no commentary around it.`
    },
  },
  {
    id: 'repurposer',
    name: 'Repurposing Engine',
    tagline: 'Long-form → shorts, threads & carousels',
    icon: Recycle,
    color: 'from-emerald-500 to-teal-500',
    platformAware: true,
    credits: { basic: 2, advanced: 3 }, // long input + multiple outputs = heavy
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
    id: 'audience-lab',
    name: 'Audience Research Lab',
    tagline: 'Trends, pain points & ready-to-run content ideas',
    icon: Radar,
    color: 'from-lime-500 to-emerald-400',
    fields: [
      { key: 'topic', label: 'Your niche or topic', type: 'text', placeholder: 'e.g. Thrift fashion for Lagos students', required: true },
    ],
    system: BASE_PERSONA + ` You are an audience researcher for the Nigerian market. You surface what this audience is talking about right now, what keeps them up at night, and exactly what content would stop their scroll. Be concrete and local — naira figures, Nigerian scenarios, platform-specific behavior.`,
    buildPrompt: (v) =>
      `Niche/topic: ${v.topic}\nProduce, with these headings:\n"## 🔥 Trending in Nigeria right now" — 5 current conversation topics/angles in this niche.\n"## 😩 Audience pain points" — 5 specific frustrations this audience has (written in their voice).\n"## 🎬 Ready-to-run content ideas" — 8–10 ideas as a list, each with: the format (Reel/Post/Carousel/Thread/Story), a ready hook line in quotes, and one sentence on why it will work.`,
    followups: [
      { label: '→ Send topic to Post Generator', to: (v) => `/app/tool/post-generator?topic=${encodeURIComponent(v.topic)}` },
      { label: '→ Build a 30-day calendar for this niche', to: (v) => `/app/tool/calendar?topic=${encodeURIComponent(v.topic)}` },
    ],
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
    id: 'dm-reply',
    name: 'DM Reply Assistant',
    tagline: 'Paste any message, get the perfect reply',
    icon: MessageCircleReply,
    color: 'from-teal-500 to-green-500',
    noCraft: true,   // post-formatting rules (hashtags, CTAs) don't apply to DM replies
    noLength: true,  // reply length is set by the sender's message, not a word-count picker
    modeDirectives: {
      basic: `\n\nRESPONSE MODE — Standard: output exactly two sections. "## 🔎 What they really mean" — ONE short line on the sender's real intent/mood. "## 💬 Your reply" — ONE ready-to-send reply, nothing else. No commentary, no options.`,
      advanced: `\n\nRESPONSE MODE — ADVANCED (premium, the user spent extra credits): output these sections. "## 🔎 What they really mean" — one sharp line on the sender's real intent/mood. "## 💬 Your reply" — the single best ready-to-send reply. "## 🕊️ Softer version" — a gentler alternative. "## 🔥 Bolder version" — a more confident/daring alternative. "## 💡 Tip" — one line on timing or what to do if they reply badly. Each reply must be complete and sendable on its own.`,
    },
    fields: [
      { key: 'topic', label: 'Paste the message you received', type: 'textarea', placeholder: 'Paste the exact WhatsApp/DM message here…', required: true },
      { key: 'voice', label: 'You are replying as', type: 'select', options: ['Prefer not to say', 'Male', 'Female'] },
      { key: 'context', label: 'What is this about?', type: 'select', options: ['💼 Business / Customer', '❤️ Relationship / Dating', '👥 Friends & Personal life', '🏢 Professional / Work'] },
      { key: 'platform', label: 'Where are you replying?', type: 'select', options: ['WhatsApp', 'Instagram DM', 'X (Twitter) DM', 'Facebook Messenger', 'SMS'] },
      { key: 'tone', label: 'How do you want to sound?', type: 'select', options: ['Warm & friendly', 'Professional', 'Flirty & playful', 'Firm but polite', 'Apologetic', 'Funny', 'Short & dry'] },
      { key: 'goal', label: 'What should the reply achieve? (optional)', type: 'text', placeholder: 'e.g. close the sale, politely say no, keep the chat going, calm them down' },
      { key: 'extra', label: 'Extra context (optional)', type: 'text', placeholder: 'e.g. she is a repeat customer / we argued yesterday' },
    ],
    system: BASE_PERSONA + ` You are a message-reply expert. Your job: study the message the user received — its mood, intent, subtext, and what the sender actually wants — then write the exact reply the user will send, in the user's voice, speaking to the sender.

NON-NEGOTIABLE RULES for replies:
- Sound like a real human typing on their phone: short natural lines, contractions, no formal-letter language. NEVER open with "I hope this message finds you well" or similar.
- Mirror the sender's energy and language: if they wrote in Nigerian Pidgin or mixed slang, the reply may naturally match it; if they were brief, don't send an essay back.
- Match the stated relationship context (business, dating, friends, work) and the platform's texting culture.
- The reply is ready to send verbatim — no placeholders like [name], no advice to the user, no meta commentary inside the reply itself.
- Business replies protect the deal and the relationship; conflict replies de-escalate without the user losing face; boundary replies are firm but never insulting.`,
    buildPrompt: (v) =>
      `Message I received:\n"""\n${v.topic}\n"""\nI am replying as: ${v.voice}\nRelationship context: ${v.context}\nPlatform: ${v.platform}\nTone I want: ${v.tone}\n${v.goal ? `What the reply should achieve: ${v.goal}\n` : ''}${v.extra ? `Extra context: ${v.extra}\n` : ''}Study the message, then write my reply following the response-mode sections exactly. Keep the reply a natural texting length for this platform — match their message, don't write an essay.`,
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
    id: 'bio-link',
    name: 'Link-in-Bio Builder',
    tagline: 'Your own bio page — replaces Linktree, free',
    icon: Link2,
    color: 'from-purple-500 to-fuchsia-500',
    special: 'biolink',
    // Used by the "Generate Bio & Layout" AI button inside the builder
    system: BASE_PERSONA + ' You write magnetic short bios for creator link-in-bio pages. Respond ONLY with valid JSON, no markdown fences, matching: {"bio": string (max 140 chars, punchy, first person, may include 1-2 emojis), "link_titles": [4 strings — compelling button labels this creator should offer, e.g. "🔥 My free caption guide"]}.',
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

/**
 * Compose the full system prompt for a generation: base persona + creator
 * personalization + (for platform tools) the platform playbook + the mode
 * directive. Used for standard generative tools; special JSON tools (viral,
 * calendar) keep their own strict system prompt to protect parsing.
 */
export function composeSystem(tool, { profile, mode = 'basic', length = 'medium' } = {}) {
  let s = tool.system + personalizationBlock(profile)
  if (tool.platformAware) s += `\n\n${PLATFORM_RULES}`
  if (!tool.noCraft) s += CRAFT_RULES
  if (!tool.noLength) s += LENGTH_DIRECTIVE[length] || LENGTH_DIRECTIVE.medium
  s += tool.modeDirectives?.[mode] ?? (MODE_DIRECTIVE[mode] || MODE_DIRECTIVE.basic)
  return s
}
