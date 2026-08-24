# Resend e-mail opsætning — DNS i SiteGround

Formål: bookingbekræftelser skal sendes fra `booking@send.bamuk.dk`.

**Vigtigt:** Vi bruger subdomænet `send.bamuk.dk` — ikke `bamuk.dk`.
Roddomænet har allerede en fungerende SPF-record til skolens almindelige
mail via SiteGround. Ændrer man den, risikerer man at bryde al personalemail.

Disse to skal IKKE røres:

```
MX   bamuk.dk    0 bamuk.dk
TXT  bamuk.dk    v=spf1 +a +mx +a:es89.siteground.eu include:bamuk.dk.spf.auto.dnssmarthost.net ~all
```

---

## De tre records

**Site Tools → Domain → DNS Zone Editor**
(nameservere er `ns1/ns2.siteground.net`)

Resend viser navnene **relativt til zonen** — præcis det format SiteGround
vil have. Skriv dem af som de står, uden `.bamuk.dk` til sidst.

### 1. DKIM — domæneverifikation

| Felt | Værdi |
|---|---|
| Type | `TXT` |
| Name | `resend._domainkey.send` |
| TTL | Auto / standard |

Content (ÉN linje, ingen mellemrum eller linjeskift):

```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDANXq/id9A+6B12lwBxiERd052c4mdHQc4Lykm0oJMA7jg18kwN8ojUZOraWg1tJiOnx/xHWajGf4n3maDZqEcMRbCDD1+6XsPM8V1SpZzTAhCvuR6IdwuIsr9l5uEk/5Z4YpbX7r5FZ1GKpK4raJx8LyKSxF/TywNw5A98zwNwwIDAQAB
```

### 2. SPF — afsender

| Type | Name | Content |
|---|---|---|
| `CNAME` | `rsend.send` | `rsend.forge.rmta.net` |

### 3. SPF — bounce-håndtering

| Type | Name | Content |
|---|---|---|
| `CNAME` | `send.send` | `send.forge.rmta.net` |

> `rsend` med ét `e` i record nr. 2 er ikke en tastefejl — det hedder
> sådan hos Resend. Skriv præcis som ovenfor.

### Detaljer der driller

- **Ingen anførselstegn** om TXT-værdien — SiteGround tilføjer dem selv
- DKIM-nøglen må ikke brydes over flere linjer
- CNAME-værdier: nogle DNS-paneler kræver et afsluttende punktum
  (`rsend.forge.rmta.net.`). Virker det ikke uden, så prøv med.
- Kopiér altid med kopiér-knappen i Resend, ikke ved at markere med musen

---

## Verificér

1. Resend → **I've already added the records**
2. Typisk grønt inden for 15 minutter; DNS kan tage op til 72 timer
3. Tjek undervejs fra terminal:

```sh
dig +short TXT   resend._domainkey.send.bamuk.dk
dig +short CNAME rsend.send.bamuk.dk
dig +short CNAME send.send.bamuk.dk
```

Tomme svar = ikke propageret endnu, eller forkert navn.

---

## Sidste skridt i appen

Når Resend viser **Verified**:

```sh
# skift FROM_EMAIL i fly.toml til booking@send.bamuk.dk
fly deploy --app bamuk-booking
```

Ingen kodeændring nødvendig — `FROM_EMAIL` læses fra miljøet i `server.js`.

---

## Fejlsøgning

```sh
fly logs --app bamuk-booking
```

Kig efter `Email fejl:`. En booking fejler aldrig på grund af mail —
bookingen gemmes uanset hvad, kun bekræftelsen udebliver.

Resend-dashboardets **Logs**-fane viser den præcise årsag til afviste sends.

---

## Noter

- **Enable Receiving** er slået fra i Resend. Det er med vilje — appen
  sender kun, den modtager ikke.
- Region er **EU (Ireland)**, så afsendelse og data holdes i EU.
