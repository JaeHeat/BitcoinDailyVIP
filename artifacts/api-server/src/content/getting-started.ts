import type { GettingStartedModule } from "./types";

export const GETTING_STARTED_MODULES: GettingStartedModule[] = [
  {
    id: "welcome",
    title: "Welcome to Bitcoin Daily VIP",
    emoji: "👋",
    duration: "2 min",
    blocks: [
      {
        type: "p",
        text: "Welcome to the community. You're here because you're tired of guessing — following random Twitter calls, buying tops, panic selling bottoms. BDV is built differently.",
      },
      {
        type: "box",
        color: "primary",
        title: "The core philosophy",
        text: "Everything here is **math-first**. No hype, no moon calls. Every signal comes with a defined entry, defined targets, and a defined stop loss. You know your risk before you ever click buy.",
      },
      { type: "h", text: "What you get as a VIP member:" },
      {
        type: "cards",
        items: [
          {
            icon: "☀️",
            title: "Morning Analysis",
            text: "Every trading day, before the NY open, you get a market breakdown — what's setting up, what to avoid, and the bias for the day.",
          },
          {
            icon: "📡",
            title: "Trade Signals",
            text: "Clear, actionable signals with entry zones, take profit targets (TP1, TP2, TP3), and a stop loss. No ambiguity.",
          },
          {
            icon: "📒",
            title: "Live Trading Journal",
            text: "Every trade is logged publicly in real-time on TradrX. You can see the full history — wins, losses, everything. Full transparency.",
          },
          {
            icon: "💬",
            title: "Discord Community",
            text: "A private VIP Discord server with channels for analysis, signals, journaling, and live discussion. This is where it all happens.",
          },
        ],
      },
      {
        type: "box",
        title: "What to expect in your first week",
        text: "Your first week should be about **learning the rhythm**, not rushing into trades. Read the morning analysis daily. Watch how signals play out. Ask questions in Discord. By day 7 you'll have a clear picture of how everything fits together.",
      },
    ],
  },
  {
    id: "signals",
    title: "Reading the Signals",
    emoji: "📡",
    duration: "5 min",
    blocks: [
      {
        type: "p",
        text: "A good signal is not just \"buy Bitcoin.\" It gives you everything you need to manage a trade from start to finish. Here's how to read one.",
      },
      { type: "h", text: "What a real signal looks like" },
      {
        type: "signal",
        strategy: "ORB",
        tf: "5m",
        orderType: "Limit",
        entry: "$79,815.28",
        sl: "$79,459.47",
        tp: "$80,216.34",
        winRate: "60%",
        risk: "0.5%",
        leverage: "5–10x",
        followUp: "tp hit! that one was fast",
      },
      { type: "h", text: "Breaking it down field by field" },
      {
        type: "terms",
        items: [
          {
            term: "BTC Long (5m timeframe)",
            def: "The asset (Bitcoin), direction (Long = buying), and the chart timeframe the setup was spotted on. Shorter timeframes like 5m are faster, scalp-style trades.",
          },
          {
            term: "Strategy: ORB",
            def: "The pattern or strategy behind the signal — in this case Opening Range Breakout. You don't need to know every strategy in-depth, but over time you'll recognize which ones suit your schedule and style.",
          },
          {
            term: "Order Type: Limit",
            def: "How to enter. Limit means place a resting order at the entry price — it fills when price reaches that level. Don't use a market order or you'll likely get a worse price.",
          },
          {
            term: "Entry",
            def: "The exact price to place your limit order. If price doesn't reach the entry level, the trade doesn't happen — never chase it higher.",
          },
          {
            term: "SL (Stop Loss)",
            def: "The price where the trade is wrong and you exit. Set this immediately after your entry order is placed. Non-negotiable.",
          },
          {
            term: "TP (Take Profit)",
            def: "Your exit target. Place a limit sell order here when you enter. The trade closes automatically when price reaches it — you don't need to watch the screen.",
          },
          {
            term: "Win rate",
            def: "The historical hit rate of this strategy. 60% means 6 out of 10 signals from this setup have been winners. Combined with the risk/reward, this determines your edge.",
          },
          {
            term: "Risk",
            def: "The percentage of your total account at risk on this trade. 0.5% on a $10,000 account = $50 maximum loss. Use this to calculate your position size before entering.",
          },
          {
            term: "Leverage",
            def: "The suggested leverage range (5–10x). If you're new, start at the lower end or trade spot (no leverage) until you're comfortable with position sizing and execution.",
          },
        ],
      },
      {
        type: "box",
        color: "amber",
        title: "⚠️ Key rule",
        text: "**Never enter a trade without setting your stop loss first.** The signal tells you exactly where to put it. Enter the order, set the stop, set the TP, then walk away. Don't move your stop loss — if it hits, that's the plan working correctly.",
      },
      { type: "h", text: "Step-by-step: placing the trade" },
      {
        type: "list",
        variant: "ol",
        items: [
          "Signal drops in #trading-signals — read it fully before touching anything.",
          "Calculate your position size: (Account × Risk%) ÷ (Entry − SL). This determines how many units to buy.",
          "Place a limit buy order at the Entry price.",
          "Immediately set your stop loss at the SL price.",
          "Set a take profit limit sell order at the TP price.",
          "Walk away. Both your exit orders are in — no need to watch the screen.",
        ],
      },
    ],
  },
  {
    id: "discord",
    title: "Navigating the Discord",
    emoji: "💬",
    duration: "3 min",
    blocks: [
      {
        type: "p",
        text: "Discord is the live hub of BDV. This is where signals drop, analysis posts, conversations happen, and questions get answered. Here's how to navigate it.",
      },
      { type: "h", text: "Key channels — bookmark these" },
      {
        type: "channels",
        items: [
          {
            name: "#📢 announcements",
            text: "Important updates, policy changes, new features. Read these first.",
          },
          {
            name: "#☀️ morning-analysis",
            text: "Daily pre-market breakdown posted before the NY open. This is your daily roadmap. Read it every morning before markets open.",
          },
          {
            name: "#📡 signals",
            text: "Live trade signals. Each signal is pinned with full details. This is where you execute from.",
          },
          {
            name: "#📒 trade-journal",
            text: "Updates on active signals — entries hit, TPs reached, SLs hit. Follow this to track how signals are progressing.",
          },
          {
            name: "#💬 vip-chat",
            text: "Main community chat. Ask questions, share observations, discuss the market. It's active but focused.",
          },
        ],
      },
      {
        type: "box",
        color: "primary",
        title: "Setting up notifications",
        text: "You don't want to miss signals. Right-click on **#signals** and **#morning-analysis** and set them to **All Messages** — you'll get a ping every time something posts. For other channels, set to **Only Mentions** to avoid noise.",
      },
      { type: "h", text: "Community etiquette" },
      {
        type: "list",
        variant: "dot",
        items: [
          "Ask questions freely — there are no dumb questions here. The community is genuinely helpful.",
          "Don't share your positions and ask for confirmation. Make your own decisions based on the signals and analysis.",
          "No signal calling of your own — this keeps the channel clean and focused.",
          "Keep the chat on-topic. Off-topic goes in #general or #off-topic.",
        ],
      },
      {
        type: "box",
        title: "Pro tip",
        text: "Enable Discord on your phone and turn on push notifications for **#signals**. Signals can appear at any time during market hours — you want to be notified immediately even when you're not at your desk.",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk Management 101",
    emoji: "🛡️",
    duration: "5 min",
    blocks: [
      {
        type: "p",
        text: "This is the most important module. You can have a 50% win rate and still grow your account consistently — or you can have an 80% win rate and blow up. The difference is risk management.",
      },
      {
        type: "box",
        color: "primary",
        title: "The #1 rule",
        text: "**Never risk more than 1–2% of your account on a single trade.** This isn't a suggestion — it's what separates traders who survive from traders who don't.",
      },
      { type: "h", text: "Why 1-2% works — the math" },
      {
        type: "table",
        caption: "With a $10,000 account risking 1% per trade ($100):",
        rows: [
          { label: "10 losing trades in a row", value: "Account: $9,044" },
          { label: "20 losing trades in a row", value: "Account: $8,179" },
          { label: "50 losing trades in a row", value: "Account: $6,050" },
        ],
        note: "Even after 50 consecutive losses — something statistically near impossible — you still have 60% of your capital left. You can recover. This is the entire point.",
      },
      { type: "h", text: "Calculating your position size" },
      {
        type: "formula",
        text: "Position Size = (Account × Risk%) ÷ (Entry − Stop Loss)",
        example: [
          { label: "Account size", value: "$10,000" },
          { label: "Risk per trade", value: "1% = $100" },
          { label: "Entry", value: "$62,000" },
          { label: "Stop loss", value: "$60,200" },
          { label: "Distance to stop", value: "$62,000 − $60,200 = $1,800" },
          { label: "Position size", value: "$100 ÷ $1,800 = 0.0556 BTC", highlight: true },
        ],
        note: "If the stop loss hits, you lose exactly $100 — your 1%. If TP1 hits, you gain proportionally more. That asymmetry is why this works.",
      },
      { type: "calculator-teaser" },
      { type: "h", text: "Rules to live by" },
      {
        type: "terms",
        items: [
          {
            term: "Set your stop loss before entering",
            def: "If the platform goes down, you have protection. If you get emotional, you have protection.",
          },
          {
            term: "Never move your stop loss further away",
            def: "This is the #1 mistake newer traders make. Your stop is where your thesis is invalidated.",
          },
          {
            term: "Don't revenge trade",
            def: "A loss is a cost of doing business. If you're trying to make back a loss immediately, you're gambling.",
          },
          {
            term: "Scale position size with your confidence level",
            def: "New to a setup type? Size down to 0.5%. Comfortable with the pattern? Full 1-2%.",
          },
          {
            term: "Correlation kills",
            def: "Don't take 5 altcoin longs at once — they all dump together. Your effective risk is 5×, not 1×.",
          },
        ],
      },
    ],
  },
  {
    id: "week1",
    title: "Your First Week — Action Plan",
    emoji: "🚀",
    duration: "3 min",
    blocks: [
      {
        type: "p",
        text: "The best thing you can do in your first week is **observe** before you act. Watch how signals play out. Read the morning analysis and then watch what happens. Build conviction in the system before you put money on it.",
      },
      { type: "h", text: "Day 1 checklist" },
      {
        type: "list",
        variant: "check",
        items: [
          "Join the Discord server (link in your portal) and verify your VIP role",
          "Set Discord notifications to 'All Messages' on #signals and #morning-analysis",
          "Read the last 7 days of morning analysis in Discord to understand the format",
          "Check the live trading journal at tradrx.io/shared/DAD01529995B — browse recent trades",
          "Post an intro in #vip-chat — introduce yourself and what you're trading",
        ],
      },
      { type: "h", text: "Days 2–7: Your daily routine" },
      {
        type: "schedule",
        items: [
          {
            time: "Before NY open (~9:15 AM ET)",
            action: "Read the morning analysis in Discord. Note the bias and any key levels.",
          },
          {
            time: "During market hours",
            action: "Watch for signals in #signals. Paper trade if you're not ready to go live.",
          },
          {
            time: "End of day",
            action: "Check the journal — see what signals were active, which hit TPs, which hit SLs.",
          },
        ],
      },
      {
        type: "partners-teaser",
        exchanges: ["Bybit", "BloFin", "Coinbase Advanced"],
        propFirms: ["Klein Funding", "Hyrotrader"],
      },
      {
        type: "box",
        color: "primary",
        title: "The mindset shift",
        text: "Most traders lose because they treat every trade like it has to be a winner. In reality, trading is about **executing a process consistently**. Your job is not to pick winners — it's to follow the system with correct position sizing, every single time. The math takes care of the rest.",
      },
      {
        type: "box",
        color: "emerald",
        title: "You're set up for success",
        text: "You now understand how signals work, how to manage risk, how to navigate the Discord, and what your first week should look like. The only thing left is to execute the plan. We'll be there in Discord the whole way.",
      },
    ],
  },
];
