/**
 * Built-in demo generations shown when no AI API key is configured.
 * Realistic, Nigerian-creator-flavoured samples so the product feels alive
 * out of the box. The last user message topic is woven in where possible.
 */

function topicFrom(messages) {
  const last = [...(messages || [])].reverse().find((m) => m.role === 'user')
  const text = last?.content || ''
  const m = text.match(/Topic:\s*(.+)/i)
  return (m ? m[1] : text).split('\n')[0].trim().slice(0, 80) || 'your topic'
}

const SAMPLES = {
  'post-generator': (t) => `## 𝕏 (Twitter)
Nobody is coming to save your content. ${t} is your unfair advantage — if you actually use it.

Here's the 3-step play I'd run this week: 🧵👇

## Instagram
✨ ${t} — but make it make money.

Swipe-worthy truth: consistency beats talent when talent won't post. Save this for your Monday planning session. 📌

👉 Follow for daily creator plays.
#NaijaCreators #ContentStrategy #CreatorEconomy

## TikTok (hook + caption)
HOOK (first 2s): "I made my first ₦100k online because of ${t} — let me show you."
CAPTION: POV: you stopped scrolling and started building. 🔥 #fyp #naijatiktok #sidehustle

## WhatsApp Status
🚀 Quick one: ${t} is the cheapest skill upgrade you can make this month. I broke it down — reply "INFO" and I'll send you the guide.

## LinkedIn
Most people overcomplicate ${t}.

After 90 days of testing, three things actually moved the needle:
1. Publishing before perfecting
2. One platform, mastered, then repurposed
3. Talking to 10 real customers weekly

Which one are you skipping?

## Facebook
Real talk 💯 — ${t} changed how I run my hustle this year. Full breakdown in the comments. Tag someone who needs to see this. 👇`,

  'yt-script': (t) => `# YouTube Script: "${t}"

**HOOK (0:00–0:15)**
"If you've been struggling with ${t}, this video will save you six months of trial and error — and I'll prove it in the next 60 seconds."

**INTRO (0:15–0:45)**
Quick credibility: who you are + one result. Promise the payoff: "By the end, you'll have a step-by-step system."

**SECTION 1 — The Mistake Everyone Makes (0:45–3:00)**
Story of failure → the turning point insight. Pattern-interrupt b-roll every 15–20s.

**SECTION 2 — The Framework (3:00–7:30)**
Three steps, each with an on-screen graphic:
1. Foundation — set it up right
2. System — make it repeatable
3. Scale — multiply what works

**SECTION 3 — Proof + Common Objections (7:30–9:30)**
Show receipts. Answer "but does this work in Nigeria?" head-on.

**CTA (9:30–10:00)**
"Comment 'FORGE' and I'll send you my free template. Subscribe — next week I'm breaking down exactly how I'd start from zero."`,

  'ad-generator': (t) => `# Meta Ad — "${t}"

**Primary Text (scroll-stopper):**
Tired of posting every day with nothing to show for it? 😤
${t} — without the guesswork. Over 2,000 hustlers already inside.
✅ Works even with 100 followers
✅ Results in 30 days or your money back
👇 Tap "Learn More" before the price goes up Friday.

**Headline:** Turn Content Into Cash — Starting This Week
**Description:** Join 2,000+ Nigerian creators. ₦3,000/month. Cancel anytime.

---

# TikTok Ad Script (15s)
(0–2s) Face to camera: "POV: your content finally pays you."
(2–8s) Fast cuts of the product + captions on screen.
(8–13s) Social proof: "2,000+ creators. Real results."
(13–15s) CTA: "Link in bio. Your future self will thank you."`,

  'design-prompts': (t) => `# Visual Prompts — "${t}"

**Midjourney / DALL-E:**
"Premium tech editorial illustration of ${t}, deep navy and electric purple gradient palette, glassmorphism panels, soft volumetric glow, isometric 3D elements, clean negative space for headline text, 4k, dribbble trending --ar 4:5"

**Canva brief (IG carousel, 5 slides):**
1. Cover — bold 64pt headline on dark gradient, single glowing icon
2. Problem — stat callout in accent purple pill
3. Solution — 3 numbered steps, left-aligned, generous spacing
4. Proof — testimonial card with 5 stars
5. CTA — "Save this 📌 + Follow" with brand handle

**Brand palette:** #0B0D14 (ink), #6366F1 (indigo), #A855F7 (purple), #F8FAFC (light)
**Fonts:** Inter ExtraBold headings / Inter Regular body`,

  repurposer: (t) => `# Repurposed: "${t}"

**🧵 X Thread (7 tweets)**
1/ Everything I learned about ${t} — condensed into one thread. Bookmark this.
2/ The core insight: attention is cheap, trust is expensive. Optimise for trust.
3/ Step one: extract your 3 strongest points. Kill the rest.
4/ Step two: every point becomes a standalone post with its own hook.
5/ Step three: the best-performing post becomes next week's video.
6/ This loop = 1 idea → 10+ pieces of content → compounding audience.
7/ Follow me for more systems like this. RT tweet 1 to help another creator.

**📱 Shorts/Reels script (30s)**
Hook: "You're creating too much and distributing too little."
Body: one idea → thread → carousel → short → newsletter. Same idea, five surfaces.
CTA: "Follow — tomorrow I'll show you the exact tools."

**🎠 Carousel (6 slides)**
1. "Stop creating. Start multiplying." 2. The 1→10 rule 3. Extract 4. Reformat 5. Schedule 6. Save + follow`,

  'viral-score': () => JSON.stringify({
    score: 68,
    verdict: 'Solid foundation — hook needs work',
    breakdown: [
      { label: 'Hook strength', score: 55, note: 'First line is generic; lead with the payoff or a pattern interrupt.' },
      { label: 'Emotional trigger', score: 72, note: 'Good relatability, could push curiosity harder.' },
      { label: 'Clarity & flow', score: 80, note: 'Easy to read. Short sentences work well.' },
      { label: 'CTA', score: 60, note: 'CTA is passive. Give one specific action.' },
      { label: 'Platform fit', score: 70, note: 'Add 2–3 niche hashtags and a line break after the hook.' },
    ],
    improvements: [
      'Rewrite the hook: open with the result, not the context — "I gained 4,000 followers in 30 days. Here\'s the exact system."',
      'Add a curiosity gap in line 2 so readers must keep going.',
      'End with ONE command CTA: "Comment GROWTH and I\'ll send you the template."',
    ],
    rewritten: 'I gained 4,000 followers in 30 days — with zero ads.\n\nThe system is stupidly simple (and most creators skip step 2):\n\n1. One sharp idea daily\n2. Hook rewritten 5x before posting\n3. Reply to every comment in hour one\n\nComment "GROWTH" and I\'ll send you my hook template. 🚀',
  }),

  calendar: (t) => JSON.stringify({
    weeks: [
      { theme: 'Week 1 — Authority Foundation', days: [
        { day: 1, idea: `Myth-busting: everyone gets ${t} wrong`, format: 'Post' },
        { day: 2, idea: 'Personal story + the lesson it taught', format: 'Video' },
        { day: 3, idea: 'Quick-win tutorial in 60 seconds', format: 'Video' },
        { day: 4, idea: 'Poll: what should I break down next?', format: 'Story' },
        { day: 5, idea: '5 beginner mistakes carousel', format: 'Carousel' },
        { day: 6, idea: 'Behind the scenes of your process', format: 'Story' },
        { day: 7, idea: 'Rest & reply to every comment', format: 'Rest' },
      ]},
      { theme: 'Week 2 — Trust Building', days: [
        { day: 8, idea: 'Tools I actually use (with receipts)', format: 'Carousel' },
        { day: 9, idea: 'Client/result proof post', format: 'Post' },
        { day: 10, idea: 'Trending audio + niche twist', format: 'Video' },
        { day: 11, idea: 'Day-in-my-life as a creator', format: 'Story' },
        { day: 12, idea: 'Answer the top question from comments', format: 'Video' },
        { day: 13, idea: 'What ₦10k gets you in this niche', format: 'Post' },
        { day: 14, idea: 'Rest & engage on bigger accounts', format: 'Rest' },
      ]},
      { theme: 'Week 3 — Growth Push', days: [
        { day: 15, idea: 'Controversial (but defensible) opinion', format: 'Post' },
        { day: 16, idea: 'Duet/collab with a bigger creator', format: 'Video' },
        { day: 17, idea: '"Steal my system" value bomb', format: 'Thread' },
        { day: 18, idea: 'Before/after transformation', format: 'Carousel' },
        { day: 19, idea: 'React to worst advice in the niche', format: 'Video' },
        { day: 20, idea: 'Q&A box + answer live', format: 'Story' },
        { day: 21, idea: 'Recap thread of best insights', format: 'Thread' },
      ]},
      { theme: 'Week 4 — Monetisation', days: [
        { day: 22, idea: 'Problem-agitation: the real cost of waiting', format: 'Post' },
        { day: 23, idea: 'Case study with actual numbers', format: 'Carousel' },
        { day: 24, idea: 'Soft pitch + testimonial', format: 'Post' },
        { day: 25, idea: 'FAQ objection-handling video', format: 'Video' },
        { day: 26, idea: 'Launch announcement + WhatsApp push', format: 'Post' },
        { day: 27, idea: 'Last-call urgency story', format: 'Story' },
        { day: 28, idea: 'Thank-you + next month teaser', format: 'Rest' },
      ]},
    ],
  }),

  trends: (t) => `# Trends & Ideas — ${t}

**🔥 Hot right now**
1. "Day in my life as a Nigerian [niche]" — high relatability, low production
2. Cost-breakdown content ("What ₦50k gets you in…") — saves + shares spike
3. Duet/stitch reactions to viral takes in your niche
4. "POV" skits with trending audio, localised humour

**💡 10 ready-to-use ideas**
1. The mistake that cost me ₦___ (story)
2. 5 tools under ₦5k that upgraded my hustle
3. Reacting to the worst advice in ${t}
4. My exact daily routine (timestamped)
5. Beginner vs pro: side-by-side
6. "If I started from zero in 2026, I'd do this"
7. Client transformation before/after
8. Unpopular opinion + defend it in comments
9. Screen-record tutorial (60s)
10. Monthly income/expense transparency post

**📈 Angle to own:** be the person who shows receipts — numbers build trust faster than motivation.`,

  competitor: (t) => `# Competitor Analysis — ${t}

**What top accounts in this niche do well**
• Post 5–7×/week with 70% value / 20% personality / 10% pitch
• Hooks lead with numbers or negative framing ("Stop doing X")
• Heavy use of carousels for saves; shorts for reach

**Gaps you can exploit**
1. Few reply to comments within the first hour — you can win the algorithm here
2. Almost nobody localises examples (naira figures, NG platforms) — instant differentiation
3. Weak lead magnets — a simple WhatsApp-delivered template would out-convert their link-in-bio pages

**Your 3-move counter-strategy**
1. Match their top 3 formats but add receipts/numbers
2. Own one underused format (e.g. 60s screen-record tutorials)
3. Build direct channel early (WhatsApp broadcast/email) — they're renting all their audience`,

  engagement: () => `# Engagement Pack

**Replies that build community (paste-ready):**
• "This is the part most people miss 👇 [add one extra tip]"
• "Facts. What worked for you when you tried it?"
• "Saving this energy for Monday 😂🔥"

**Comment starters to drop on bigger accounts:**
• "The second point is underrated — I tested it and [result]."
• "Adding one thing from experience: …" (value-add = profile visits)

**DM opener (collab):**
"Hey [name] — loved your post on [topic], especially [specific detail]. I create [niche] content for [audience] and I think our audiences overlap. Open to a quick collab idea that'd take you <30 mins?"

**Handling negativity:**
• Correct + kind: "Fair point — here's the context I should've added…"
• Never argue below your own post; pin the best supportive comment instead.`,

  monetization: (t) => `# Monetisation Playbook — ${t}

**Ranked for speed-to-first-naira:**

1. **Digital product (₦2k–₦10k)** — template, guide, or checklist delivered via WhatsApp/Selar. Launch in 7 days to your existing audience.
2. **Service/freelancing** — package the skill behind your content (e.g. "I'll write your 30-day content plan — ₦25k").
3. **Affiliate deals** — hosting, tools, banks' referral programs; disclose and only promote what you use.
4. **Sponsored content** — pitch small NG brands once you pass ~5k engaged followers; media kit = 1 page.
5. **Community (₦1k–₦3k/month)** — private WhatsApp/Telegram with weekly value drops.
6. **Coaching/cohort (₦20k+)** — after digital product proves demand.

**This week's action:** pick #1, write the outline tonight, presell to 10 followers before you build it.`,

  templates: () => `# Saved Template

**The Result-First Hook**
"[Specific result] in [timeframe] — without [common pain]. Here's the exact system:"

**The Contrarian Open**
"Everyone tells you to [common advice]. That advice kept me broke for [time]. Do this instead:"

**The Receipt Post**
Screenshot + "Proof that [claim]. Steps in the comments 👇"`,

  'viral-improve': () => `I gained 4,000 followers in 30 days — with ₦0 in ads.\n\nAnd no, it wasn't luck. It was one boring habit most creators skip:\n\n→ I rewrote every hook 5 times before posting\n→ I replied to every single comment within 60 minutes\n→ I posted one sharp idea daily (not three weak ones)\n\nThe hook template that did the heavy lifting is free.\n\nComment "GROWTH" and it's yours. 🚀`,

  strategist: (t) => `Great question! Here's how I'd think about **${t}** for your niche:

**The short answer:** focus on one platform, one format, one offer for the next 30 days. Depth beats spread every time at this stage.

**Why:** the algorithm rewards consistency within a format, and your audience needs repeated exposure to one clear promise before they trust you.

**Your next 3 moves:**
1. Pick your best-performing post from the last month and make 4 variations of it this week.
2. Set up a simple lead capture (WhatsApp broadcast list works perfectly in Nigeria).
3. Block 20 minutes daily for replies — the first hour after posting matters most.

Want me to turn this into a full 30-day plan, or drill into any of the three moves?`,
}

export function demoGenerate(tool, messages) {
  const t = topicFrom(messages)
  const fn = SAMPLES[tool] || SAMPLES['post-generator']
  return fn(t)
}
