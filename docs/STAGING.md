# Staging und Production

| | Staging | Production |
| --- | --- | --- |
| Supabase | `sellycat-staging` (`odvgktijrxkbrxfdvjqz`, eu-central-1 Frankfurt) | noch nicht angelegt (vor dem ersten echten Kunden) |
| Vercel | Projekt `sellycat` (Team 105), Branch `main` → Preview | Branch `release` → Production |
| Adresse | https://staging.sellycat.com (Passwortschutz, `STAGING_PASSWORD`) | https://sellycat.com |
| Shops | `<slug>.staging.sellycat.com` | `<slug>.sellycat.com` |

## DNS (GoDaddy)

- `staging` und `*.staging` → CNAME `ed1c58be89aba46b.vercel-dns-016.com` (16.11.2026).
- Apex `sellycat.com` und `*` folgen mit Production.
- Vercel stellt für Wildcards ohne Vercel-Nameserver keine Zertifikate aus: jede Shop-Subdomain wird einzeln beim Projekt registriert (Demo-Shops von Hand, neue Kunden künftig automatisch über die Vercel-API).

## Ablauf

1. Migration anlegen (`npx supabase migration new <name>`), `npm run db:push`, `npm run db:types`.
2. Push auf `main` → Staging-Build. Live nur über `git push origin <sha>:release` (bewusster Schritt).
3. Seed: `NEXT_PUBLIC_SITE_URL=https://staging.sellycat.com npm run seed:staging`.
