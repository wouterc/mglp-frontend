# � Den Komplette Brugermanual: MGLP Administration

Velkommen til den fulde vejledning til MGLP Flow. Dette dokument dækker alle aspekter af systemet, fra daglig sagsbehandling til avanceret skabelonstyring.

---

## 🏗️ 1. Den Overordnede Arbejdsproces
For at få det maksimale ud af systemets automatisering, bør en sag følge denne faste rækkefølge:

1.  **Oprettelse**: Opret sagen i **Sagsoversigten**.
2.  **Stamdata**: Udfyld alle faner i **Sagsdetaljer** (Mægler, Bank, Sælgere, osv.).
3.  **Procesvalg**: Vælg de relevante skabeloner under fanen **Processer**.
4.  **Generering**: Klik på **"Opret Aktiviteter"** og **"Opret Dokumenter"** i sagsoversigten.
5.  **Ekspedition**: Håndtér opgaver i **Aktiviteter** og journalisér i **SagsMail**.

---

## 🏠 2. Sagsoversigt (Main Dashboard)
Dette er din startside og kontrolcenter.

### Felter & Søgning
*   **Sagsnr**: Søg på det specifikke sagsnummer.
*   **Status**: Søg på proces-status (fx "Ny", "I gang").
*   **Alias**: Søg på sagens alias/navn (fx "Hansen - Salg").
*   **Ansvarlig**: Filtrér sager efter hvem der sidder med dem.
*   **Adresse**: Søg på den fysiske adresse.

### Features & Knapper
*   ➕ **Opret Ny Sag**: Åbner en formular til indtastning af basisdata.
*   🔵 **Status-badge**: Klik direkte på statussen i rækken for at ændre den lynhurtigt.
*   ⚡ **Opret Aktiviteter**: Udruller alle opgaver fra de valgte skabeloner til sagen.
*   📂 **Opret Dokumenter**: Opretter den fulde mappestruktur.
*   ℹ️ **Info-ikon**: Sender dig til de dybe sagsdetaljer.
*   �️ **Adresse-klik**: Viser ejendommen på kort (hvis konfigureret).

---

## 🔍 3. Sagsdetaljer (Den Dybe Indsigt)
Siden er opdelt i faner for at holde overblikket.

### Faner
*   **Overblik**: Viser stamdata og en **Progress Bar**, der beregner færdiggørelsesgraden baseret på aktiviteter.
*   **Processer (VIGTIG)**: Her vælger du hvilke arbejdsprocesser (fx "Projekt", "Standard") der skal gælde. Dine valg her styrer alt andet!
*   **Mægler / Bank / Sælgere / Rådgivere / Købere**:
    *   Søg i det globale register.
    *   Tilknyt eksisterende firmaer/personer.
    *   **Feature**: Du kan oprette en ny virksomhed direkte fra disse faner, hvis den ikke findes.
*   **Kommune / Forsyning**: Specifikke datafelter til ejendomsoplysninger og forsyningsledninger.

---

## ✅ 4. Aktiviteter (Din Arbejdsliste)
Her foregår det daglige rugbrødsarbejde.

### Felter i rækken
*   **Aktiv (Checkbox)**: Er opgaven relevant lige nu?
*   **Intern Dato**: Din personlige huskeseddel.
*   **Ekstern Dato**: Den hårde deadline ud mod kunden.
*   **Status**: Typisk "Oprettet", "I gang", "Udført".
*   **Resultat**: Et tekstfelt til at logge sagens gang.
*   **Kilde**: Hvem kommer informationen fra?
*   **Ansvarlig**: Hvem i teamet ejer denne specifikke opgave?

### Smarte Features
*   🚦 **Trafiklys**: Rød = Overskredet, Orange = Deadline i dag/i morgen (inkl. weekend-logik).
*   ⌨️ **Enter-navigation**: Tryk Enter for at hoppe til næste felt i rækken og gemme automatisk.
*   💬 **Vigtig Kommentar**: Klik på taleboblen og markér som "Vigtig" for at gøre den rød og synlig for alle.
*   💾 **Gem som Skabelon**: Har du opfundet en ny arbejdsgang? Gem den globalt direkte fra sagen.
*   🔄 **Synkroniser**: Hvis admin har opdateret en skabelon, kan du trække ændringerne ind på din sag.

---

## 📁 5. Dokumenter & Mappestruktur
Fuld kontrol over sagsakterne.

### 4 Måder at tilknytte filer
1.  **Klik/Upload**: Den klassiske måde.
2.  **Computer Drop**: Træk filer fra Windows direkte ind på rækken.
3.  **SagsMail Drop**: Træk bilag fra en email direkte ind i dokumentlisten.
4.  **Auto-navngivning**: Systemet sikrer altid formater som *"102. Købsaftale.pdf"*.

### Dokument Features
*   🌐 **Eksternt Link**: Direkte genvej til Tinglysning, BBR eller lignende.
*   ✏️ **Omdøb**: Ret filnavnet hvis det blev forkert (systemet beholder nummereringen).
*   🗑️ **Slet**: Sletter filen permanent fra serveren.

---

## 📧 6. SagsMail (Email Integration)
Integreret Outlook-håndtering koblet direkte på sagen.

*   🔴 **Ubehandlet Prik**: Viser hvilke mails der er nye og "farvestrålende".
*   🔗 **Link Bilag**: Åbner dokument-skuffen i højre side, så du kan drag-and-droppe filer til sagen.
*   📝 **Email Noter**: Skriv kommentarer til en mail, fx "Vent på svar fra banken", så kolleger ved hvorfor den ligger der.

---

## 🏢 7. Virksomheder & Kontakter (Register)
Jeres fælles database over samarbejdspartnere.

*   **Virksomheder**: Gemmer CVR, hovednumre og generelle aftaler.
*   **Kontakter**: De specifikke personer (fx mægleren Anders) koblet til firmaet.
*   📊 **Ekspert-funktion**: Eksportér filtrede lister til Excel (XLSX) til julekort, nyhedsbreve eller statistik.
*   📥 **Import**: Har du en liste fra et andet system? Upload den direkte via Excel-import.

---

## ⚙️ 8. Skabeloner (Administrator)
Hjertet i automatiseringen.

*   **Aktivitetsskabeloner**: Her bygger I jeres best-practice tjeklister.
*   **Dokumentskabeloner**: Definer hvilke filer der skal bruges, og hvilke eksterne links der skal hjælpe sagsbehandleren.
*   **Feature: #BFE#**: Brug koden `#BFE#` i et link, så indsætter systemet automatisk ejendommens BFE-nummer.

---

## � 9. Filtre & Tips til hurtigere navigation
*   **Sidebaren i Aktiviteter**: Brug "Overskredne" for at se dagens vigtigste opgaver.
*   **Smart Dato**: Skriv "2412" for at få dags dato juleaften i år.
*   **Multi-select**: (Hvor implementeret) hold Shift nede for at vælge flere.
*   **Tastatur**: Brug Tab og Enter for at undgå at røre musen under dataindtastning.

---

*Manual opdateret: 2026-01-01*
