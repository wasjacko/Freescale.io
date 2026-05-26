export const PUBLIC_CONTACT_EMAIL = "hello@freescale.app";
export const PUBLIC_POLICY_UPDATED_AT = "26 mai 2026";

export type PublicPolicy = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[]; items?: string[] }>;
  action?: { label: string; href: string };
};

export const privacyPolicy: PublicPolicy = {
  eyebrow: "Confidentialité",
  title: "Politique de confidentialité",
  introduction:
    "Freescale centralise des conversations et des tâches pour aider ses utilisateurs à agir. Cette page décrit les données traitées et les choix disponibles.",
  sections: [
    {
      title: "Responsable et contact",
      paragraphs: [
        `Le service Freescale est joignable à ${PUBLIC_CONTACT_EMAIL} pour toute question relative aux données personnelles ou à l'exercice de vos droits.`,
      ],
    },
    {
      title: "Données traitées",
      paragraphs: ["Nous traitons uniquement les données nécessaires au fonctionnement demandé."],
      items: [
        "Identité de compte : nom, adresse email, avatar et informations d'espace de travail.",
        "Données connectées : jetons d'autorisation chiffrés et conversations des canaux que vous reliez volontairement.",
        "Données de travail : tâches, échéances, événements, modèles et préférences.",
        "Demandes Mue : contenu transmis lorsque vous lancez explicitement une analyse ou une assistance.",
        "Facturation web : état du plan et références nécessaires au paiement Stripe sur le site.",
      ],
    },
    {
      title: "Finalités et services utilisés",
      paragraphs: [
        "Ces données servent à authentifier le compte, synchroniser les canaux choisis, afficher l'inbox et les tâches, exécuter une demande Mue et fournir l'assistance.",
        "Freescale s'appuie notamment sur Supabase pour les comptes et données, Google ou Microsoft pour les canaux autorisés, Stripe pour la facturation web et un fournisseur de modèle IA configuré pour les demandes Mue explicites.",
      ],
    },
    {
      title: "Contrôle et suppression",
      paragraphs: [
        "Vous pouvez déconnecter un canal depuis les réglages. Vous pouvez initier la suppression définitive de votre compte depuis Réglages > Profil > Supprimer mon compte ; la suppression efface le profil, les workspaces, les jetons connectés, les conversations, les tâches et les événements associés.",
        `Pour exercer un droit d'accès, de rectification ou de suppression si vous ne pouvez plus vous connecter, écrivez à ${PUBLIC_CONTACT_EMAIL}.`,
      ],
    },
  ],
  action: { label: "Comment supprimer mon compte", href: "/account-deletion" },
};

export const termsOfService: PublicPolicy = {
  eyebrow: "Conditions",
  title: "Conditions d'utilisation",
  introduction:
    "En utilisant Freescale, vous confiez au service l'organisation des messages et tâches que vous choisissez de connecter.",
  sections: [
    {
      title: "Compte et accès",
      paragraphs: [
        "Vous êtes responsable de votre compte et des connexions de canaux que vous autorisez. Vous pouvez retirer une connexion ou supprimer votre compte depuis les réglages.",
      ],
    },
    {
      title: "Mue",
      paragraphs: [
        "Mue fournit une aide à la lecture, à la rédaction ou à la collecte de tâches uniquement lorsque vous la sollicitez. Ses suggestions doivent être vérifiées avant envoi ou création d'une action.",
      ],
    },
    {
      title: "Abonnement",
      paragraphs: [
        "La version iPhone compagnon ne permet pas l'achat d'un abonnement. Les offres, essais et paiements éventuellement proposés sont gérés sur le site web Freescale.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [`Questions relatives au service : ${PUBLIC_CONTACT_EMAIL}.`],
    },
  ],
};

export const supportInformation: PublicPolicy = {
  eyebrow: "Support",
  title: "Comment pouvons-nous vous aider ?",
  introduction:
    "Pour un problème de connexion, de synchronisation, de tâches ou de confidentialité, contactez l'équipe Freescale.",
  sections: [
    {
      title: "Obtenir de l'aide",
      paragraphs: [
        `Écrivez à ${PUBLIC_CONTACT_EMAIL} en indiquant l'adresse de votre compte et le problème rencontré. Ne transmettez jamais de mot de passe ou de jeton d'accès.`,
      ],
    },
    {
      title: "Compte et données",
      paragraphs: [
        "La déconnexion d'un canal et la suppression du compte se pilotent depuis les réglages lorsque vous êtes connecté.",
      ],
    },
  ],
  action: { label: "Écrire au support", href: `mailto:${PUBLIC_CONTACT_EMAIL}` },
};

export const accountDeletionInformation: PublicPolicy = {
  eyebrow: "Compte",
  title: "Supprimer votre compte Freescale",
  introduction:
    "Vous gardez le contrôle : la suppression du compte peut être initiée directement dans Freescale.",
  sections: [
    {
      title: "Depuis le service",
      paragraphs: [
        "Connectez-vous, ouvrez Réglages > Profil, puis la zone dangereuse et choisissez Supprimer mon compte. Après confirmation, la suppression est immédiate et irréversible.",
      ],
    },
    {
      title: "Données supprimées",
      paragraphs: [
        "La suppression efface votre profil, vos workspaces, les comptes connectés et leurs jetons, les conversations, les messages, les contacts, les tâches et les événements associés.",
      ],
    },
    {
      title: "Si vous ne pouvez plus vous connecter",
      paragraphs: [
        `Contactez ${PUBLIC_CONTACT_EMAIL} depuis l'adresse liée à votre compte afin que nous puissions traiter votre demande en sécurité.`,
      ],
    },
  ],
  action: { label: "Ouvrir les réglages du profil", href: "/app/settings/profile" },
};
