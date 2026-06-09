import { useState } from "react";
import { useUser, useClerk } from "@/lib/clerk-compat";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Calculator,
  Shield,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Ticket,
  HandCoins,
  Users,
  BookMarked,
} from "lucide-react";

const ADMIN_ID = "user_3DUHjlIjpjTtgh7t0H6PKwOqFLq";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/portal" },
  { label: "Getting Started", icon: GraduationCap, path: "/getting-started" },
  { label: "Resources", icon: BookOpen, path: "/resources" },
  { label: "Position Calculator", icon: Calculator, path: "/calculator" },
  { label: "Exchanges", icon: HandCoins, path: "/exchanges" },
  { label: "Prop Firms", icon: HandCoins, path: "/prop-firms" },
  { label: "Guides", icon: BookMarked, path: "/guides" },
  { label: "Mentorship", icon: Users, path: "/mentorship" },
];

interface PortalLayoutProps {
  children: React.ReactNode;
  onOpenChat?: () => void;
  onOpenTicket?: () => void;
}

function SidebarContent({
  currentPath,
  userEmail,
  isAdmin,
  onNavigate,
  onSignOut,
  onOpenChat,
  onOpenTicket,
}: {
  currentPath: string;
  userEmail: string | undefined;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onOpenChat?: () => void;
  onOpenTicket?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="text-2xl font-bold text-primary">₿</span>
        <div className="leading-tight">
          <p className="font-bold text-sm tracking-tight">Bitcoin Daily</p>
          <p className="font-bold text-sm tracking-tight text-primary">VIP</p>
        </div>
      </div>

      {/* Open Discord — the #1 destination, always one tap away */}
      <div className="px-3 pb-2">
        <a
          href="https://discord.gg/bitcoindailyvip"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#5865F2] text-white hover:bg-[#4752c4] transition-colors"
        >
          <svg width="15" height="11" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          Open Discord
        </a>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = currentPath === path || (path === "/portal" && currentPath === "/");
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
                Admin
              </p>
            </div>
            <button
              onClick={() => onNavigate("/admin")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                currentPath.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              Admin Panel
            </button>
          </>
        )}

        {/* Need Help? */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Need Help?
          </p>
        </div>
        <button
          onClick={onOpenChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          Chat with Us
        </button>
        <button
          onClick={onOpenTicket}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <Ticket className="h-4 w-4 shrink-0" />
          Open a Ticket
        </button>
      </nav>

      {/* Disclaimer */}
      <div className="mx-3 mb-2 rounded-lg bg-muted/20 border border-border/30 px-3 py-2.5">
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          <span className="font-semibold text-muted-foreground/90">Not financial advice.</span> All content is personal opinion shared for entertainment only. Trade at your own risk.
        </p>
      </div>

      {/* User + Sign Out */}
      <div className="px-3 pb-4 pt-2 border-t border-border/40 mt-2">
        {userEmail && (
          <p className="px-3 pt-3 pb-2 text-xs text-muted-foreground truncate">
            {userEmail}
          </p>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function PortalLayout({ children, onOpenChat, onOpenTicket }: PortalLayoutProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.id === ADMIN_ID;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const currentPath = location.replace(basePath, "") || "/";

  function navigate(path: string) {
    setLocation(`${basePath}${path}`);
    setMobileOpen(false);
  }

  function handleSignOut() {
    signOut(() => setLocation(`${basePath}/`));
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar — fixed left rail */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/40 bg-card/20 fixed inset-y-0 left-0 z-30">
        <SidebarContent
          currentPath={currentPath}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          onOpenChat={onOpenChat}
          onOpenTicket={onOpenTicket}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 border-b border-border/40 bg-background/90 backdrop-blur-xl flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">₿</span>
          <span className="font-bold tracking-tight text-sm">Bitcoin Daily VIP</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border/40 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">₿</span>
                <span className="font-bold tracking-tight text-sm">Bitcoin Daily VIP</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                currentPath={currentPath}
                userEmail={userEmail}
                isAdmin={isAdmin}
                onNavigate={navigate}
                onSignOut={handleSignOut}
                onOpenChat={() => { onOpenChat?.(); setMobileOpen(false); }}
                onOpenTicket={() => { onOpenTicket?.(); setMobileOpen(false); }}
              />
            </div>
          </aside>
        </>
      )}

      {/* Page content — offset by sidebar on desktop, top bar on mobile */}
      <div className="flex-1 md:ml-56 pt-14 md:pt-0 min-w-0">
        {children}
      </div>
    </div>
  );
}
