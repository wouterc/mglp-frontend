// --- Fil: src/types.ts ---
// @# 2025-11-19 20:25 - Tilføjet 'kommunekode' til Sag-typen.
// @# 2025-11-21 20:45 - Tilføjet forsynings-felter til Sag og kommunekode til Virksomhed.
// @# 2025-11-22 11:00 - Tilføjet specifikke forsynings-flags til VirksomhedGruppe.

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

export interface VirksomhedGruppe {
  id: number;
  navn: string;
  er_maegler_gruppe: boolean;
  er_bank: boolean;
  er_raadgiver: boolean;
  er_forsyning: boolean;
  // @# 2025-11-22 11:00 - Nye felter
  er_vand: boolean;
  er_varme: boolean;
  er_spildevand: boolean;

  er_forsikring: boolean;
  er_kommune: boolean;
}

export interface Virksomhed {
  id: number;
  navn: string;
  cvr_nr: string | null;
  gruppe: VirksomhedGruppe | null;
  // @ Ny: Bruges til at matche mod sagens kommunekode
  kommunekode: number | null;
  afdeling: string | null;
  telefon: string | null;
  email: string | null;
  web: string | null;
  adresse_vej: string | null;
  adresse_postnr: string | null;
  adresse_by: string | null;
  kommentar: string | null;
  kontakter_count: number;
}

export interface Rolle {
  id: number;
  navn: string;
  er_saelger: boolean;
  er_koeber: boolean;
  er_maegler: boolean;
  er_bank_kontakt: boolean;
  er_raadgiver_kontakt: boolean;
}

export interface Kontakt {
  id: number;
  virksomhed: Virksomhed | null;
  fornavn: string | null;
  mellemnavn: string | null;
  efternavn: string;
  fulde_navn: string;
  roller: Rolle[];
  telefon: string | null;
  email: string | null;
  adresse_vej: string | null;
  adresse_postnr: string | null;
  adresse_by: string | null;
  kommentar: string | null;
}

export interface SagRaadgiverTilknytning {
  id: number;
  sag_id: number;
  virksomhed: Virksomhed | null;
  kontakt: Kontakt | null;
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

  // Adressefelter
  adresse_vej: string | null;
  adresse_husnr: string | null;
  adresse_etage: string | null;
  adresse_doer: string | null;
  adresse_post_nr: string | null;
  adresse_by: string | null;
  adresse_id_dawa: string | null;
  adressebetegnelse: string | null;
  kommunekode: number | null;

  bolig_type: string | null;
  bolig_matrikel: string | null;
  bolig_anvendelse: BbrAnvendelse | null;
  bolig_bfe: string | null;
  bolig_anpart: string | null; // Django DecimalField serialiseres som string

  opgaver_oprettet: boolean;
  mappen_oprettet: boolean;
  // Relationer
  maegler_virksomhed: Virksomhed | null;
  maegler_kontakt: Kontakt | null;

  saelgere: Kontakt[];
  primaer_saelger: Kontakt | null;
  bank_virksomhed: Virksomhed | null;
  bank_kontakt: Kontakt | null;

  raadgiver_tilknytninger: SagRaadgiverTilknytning[];

  // @ Nye forsynings-relationer
  vand_virksomhed: Virksomhed | null;
  varme_virksomhed: Virksomhed | null;
  spildevand_virksomhed: Virksomhed | null;

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
  kommentar: string | null;
}

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

export interface AktivitetGruppeSummary {
  proces: Blokinfo;
  gruppe: Blokinfo;
  filtered_aktiv_count: number;
  filtered_faerdig_count: number;
  total_aktiv_count: number;
  total_faerdig_count: number;
}

export interface SagsoversigtFilterState {
  sags_nr: string;
  alias: string;
  hovedansvarlige: string;
  adresse: string;
  status: string;
}

export interface SagsoversigtSortConfig {
  key: keyof Sag | `status.${keyof Status}`;
  direction: 'ascending' | 'descending';
}

export interface BlokinfoSkabelonerFilterState {
  formaal: string;
  nr: string;
  titel_kort: string;
  beskrivelse: string;
}

export interface AktivitetsskabelonerFilterState {
  proces_nr: string;
  gruppe_nr: string;
  aktivitet_nr: string;
  aktivitet: string;
}

export interface VirksomhedFilterState {
  navn: string;
  afdeling: string;
  gruppe: string;
  telefon: string;
  email: string;
}

export interface KontaktFilterState {
  navn: string;
  rolle: string;
  virksomhed: string;
  telefon: string;
  email: string;
}

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

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  work_phone?: string;
  private_phone?: string;
  private_address?: string;
}