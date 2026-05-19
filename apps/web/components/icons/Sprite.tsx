/**
 * SVG sprite — all icons + brand logos defined once, referenced via <use href="#i-…" />
 * Rendered once at the top of the app layout.
 */
export function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true">
      {/* Outline icons */}
      <symbol id="i-inbox" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></symbol>
      <symbol id="i-task" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></symbol>
      <symbol id="i-cal" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></symbol>
      <symbol id="i-folder" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/></symbol>
      <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>
      <symbol id="i-filter" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></symbol>
      <symbol id="i-edit" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></symbol>
      <symbol id="i-more" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></symbol>
      <symbol id="i-tag" viewBox="0 0 24 24"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><line x1="7" y1="7" x2="7.01" y2="7"/></symbol>
      {/* Open book — used for the AI Knowledge nav item. Lucide
          "book-open" silhouette: spine with two pages facing out. */}
      <symbol id="i-book" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></symbol>
      <symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></symbol>
      <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="i-list" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></symbol>
      <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></symbol>
      <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></symbol>
      <symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></symbol>
      <symbol id="i-clip" viewBox="0 0 24 24"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></symbol>
      <symbol id="i-send" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></symbol>
      <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></symbol>
      <symbol id="i-chevron-down" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></symbol>
      <symbol id="i-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
      <symbol id="i-arrow-up" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>
      <symbol id="i-heart-o" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></symbol>
      <symbol id="i-cog" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>

      {/* Brand logos */}
      <symbol id="l-gmail" viewBox="0 0 48 48">
        <path fill="#fff" d="M8 39h7V22l-9-6.8V37a2 2 0 0 0 2 2Z"/>
        <path fill="#4285F4" d="M8 39h7V22L6 15.2V37a2 2 0 0 0 2 2Z"/>
        <path fill="#34A853" d="M33 39h7a2 2 0 0 0 2-2V15.2L33 22Z"/>
        <path fill="#FBBC04" d="M33 11v11l9-6.8V13a2 2 0 0 0-2-2Z"/>
        <path fill="#EA4335" d="M15 22V11l9 6.8L33 11v11l-9 6.8Z"/>
        <path fill="#C5221F" d="M6 13v2.2L15 22V11H8a2 2 0 0 0-2 2Z"/>
      </symbol>
      <symbol id="l-instagram" viewBox="0 0 48 48">
        <defs>
          <radialGradient id="ig-grad" cx="28%" cy="102%" r="130%">
            <stop offset="0" stopColor="#FFD776"/>
            <stop offset="0.15" stopColor="#FCAF45"/>
            <stop offset="0.35" stopColor="#F77737"/>
            <stop offset="0.55" stopColor="#F56040"/>
            <stop offset="0.72" stopColor="#E1306C"/>
            <stop offset="0.88" stopColor="#C13584"/>
            <stop offset="1" stopColor="#833AB4"/>
          </radialGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill="url(#ig-grad)"/>
        <rect x="11" y="11" width="26" height="26" rx="8" fill="none" stroke="#fff" strokeWidth="3"/>
        <circle cx="24" cy="24" r="6.5" fill="none" stroke="#fff" strokeWidth="3"/>
        <circle cx="33" cy="15" r="2.2" fill="#fff"/>
      </symbol>
      <symbol id="l-whatsapp" viewBox="0 0 48 48">
        <path fill="#25D366" d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17.2 43 20.5 44 24 44c11 0 20-9 20-20S35 4 24 4Z"/>
        <path fill="#fff" d="M34.4 28.6c-.5-.3-3.2-1.6-3.7-1.8-.5-.2-.9-.3-1.2.3-.4.5-1.4 1.8-1.7 2.1-.3.4-.6.4-1.2.1-3-1.5-5-2.7-7-6.1-.5-.9.5-.8 1.5-2.7.2-.4.1-.7-.1-1-.1-.3-1.2-2.9-1.6-4-.4-1-.9-.9-1.2-.9h-1c-.4 0-1 .1-1.5.7-.5.6-2 2-2 4.8s2 5.6 2.3 6c.3.4 4 6.1 9.7 8.6 3.6 1.5 5 1.6 6.8 1.4 1.1-.2 3.2-1.3 3.7-2.6.5-1.3.5-2.3.3-2.6-.1-.3-.5-.4-1.1-.7Z"/>
      </symbol>
      <symbol id="l-slack" viewBox="0 0 48 48">
        <path fill="#E01E5A" d="M14 30a4 4 0 1 1-4-4h4Zm2 0a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0Z"/>
        <path fill="#36C5F0" d="M18 14a4 4 0 1 1 4-4v4Zm0 2a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8Z"/>
        <path fill="#2EB67D" d="M34 18a4 4 0 1 1 4 4h-4Zm-2 0a4 4 0 0 1-8 0V8a4 4 0 0 1 8 0Z"/>
        <path fill="#ECB22E" d="M30 34a4 4 0 1 1-4 4v-4Zm0-2a4 4 0 0 1 0-8h10a4 4 0 0 1 0 8Z"/>
      </symbol>
      <symbol id="l-discord" viewBox="0 0 48 48">
        <rect x="4" y="4" width="40" height="40" rx="10" fill="#5865F2"/>
        <path fill="#fff" d="M33.5 15.2a23 23 0 0 0-5.6-1.7l-.3.5a17 17 0 0 0-7.2 0l-.3-.5a23 23 0 0 0-5.6 1.7c-3.6 5.3-4.6 10.5-4.1 15.6 2.4 1.7 4.7 2.8 7 3.5l.6-.8c.9-.3 1.8-.7 2.5-1.2l-.5-.3c-3 1-6-.7-6.4-2.4 4.5 1.8 9.4 1.8 13.9 0-.4 1.7-3.4 3.4-6.4 2.4l-.5.3c.8.5 1.7.9 2.5 1.2l.6.8c2.3-.7 4.6-1.8 7-3.5.6-5.9-1-11-4.1-15.6ZM19.4 28.1c-1.3 0-2.4-1.2-2.4-2.6 0-1.5 1-2.7 2.4-2.7s2.5 1.2 2.4 2.7c0 1.4-1 2.6-2.4 2.6Zm9 0c-1.4 0-2.4-1.2-2.4-2.6 0-1.5 1-2.7 2.4-2.7s2.5 1.2 2.4 2.7c0 1.4-1 2.6-2.4 2.6Z"/>
      </symbol>
      <symbol id="l-x" viewBox="0 0 48 48">
        <rect x="3" y="3" width="42" height="42" rx="10" fill="#0F172A"/>
        <path fill="#fff" d="M29.5 13h4l-8.7 10 10.2 12h-8l-6.3-7.6-7.2 7.6h-4l9.3-10.7L9 13h8.2l5.7 7 6.6-7Zm-1.4 19.4h2.2L17.4 15h-2.4l13.1 17.4Z"/>
      </symbol>
      <symbol id="l-linkedin" viewBox="0 0 48 48">
        <rect x="3" y="3" width="42" height="42" rx="6" fill="#0A66C2"/>
        <path fill="#fff" d="M16 19h-5v17h5V19Zm-2.5-8.3a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8ZM37 36h-5v-9c0-2.2-.8-3.7-2.8-3.7-1.5 0-2.5 1-2.9 2.1-.2.4-.2.9-.2 1.5V36h-5V19h5v2.2c.7-1 1.9-2.5 4.6-2.5 3.4 0 5.9 2.2 5.9 6.9V36Z"/>
      </symbol>
      <symbol id="l-telegram" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="#27A6E5"/>
        <path fill="#fff" d="M34.5 15.4 30.3 33c-.3 1.4-1.2 1.7-2.4 1l-6.5-4.8-3.2 3c-.3.4-.6.6-1.3.6l.5-6.6 12.1-10.9c.5-.5-.1-.7-.8-.3l-15 9.4-6.4-2c-1.4-.5-1.4-1.4.3-2l25-9.7c1.2-.4 2.2.3 1.9 2.3Z"/>
      </symbol>
      <symbol id="l-messenger" viewBox="0 0 48 48">
        <defs>
          <radialGradient id="msg-grad" cx="20%" cy="100%" r="120%">
            <stop offset="0" stopColor="#0099FF"/>
            <stop offset="0.6" stopColor="#A033FF"/>
            <stop offset="1" stopColor="#FF5280"/>
          </radialGradient>
        </defs>
        <path fill="url(#msg-grad)" d="M24 4C12.4 4 4 12.5 4 23.5c0 6.2 2.9 11.7 7.4 15.2v6.3l6.7-3.7c1.9.5 3.9.8 5.9.8 11.6 0 20-8.5 20-19.5S35.6 4 24 4Z"/>
        <path fill="#fff" d="M12.8 28.8 18.7 19l5.7 4.7 6.5-4.7 5.4 9.8-5.6 1.8-5-4.4-6.8 4.4Z"/>
      </symbol>
    </svg>
  );
}
