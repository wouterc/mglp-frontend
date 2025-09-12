// --- Fil: src/pages/AktivitetsskabelonerPage.jsx ---
// @ 2025-09-12 22:59 - Justeret bredde på proces-filter for bedre visning af tekst
// @ 2025-09-12 22:58 - Tilføjet dropdown til proces-filter for forbedret brugervenlighed
// @ 2025-09-12 22:45 - Implementeret grupperede rækker med overskrifter i tabellen
// @ 2025-09-12 22:25 - Opdateret til at vise 'proces' som relation med tooltip
// @ 2025-09-11 21:25 - Tilføjet info-ikon med tooltip på Gruppe Nr.
import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { API_BASE_URL } from '/src/config.js';
import AktivitetForm from '../components/AktivitetForm';
import useDebounce from '../hooks/useDebounce';
import { PlusCircle, AlertCircle, Edit, FunnelX, Loader2 } from 'lucide-react';

function AktivitetsskabelonerPage() {
  const [aktiviteter, setAktiviteter] = useState([]);
  const [blokinfo, setBlokinfo] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visForm, setVisForm] = useState(false);
  const [aktivitetTilRedigering, setAktivitetTilRedigering] = useState(null);

  const [filters, setFilters] = useState({
    proces_nr: '',
    gruppe_nr: '',
    aktivitet_nr: '',
    aktivitet: '',
  });

  const [visInaktive, setVisInaktive] = useState(false);
  const [visUdgaaede, setVisUdgaaede] = useState(false);
  const debouncedFilters = useDebounce(filters, 500);

  // Memoized liste over processer (formaal = 1) til filter-dropdown
  const procesList = useMemo(() => {
    return blokinfo.filter(b => b.formaal === 1);
  }, [blokinfo]);

  // @ 2025-09-12 22:15 - Tilføjet memoized liste for grupper
  const gruppeList = useMemo(() => {
    return blokinfo.filter(b => b.formaal === 2);
  }, [blokinfo]);

  const buildQueryString = useCallback((filterObj) => {
    const params = new URLSearchParams();
    if (filterObj.proces_nr) params.append('proces_nr', filterObj.proces_nr);
    if (filterObj.gruppe_nr) params.append('gruppe_nr', filterObj.gruppe_nr);
    if (filterObj.aktivitet_nr) params.append('aktivitet_nr', filterObj.aktivitet_nr);
    if (filterObj.aktivitet) params.append('aktivitet', filterObj.aktivitet);
    
    params.append('aktiv', visInaktive ? 'false' : 'true');
    params.append('udgaaet', visUdgaaede ? 'true' : 'false');
    
    return params.toString();
  }, [visInaktive, visUdgaaede]);

  const hentData = useCallback(async (filterObj) => {
    setIsLoading(true);
    setError(null);
    const queryString = buildQueryString(filterObj);
    
    try {
      const [aktiviteterRes, blokinfoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/skabeloner/aktiviteter/?${queryString}`),
        fetch(`${API_BASE_URL}/skabeloner/blokinfo/`)
      ]);

      if (!aktiviteterRes.ok || !blokinfoRes.ok) {
        throw new Error('Kunne ikke hente data fra serveren.');
      }
      const aktiviteterData = await aktiviteterRes.json();
      const blokinfoData = await blokinfoRes.json();
      
      setAktiviteter(aktiviteterData.results || []);
      setNextPageUrl(aktiviteterData.next);
      setBlokinfo(blokinfoData || []);

    } catch (e) {
      setError('Fejl ved hentning af data. Sikr at backend-serveren kører.');
      console.error("Fejl ved hentning af aktivitetsdata:", e);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    hentData(debouncedFilters);
  }, [debouncedFilters, visInaktive, visUdgaaede, hentData]);

  const handleHentFlere = async () => {
    if (!nextPageUrl || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(nextPageUrl);
      if (!response.ok) throw new Error('Kunne ikke hente mere data.');
      const data = await response.json();
      setAktiviteter(prev => [...prev, ...data.results]);
      setNextPageUrl(data.next);
    } catch (e) {
      setError('Fejl ved hentning af mere data.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleNulstilFiltre = () => {
    setFilters({ proces_nr: '', gruppe_nr: '', aktivitet_nr: '', aktivitet: '' });
    setVisInaktive(false);
    setVisUdgaaede(false);
  };
  
  const handleOpret = () => {
    setAktivitetTilRedigering(null);
    setVisForm(true);
  };

  const handleRediger = (aktivitet) => {
    setAktivitetTilRedigering(aktivitet);
    setVisForm(true);
  };

  const handleSave = () => {
    setVisForm(false);
    hentData(filters);
  };

  const handleCancel = () => {
    setVisForm(false);
  };

  let lastGroupHeader = null;

  if (error && !isLoadingMore) return (
    <div className="p-8 flex flex-col items-center justify-center text-red-600">
      <AlertCircle size={48} className="mb-4" />
      <h2 className="text-xl font-bold mb-2">Fejl</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {visForm && (
        <AktivitetForm
          onSave={handleSave}
          onCancel={handleCancel}
          aktivitetTilRedigering={aktivitetTilRedigering}
          blokinfoList={blokinfo}
        />
      )}

       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Aktivitetsskabeloner</h2>
        <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Aktivitetsskabelon">
          <PlusCircle size={20} />
        </button>
      </div>
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex space-x-2">
            <div className="w-[20%] flex">
                <input type="text" name="proces_nr" placeholder="Nr." value={filters.proces_nr} onChange={handleFilterChange} className="w-1/4 p-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <select name="proces_nr" value={filters.proces_nr} onChange={handleFilterChange} className="w-3/4 p-2 border border-gray-300 rounded-r-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Vælg proces...</option>
                    {procesList.map(p => (
                        <option key={p.id} value={p.nr}>{p.nr} - {p.titel_kort}</option>
                    ))}
                </select>
            </div>
            {/* @ 2025-09-12 22:15 - Ændret gruppe-filter til kombineret input/select */}
            <div className="w-[20%] flex">
                <input type="text" name="gruppe_nr" placeholder="Nr." value={filters.gruppe_nr} onChange={handleFilterChange} className="w-1/4 p-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                <select name="gruppe_nr" value={filters.gruppe_nr} onChange={handleFilterChange} className="w-3/4 p-2 border border-gray-300 rounded-r-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Vælg gruppe...</option>
                    {gruppeList.map(g => (
                        <option key={g.id} value={g.nr}>{g.nr} - {g.titel_kort}</option>
                    ))}
                </select>
            </div>
            <div className="w-[10%]">
                <input type="text" name="aktivitet_nr" placeholder="Aktiv. Nr..." value={filters.aktivitet_nr} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm"/>
            </div>
            <div className="w-[35%]">
                <input type="text" name="aktivitet" placeholder="Filtrer på aktivitet..." value={filters.aktivitet} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm"/>
            </div>
            <div className="w-[15%]"></div> 
        </div>

        <div className="flex justify-between items-center mt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={visInaktive} onChange={() => setVisInaktive(!visInaktive)} className="h-4 w-4 rounded border-gray-300"/>
                    <span>Vis inaktive</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={visUdgaaede} onChange={() => setVisUdgaaede(!visUdgaaede)} className="h-4 w-4 rounded border-gray-300"/>
                    <span>Vis udgåede</span>
                </label>
            </div>
            <button onClick={handleNulstilFiltre} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Nulstil Filtre">
                <FunnelX size={18} />
            </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white table-fixed">
          <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]">Aktiv. Nr.</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[70%]">Aktivitet</th>
              <th className="text-center py-1 px-2 uppercase font-semibold w-[5%]">Aktiv</th>
              <th className="text-center py-1 px-2 uppercase font-semibold w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {isLoading && aktiviteter.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4">Henter data...</td></tr>
            ) : (
              aktiviteter.map(a => {
                const currentGroupHeader = `${a.proces?.nr || ''}.${a.gruppe?.nr || ''} - ${a.proces?.titel_kort || ''} / ${a.gruppe?.titel_kort || ''}`;
                const showHeader = currentGroupHeader !== lastGroupHeader;
                if (showHeader) {
                  lastGroupHeader = currentGroupHeader;
                }
                
                return (
                  <Fragment key={a.id}>
                    {showHeader && (
                      <tr className="bg-gray-200 sticky top-0">
                        <td colSpan="4" className="py-1 px-2 font-bold text-gray-700">
                          {currentGroupHeader}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-1 px-2">{a.aktivitet_nr}</td>
                      <td className="py-1 px-2 break-words">{a.aktivitet}</td>
                      <td className="py-1 px-2 text-center">
                        <input type="checkbox" checked={a.aktiv || false} readOnly disabled className="h-4 w-4"/>
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button onClick={() => handleRediger(a)} title="Rediger"><Edit size={16} className="text-blue-600 hover:text-blue-800" /></button>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
            {!isLoading && aktiviteter.length === 0 && (
              <tr><td colSpan="4" className="text-center py-4">Ingen aktiviteter matcher dit filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {nextPageUrl && (
        <div className="mt-4 text-center">
            <button
                onClick={handleHentFlere}
                disabled={isLoadingMore}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center mx-auto"
            >
                {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Henter...</> : 'Hent Flere'}
            </button>
        </div>
      )}
    </div>
  );
}

export default AktivitetsskabelonerPage;

