# Medilio

Application web mobile-first de coordination des soins à domicile. Elle propose quatre espaces : patient, professionnel, établissement et administration.

## Prérequis

- Node.js 24 ou supérieur
- npm
- un projet Supabase

## Installation locale

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Renseigner dans `.env.local` la clé publique/publishable du projet Supabase. Ne jamais placer une clé `service_role` dans une variable `VITE_*`.

## Base de données

Le schéma de référence est la migration :

```text
supabase/migrations/20260825190000_initial_secure_schema.sql
```

Elle crée les profils, patients gérés, missions, candidatures, notes de soins, conversations, notifications, évaluations et buckets de stockage. Toutes les tables applicatives utilisent RLS. Les missions ouvertes sont exposées aux professionnels vérifiés par une fonction qui masque l’identité, l’adresse précise, les documents et les données médicales.

Application avec la CLI Supabase :

```bash
supabase link --project-ref plizoowokyzpfvhtasxj
supabase db push
```

Le premier administrateur doit d’abord créer un compte normal, puis être promu manuellement depuis un accès SQL de confiance :

```sql
update public.profiles set role = 'admin' where id = 'uuid-du-compte';
```

L’inscription publique ne peut jamais créer un administrateur.

## E-mails transactionnels

La fonction `supabase/functions/send-email` exige un JWT utilisateur et reconstruit côté serveur le destinataire et le contenu. Le navigateur ne peut pas choisir librement une adresse ou envoyer du HTML.

Secrets requis côté Supabase :

```text
BREVO_API_KEY
SENDER_EMAIL
SENDER_NAME
APP_URL
ALLOWED_ORIGINS
```

Puis déployer :

```bash
supabase functions deploy send-email --project-ref plizoowokyzpfvhtasxj
```

## Vérification

```bash
npm run check
npm audit
```

`npm run check` exécute le lint, les tests, le build PWA et vérifie que le
livrable production n’embarque aucune identité ou donnée de validation.

Avant un déploiement commercial :

```bash
npm run release:check
```

Cette commande refuse une configuration sans URL publique, identité juridique
ou contact confidentialité. Les secrets Brevo restent à contrôler dans le
coffre de secrets Supabase, jamais dans un fichier `VITE_*`.

Les appels critiques de l’interface ont un délai maximal et proposent un état
d’erreur avec relance : un incident réseau ne doit pas laisser un écran tourner
indéfiniment.

## Frontière de production

- Les montants sont des estimations : aucun paiement ni reversement n’est intégré.
- Les informations légales, le contact confidentialité et les durées de conservation doivent être finalisés avant une ouverture commerciale.
- Le déploiement avec des données de santé réelles exige une validation juridique et contractuelle du périmètre HDS, des sous-traitants et des procédures d’exploitation ; la présence de contrôles techniques dans le code ne constitue pas une certification.
