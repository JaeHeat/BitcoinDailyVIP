export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "box"; color?: "primary" | "amber" | "emerald"; title?: string; text: string }
  | { type: "list"; variant: "ul" | "ol" | "check" | "dot"; items: string[] }
  | { type: "cards"; items: { icon?: string; title: string; text: string }[] }
  | { type: "signal"; strategy: string; tf: string; orderType: string; entry: string; sl: string; tp: string; winRate: string; risk: string; leverage: string; followUp?: string }
  | { type: "terms"; items: { term: string; def: string }[] }
  | { type: "emotion-cards"; items: { feeling: string; trigger: string; response: string }[] }
  | { type: "table"; rows: { label: string; value: string }[]; caption?: string; note?: string }
  | { type: "formula"; text: string; example?: { label: string; value: string; highlight?: boolean }[]; note?: string }
  | { type: "schedule"; items: { time: string; action: string }[] }
  | { type: "notif"; allMessages: string[]; onlyMentions: string[] }
  | { type: "ev-rows"; items: { scenario: string; formula: string }[] }
  | { type: "two-cards"; items: { title: string; badge?: string; badgeColor?: "emerald" | "amber"; text: string }[] }
  | { type: "channels"; items: { name: string; text: string }[] }
  | { type: "partners-teaser"; exchanges: string[]; propFirms: string[] }
  | { type: "calculator-teaser" };

export interface GettingStartedModule {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  blocks: ContentBlock[];
}

export interface ResourceGuide {
  title: string;
  readTime: string;
  blocks: ContentBlock[];
}

export interface ResourceCategory {
  id: string;
  icon: string;
  label: string;
  guides: ResourceGuide[];
}
