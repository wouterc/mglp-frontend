// src/pages/SagsoversigtPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import SagsForm from '../components/SagsForm';
// Importer de nye ikoner til knapperne
import { Edit, ArrowUp, ArrowDown, FileText, Folder, ListChecks, PlusCircle, FunnelX } from 'lucide-react'; 

function SagsoversigtPage() {
  const [sager, setSager] = useState([]);
  const [error, setError] = useState(null);
  const [visForm, setVisForm] = useState(false);
  const [sagTilRedigering, setSagTilRedigering] = useState(null);
  const [udfoldetSagId, setUdfoldetSagId] = useState(null);
  
  const [filter, setFilter] = useState({ sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' });
  const [visLukkede, setVisLukkede] = useState(false);
  const [visAnnullerede, setVisAnnullerede] = useState(false);
  const [visFlereFiltre, setVisFlereFiltre] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'sags_nr', direction: 'ascending' });

  // ... (hentSager, useMemo, og alle andre funktioner er uændrede) ...
  async function hentSager() { try { const response = await fetch(`${API_BASE_URL}/sager/`); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const data = await response.json(); setSager(data); } catch (e) { setError('Kunne ikke hente sagsdata. Sikr at backend-serveren kører.'); console.error("Fejl ved hentning af sager:", e); } }
  useEffect(() => { hentSager(); }, []);
  const sorteredeOgFiltreredeSager = useMemo(() => {
    const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

    let filtreret = [...sager];

    // Tjek om der er en specifik søgning på sagsnr eller status
    const isSpecificSearch = filter.sags_nr || filter.status;

    if (isSpecificSearch) {
      // Håndter specifik søgning
      filtreret = filtreret.filter(sag => {
        if (filter.sags_nr && !sag.sags_nr?.toString().includes(filter.sags_nr)) {
          return false;
        }
        if (filter.status) {
          const searchLower = filter.status.toLowerCase();
          const statusMatch = sag.status?.beskrivelse.toLowerCase().includes(searchLower) ||
                              sag.status?.status_nummer.toString().includes(searchLower);
          if (!statusMatch) return false;
        }
        return true;
      });
    } else {
      // Håndter generelle filtre
      filtreret = filtreret.filter(sag => {
        // Status kategori filter
        if (!sag.status) return !visLukkede && !visAnnullerede;
        const kategori = sag.status.status_kategori;
        const isVisibleStatus = (kategori === 0 && !visLukkede && !visAnnullerede) ||
                                (kategori === 1 && visLukkede) ||
                                (kategori === 9 && visAnnullerede);
        if (!isVisibleStatus) return false;

        // Tekstfiltre
        if (filter.alias && !sag.alias?.toLowerCase().includes(filter.alias.toLowerCase())) return false;
        if (filter.hovedansvarlige && !sag.hovedansvarlige?.toLowerCase().includes(filter.hovedansvarlige.toLowerCase())) return false;
        if (filter.adresse && !sag.fuld_adresse?.toLowerCase().includes(filter.adresse.toLowerCase())) return false;

        return true;
      });
    }

    // Anvend sortering
    if (sortConfig.key) {
      filtreret.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key) || '';
        const bValue = getNestedValue(b, sortConfig.key) || '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtreret;
  }, [sager, filter, sortConfig, visLukkede, visAnnullerede]);
  const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const handleFilterChange = (e) => { const { name, value } = e.target; setFilter(prevFilter => ({ ...prevFilter, [name]: value })); };
  const handleNulstilFiltre = () => { setFilter({ sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' }); setVisLukkede(false); setVisAnnullerede(false); };
  const handleOpretNySag = () => { setSagTilRedigering(null); setVisForm(true); }; const handleRedigerSag = (sag) => { setSagTilRedigering(sag); setVisForm(true); }; const handleAnnuller = () => { setVisForm(false); setSagTilRedigering(null); }; const handleRaekkeKlik = (sagId) => { setUdfoldetSagId(udfoldetSagId === sagId ? null : sagId); }; const handleSaveSag = () => { hentSager(); setVisForm(false); setSagTilRedigering(null); };
  if (error) return <div className="text-red-500 p-4">{error}</div>; if (visForm) return <SagsForm onSave={handleSaveSag} onCancel={handleAnnuller} sagTilRedigering={sagTilRedigering} />;
  const getSortIcon = (key) => { if (sortConfig.key !== key) return null; if (sortConfig.direction === 'ascending') return <ArrowUp className="inline-block ml-1 h-4 w-4" />; return <ArrowDown className="inline-block ml-1 h-4 w-4" />; };

  return (
    // Reduceret overordnet padding fra p-8 til p-4 for et mere kompakt look
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Sagsoversigt</h2>
        {/* Knap er nu et ikon med tooltip */}
        <button onClick={handleOpretNySag} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Sag">
          <PlusCircle size={20} />
        </button>
      </div>
      
      {/* Reduceret padding (p-4) og bundmargen (mb-4) */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <input type="text" name="sags_nr" placeholder="Sagsnr..." value={filter.sags_nr} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="status" placeholder="Status..." value={filter.status} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="alias" placeholder="Alias..." value={filter.alias} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="hovedansvarlige" placeholder="Ansvarlig..." value={filter.hovedansvarlige} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3 text-sm"/>
          <input type="text" name="adresse" placeholder="Adresse..." value={filter.adresse} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3 text-sm"/>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button onClick={() => setVisFlereFiltre(!visFlereFiltre)} className="text-blue-600 hover:text-blue-800 text-sm">
            {visFlereFiltre ? 'Skjul flere filtre' : 'Vis flere filtre'}
          </button>
          {/* Knap er nu et ikon med tooltip */}
          <button onClick={handleNulstilFiltre} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Nulstil Alle Filtre">
            <FunnelX size={18} />
          </button>
        </div>

        {visFlereFiltre && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={visLukkede} onChange={() => setVisLukkede(!visLukkede)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <span>Vis lukkede</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={visAnnullerede} onChange={() => setVisAnnullerede(!visAnnullerede)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <span>Vis annullerede</span>
              </label>
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-2 px-4 uppercase font-semibold" onClick={() => requestSort('sags_nr')}>SagsNr{getSortIcon('sags_nr')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold" onClick={() => requestSort('alias')}>Alias{getSortIcon('alias')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold" onClick={() => requestSort('status.beskrivelse')}>Status{getSortIcon('status.beskrivelse')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold" onClick={() => requestSort('hovedansvarlige')}>Ansvarlig{getSortIcon('hovedansvarlige')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold" onClick={() => requestSort('fuld_adresse')}>Adresse{getSortIcon('fuld_adresse')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold">Handlinger</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">{sorteredeOgFiltreredeSager.map(sag => (<React.Fragment key={sag.id}>
                <tr onClick={() => handleRaekkeKlik(sag.id)} className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer">
                  <td className="py-2 px-4">{sag.sags_nr}</td>
                  <td className="py-2 px-4">{sag.alias}</td>
                  <td className="py-2 px-4">{sag.status ? `${sag.status.status_nummer} - ${sag.status.beskrivelse}` : 'N/A'}</td>
                  <td className="py-2 px-4">{sag.hovedansvarlige}</td>
                  <td className="py-2 px-4">{sag.fuld_adresse}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center space-x-3"><button onClick={(e) => { e.stopPropagation(); handleRedigerSag(sag); }} className="text-gray-500 hover:text-blue-600" title="Rediger sag"><Edit size={18} /></button><button onClick={(e) => { e.stopPropagation(); alert('Viser sagsdetaljer...'); }} className="text-gray-500 hover:text-green-600" title="Vis sagsdetaljer"><FileText size={18} /></button><button onClick={(e) => { e.stopPropagation(); alert('Viser dokumenter...'); }} className="text-gray-500 hover:text-yellow-600" title="Vis dokumenter"><Folder size={18} /></button><button onClick={(e) => { e.stopPropagation(); alert('Viser aktiviteter...'); }} className="text-gray-500 hover:text-purple-600" title="Vis aktiviteter"><ListChecks size={18} /></button></div>
                  </td>
                </tr>
                {udfoldetSagId === sag.id && ( <tr className="bg-gray-50"><td colSpan="6" className="p-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><h4 className="font-bold text-gray-700">Boliginformation</h4><p><span className="font-semibold">Type:</span> {sag.bolig_type}</p><p><span className="font-semibold">Matrikel:</span> {sag.bolig_matrikel}</p></div><div><h4 className="font-bold text-gray-700">Kommentar</h4><p>{sag.kommentar || "Ingen kommentar"}</p></div></div></td></tr> )}
              </React.Fragment>))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default SagsoversigtPage;
