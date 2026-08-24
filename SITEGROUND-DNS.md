# Resend e-mail opsætning — DNS i SiteGround

Formålet: få bookingbekræftelser sendt fra `booking@send.bamuk.dk`.

**Vigtigt:** Vi bruger subdomænet `send.bamuk.dk` — ikke `bamuk.dk`.
Roddomænet har allerede en fungerende SPF-record til skolens almindelige mail
via SiteGround. Ændrer man den, risikerer man at bryde al personalemail.
Lad rodens `MX` og `TXT`-records være i fred.

Nuværende (skal IKKE røres):

```
MX   bamuk.dk        0 bamuk.dk
TXT  bamuk.dk        v=spf1 +a +mx +a:es89.siteground.eu include:bamuk.dk.spf.auto.dnssmarthost.net ~all
```

---

## 1. Opret domænet i Resend

1. Log ind på https://resend.com → **Domains** → **Add Domain**
2. Domæne: `send.bamuk.dk`
3. Region: **EU (Ireland)** — tættest på og holder data i EU
4. Resend viser nu tre records: én **DKIM** og to under **SPF**

---

## 2. Indsæt records i SiteGround

**Site Tools → Domain → DNS Zone Editor** (nameservere er `ns1/ns2.siteground.net`)

### ⚠️ Den fejl alle laver

SiteGrounds **Name/Host**-felt er *relativt til zonen*. Resend viser det fulde
navn. Skriver du det fulde navn, laver SiteGround `send.bamuk.dk.bamuk.dk`,
og verifikationen bliver aldrig grøn.

| Resend viser | Skriv i SiteGround |
|---|---|
| `send.bamuk.dk` | `send` |
| `resend._domainkey.send.bamuk.dk` | `resend._domainkey.send` |

SiteGround viser `.bamuk.dk` i grå tekst ved siden af feltet. Ser du det,
er du i det relative format — skriv kun venstre del.

### De tre records

Hent de præcise værdier fra Resend-dashboardet. Nedenstående er formatet:

**1. DKIM (TXT)**

| Felt | Værdi |
|---|---|
| Type | `TXT` |
| Name | `resend._domainkey.send` |
| Value | `p=MIGfMA0GCSq...` (lang streng — kopiér HELE den fra Resend) |

**2. SPF — bounce-håndtering (MX)**

| Felt | Værdi |
|---|---|
| Type | `MX` |
| Name | `send` |
| Value | `feedback-smtp.eu-west-1.amazonses.com` |
| Priority | `10` |

**3. SPF — afsendertilladelse (TXT)**

| Felt | Værdi |
|---|---|
| Type | `TXT` |
| Name | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |

### Detaljer der driller

- **Ingen anførselstegn** om TXT-værdier — SiteGround tilføjer dem selv
- **MX skal have priority** (`10`), ellers afvises den
- DKIM-værdien er lang og må ikke få linjeskift eller mellemrum indsat
- Kopiér altid fra Resend med kopiér-knappen, ikke ved at markere med musen

---

## 3. Verificér

1. Tilbage i Resend → **Verify DNS Records**
2. Propagering tager typisk få minutter, men kan tage timer
3. Tjek undervejs fra terminal:

```sh
dig +short TXT resend._domainkey.send.bamuk.dk
dig +short TXT send.bamuk.dk
dig +short MX  send.bamuk.dk
```

Kommer der tomme svar, er recorden enten ikke propageret endnu eller
oprettet med forkert navn (se fejlen ovenfor).

---

## 4. Sidste skridt i appen

Når Resend viser **Verified**, skal afsenderadressen skiftes:

```
booking@bamuk.dk  →  booking@send.bamuk.dk
```

Den ligger allerede klar i `fly.toml` som `FROM_EMAIL`. Deploy med:

```sh
fly deploy --app bamuk-booking
```

Ingen kodeændring nødvendig — `FROM_EMAIL` læses fra miljøet i `server.js`.

---

## Fejlsøgning

Mail kommer ikke frem:

```sh
fly logs --app bamuk-booking
```

Kig efter `Email fejl:`. Appen fejler aldrig en booking på grund af mail —
bookingen gemmes uanset hvad, kun bekræftelsen udebliver.

Tjek også Resend-dashboardets **Logs**-fane; der står den præcise årsag
til afviste sends.
