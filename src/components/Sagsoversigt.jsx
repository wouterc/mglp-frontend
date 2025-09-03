// src/components/Sagsoversigt.jsx
import React, { useState, useEffect, useMemo } from 'react';
import SagsForm from './SagsForm';
// Importer de nye ikoner
import { Edit, ArrowUp, ArrowDown, FileText, Folder, ListChecks } from 'lucide-react'; 

function Sagsoversigt() {
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
  async function hentSager() { try { const response = await fetch('http://127.0.0.1:8000/api/sager/'); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const data = await response.json(); setSager(data); } catch (e) { setError('Kunne ikke hente sagsdata. Sikr at backend-serveren kører.'); console.error("Fejl ved hentning af sager:", e); } }
  useEffect(() => { hentSager(); }, []);
  const sorteredeOgFiltreredeSager = useMemo(() => { let filtreret = [...sager]; filtreret = filtreret.filter(sag => { const statusValue = sag.status; if (statusValue === null || statusValue < 90) return true; if (visLukkede && statusValue === 90) return true; if (visAnnullerede && statusValue === 99) return true; return false; }); if (filter.sags_nr) filtreret = filtreret.filter(s => s.sags_nr?.toString().includes(filter.sags_nr)); if (filter.status) filtreret = filtreret.filter(s => s.status?.toString().includes(filter.status)); if (filter.alias) filtreret = filtreret.filter(s => s.alias?.toLowerCase().includes(filter.alias.toLowerCase())); if (filter.hovedansvarlige) filtreret = filtreret.filter(s => s.hovedansvarlige?.toLowerCase().includes(filter.hovedansvarlige.toLowerCase())); if (filter.adresse) filtreret = filtreret.filter(s => s.fuld_adresse?.toLowerCase().includes(filter.adresse.toLowerCase())); if (sortConfig.key !== null) { filtreret.sort((a, b) => { const aValue = a[sortConfig.key] || ''; const bValue = b[sortConfig.key] || ''; if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1; if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; }); } return filtreret; }, [sager, filter, sortConfig, visLukkede, visAnnullerede]);
  const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const handleFilterChange = (e) => { const { name, value } = e.target; setFilter(prevFilter => ({ ...prevFilter, [name]: value })); };
  const handleNulstilFiltre = () => { setFilter({ sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' }); setVisLukkede(false); setVisAnnullerede(false); };
  const handleOpretNySag = () => { setSagTilRedigering(null); setVisForm(true); }; const handleRedigerSag = (sag) => { setSagTilRedigering(sag); setVisForm(true); }; const handleAnnuller = () => { setVisForm(false); setSagTilRedigering(null); }; const handleRaekkeKlik = (sagId) => { setUdfoldetSagId(udfoldetSagId === sagId ? null : sagId); }; const handleSaveSag = async (sagsData) => { const erRedigering = sagsData.id != null; const url = erRedigering ? `http://127.0.0.1:8000/api/sager/${sagsData.id}/` : 'http://127.0.0.1:8000/api/sager/'; const method = erRedigering ? 'PUT' : 'POST'; try { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sagsData) }); if (!response.ok) throw new Error('Netværks-svar var ikke ok'); setVisForm(false); setSagTilRedigering(null); hentSager(); } catch (error) { console.error('Fejl ved lagring af sag:', error); } };
  if (error) return <div className="text-red-500 p-4">{error}</div>; if (visForm) return <SagsForm onSave={handleSaveSag} onCancel={handleAnnuller} sagTilRedigering={sagTilRedigering} />;
  const getSortIcon = (key) => { if (sortConfig.key !== key) return null; if (sortConfig.direction === 'ascending') return <ArrowUp className="inline-block ml-1 h-4 w-4" />; return <ArrowDown className="inline-block ml-1 h-4 w-4" />; };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Filter-sektion er uændret... */}
      <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800">Sagsoversigt</h2><button onClick={handleOpretNySag} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Opret Ny Sag</button></div>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4"><input type="text" name="sags_nr" placeholder="Sagsnr..." value={filter.sags_nr} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2"/><input type="text" name="status" placeholder="Status..." value={filter.status} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-1"/><input type="text" name="alias" placeholder="Alias..." value={filter.alias} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3"/><input type="text" name="hovedansvarlige" placeholder="Ansvarlig..." value={filter.hovedansvarlige} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3"/><input type="text" name="adresse" placeholder="Adresse..." value={filter.adresse} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3"/></div><div className="flex justify-between items-center mt-4"><button onClick={() => setVisFlereFiltre(!visFlereFiltre)} className="text-blue-600 hover:text-blue-800 text-sm">{visFlereFiltre ? 'Skjul flere filtre' : 'Vis flere filtre'}</button><button onClick={handleNulstilFiltre} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">Nulstil Alle Filtre</button></div>
      {visFlereFiltre && (<div className="mt-4 pt-4 border-t border-gray-200"><div className="flex flex-wrap items-center gap-4"><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visLukkede} onChange={() => setVisLukkede(!visLukkede)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span>Inkluder lukkede (90)</span></label><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visAnnullerede} onChange={() => setVisAnnullerede(!visAnnullerede)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span>Inkluder annullerede (99)</span></label></div></div>)}</div>
      
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm cursor-pointer" onClick={() => requestSort('sags_nr')}>SagsNr{getSortIcon('sags_nr')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm cursor-pointer" onClick={() => requestSort('alias')}>Alias{getSortIcon('alias')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm cursor-pointer" onClick={() => requestSort('status')}>Status{getSortIcon('status')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm cursor-pointer" onClick={() => requestSort('hovedansvarlige')}>Ansvarlig{getSortIcon('hovedansvarlige')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm cursor-pointer" onClick={() => requestSort('fuld_adresse')}>Adresse{getSortIcon('fuld_adresse')}</th>
              <th className="text-left py-2 px-4 uppercase font-semibold text-sm">Handlinger</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {sorteredeOgFiltreredeSager.map(sag => (
              <React.Fragment key={sag.id}>
                <tr onClick={() => handleRaekkeKlik(sag.id)} className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer">
                  <td className="py-2 px-4">{sag.sags_nr}</td>
                  <td className="py-2 px-4">{sag.alias}</td>
                  <td className="py-2 px-4">{sag.status}</td>
                  <td className="py-2 px-4">{sag.hovedansvarlige}</td>
                  <td className="py-2 px-4">{sag.fuld_adresse}</td>
                  
                  {/* --- NY HANDLINGSKOLONNE MED IKONER --- */}
                  <td className="py-2 px-4">
                    <div className="flex items-center space-x-3">
                      {/* Rediger-knap */}
                      <button onClick={(e) => { e.stopPropagation(); handleRedigerSag(sag); }} className="text-gray-500 hover:text-blue-600" title="Rediger sag">
                        <Edit size={18} />
                      </button>
                      {/* Sagsdetaljer-knap (placeholder) */}
                      <button onClick={(e) => { e.stopPropagation(); alert('Viser sagsdetaljer...'); }} className="text-gray-500 hover:text-green-600" title="Vis sagsdetaljer">
                        <FileText size={18} />
                      </button>
                      {/* Dokumenter-knap (placeholder) */}
                      <button onClick={(e) => { e.stopPropagation(); alert('Viser dokumenter...'); }} className="text-gray-500 hover:text-yellow-600" title="Vis dokumenter">
                        <Folder size={18} />
                      </button>
                      {/* Aktiviteter-knap (placeholder) */}
                      <button onClick={(e) => { e.stopPropagation(); alert('Viser aktiviteter...'); }} className="text-gray-500 hover:text-purple-600" title="Vis aktiviteter">
                        <ListChecks size={18} />
                      </button>
                    </div>
                  </td>

                </tr>
                {udfoldetSagId === sag.id && (
                  <tr className="bg-gray-50">
                    <td colSpan="6" className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-bold text-gray-700">Boliginformation</h4>
                            <p><span className="font-semibold">Type:</span> {sag.bolig_type}</p>
                            <p><span className="font-semibold">Matrikel:</span> {sag.bolig_matrikel}</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-700">Kommentar</h4>
                            <p>{sag.kommentar || "Ingen kommentar"}</p>
                          </div>
                        </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Sagsoversigt;
