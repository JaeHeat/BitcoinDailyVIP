import type { ContentBlock } from "@/lib/content-types";

function renderText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-muted-foreground leading-relaxed">
          {renderText(block.text)}
        </p>
      );

    case "h":
      return <p className="font-semibold">{block.text}</p>;

    case "box": {
      const colorCls =
        block.color === "primary"
          ? "border-primary/20 bg-primary/5"
          : block.color === "amber"
            ? "border-amber-400/20 bg-amber-400/5"
            : block.color === "emerald"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-border/40 bg-card/30";
      const titleCls =
        block.color === "primary"
          ? "text-primary"
          : block.color === "amber"
            ? "text-amber-400"
            : block.color === "emerald"
              ? "text-emerald-400"
              : "";
      return (
        <div className={`rounded-xl border ${colorCls} p-5 space-y-2`}>
          {block.title && (
            <p className={`font-semibold ${titleCls}`}>{block.title}</p>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {renderText(block.text)}
          </p>
        </div>
      );
    }

    case "list": {
      if (block.variant === "ol") {
        return (
          <div className="space-y-3">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>
        );
      }
      if (block.variant === "check") {
        return (
          <div className="space-y-3">
            {block.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/30 p-3"
              >
                <div className="h-5 w-5 rounded border border-primary/40 shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item}
              </p>
            </div>
          ))}
        </div>
      );
    }

    case "cards":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <div
              key={item.title}
              className="flex gap-3 rounded-lg border border-border/40 bg-card/30 p-4"
            >
              {item.icon && (
                <span className="text-xl shrink-0">{item.icon}</span>
              )}
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      );

    case "signal":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#5865F2]/20 bg-[#313338] p-4 font-mono text-sm space-y-3">
            <div>
              <p className="text-[#f0b132] font-semibold not-italic">
                Bitcoin Jae
              </p>
              <p className="text-white font-bold mt-1">New Trade Alert!</p>
              <p className="text-[#23a55a] text-xs mt-0.5">
                @VIP ALL ACCESS PASS 💰 @VIP - Leverage Signals
              </p>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1 text-[#dbdee1]">
              <p className="font-semibold text-white">
                BTC Long ({block.tf} timeframe)
              </p>
              <p>Strategy: {block.strategy}</p>
              <p>Order Type: {block.orderType}</p>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1 text-[#dbdee1]">
              <p>
                Entry: <span className="text-white">{block.entry}</span>
              </p>
              <p>
                SL: <span className="text-red-400">{block.sl}</span>
              </p>
              <p>
                TP: <span className="text-emerald-400">{block.tp}</span>
              </p>
              <p>
                Win rate: <span className="text-white">{block.winRate}</span>
              </p>
              <p>
                Risk: <span className="text-white">{block.risk}</span>
              </p>
              <p>
                Leverage: <span className="text-white">{block.leverage}</span>
              </p>
            </div>
          </div>
          {block.followUp && (
            <div className="rounded-xl border border-[#5865F2]/20 bg-[#313338] px-4 py-3 font-mono text-sm">
              <p className="text-[#f0b132] font-semibold text-xs">
                Bitcoin Jae{" "}
                <span className="text-[#949ba4] font-normal">10 min later</span>
              </p>
              <p className="text-[#dbdee1] mt-1">
                {block.followUp}{" "}
                <span className="text-[#23a55a]">@VIP ALL ACCESS PASS 💰</span>
              </p>
            </div>
          )}
        </div>
      );

    case "terms":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <div
              key={item.term}
              className="rounded-lg border border-border/40 bg-card/30 p-4"
            >
              <p className="font-semibold text-sm text-primary">{item.term}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.def}
              </p>
            </div>
          ))}
        </div>
      );

    case "emotion-cards":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <div
              key={item.feeling}
              className="rounded-lg border border-border/40 bg-card/30 p-4"
            >
              <p className="font-semibold text-foreground">{item.feeling}</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Triggered by: {item.trigger}
              </p>
              <p className="text-sm text-muted-foreground">{item.response}</p>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
          {block.caption && (
            <p className="text-sm text-muted-foreground">{block.caption}</p>
          )}
          <div className="space-y-2 text-sm">
            {block.rows.map((row, i) => (
              <div
                key={i}
                className={`flex justify-between py-2 ${i < block.rows.length - 1 ? "border-b border-border/30" : ""}`}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          {block.note && (
            <p className="text-xs text-muted-foreground">{block.note}</p>
          )}
        </div>
      );

    case "formula":
      return (
        <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
          <p className="text-sm font-mono text-primary">{block.text}</p>
          {block.example && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Example:</p>
              {block.example.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.highlight ? "text-foreground font-medium pt-1" : ""
                  }
                >
                  {line.label}: {line.value}
                </p>
              ))}
            </div>
          )}
          {block.note && (
            <p className="text-xs text-muted-foreground">{block.note}</p>
          )}
        </div>
      );

    case "schedule":
      return (
        <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
          {block.items.map((item) => (
            <div key={item.time} className="space-y-1">
              <p className="text-xs text-primary font-medium">{item.time}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.action}
              </p>
            </div>
          ))}
        </div>
      );

    case "notif":
      return (
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground mb-2 text-sm">
              Set to "All Messages":
            </p>
            <div className="space-y-1">
              {block.allMessages.map((ch) => (
                <div key={ch} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs">{ch}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground mb-2 text-sm">
              Set to "Only Mentions":
            </p>
            <div className="space-y-1">
              {block.onlyMentions.map((ch) => (
                <div key={ch} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="font-mono text-xs">{ch}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "ev-rows":
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/40 bg-card/30 p-3 space-y-1"
            >
              <p className="text-foreground text-sm">{item.scenario}</p>
              <p className="text-sm text-muted-foreground">{item.formula}</p>
            </div>
          ))}
        </div>
      );

    case "two-cards":
      return (
        <div className="space-y-3">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/40 bg-card/30 p-4"
            >
              <p className="font-medium text-foreground mb-1">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.text}</p>
              {item.badge && (
                <p
                  className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                    item.badgeColor === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-400/10 text-amber-400"
                  }`}
                >
                  {item.badge}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case "channels":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-border/40 bg-card/30 p-4"
            >
              <p className="font-mono text-sm text-primary font-medium">
                {item.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      );

    case "calculator-teaser": {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      return (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🧮</span>
            <p className="font-semibold text-emerald-400">Don't do this by hand every time</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your member portal includes a <strong className="text-foreground">Position Size Calculator</strong> — enter your account size, risk %, entry price, and stop loss, and it spits out the exact position size and dollar risk instantly. Use it before every trade.
          </p>
          <a
            href={`${basePath}/calculator`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
          >
            Open the Position Calculator →
          </a>
        </div>
      );
    }

    case "partners-teaser": {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      return (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🤝</span>
            <p className="font-semibold text-primary">Our Recommended Exchanges & Prop Firms</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Not sure where to trade? We've vetted a few platforms for liquidity, fees, and accessibility — including options with no KYC and US-accessible accounts. We also partner with prop firms if you want to trade funded capital using our signals.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {block.exchanges.map((name) => (
              <span key={name} className="text-xs px-2.5 py-1 rounded-full bg-background border border-border/60 text-foreground font-medium">
                {name}
              </span>
            ))}
            {block.propFirms.map((name) => (
              <span key={name} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                {name} (prop)
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href={`${basePath}/exchanges`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              View exchanges →
            </a>
            <a
              href={`${basePath}/prop-firms`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:underline"
            >
              View prop firms →
            </a>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
