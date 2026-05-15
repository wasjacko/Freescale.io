---
title: Resend
type: stack
category: email
status: confirmed
role: transactional-email
cost_monthly: 20
created: 2026-05-15
tags:
  - stack/email
---

# Resend

Service d'envoi d'email transactionnels (verification, password reset, weekly digest).

## Usage

- Verification email (signup)
- Magic link (sign in)
- Password reset
- Weekly digest "tu as 12 messages non lus"
- Invoice receipts (relayés par [[Stripe]])

## Pourquoi Resend

> [!tip] DX moderne
> - **React Email** : templates en composants React (versionnés dans Git)
> - SDK propre, types TS
> - 3000 emails/mo gratuits, 50€ pour 50k/mo
> - Créé par l'équipe Vercel → integration parfaite

## Template type

```tsx
// emails/welcome.tsx
import { Html, Button } from "@react-email/components";

export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <h1>Hey {name}, welcome to Freescale 🦎</h1>
      <p>Let's connect your first channel.</p>
      <Button href="https://app.freescale.app/onboarding">Get started</Button>
    </Html>
  );
}

// In server action
import { resend } from "@/lib/resend";
import WelcomeEmail from "@/emails/welcome";

await resend.emails.send({
  from: "Mue <hello@freescale.app>",
  to: user.email,
  subject: "Welcome to Freescale",
  react: WelcomeEmail({ name: user.name })
});
```

## DNS setup (post étape 2)

Une fois le domaine acheté :
- SPF record
- DKIM keys (générés par Resend)
- DMARC record

## Liens

- [Resend](https://resend.com)
- [React Email](https://react.email)
