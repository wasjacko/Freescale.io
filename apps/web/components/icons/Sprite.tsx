/**
 * SVG sprite — all icons + brand logos defined once, referenced via <use href="#i-…" />
 * Rendered once at the top of the app layout.
 */
export function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true">
      {/* Outline icons */}
      <symbol id="i-inbox" viewBox="0 0 24 24">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      </symbol>
      <symbol id="i-task" viewBox="0 0 24 24">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </symbol>
      <symbol id="i-cal" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </symbol>
      <symbol id="i-folder" viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />
      </symbol>
      <symbol id="i-grid" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </symbol>
      <symbol id="i-filter" viewBox="0 0 24 24">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </symbol>
      <symbol id="i-edit" viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
      </symbol>
      <symbol id="i-more" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </symbol>
      <symbol id="i-tag" viewBox="0 0 24 24">
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </symbol>
      {/* Open book — used for the AI Knowledge nav item. Lucide
          "book-open" silhouette: spine with two pages facing out. */}
      <symbol id="i-book" viewBox="0 0 24 24">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
      </symbol>
      <symbol id="i-star" viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </symbol>
      <symbol id="i-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </symbol>
      <symbol id="i-heart" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
      </symbol>
      <symbol id="i-spark" viewBox="0 0 24 24">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </symbol>
      <symbol id="i-list" viewBox="0 0 24 24">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </symbol>
      <symbol id="i-globe" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </symbol>
      <symbol id="i-chevron" viewBox="0 0 24 24">
        <polyline points="9 18 15 12 9 6" />
      </symbol>
      <symbol id="i-smile" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </symbol>
      <symbol id="i-clip" viewBox="0 0 24 24">
        <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </symbol>
      <symbol id="i-send" viewBox="0 0 24 24">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </symbol>
      <symbol id="i-info" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </symbol>
      <symbol id="i-settings" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </symbol>
      <symbol id="i-plus" viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </symbol>
      <symbol id="i-chevron-down" viewBox="0 0 24 24">
        <polyline points="6 9 12 15 18 9" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </symbol>
      <symbol id="i-arrow-up" viewBox="0 0 24 24">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </symbol>
      <symbol id="i-user" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </symbol>
      <symbol id="i-heart-o" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
      </symbol>
      <symbol id="i-cog" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </symbol>

      {/* Brand logos */}
      {/* Logos de marque recréés en vecteur (couleurs officielles) — lisibles
          sur la pastille gris foncé de la topbar. */}
      <symbol id="l-gmail" viewBox="-3.5 -3.5 31 31">
        <path
          fill="#EA4335"
          d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
        />
      </symbol>
      <symbol id="l-outlook" viewBox="0 0 24 24">
        {/* Enveloppe bleu clair (droite) */}
        <path fill="#28A8EA" d="M10.5 7H22a1.3 1.3 0 0 1 1.3 1.3v7.4A1.3 1.3 0 0 1 22 17H10.5z" />
        <path fill="#fff" opacity=".92" d="M10.5 8.6 17 12.9l6.3-4.3v1.9l-6.3 4.2-6.5-4.3z" />
        {/* Panneau « O » bleu foncé (gauche) */}
        <rect x="0.5" y="3.4" width="12" height="17.2" rx="2.4" fill="#0A5AA8" />
        <ellipse cx="6.5" cy="12" rx="3.5" ry="4.3" fill="none" stroke="#fff" strokeWidth="2" />
      </symbol>
      <symbol id="l-icloud" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="icloud-grad" x1="8" y1="8" x2="40" y2="40">
            <stop offset="0" stopColor="#60A5FA" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#icloud-grad)" />
        <path
          fill="#fff"
          d="M17 33h18.1a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-19.1-3.3A8.7 8.7 0 0 0 17 33Z"
        />
      </symbol>
      <symbol id="l-imap" viewBox="0 0 48 48">
        <rect x="4" y="7" width="40" height="34" rx="9" fill="#0F172A" />
        <path fill="#fff" d="M10 16v19h28V16L24 27Z" opacity=".96" />
        <path fill="#94A3B8" d="M10 16h28L24 27Z" />
        <path fill="#38BDF8" d="M10 35 21 25l3 2 3-2 11 10Z" opacity=".75" />
      </symbol>
      {/* Logos réels fournis (fichiers dans /public/channels) — référencés en
          <image> pour garder le mécanisme <use> + le style existant partout. */}
      <symbol id="l-instagram" viewBox="0 0 24 24">
        {/* Caméra Instagram — anneaux « donut » en remplissage (fill-rule
            evenodd) : uniquement des fills, donc peints correctement via <use>
            (contrairement aux stroke, ignorés lors de l'instanciation). */}
        <path
          fill="#E4405F"
          fillRule="evenodd"
          d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 5.2 8v8A2.8 2.8 0 0 0 8 18.8h8A2.8 2.8 0 0 0 18.8 16V8A2.8 2.8 0 0 0 16 5.2Z"
        />
        <path
          fill="#E4405F"
          fillRule="evenodd"
          d="M12 7.1a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 2.2a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z"
        />
        <circle cx="16.8" cy="7.2" r="1.35" fill="#E4405F" />
      </symbol>
      <symbol id="l-whatsapp" viewBox="-2 -2 28 28">
        <path
          fill="#25D366"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
        />
      </symbol>
      <symbol id="l-slack" viewBox="-3 -3 30 30">
        <path
          fill="#36C5F0"
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        />
        <path
          fill="#2EB67D"
          d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        />
        <path
          fill="#ECB22E"
          d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        />
        <path
          fill="#E01E5A"
          d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        />
      </symbol>
      <symbol id="l-discord" viewBox="0 0 48 48">
        <image
          href="/channels/discord.webp"
          x="0"
          y="0"
          width="48"
          height="48"
          preserveAspectRatio="xMidYMid meet"
        />
      </symbol>
      <symbol id="l-x" viewBox="0 0 48 48">
        <rect x="3" y="3" width="42" height="42" rx="10" fill="#0F172A" />
        <path
          fill="#fff"
          d="M29.5 13h4l-8.7 10 10.2 12h-8l-6.3-7.6-7.2 7.6h-4l9.3-10.7L9 13h8.2l5.7 7 6.6-7Zm-1.4 19.4h2.2L17.4 15h-2.4l13.1 17.4Z"
        />
      </symbol>
      <symbol id="l-linkedin" viewBox="-2.5 -2.5 29 29">
        <path
          fill="#0A66C2"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </symbol>
      <symbol id="l-telegram" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="#27A6E5" />
        <path
          fill="#fff"
          d="M34.5 15.4 30.3 33c-.3 1.4-1.2 1.7-2.4 1l-6.5-4.8-3.2 3c-.3.4-.6.6-1.3.6l.5-6.6 12.1-10.9c.5-.5-.1-.7-.8-.3l-15 9.4-6.4-2c-1.4-.5-1.4-1.4.3-2l25-9.7c1.2-.4 2.2.3 1.9 2.3Z"
        />
      </symbol>
      <symbol id="l-messenger" viewBox="0 0 48 48">
        <defs>
          <radialGradient id="msg-grad" cx="20%" cy="100%" r="120%">
            <stop offset="0" stopColor="#0099FF" />
            <stop offset="0.6" stopColor="#A033FF" />
            <stop offset="1" stopColor="#FF5280" />
          </radialGradient>
        </defs>
        <path
          fill="url(#msg-grad)"
          d="M24 4C12.4 4 4 12.5 4 23.5c0 6.2 2.9 11.7 7.4 15.2v6.3l6.7-3.7c1.9.5 3.9.8 5.9.8 11.6 0 20-8.5 20-19.5S35.6 4 24 4Z"
        />
        <path fill="#fff" d="M12.8 28.8 18.7 19l5.7 4.7 6.5-4.7 5.4 9.8-5.6 1.8-5-4.4-6.8 4.4Z" />
      </symbol>
      <symbol id="l-sms" viewBox="0 0 48 48">
        <rect x="4" y="7" width="40" height="34" rx="12" fill="#16A34A" />
        <path fill="#fff" d="M14 18h20v4H14Zm0 7h15v4H14Z" />
        <path fill="#16A34A" d="m17 40 3-6h9l-8 8c-1.4 1.4-4 .4-4-1.6Z" />
      </symbol>
    </svg>
  );
}
