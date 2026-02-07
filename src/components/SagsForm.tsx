// --- Fil: src/components/SagsForm.tsx ---

//@@ 2025-09-09 15:14 - Rettet logik til at hente bygningsdata fra en liste (bygninger)
// @# 2025-11-10 19:05 - Refaktoreret til at bruge globale typer fra types.ts
// @# 2025-11-10 19:20 - Rettet 7 fejl ifm.
// @# 2025-11-10 19:30 - Rettet 8. fejl (type-mismatch i useEffect) ved eksplicit mapping
// @# 2025-11-10 20:10 - Rettet type-fejl i handleSubmit (string | null vs string)
// @# 2025-11-15 12:30 - Opdateret til at bruge genbrugelig Button-komponent
// @# 2025-11-19 20:30 - Tilføjet håndtering af kommunekode fra DAWA.
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { api } from '../api';
import AdresseSøgning from './AdresseSøgning';
// @# 2025-11-10 19:05 - Importeret globale typer
import type { Status, BbrAnvendelse, DawaAdresse, Sag, User } from '../types';
import Button from './ui/Button'; // Importer den nye knap
import SearchableSelect from './ui/SearchableSelect';
import { SagService } from '../services/SagService';
import { LookupService } from '../services/LookupService';
import { useLookups } from '../contexts/LookupContext';

// @# 2025-11-10 19:05 - Fjernet lokale, redundante type-definitioner for Status og BbrAnvendelse

// @# 2025-11-10 19:05 - Ændret lokal type til at bruge den globale 'Sag' type
type SagTilRedigering = Sag | null;

interface SagsFormProps {
  onSave: (sag?: Sag) => void;
  onCancel: () => void;
  sagTilRedigering: SagTilRedigering;
}

// @# 2025-11-10 19:05 - Fjernet lokal, redundant type-definition for DawaAdresse

// @# 2025-11-10 19:20 - Tilføjet id og sags_nr til state-interfacet
interface SagsDataState {
  id?: number; // Tilføjet
  sags_nr?: string; // Tilføjet
  alias: string;
  hovedansvarlige: string;
  standard_outlook_account_id: string;
  status_id: string;
  adresse_vej: string;
  adresse_husnr: string;
  adresse_etage: string;
  adresse_doer: string;
  adresse_post_nr: string;
  adresse_by: string;
  adresse_id_dawa: string | null;
  adressebetegnelse: string;
  // @# 2025-11-19 20:30 - Tilføjet kommunekode til state (som string for nemheds skyld i forms)
  kommunekode: string;
  bolig_type: string;
  bolig_bfe: string;
  bolig_matrikel: string;
  bolig_anpart: string;
  bolig_anvendelse_id: string;
  bolig_link: string;
  kommentar: string;
  byggeaar: string;
  boligareal: string;
  maegler_sagsnr: string;
  bank_sagsnr: string;
  raadgiver_sagsnr: string;
  raadgiver_kontakt_id: string;
  [key: string]: any;
}

function SagsForm({ onSave, onCancel, sagTilRedigering }: SagsFormProps) {
  const { state: lookupState } = useLookups();
  const { sagsStatusser: statusser } = lookupState;
  const [sagsData, setSagsData] = useState<SagsDataState>({
    alias: '',
    hovedansvarlige: '',
    standard_outlook_account_id: '',
    status_id: '',
    adresse_vej: '',
    adresse_husnr: '',
    adresse_etage: '',
    adresse_doer: '',
    adresse_post_nr: '',
    adresse_by: '',
    adresse_id_dawa: null,
    adressebetegnelse: '',
    // @# 2025-11-19 20:30 - Init
    kommunekode: '',
    bolig_type: '',
    bolig_bfe: '',
    bolig_matrikel: '',
    bolig_anpart: '',
    bolig_anvendelse_id: '',
    bolig_link: '',
    kommentar: '',
    byggeaar: '',
    boligareal: '',
    maegler_sagsnr: '',
    bank_sagsnr: '',
    raadgiver_sagsnr: '',
    raadgiver_kontakt_id: '',
  });
  // const [statusser, setStatusser] = useState<Status[]>([]); // Uses context now
  const [outlookAccounts, setOutlookAccounts] = useState<any[]>([]);
  const [bbrAnvendelser, setBbrAnvendelser] = useState<BbrAnvendelse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
  const erRedigering = sagTilRedigering != null;

  const BOLIG_TYPER = [
    { value: 'Villa', label: 'Villa' },
    { value: 'Rækkehus', label: 'Rækkehus' },
    { value: 'Ejerlejlighed', label: 'Ejerlejlighed' },
    { value: 'Andelsbolig', label: 'Andelsbolig' },
    { value: 'Landejendom', label: 'Landejendom' },
    { value: 'Sommerhus', label: 'Sommerhus' },
    { value: 'Byggegrund', label: 'Byggegrund' },
    { value: 'Villalejlighed', label: 'Villalejlighed' },
    { value: 'Ideel anpart', label: 'Ideel anpart' },
    { value: 'Erhverv', label: 'Erhverv' },
  ];

  // @# 2025-11-10 19:30 - Rettet type-mismatch. Mapper nu eksplicit null -> ''
  useEffect(() => {
    if (erRedigering && sagTilRedigering) {
      setSagsData({
        // Bevar felter, der kun findes på SagsDataState (som byggeaar)
        ...sagsData,

        // Udfyld fra sagTilRedigering og konverter 'null' til 'string'
        id: sagTilRedigering.id,
        sags_nr: sagTilRedigering.sags_nr || '',
        alias: sagTilRedigering.alias || '',
        hovedansvarlige: sagTilRedigering.hovedansvarlige || '',
        standard_outlook_account_id: sagTilRedigering.standard_outlook_account_id ? String(sagTilRedigering.standard_outlook_account_id) : '',
        status_id: sagTilRedigering.status ? String(sagTilRedigering.status.id) : '',

        adresse_vej: sagTilRedigering.adresse_vej || '',
        adresse_husnr: sagTilRedigering.adresse_husnr || '',
        adresse_etage: sagTilRedigering.adresse_etage || '',
        adresse_doer: sagTilRedigering.adresse_doer || '',
        adresse_post_nr: sagTilRedigering.adresse_post_nr || '',
        adresse_by: sagTilRedigering.adresse_by || '',
        adresse_id_dawa: sagTilRedigering.adresse_id_dawa || null,
        adressebetegnelse: sagTilRedigering.adressebetegnelse || '',
        // @# 2025-11-19 20:30 - Hent kommunekode
        kommunekode: sagTilRedigering.kommunekode ? String(sagTilRedigering.kommunekode) : '',

        bolig_type: sagTilRedigering.bolig_type || '',
        bolig_bfe: sagTilRedigering.bolig_bfe || '',
        bolig_matrikel: sagTilRedigering.bolig_matrikel || '',
        bolig_anpart: sagTilRedigering.bolig_anpart || '',
        bolig_anvendelse_id: sagTilRedigering.bolig_anvendelse ? String(sagTilRedigering.bolig_anvendelse.id) : '',
        bolig_link: sagTilRedigering.bolig_link || '',

        kommentar: sagTilRedigering.kommentar || '',
        maegler_sagsnr: sagTilRedigering.maegler_sagsnr || '',
        bank_sagsnr: sagTilRedigering.bank_sagsnr || '',
        raadgiver_sagsnr: sagTilRedigering.raadgiver_sagsnr || '',
        raadgiver_kontakt_id: sagTilRedigering.raadgiver_kontakt ? String(sagTilRedigering.raadgiver_kontakt.id) : '',
      });
    }
  }, [sagTilRedigering, erRedigering]);

  useEffect(() => {
    // Statusser kommer nu fra Context context
    /*
    const fetchStatusser = async () => {
      try {
        const data = await api.get<any>('/kerne/status/?formaal=1');
        setStatusser(data.results || data);
      } catch (error) {
        console.error('Fejl ved hentning af statusser:', error);
      }
    };
    fetchStatusser();
    */

    const fetchAccounts = async () => {
      try {
        const allAccounts = await LookupService.getEmailAccounts();
        setOutlookAccounts(allAccounts.filter((a: any) => a.is_active));
      } catch (error) {
        console.error('Fejl ved hentning af konti:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const allUsers = await LookupService.getUsers();
        setUsers(allUsers.filter(u => u.is_active));
      } catch (error) {
        console.error('Fejl ved hentning af brugere:', error);
      }
    };

    fetchAccounts();
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchBbrAnvendelser = async () => {
      try {
        const data = await LookupService.getBbrAnvendelser();
        setBbrAnvendelser(data);
      } catch (error) {
        console.error('Error fetching BBR applications:', error);
      }
    };
    fetchBbrAnvendelser();
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onCancel]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleAdresseValgt = async (adresse: DawaAdresse) => {
    const calculatedAlias = [
      adresse.vejnavn,
      adresse.husnr,
      adresse.etage,
      adresse.dør
    ].filter(Boolean).join(' ').trim();

    setSagsData(prevData => ({
      ...prevData,
      adresse_id_dawa: adresse.id,
      adressebetegnelse: adresse.adressebetegnelse,
      adresse_vej: adresse.vejnavn,
      adresse_husnr: adresse.husnr,
      adresse_etage: adresse.etage || '',
      adresse_doer: adresse.dør || '',
      adresse_post_nr: adresse.postnr,
      adresse_by: adresse.postnrnavn,
      // Auto-udfyld alias hvis det er tomt
      alias: prevData.alias && prevData.alias.trim() !== '' ? prevData.alias : calculatedAlias,
      // Nulstil detaljer, mens vi henter nye
      bolig_bfe: '',
      bolig_matrikel: '',
      bolig_anvendelse_id: '',
      kommunekode: '', // Nulstil
      byggeaar: '',
      boligareal: '',
    }));

    setIsFetchingDetails(true);

    try {
      const adresseResponse = await fetch(adresse.href);
      const adresseDetaljer = await adresseResponse.json();
      const adgangsAdresseData = adresseDetaljer.adgangsadresse;

      const matrikelnr = adgangsAdresseData?.jordstykke?.matrikelnr || '';
      const bfeNummer = adgangsAdresseData?.bfe_nummer || '';

      // @# 2025-11-19 20:30 - Hent kommunekode fra DAWA (ligger i adgangsadresse -> kommune -> kode)
      const kommunekodeRaw = adgangsAdresseData?.kommune?.kode || '';

      const bygningHref = adgangsAdresseData?.bygninger?.[0]?.href;
      let bbrKode = '';
      let byggeaar = '';
      let boligareal = '';

      if (bygningHref) {
        const bygningDetaljer = await api.get<any>(bygningHref);
        bbrKode = bygningDetaljer.byg_anvendelse?.kode || '';
        byggeaar = bygningDetaljer.opfoerelsesaar || '';
        boligareal = bygningDetaljer.samlet_bolig_areal || '';
      }

      const matchendeAnvendelse = bbrAnvendelser.find(a => String(a.kode) === String(bbrKode));
      const anvendelseId = matchendeAnvendelse ? String(matchendeAnvendelse.id) : '';

      setSagsData(prevData => ({
        ...prevData,
        bolig_matrikel: matrikelnr,
        bolig_bfe: bfeNummer,
        bolig_anvendelse_id: anvendelseId,
        kommunekode: kommunekodeRaw, // Gem kommunekoden
        byggeaar: byggeaar,
        boligareal: boligareal,
      }));
    } catch (error) {
      console.error("Error fetching additional address details:", error);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const constructAliasFromAddress = () => {
    const parts = [
      sagsData.adresse_vej,
      sagsData.adresse_husnr,
      sagsData.adresse_etage,
      sagsData.adresse_doer
    ].filter(Boolean); // Filter out empty strings/nulls
    return parts.join(' ').trim();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // @# 2025-11-10 20:10 - Rettet type fra Partial<SagsDataState> til 'any'
    // Objektet er en API-payload, der tillader 'null', hvor SagsDataState kun tillader 'string'.
    const dataToSave: any = {
      ...sagsData,
      bolig_anvendelse_id: sagsData.bolig_anvendelse_id === '' ? null : sagsData.bolig_anvendelse_id,
      status_id: sagsData.status_id === '' ? null : sagsData.status_id,
      standard_outlook_account_id: sagsData.standard_outlook_account_id === '' ? null : parseInt(sagsData.standard_outlook_account_id, 10),
      // @# 2025-11-19 20:30 - Konverter kommunekode til int eller null
      kommunekode: sagsData.kommunekode ? parseInt(sagsData.kommunekode, 10) : null,
      raadgiver_kontakt_id: sagsData.raadgiver_kontakt_id === '' ? null : parseInt(sagsData.raadgiver_kontakt_id, 10),
    };

    delete dataToSave.byggeaar;
    delete dataToSave.boligareal;
    // @# 2025-11-10 19:20 - Slet read-only felter (objekter) før 'send'
    delete (dataToSave as any).status;
    delete (dataToSave as any).bolig_anvendelse;

    if (!erRedigering) {
      delete dataToSave.sags_nr;
    }

    // Auto-fill alias if empty on save
    if (!dataToSave.alias || dataToSave.alias.trim() === '') {
      dataToSave.alias = constructAliasFromAddress();
    }



    try {
      let gemtSag;
      if (erRedigering) {
        gemtSag = await SagService.updateSag(dataToSave.id, dataToSave);
      } else {
        gemtSag = await SagService.createSag(dataToSave);
      }
      onSave(gemtSag);
    } catch (error: any) {
      console.error('Error saving case:', error);
      alert(`Fejl ved gemning: ${error.message}`);
    }
  };

  // Alias is not required anymore (auto-filled), but Hovedansvarlig is.
  const erFormularGyldig = !!sagsData.hovedansvarlige;

  const userOptions = users.map(u => ({
    value: `${u.first_name} ${u.last_name}`.trim() || u.username,
    label: `${u.first_name} ${u.last_name}`.trim() || u.username
  }));

  return (
    <div className="p-2 sm:p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {erRedigering ? `Rediger Sag: ${sagsData.alias}` : 'Opret Ny Sag'}
        </h2>
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onCancel} variant="secondary" className="py-1 px-3 text-sm">
            Annuller
          </Button>
          <Button type="submit" onClick={(e) => handleSubmit(e as any)} disabled={!erFormularGyldig} variant="primary" className="py-1 px-4 text-sm font-semibold">
            Gem Sag
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
      >
        {/* Adresse Sektion - Nu øverst */}
        <div className="p-3 border rounded-md">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Adresse</h3>
          <div className="mb-3">
            <AdresseSøgning onAdresseValgt={handleAdresseValgt} />
            {isFetchingDetails && <div className="mt-1 text-xs text-blue-500 flex items-center"><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div> Henter detaljer fra DAWA...</div>}
          </div>

          <div className="grid grid-cols-12 gap-x-3 gap-y-2">
            <div className="col-span-12 sm:col-span-6">
              <label htmlFor="adresse_vej_vis" className="block text-xs font-medium text-gray-500">Vejnavn</label>
              <input type="text" id="adresse_vej_vis" value={sagsData.adresse_vej || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <label htmlFor="adresse_husnr_vis" className="block text-xs font-medium text-gray-500">Nr.</label>
              <input type="text" id="adresse_husnr_vis" value={sagsData.adresse_husnr || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <label htmlFor="adresse_etage_vis" className="block text-xs font-medium text-gray-500">Etage</label>
              <input type="text" id="adresse_etage_vis" value={sagsData.adresse_etage || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <label htmlFor="adresse_doer_vis" className="block text-xs font-medium text-gray-500">Dør</label>
              <input type="text" id="adresse_doer_vis" value={sagsData.adresse_doer || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>

            <div className="col-span-12 sm:col-span-4">
              <label htmlFor="adresse_post_nr_vis" className="block text-xs font-medium text-gray-500">Postnr.</label>
              <input type="text" id="adresse_post_nr_vis" value={sagsData.adresse_post_nr || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <label htmlFor="adresse_by_vis" className="block text-xs font-medium text-gray-500">By</label>
              <input type="text" id="adresse_by_vis" value={sagsData.adresse_by || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm" />
            </div>
            <div className="col-span-12 sm:col-span-2">
              <label htmlFor="kommunekode_vis" className="block text-xs font-medium text-gray-500">Kommune</label>
              <input type="text" id="kommunekode_vis" value={sagsData.kommunekode || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm text-center" />
            </div>
          </div>
        </div>

        {/* Generelt Sektion */}
        <div className="p-3 border rounded-md bg-gray-50/30">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Generelt</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            {erRedigering && (
              <div>
                <label htmlFor="sags_nr" className="block text-xs font-medium text-gray-500">SagsNr</label>
                <input type="text" id="sags_nr" name="sags_nr" value={sagsData.sags_nr || ''} disabled className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm bg-gray-100 text-sm" />
              </div>
            )}

            <div>
              <label htmlFor="alias" className="block text-xs font-medium text-gray-500">Alias (Valgfri - autoudfyldes ved gem)</label>
              <input type="text" id="alias" name="alias" value={sagsData.alias || ''} onChange={handleChange} placeholder="F.eks. Vejnavn 123" className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>

            <div>
              <label htmlFor="status_id" className="block text-xs font-medium text-gray-500">Status</label>
              <select
                id="status_id"
                name="status_id"
                value={sagsData.status_id || ''}
                onChange={handleChange}
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 bg-white rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Vælg status...</option>
                {statusser.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.status_nummer} - {status.beskrivelse}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hovedansvarlige" className="block text-xs font-medium text-gray-500 mb-0.5 after:content-['*'] after:ml-0.5 after:text-red-500">Hovedansvarlig</label>
              <SearchableSelect
                id="hovedansvarlige"
                value={sagsData.hovedansvarlige || ''}
                onChange={(val) => setSagsData(prev => ({ ...prev, hovedansvarlige: val }))}
                options={userOptions}
                placeholder="Vælg ansvarlig..."
                error={!sagsData.hovedansvarlige}
              />
            </div>

            <div>
              <label htmlFor="standard_outlook_account_id" className="block text-xs font-medium text-gray-500">Standard mail-konto (Afsender)</label>
              <select
                id="standard_outlook_account_id"
                name="standard_outlook_account_id"
                value={sagsData.standard_outlook_account_id || ''}
                onChange={handleChange}
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 bg-white rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Vælg konto...</option>
                {outlookAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.email_address})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bolig_bfe" className="block text-xs font-medium text-gray-500">BFE Nummer</label>
              <input type="text" id="bolig_bfe" name="bolig_bfe" value={sagsData.bolig_bfe || ''} onChange={handleChange} className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>

            <div>
              <label htmlFor="bolig_type" className="block text-xs font-medium text-gray-500 mb-0.5">Bolig Type</label>
              <SearchableSelect
                id="bolig_type"
                value={sagsData.bolig_type || ''}
                onChange={(val) => setSagsData(prev => ({ ...prev, bolig_type: val }))}
                options={BOLIG_TYPER}
                placeholder="Vælg boligtype..."
              />
            </div>

            <div>
              <label htmlFor="bolig_matrikel" className="block text-xs font-medium text-gray-500">Matrikel</label>
              <input type="text" id="bolig_matrikel" name="bolig_matrikel" value={sagsData.bolig_matrikel || ''} onChange={handleChange} className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>

            <div>
              <label htmlFor="bolig_anpart" className="block text-xs font-medium text-gray-500">Ejerlejligheds Anpart</label>
              <input type="text" id="bolig_anpart" name="bolig_anpart" value={sagsData.bolig_anpart || ''} onChange={handleChange} placeholder="0.00" className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="bolig_link" className="block text-xs font-medium text-gray-500">Bolig system</label>
              <input type="text" id="bolig_link" name="bolig_link" value={sagsData.bolig_link || ''} onChange={handleChange} placeholder="https://..." className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>

            <div>
              <label htmlFor="bolig_anvendelse_id" className="block text-xs font-medium text-gray-500">Anvendelse (BBR)</label>
              <select
                id="bolig_anvendelse_id"
                name="bolig_anvendelse_id"
                value={sagsData.bolig_anvendelse_id || ''}
                onChange={handleChange}
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 bg-white rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Vælg anvendelse...</option>
                {bbrAnvendelser.map(anv => (
                  <option key={anv.id} value={anv.id}>
                    {anv.kode} - {anv.beskrivelse}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kommentar */}
        <div>
          <label htmlFor="kommentar" className="block text-xs font-medium text-gray-500">Kommentar</label>
          <textarea id="kommentar" name="kommentar" value={sagsData.kommentar || ''} onChange={handleChange} rows={2} className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
        </div>

        <div className="flex justify-end space-x-3 pt-2 border-t mt-4">
          <Button type="button" onClick={onCancel} variant="secondary">
            Annuller
          </Button>
          <Button type="submit" onClick={(e) => handleSubmit(e as any)} disabled={!erFormularGyldig} variant="primary" className="px-6">
            Gem Sag
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SagsForm;