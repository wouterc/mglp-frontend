// --- Fil: src/types.ts ---
// @# 2025-09-15 15:01 - Tilføjet manglende 'kommentar'-felt til Aktivitet-typen.
// @# 2025-11-06 18:25 - Tilføjet typer for Virksomhed og Kontakt.
// @# 2025-11-06 19:27 - Tilføjet Rolle-type og opdateret Kontakt-type.
// @# 2025-11-06 20:02 - Tilføjet VirksomhedGruppe-type og opdateret Virksomhed-type.
// @# 2025-11-10 17:40 - Opdateret Rolle- og Kontakt-typer til M2M.
// @# 2025-11-10 18:40 - Tilføjet global DawaAdresse type.
// @# 2025-11-10 19:20 - Tilføjet manglende bolig_bfe og bolig_anpart til Sag-typen.
// @# 2025-11-10 19:30 - Tilføjet manglende adresse-felter til Sag-typen for at matche serializer.
// @# 2025-11-10 21:30 - Tilføjet 'primaer_saelger' til Sag-typen.
export interface Blokinfo {
  id: number;
  formaal: number;
  nr: number;
  titel_kort: string | null;
  beskrivelse: string | null;
}

export interface SkabAktivitet {
  id: number;
  proces: Blokinfo | null;
  gruppe: Blokinfo | null;
  aktivitet_nr: number | null;
  aktivitet: string | null;
  aktiv: boolean | null;
  udgaaet: boolean | null;
  note: string | null;
  ansvarlig: string | null;
  frist: number | null;
}

export interface Status {
    id: number;
    status_nummer: number;
    beskrivelse: string;
    status_kategori: number;
}

export interface BbrAnvendelse {
  id: number;
  kode: number;
  beskrivelse: string;
}

// Komplet Sag-interface, der matcher API'et
export interface Sag {
    id: number;
    sags_nr: string;
    alias: string;
    hovedansvarlige: string;
    status: Status | null;
    fuld_adresse: string;
    kommentar: string | null;

    // @# 2025-11-10 19:30 - Tilføjet manglende adressefelter
    adresse_vej: string | null;
    adresse_husnr: string | null;
    adresse_etage: string | null;
    adresse_doer: string | null;
    adresse_post_nr: string | null;
    adresse_by: string | null;
    adresse_id_dawa: string | null;
    adressebetegnelse: string | null;

    bolig_type: string | null;
    bolig_matrikel: string | null;
    bolig_anvendelse: BbrAnvendelse | null;
    // @# 2025-11-10 19:20 - Tilføjet manglende felter for at matche Serializer
    bolig_bfe: string | null;
    bolig_anpart: string | null; // Django DecimalField serialiseres som string
    
    opgaver_oprettet: boolean;
    mappen_oprettet: boolean;
    // @# 2025-11-10 17:40 - Tilføjet mægler og sælger felter
    maegler_virksomhed: Virksomhed | null;
    maegler_kontakt: Kontakt | null;
    saelgere: Kontakt[]; // En liste af kontakter
    
    // @# 2025-11-10 21:30 - Tilføjet felt for primær sælger
    primaer_saelger: Kontakt | null;
    
    // Tillad andre felter
    [key: string]: any;
}

export interface Aktivitet {
    id: number;
    aktiv: boolean | null;
    aktivitet_nr: number | null;
    aktivitet: string | null;
    status: Status | null;
    ansvarlig: string | null;
    dato_intern: string | null;
    dato_ekstern: string | null;
    resultat: string | null;
    proces: Blokinfo | null;
    gruppe: Blokinfo | null;
    kommentar: string | null; // @# 2025-09-15 15:01 - Felt tilføjet
}

// @# 2025-09-15 09:20 - Udbygget filter state for Aktiviteter
export interface AktiviteterFilterState {
  aktivitet: string;
  ansvarlig: string;
  status: string;
  aktiv_filter: string;
  dato_intern_efter: string;
  dato_intern_foer: string;
  dato_ekstern_efter: string;
  dato_ekstern_foer: string;
  overskredet: boolean;
}

// @# 2025-09-15 19:10 - Udbygget gruppe-opsummering med både totale og filtrerede tællinger.
export interface AktivitetGruppeSummary {
  proces: Blokinfo;
  gruppe: Blokinfo;
  filtered_aktiv_count: number;
  filtered_faerdig_count: number;
  total_aktiv_count: number;
  total_faerdig_count: number;
}

// @# 2025-09-14 22:15 - Tilføjet typer for Sagsoversigt state
export interface SagsoversigtFilterState {
  sags_nr: string;
  alias: string;
  hovedansvarlige: string;
  adresse: string;
  status: string;
}

// @# 2025-09-14 22:15 - Tilføjet typer for Sagsoversigt state
export interface SagsoversigtSortConfig {
  key: keyof Sag | `status.${keyof Status}`;
  direction: 'ascending' | 'descending';
}
// @# 2025-09-15 08:15 - Tilføjet typer for BlokInfoSkabelonerPage state
export interface BlokinfoSkabelonerFilterState {
  formaal: string;
  nr: string;
  titel_kort: string;
  beskrivelse: string;
}

// @# 2025-09-15 08:15 - Tilføjet typer for AktivitetsskabelonerPage state
export interface AktivitetsskabelonerFilterState {
  proces_nr: string;
  gruppe_nr: string;
  aktivitet_nr: string;
  aktivitet: string;
}

// @# 2025-11-06 20:02 - Ny type for VirksomhedGruppe
export interface VirksomhedGruppe {
    id: number;
    navn: string;
}

// @# 2025-11-06 18:25 - Ny type for Virksomhed
// @# 2025-11-06 20:02 - Opdateret 'gruppe' til at være VirksomhedGruppe-objekt
export interface Virksomhed {
    id: number;
    navn: string;
    cvr_nr: string | null;
    gruppe: VirksomhedGruppe | null; // @# 2025-11-06 20:02 - Opdateret
    afdeling: string | null;
    telefon: string | null;
    email: string | null;
    web: string | null;
    adresse_vej: string | null;
    adresse_postnr: string | null;
    adresse_by: string | null;
    kommentar: string | null;
}

// @# 2025-11-06 19:27 - Ny type for Rolle
// @# 2025-11-10 17:40 - Opdateret med boolean-flags
export interface Rolle {
    id: number;
    navn: string;
    er_saelger: boolean;
    er_koeber: boolean;
    er_maegler: boolean;
}

// @# 2025-11-06 18:25 - Ny type for Kontakt
// @# 2025-11-06 19:27 - Opdateret 'rolle' til at være Rolle-objekt
// @# 2025-11-10 17:40 - Opdateret 'rolle' til 'roller' (M2M array)
export interface Kontakt {
    id: number;
    virksomhed: Virksomhed | null; // Hele virksomhedsobjektet
    fornavn: string | null;
    mellemnavn: string | null;
    efternavn: string;
    fulde_navn: string; // Genereres af backend
    roller: Rolle[]; // @# 2025-11-10 17:40 - Opdateret
    telefon: string | null;
    email: string | null;
    adresse_vej: string | null;
    adresse_postnr: string | null;
    adresse_by: string | null;
    kommentar: string | null;
}

// @# 2025-11-10 18:40 - Tilføjet type for DAWA (flere komponenter)
export interface DawaAdresse {
  id: string;
  adressebetegnelse: string;
  vejnavn: string;
  husnr: string;
  etage: string | null;
  dør: string | null;
  postnr: string;
  postnrnavn: string;
  href: string;
}