# Introduktionsmateriale — Lokalebooking

To ting: en mail til administrationen, og en prompt til OpenDesign
der laver en plakat til lærere og elever.

---

## 1. Mail til administrationen

> **Emne:** Nyt bookingsystem til elevafdelingen

Kære kolleger

Vi har fået et nyt, lille bookingsystem til elevafdelingen. Det ligger her:

**https://elevafdeling.bamuk.dk**

### Hvad er det?

En hjemmeside hvor man kan reservere elevafdelingen i et bestemt tidsrum,
så to hold ikke møder op til samme lokale. Ikke andet.

### Sådan bruger man det

1. Åbn linket — der er ingen login og ingen kode
2. Vælg dag øverst (man kan booke op til 7 dage frem)
3. Klik på et ledigt tidspunkt
4. Skriv navn og e-mail, vælg hvor længe (30 minutter til 3 timer)
5. Tryk **Book**

Man får en bekræftelse på mail med et link, man kan afmelde med, hvis
planerne ændrer sig.

### Det er værd at vide

- **Åbningstid:** 07:00–23:00, i intervaller på en halv time
- **Torsdag 15:00–20:00 er fast reserveret** og kan ikke bookes
- **Man kan booke 7 dage frem** — ikke længere
- **Afbestilling:** enten via linket i mailen, eller ved at klikke på sin
  booking på siden og skrive sit navn
- Der er **ingen bruger-login**. Systemet bygger på tillid — alle på
  skolen kan i princippet afmelde en andens booking, hvis de kender
  navnet. Det er et bevidst valg for at holde det enkelt.

### Til administrationen

Der er en oversigt på **https://elevafdeling.bamuk.dk/admin** med en
adgangskode, I får særskilt. Her kan man se alle bookinger, slette dem,
og se statistik over hvor meget lokalet bliver brugt.

### Persondata

Navne og e-mailadresser slettes automatisk efter 30 dage. Derefter
gemmes kun anonyme tal — hvor mange bookinger, hvilke dage og tidspunkter.
Det er for at kunne vurdere om systemet er værd at beholde på sigt,
uden at opbevare persondata længere end nødvendigt.

Sig endelig til hvis noget driller, eller hvis I opdager noget mærkeligt.

Bedste hilsner
Adam

---

## 2. Prompt til OpenDesign — plakat

Kopiér alt herunder ind i OpenDesign.

```
Lav en plakat i A3-format (stående) til opslagstavlen på en dansk
efterskole. Plakaten skal introducere et nyt online bookingsystem til
skolens elevafdeling. Målgruppen er lærere og elever mellem 14 og 18 år.

TONE
Venlig, direkte og kort. Ikke corporate, ikke barnlig. Plakaten skal
kunne forstås på fem sekunder på vej forbi.

FARVER
Primær blå: #003DA5
Accent orange: #FF5C00
Baggrund: hvid eller meget lys grå (#FCFCFC)
Tekst: mørkegrå (#54595F)
Brug orange sparsomt — kun til det vigtigste.

INDHOLD (dansk tekst, brug præcis denne ordlyd)

Overskrift:
"Book elevafdelingen"

Underoverskrift:
"Nu online — så I ikke render ind i hinanden"

Stort og tydeligt, det vigtigste element på plakaten:
"elevafdeling.bamuk.dk"

Tre trin med ikoner, side om side eller under hinanden:
1. "Vælg dag og tid"
2. "Skriv navn og mail"
3. "Du får en bekræftelse"

En lille boks nederst med praktisk info:
"Åbent 07:00–23:00 · Book op til 7 dage frem · Torsdag 15–20 er optaget"

Nederst i hjørnet, diskret:
"Afbestil via linket i din mail"

LAYOUT
Der skal være god luft. Webadressen skal være det, man husker.
Efterlad plads nederst til en QR-kode (ca. 4x4 cm), som vi selv
indsætter bagefter — marker feltet, men lav ikke selve koden.

UNDGÅ
Stockfotos af mennesker der giver hånd. Ingen kalendericoner i clipart-stil.
Ingen engelsk tekst. Ingen lange forklaringer.
```

### Efter plakaten er lavet

Lav en QR-kode der peger på `https://elevafdeling.bamuk.dk` og sæt den
i feltet nederst. Der findes gratis QR-generatorer online — vælg en der
laver en almindelig, statisk kode, ikke en der kræver login eller
omdirigerer via deres eget domæne.
