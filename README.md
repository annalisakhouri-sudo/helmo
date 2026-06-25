# Helmo 🚢

**Plateforme de mise en relation entre agences de location nautique et skippers professionnels.**

## Stack technique

| Outil | Usage |
|-------|-------|
| React 18 + Vite | Frontend |
| Tailwind CSS | Styles |
| React Router v6 | Navigation |
| Supabase | Base de données + Auth + Stockage |
| Stripe Connect | Paiements + Commissions |
| Vercel | Déploiement |
| qrcode.react | Génération QR codes |
| date-fns | Gestion des dates |

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 3. Lancer en développement
npm run dev

# 4. Build pour production
npm run build
```

## Structure du projet

```
src/
├── components/
│   ├── ui/          → Composants réutilisables (Badge, Avatar, Card...)
│   ├── layout/      → AppLayout (sidebar + topbar)
│   └── planning/    → BookingDetail (panneau détail location)
├── pages/
│   ├── Dashboard.jsx    → Vue d'ensemble agence
│   ├── Planning.jsx     → Planning hebdomadaire
│   ├── Documents.jsx    → Gestion docs + QR codes
│   ├── Skippers.jsx     → Recherche et fiches skippers
│   ├── Techniciens.jsx  → Checklist temps réel
│   └── Others.jsx       → Mes skippers, Bateaux
├── lib/
│   ├── supabase.js      → Client Supabase
│   └── mock-data.js     → Données de démo
└── styles/
    └── globals.css      → Design system Helmo
```

## Palette de couleurs

| Nom | Hex | Usage |
|-----|-----|-------|
| Navy 900 | #042C53 | Sidebar, headers |
| Navy 600 | #185FA5 | Boutons primaires, liens |
| Teal 400 | #1D9E75 | Accent, statut OK |
| Amber 200 | #EF9F27 | Warnings |
| Danger 600 | #A32D2D | Erreurs, docs manquants |

## Roadmap V1 → V4

### V1 — En cours ✅
- [x] Dashboard agence avec alertes docs
- [x] Planning hebdomadaire (blocs continus)
- [x] Détail location (draps, skipper, techniciens)
- [x] Documents flotte + QR codes
- [x] Recherche skippers avec filtres
- [x] Checklist techniciens temps réel

### V2 — Authentification
- [ ] Inscription agence / skipper
- [ ] Login Supabase Auth
- [ ] Profils en base de données
- [ ] Upload documents vers Supabase Storage

### V3 — Données réelles
- [ ] CRUD bateaux, locs, skippers
- [ ] Notifications email (Resend)
- [ ] Contrats PDF auto-générés
- [ ] QR codes liés à la base

### V4 — Paiements
- [ ] Stripe Connect pour les skippers
- [ ] Commission automatique 5%/5%
- [ ] Tableau de bord financier
- [ ] Facturation automatique

## Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ajouter les variables d'env sur vercel.com/project/settings
```

## Supabase — Tables à créer

```sql
-- Agences
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  port text,
  email text unique,
  created_at timestamptz default now()
);

-- Bateaux
create table boats (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id),
  name text not null,
  type text,
  length int,
  port text,
  created_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid references boats(id),
  type text not null, -- francisation, assurance, securite, jauge
  status text default 'pending', -- ok, warn, danger
  expires_at date,
  file_url text,
  created_at timestamptz default now()
);

-- Skippers
create table skippers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  rate int,
  phone text,
  email text unique,
  created_at timestamptz default now()
);

-- Locations
create table bookings (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid references boats(id),
  skipper_id uuid references skippers(id),
  client_name text,
  client_phone text,
  guests text,
  start_date date,
  end_date date,
  needs_skipper boolean default false,
  status text default 'pending',
  created_at timestamptz default now()
);
```
