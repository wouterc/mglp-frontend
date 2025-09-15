// --- Fil: src/types.ts ---

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
    bolig_type: string | null;
    bolig_matrikel: string | null;
    bolig_anvendelse: BbrAnvendelse | null;
    opgaver_oprettet: boolean;
    mappen_oprettet: boolean;
    // Tilføj eventuelle andre felter fra SagsForm her for fuld dækning
    [key: string]: any;
}

export interface Aktivitet {
    id: number;
    aktiv: boolean | null;
    aktivitet_nr: number | null;
    aktivitet: string |
null;
    status: Status | null;
    ansvarlig: string | null;
    dato_intern: string | null;
    dato_ekstern: string | null;
    resultat: string |
null;
    proces: Blokinfo | null;
    gruppe: Blokinfo | null;
}

export interface AktiviteterFilterState {
  aktivitet: string;
  status: string;
  ansvarlig: string;
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
  key: keyof Sag |
`status.${keyof Status}`;
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