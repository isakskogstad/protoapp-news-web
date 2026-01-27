# ProtoApp News Web

Minimalistisk webbsida för att visa bolagsnyheter i realtid. Integreras med Slack för autentisering och notifikationer.

## Features

- **Live nyhetsflöde** via Server-Sent Events (SSE)
- **Slack OAuth** för enkel inloggning
- **Impact Loop-integration** för relaterade nyhetsartiklar
- **Minimalistisk design** med animationer
- **Responsiv** för desktop och mobil

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- NextAuth.js (Slack OAuth)
- Supabase (PostgreSQL + Realtime)

## Setup

1. **Klona och installera:**
   ```bash
   npm install
   ```

2. **Konfigurera miljövariabler:**
   ```bash
   cp .env.example .env.local
   # Fyll i alla variabler
   ```

3. **Slack App-konfiguration:**
   - Gå till https://api.slack.com/apps
   - Lägg till OAuth Redirect URL: `https://your-domain.com/api/auth/callback/slack`
   - Aktivera scope: `identity.basic`, `identity.email`, `identity.avatar`

4. **Starta utvecklingsserver:**
   ```bash
   npm run dev
   ```

## Deploy till Railway

1. Skapa nytt projekt på Railway
2. Koppla GitHub-repo
3. Lägg till miljövariabler i Railway dashboard
4. Deploy!

## Miljövariabler

| Variabel | Beskrivning |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SLACK_CLIENT_ID` | Slack App client ID |
| `SLACK_CLIENT_SECRET` | Slack App client secret |
| `NEXTAUTH_URL` | Din domän (t.ex. https://news.example.com) |
| `NEXTAUTH_SECRET` | Slumpmässig hemlig sträng |
| `ALLOWED_SLACK_USERS` | Kommaseparerade emails/user IDs |
| `IMPACTLOOP_PROXY_URL` | URL till Impact Loop proxy |

## Slack-knapp i webhook

Uppdatera Slack webhook-payload i ProtoApp för att lägga till "Läs mer"-knapp:

```swift
// I buildSlackPayload(), lägg till knapp:
[
  "type": "button",
  "text": ["type": "plain_text", "text": "Läs mer", "emoji": true],
  "url": "https://news.protoapp.se/news/\(item.id)"
]
```
