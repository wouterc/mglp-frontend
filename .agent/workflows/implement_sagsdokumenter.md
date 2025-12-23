---
description: Implementering af Sagsdokumenter med Drag & Drop og Auto-navngivning
status: in_progress
---

# Implementeringsplan: Sagsdokumenter

Denne plan beskriver opbygningen af dokumentstyringsmodulet til sager, inklusive backend-modeller, filhåndtering og frontend UI med drag & drop.

## Fase 1: Backend (Django) - Datamodel og API

- [ ] **Opret `SagsDokument` model** i `sager/models.py`.
    - Felter: `sag` (FK), `skabelon` (FK, nullable), `titel`, `filnavn`, `fil` (FileField), `gruppe` (FK/Char), `aktiv`, `dato_intern`, `dato_ekstern`, `ansvarlig` (FK), `kommentar`.
    - Definer `upload_to` funktion for dynamisk sti: `dokumenter/<sags_id>/<filnavn>`.
- [ ] **Opret Migrering** og kør `migrate`.
- [ ] **Opret Serializer** i `sager/serializers.py` (`SagsDokumentSerializer`).
- [ ] **Opret ViewSet** i `sager/views.py` (`SagsDokumentViewSet`).
    - Standard CRUD operationer.
    - Implementer `upload` action (hvis standard ikke er nok, men Multipart parser burde klare det).
- [ ] **Implementer `Generate/Sync` Endpoint**.
    - Endpoint: `POST /api/sager/<id>/sync_dokumenter/`.
    - Logik: Iterer over alle aktive `DokumentSkabeloner`. Opret `SagsDokument` rækker for dem, der mangler på sagen. (Sæt foreløbig fil=null).
- [ ] **Registrer URL** i `sager/urls.py`.

## Fase 2: Frontend (React) - Typer og API

- [ ] **Opdater Types** i `src/types.ts`.
    - Tilføj `SagsDokument` interface.
- [ ] **API Service**.
    - Vær sikker på `api.ts` kan håndtere `FormData` til fil-upload korrekt (tilføje multipart headers automatisk eller manuelt).

## Fase 3: Frontend - Navngivningslogik

- [ ] **Opret Utility funktion** `src/utils/filenameGenerator.ts`.
    - Funktion: `generateDocFilename(sagsNr, templateFilename, userInput?)`.
    - Implementer parsing af tags: `<dato>` (DD), `<årstal>` (YYYY), `<input>`.
    - Returner objekt: `{ filename: string, needsInput: boolean }`.

## Fase 4: Frontend - UI Komponenter

- [ ] **Opret `SagsDokumenterTab.tsx`** (eller Page/Komponent).
    - Baser layout på `SagsAktiviteter`.
    - Genbrug `FilterSidebar`.
- [ ] **Implementer Tabel/Liste visning**.
    - Gruppér efter `gruppe`.
    - Vis kolonner: Aktiv (checkbox), Titel, Filnavn/Link, Datoer, Ansvarlig, Kommentar.
- [ ] **Implementer "Synkroniser" Knap**.
    - Kalder backend sync endpoint.
- [ ] **Implementer Drag & Drop (DnD)**.
    - Gør hver række til et "Drop Zone".
    - `onDrop` handler:
        1.  Tag filen.
        2.  Kør `filenameGenerator`.
        3.  Hvis `needsInput`: Åbn Modal -> vent på input -> generer navn -> upload.
        4.  Hvis !`needsInput`: Upload med det samme.
- [ ] **Implementer File Upload Logik**.
    - Kald API med `FormData` (fil + genereret filnavn).
    - Opdater UI optimistisk eller ved reload.

## Fase 5: UI Finpudsning

- [ ] **Input Modal**.
    - Simpel modal til at indtaste værdien for `<input>` tagget.
- [ ] **Kommentar Modal/Popover**.
    - Samme logik som OverblikTab (inline eller popup).
- [ ] **Responsivitet & Styling**.
    - Tjek på små skærme.

