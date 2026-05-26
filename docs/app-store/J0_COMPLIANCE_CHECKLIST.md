# Freescale iPhone - J0 Compliance Checklist

## Product Decision

- Distribution model: free companion iPhone app for the Freescale web service.
- Commerce in iPhone V1: prohibited; no price, paywall, checkout, subscribe CTA, or external purchase link.
- Web commerce: Stripe pricing and checkout remain on `https://www.freescale.site`.
- Native value required for review: task-first navigation, offline task cache/sync, local reminders, native auth and account deletion.

## Identifiers

| Item | Target value | Status | Evidence required |
| --- | --- | --- | --- |
| App name | Freescale | Decision recorded | App Store Connect URL once created |
| iOS bundle identifier | `site.freescale.app` | To register in Apple Developer | Identifier screenshot/URL |
| Deep-link scheme | `freescale` | Reserved for Expo phase | `app.config.ts` in J2 |
| Website | `https://www.freescale.site` | Existing production domain | Live URL check |
| Support contact | `hello@freescale.app` | Owner must confirm monitored inbox | Successful test email date |

## Apple Gates

| Requirement | Current status | Completion evidence |
| --- | --- | --- |
| Apple Developer Program membership | Owner action required | Team ID and enrollment confirmation |
| App Store Connect app record | Owner action required | App record URL |
| Sign in with Apple capability | Owner action required | Service/App ID and key configured securely |
| Privacy policy URL | Implemented locally; deployment pending | Live `/privacy` URL |
| Support URL | Implemented locally; deployment pending | Live `/support` URL |
| Account deletion initiation | Web public guidance and settings action implemented; native required in J2/J3 | TestFlight screen recording |
| No native purchase CTA | Design locked; verify per build | Review checklist result |

## Google Gmail Gate

Freescale currently requests `https://www.googleapis.com/auth/gmail.modify`
and `https://www.googleapis.com/auth/gmail.send`. Google classifies
`gmail.modify` as a restricted scope. Freescale stores or transmits mailbox
content server-side, so public distribution must not be considered cleared
until Google OAuth verification and any required security assessment are
confirmed.

| Requirement | Current status | Completion evidence |
| --- | --- | --- |
| OAuth consent project owner access | Owner action required | Project identifier recorded privately |
| Restricted-scope verification status checked | Owner action required | Console status and date |
| Security assessment requirement confirmed | Owner action required | Google response/status |
| Review/demo account behavior without Gmail | Product requirement recorded | Native J2 test |

## Legal And Support Copy Gate

The repository may ship public informational routes using the existing
contact `hello@freescale.app`. Before App Store submission or publication of
final legal wording, the owner must confirm:

- the mailbox is monitored;
- the legal name and postal address of the data controller;
- the countries offered at launch;
- the final list of subprocessors for infrastructure, email, payment and Mue.

## J0 Implementation Record

- Branch: `codex/j0-app-store-foundation`.
- Public pages implemented: `/privacy`, `/terms`, `/support`, `/account-deletion`.
- Access verified anonymously through production build locally on 26 May 2026.
- Footer discovery checked at iPhone-width viewport; all four public destinations remain reachable.
- Technical verification: `pnpm --filter @freescale/web lint`, `typecheck`, `test`, `build`, and root `pnpm test` passed locally.

## Official References

- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Apple account deletion: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Google Gmail scopes: <https://developers.google.com/workspace/gmail/api/auth/scopes>
- Supabase Sign in with Apple: <https://supabase.com/docs/guides/auth/auth-apple>
- Supabase native mobile deep linking: <https://supabase.com/docs/guides/auth/native-mobile-deep-linking>
