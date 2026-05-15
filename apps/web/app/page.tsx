import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MueAvatar } from "@/components/MueAvatar";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <div className="land">
      <header className="land-nav">
        <Link href="/" className="land-logo">
          <span className="land-logo-mark">
            <MueAvatar />
          </span>
          <span>Freescale</span>
        </Link>
        <nav className="land-links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#mue">Mue</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="land-cta">
          <Link href="/login" className="land-btn ghost">Sign in</Link>
          <Link href="/signup" className="land-btn primary">Get started</Link>
        </div>
      </header>

      <main>
        <section className="land-hero">
          <div className="land-grain" aria-hidden />
          <div className="land-glow" aria-hidden />
          <div className="land-hero-inner">
            <span className="land-eyebrow">
              <span className="dot" /> Now in private beta
            </span>
            <h1 className="land-h1">
              One inbox.<br />
              <em>Every</em> conversation.
            </h1>
            <p className="land-sub">
              Freescale unifies email, social DMs, and team chat. Mue, your AI copilot,
              listens and turns the noise into focused, actionable threads.
            </p>
            <div className="land-hero-cta">
              <Link href="/signup" className="land-btn primary lg">Start free</Link>
              <Link href="/login" className="land-btn ghost lg">Sign in</Link>
            </div>
            <div className="land-meta">
              <span>No credit card</span>
              <span>·</span>
              <span>5 channels included</span>
              <span>·</span>
              <span>2 min setup</span>
            </div>
          </div>
        </section>

        <section className="land-features" id="features">
          <div className="land-section-head">
            <span className="land-kicker">Built for focus</span>
            <h2>Less switching. More replying.</h2>
          </div>
          <div className="land-grid">
            <article className="land-card">
              <span className="land-card-num">01</span>
              <h3>Unified inbox</h3>
              <p>Gmail, Slack, Instagram, WhatsApp, Discord — all threaded behind a single timeline.</p>
            </article>
            <article className="land-card">
              <span className="land-card-num">02</span>
              <h3>Mue, your copilot</h3>
              <p>Summarizes long threads, drafts replies in your voice, and turns ideas into tasks.</p>
            </article>
            <article className="land-card">
              <span className="land-card-num">03</span>
              <h3>Knowledge that compounds</h3>
              <p>Every conversation feeds an embedded memory only you can query.</p>
            </article>
            <article className="land-card">
              <span className="land-card-num">04</span>
              <h3>Keyboard-first</h3>
              <p>⌘K, J/K, single-key actions. The fastest way through a busy day.</p>
            </article>
          </div>
        </section>

        <section className="land-cta-band" id="pricing">
          <h2>Get started in two minutes.</h2>
          <p>Free during the private beta. Connect one channel, see Mue work, decide later.</p>
          <Link href="/signup" className="land-btn primary lg">Create your workspace</Link>
        </section>
      </main>

      <footer className="land-foot">
        <span>© 2026 Freescale</span>
        <div>
          <a href="mailto:hello@freescale.app">hello@freescale.app</a>
          <a href="/login">Sign in</a>
        </div>
      </footer>
    </div>
  );
}
