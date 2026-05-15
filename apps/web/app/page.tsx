import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MueAvatar } from "@/components/MueAvatar";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { Sprite } from "@/components/icons/Sprite";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <div className="land">
      <Sprite />

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
          <Link href="/sign-in" className="land-btn land-btn-ghost">Se connecter</Link>
          <Link href="/sign-up" className="land-btn land-btn-primary">Démarrer</Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="land-hero">
          <div className="land-aura" aria-hidden />
          <div className="land-noise" aria-hidden />

          <div className="land-hero-inner">
            <span className="land-eyebrow">
              <span className="land-eyebrow-dot" />
              Beta privée · Mai 2026
            </span>

            <h1 className="land-h1">
              Une demande par message,<br />
              une autre par mail,<br />
              <span className="land-h1-accent">vous arrivez à suivre ?</span>
            </h1>

            <p className="land-sub">
              Freescale réunit tous vos canaux dans une seule inbox calme.
              Mue, votre copilote IA, écoute et transforme le bruit en actions ciblées.
            </p>

            <div className="land-hero-cta">
              <Link href="/sign-up" className="land-btn land-btn-primary land-btn-lg">
                Démarrer gratuitement
              </Link>
              <Link href="/sign-in" className="land-btn land-btn-ghost land-btn-lg">
                Se connecter
              </Link>
            </div>

            <div className="land-meta">
              <span>Sans carte bancaire</span>
              <span className="land-meta-sep" />
              <span>5 canaux inclus</span>
              <span className="land-meta-sep" />
              <span>Prêt en 2 minutes</span>
            </div>
          </div>

          {/* Preview card — a glassy snapshot of the product */}
          <div className="land-preview" aria-hidden>
            <div className="land-preview-frame">
              <div className="land-preview-bar">
                <span /><span /><span />
              </div>
              <div className="land-preview-body">
                <aside className="lp-side">
                  <div className="lp-side-mue">
                    <span className="lp-mue"><MueAvatar /></span>
                    <div>
                      <div className="lp-mue-name">Mue</div>
                      <div className="lp-mue-status"><span className="lp-dot" />Listening</div>
                    </div>
                  </div>
                  <div className="lp-side-section">Inbox</div>
                  <div className="lp-side-row is-active">
                    <span className="lp-pill rose" />
                    Sarah Johnson
                  </div>
                  <div className="lp-side-row">
                    <span className="lp-pill blue" />
                    Acme Corp
                  </div>
                  <div className="lp-side-row">
                    <span className="lp-pill violet" />
                    Marketing
                  </div>
                </aside>

                <section className="lp-thread">
                  <header className="lp-thread-head">
                    <div>
                      <div className="lp-thread-name">Sarah Johnson</div>
                      <div className="lp-thread-sub">
                        <ChannelLogo channel="instagram" /> Instagram · 2 min ago
                      </div>
                    </div>
                    <span className="lp-thread-tag">Replying soon</span>
                  </header>

                  <div className="lp-bubbles">
                    <div className="lp-bubble lp-in">Love the new direction! 🔥</div>
                    <div className="lp-bubble lp-in">
                      Just a few tweaks before we share it with the team.
                    </div>
                    <div className="lp-bubble lp-out">
                      Got it. I&apos;ll send v2 by end of day 🚀
                    </div>
                  </div>

                  <div className="lp-suggest">
                    <span className="lp-suggest-icon"><Icon name="i-spark" /></span>
                    <div className="lp-suggest-body">
                      <div className="lp-suggest-title">Mue suggests</div>
                      <div className="lp-suggest-text">
                        Schedule the design review for Thursday 3 PM with Sarah.
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED LOGO STRIP — minimal */}
        <section className="land-strip">
          <span>Made for designers, founders, and operators at</span>
          <div className="land-strip-row">
            <span>Notion</span>
            <span>Linear</span>
            <span>Stripe</span>
            <span>Vercel</span>
            <span>Framer</span>
          </div>
        </section>

        {/* FEATURES */}
        <section className="land-section" id="features">
          <div className="land-section-head">
            <span className="land-kicker">Built for calm</span>
            <h2 className="land-h2">A single, quieter inbox.</h2>
            <p className="land-section-sub">
              Five channels collapsed into one timeline. No tabs to chase, no apps to switch.
            </p>
          </div>

          <div className="land-grid">
            <article className="land-card">
              <span className="land-card-icon icon-blue"><Icon name="i-inbox" /></span>
              <h3>Unified inbox</h3>
              <p>Gmail, Slack, Instagram, WhatsApp, Discord — threaded behind a single timeline.</p>
            </article>
            <article className="land-card">
              <span className="land-card-icon icon-rose"><Icon name="i-spark" /></span>
              <h3>Mue, your copilot</h3>
              <p>Summarizes long threads, drafts replies in your voice, turns ideas into tasks.</p>
            </article>
            <article className="land-card">
              <span className="land-card-icon icon-mint"><Icon name="i-list" /></span>
              <h3>Tasks that write themselves</h3>
              <p>Every action item surfaces automatically. Due dates, priorities, owners.</p>
            </article>
            <article className="land-card">
              <span className="land-card-icon icon-peach"><Icon name="i-globe" /></span>
              <h3>Knowledge that compounds</h3>
              <p>Mue remembers your clients, your projects, your decisions — only you can query it.</p>
            </article>
          </div>
        </section>

        {/* MUE SECTION */}
        <section className="land-mue" id="mue">
          <div className="land-mue-glow" aria-hidden />
          <div className="land-mue-inner">
            <div className="land-mue-orb">
              <MueAvatar />
            </div>
            <div className="land-mue-text">
              <span className="land-kicker">Meet Mue</span>
              <h2 className="land-h2">A copilot, not a chatbot.</h2>
              <p className="land-mue-sub">
                Mue lives quietly beside your inbox. It listens to every conversation,
                drafts in your tone, and turns intent into action — without ever sounding
                like a machine.
              </p>
              <div className="land-mue-cta">
                <Link href="/sign-up" className="land-btn land-btn-primary">Essayer Mue</Link>
                <a href="#features" className="land-btn land-btn-ghost">Voir les fonctionnalités</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section className="land-cta-band" id="pricing">
          <div className="land-cta-glow" aria-hidden />
          <h2 className="land-h2">Get started in two minutes.</h2>
          <p>Free during the private beta. Connect one channel, see Mue work, decide later.</p>
          <Link href="/sign-up" className="land-btn land-btn-primary land-btn-lg">
            Créer mon workspace
          </Link>
        </section>
      </main>

      <footer className="land-foot">
        <div className="land-foot-inner">
          <span className="land-foot-logo">
            <span className="land-logo-mark sm"><MueAvatar /></span>
            Freescale
          </span>
          <div className="land-foot-links">
            <a href="mailto:hello@freescale.app">hello@freescale.app</a>
            <Link href="/sign-in">Se connecter</Link>
            <span className="land-foot-meta">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
