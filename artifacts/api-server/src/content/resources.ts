import type { ResourceCategory } from "./types";

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "signals",
    icon: "BarChart2",
    label: "Signals & Execution",
    guides: [
      {
        title: "How to Read a Trade Signal",
        readTime: "4 min",
        blocks: [
          {
            type: "p",
            text: "Every signal contains the same core information — once you know how to read one, you can act on any of them quickly and confidently.",
          },
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
          },
          {
            type: "terms",
            items: [
              {
                term: "Asset, Direction & Timeframe",
                def: "BTC Long on the 5-minute chart — you're buying Bitcoin on a short-term setup. The timeframe tells you how fast the trade is expected to play out.",
              },
              {
                term: "Strategy",
                def: "The pattern behind the signal (ORB = Opening Range Breakout). Each strategy has its own win rate and behavior — over time you'll learn which ones fit your availability.",
              },
              {
                term: "Entry & Order Type",
                def: "Place a limit order at the exact entry price. Limit means it only fills at that price or better — never use market orders on entry or you'll overpay.",
              },
              {
                term: "SL (Stop Loss)",
                def: "Set this immediately after your entry order is placed. If price hits the SL, your position closes automatically — protecting you from a larger loss.",
              },
              {
                term: "TP (Take Profit)",
                def: "Set a limit sell order here when you enter. The trade closes on its own when price reaches the target. No screen-watching required.",
              },
              {
                term: "Risk % & Leverage",
                def: "Risk 0.5% of your account on this trade. Use the position sizing formula to calculate how many units to buy. Leverage 5–10x means your position is 5–10× your margin — start at the lower end until you're comfortable.",
              },
            ],
          },
        ],
      },
      {
        title: "Limit Orders vs Market Orders",
        readTime: "3 min",
        blocks: [
          {
            type: "p",
            text: "The type of order you use affects both your entry price and your slippage. Understanding the difference matters.",
          },
          {
            type: "two-cards",
            items: [
              {
                title: "Limit Order — preferred for entries",
                badge: "Lower cost · Better risk/reward · May not fill if price doesn't reach zone",
                badgeColor: "emerald",
                text: "A limit order only fills at your specified price or better. Place it inside the entry zone and wait. This ensures you get the price you planned and avoids chasing.",
              },
              {
                title: "Market Order — use sparingly",
                badge: "Guaranteed fill · Potential slippage · Fine for closing positions quickly",
                badgeColor: "amber",
                text: "A market order fills immediately at whatever price is available. Fast, but often slightly worse than the quoted price, especially on altcoins with wide spreads.",
              },
            ],
          },
          {
            type: "p",
            text: "For BDV signals: use limit orders on entry. Use market or limit on exits — either works when price is reaching your target.",
          },
        ],
      },
      {
        title: "What To Do When a Signal Misses Your Entry",
        readTime: "2 min",
        blocks: [
          {
            type: "p",
            text: "Price sometimes runs straight past the entry zone without filling your order. This is one of the most frustrating situations in trading — and how you handle it defines your discipline.",
          },
          {
            type: "box",
            color: "amber",
            title: "The answer: let it go",
            text: "If price didn't reach your zone, you had no valid signal to act on. Chasing a trade that's already moved means your risk/reward is now worse than planned — and your stop loss is in the wrong place.",
          },
          {
            type: "p",
            text: "There will always be another signal. Missing an entry that ran without you is not a loss — it's discipline. The traders who blow accounts are the ones who chase every move they missed.",
          },
          {
            type: "p",
            text: "Stay patient. The next setup is always coming.",
          },
        ],
      },
    ],
  },
  {
    id: "risk",
    icon: "Shield",
    label: "Risk & Money Management",
    guides: [
      {
        title: "Position Sizing — The Complete Guide",
        readTime: "5 min",
        blocks: [
          {
            type: "p",
            text: "Position sizing is the single biggest lever you have over your long-term results. More than your win rate. More than which coins you trade. Sizing correctly is what separates accounts that survive from accounts that don't.",
          },
          {
            type: "formula",
            text: "Position Size = (Account × Risk%) ÷ (Entry − Stop Loss)",
            example: [
              { label: "Account", value: "$10,000" },
              { label: "Risk", value: "1% → $100 at risk" },
              { label: "Entry · Stop", value: "$62,000 · $60,200 → $1,800 distance" },
              { label: "Position", value: "$100 ÷ $1,800 = 0.0556 BTC", highlight: true },
            ],
            note: "At 0.0556 BTC, if price drops $1,800 to your stop, you lose exactly $100 — your planned 1%.",
          },
          {
            type: "p",
            text: "Repeat this calculation for every trade. Don't eyeball it. Small sizing errors compound over hundreds of trades into large account drag.",
          },
          {
            type: "table",
            caption: "Suggested risk levels by experience",
            rows: [
              { label: "New to trading", value: "0.5%" },
              { label: "Comfortable with the system", value: "1%" },
              { label: "High conviction setups", value: "1.5–2%" },
              { label: "Maximum recommended", value: "2%" },
            ],
          },
        ],
      },
      {
        title: "The 1–2% Rule Explained",
        readTime: "3 min",
        blocks: [
          {
            type: "p",
            text: "The 1–2% rule means you never put more than 1–2% of your total trading account at risk on a single trade. Not 1–2% of your position — 1–2% of your entire account.",
          },
          {
            type: "p",
            text: "It sounds conservative. It is. That's why it works.",
          },
          { type: "h", text: "What it protects against:" },
          {
            type: "list",
            variant: "dot",
            items: [
              "A bad streak of 10+ losses won't significantly hurt your capital",
              "One bad trade can't cause serious damage",
              "Emotional pressure per trade stays manageable",
              "You stay in the game long enough to benefit from your edge",
            ],
          },
          {
            type: "p",
            text: "Most accounts that blow up aren't blown up by bad signals — they're blown up by oversizing. A 10% risk trade that goes wrong wipes out months of gains in a single afternoon. Don't be that trader.",
          },
        ],
      },
      {
        title: "Keeping a Trading Journal",
        readTime: "4 min",
        blocks: [
          {
            type: "p",
            text: "A journal is how good traders become great traders. You can't improve what you don't measure.",
          },
          { type: "h", text: "What to log for every trade:" },
          {
            type: "terms",
            items: [
              { term: "Date & time", def: "When you entered and exited" },
              { term: "Coin & direction", def: "BTC LONG, ETH SHORT, etc." },
              { term: "Entry & exit prices", def: "Actual prices, not planned" },
              { term: "Position size", def: "How many units" },
              { term: "P&L", def: "In dollars and % of account" },
              { term: "Signal followed?", def: "Yes / modified / self-initiated" },
              { term: "Notes", def: "What you observed, what you did right or wrong" },
            ],
          },
          {
            type: "p",
            text: "Review your journal weekly. Look for patterns: which setups you're skipping, which you're oversizing, where your emotional decisions cluster. That's where your edge improvements live.",
          },
          {
            type: "p",
            text: "You can also follow our public journal at TradrX to see how professional trades are logged and tracked.",
          },
        ],
      },
    ],
  },
  {
    id: "discord",
    icon: "MessageCircle",
    label: "Discord & Community",
    guides: [
      {
        title: "Channel Guide — What Goes Where",
        readTime: "2 min",
        blocks: [
          {
            type: "channels",
            items: [
              { name: "#announcements", text: "Official updates only. Read-only. Check here first after any absence." },
              { name: "#morning-analysis", text: "Daily pre-market breakdown. Posted before NY open. Read this every day." },
              { name: "#signals", text: "Live trade signals. Set to 'All Messages' notifications. Act from here." },
              { name: "#trade-journal", text: "Real-time updates on active signals — TP hits, SL hits, partial closes." },
              { name: "#vip-chat", text: "Main community discussion. Ask questions, share analysis, talk markets." },
              { name: "#off-topic", text: "Anything not trading-related goes here." },
            ],
          },
        ],
      },
      {
        title: "Setting Up Notifications Correctly",
        readTime: "2 min",
        blocks: [
          {
            type: "p",
            text: "The right notification setup means you never miss a signal and never get overwhelmed by noise.",
          },
          {
            type: "notif",
            allMessages: ["#morning-analysis", "#signals", "#trade-journal"],
            onlyMentions: ["#vip-chat", "#off-topic", "#announcements"],
          },
          {
            type: "p",
            text: "To change: right-click a channel → Notification Settings → select your preference. Do this on desktop — the setting syncs to mobile.",
          },
          {
            type: "p",
            text: "Also enable push notifications for the BDV Discord server on your phone. Signals can appear during market hours at any time.",
          },
        ],
      },
    ],
  },
  {
    id: "strategy",
    icon: "BookOpen",
    label: "Strategy & Mindset",
    guides: [
      {
        title: "How the Morning Analysis Works",
        readTime: "3 min",
        blocks: [
          {
            type: "p",
            text: "The morning analysis is your daily edge. It's posted every trading day before the New York market open and covers the key things you need to know before placing a trade.",
          },
          { type: "h", text: "What it typically covers:" },
          {
            type: "terms",
            items: [
              {
                term: "Macro bias",
                def: "Is today a buy-the-dip day, a sell-the-rally day, or a stay-out day? This is the overall direction signal.",
              },
              {
                term: "Key levels",
                def: "Support and resistance levels that matter for the day. These are where price is likely to react — your entries and targets are often near these.",
              },
              {
                term: "Setups to watch",
                def: "Specific coins or patterns that are setting up for potential signals. Not every one becomes a signal, but these are the candidates.",
              },
              {
                term: "Risk flags",
                def: "High-impact news, extreme volatility, or market conditions that warrant smaller sizing or sitting out.",
              },
            ],
          },
          {
            type: "p",
            text: "Make reading the morning analysis a habit before you look at price. It resets your frame for the day and prevents you from reacting emotionally to market moves.",
          },
        ],
      },
      {
        title: "Understanding Win Rate vs. Risk/Reward",
        readTime: "4 min",
        blocks: [
          {
            type: "p",
            text: "Most new traders obsess over win rate. It's the wrong metric. What actually determines profitability is the combination of win rate and risk/reward ratio.",
          },
          {
            type: "box",
            color: "primary",
            title: "The math that matters",
            text: "Expected value per trade = (Win rate × Average win) − (Loss rate × Average loss)",
          },
          { type: "h", text: "Examples:" },
          {
            type: "ev-rows",
            items: [
              { scenario: "50% win rate, 2:1 R/R", formula: "EV = (0.5 × 2) − (0.5 × 1) = +0.5R per trade ✓ Profitable" },
              { scenario: "40% win rate, 3:1 R/R", formula: "EV = (0.4 × 3) − (0.6 × 1) = +0.6R per trade ✓ Profitable" },
              { scenario: "70% win rate, 0.5:1 R/R", formula: "EV = (0.7 × 0.5) − (0.3 × 1) = +0.05R per trade ✓ Barely profitable" },
            ],
          },
          {
            type: "p",
            text: "BDV signals typically target 2:1 to 4:1 R/R (TP2 and TP3). This means even a 40–50% win rate produces consistent account growth when position sizing is correct.",
          },
        ],
      },
      {
        title: "Managing Emotions While Trading",
        readTime: "4 min",
        blocks: [
          {
            type: "p",
            text: "The markets are designed to make you feel things. Fear, greed, FOMO, regret — these are not weaknesses, they're evolutionary responses misapplied to a modern context. Professional trading is largely about managing these responses.",
          },
          {
            type: "emotion-cards",
            items: [
              {
                feeling: "FOMO (Fear Of Missing Out)",
                trigger: "Price runs without you entering",
                response: "Accept the miss. A trade you didn't take is never a loss. Chase it and you'll find your next loss quickly.",
              },
              {
                feeling: "Revenge trading",
                trigger: "A loss, especially an unexpected one",
                response: "Close the platform. Step away for 30–60 minutes. Return only when calm. The market will still be there.",
              },
              {
                feeling: "Moving stop losses",
                trigger: "Trade goes against you; you don't want to take the loss",
                response: "Your stop is where your thesis is invalidated. Moving it is ignoring your own analysis. Take the planned loss.",
              },
              {
                feeling: "Overconfidence after a win streak",
                trigger: "Several wins in a row",
                response: "This is when accounts blow up. Stick to the same risk %. Don't size up because you're 'on a roll.'",
              },
            ],
          },
        ],
      },
    ],
  },
];
