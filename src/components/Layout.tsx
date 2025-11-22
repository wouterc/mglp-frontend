// --- Fil: src/components/Layout.tsx ---
// @# 2025-09-15 18:20 - Justeret bredden på den lukkede venstre sidebar fra w-20 til w-16.
// @# 2025-11-17 21:55 - Importeret 'Link' og erstattet <button> med <Link> for navigation.
import React, { useState, ReactNode } from 'react';
// @# 2025-11-17 21:55 - Importeret 'Link'
import { Link } from 'react-router-dom';
import { Menu, X, LayoutGrid, FileText, Folder, ListChecks, Building2, Users, SquareStack, CheckSquare, FileStack, UserCircle, LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  aktivSide: string;
  // @# 2025-11-17 21:55 - setAktivSide bruges nu kun til 'Log ud' (via navigateTo)
  setAktivSide: (side: string) => void;
  filterSidebar?: ReactNode;
}

function Layout({ children, aktivSide, setAktivSide, filterSidebar }: LayoutProps): React.ReactElement {
  const [erMenuAaben, setErMenuAaben] = useState(false);
  const menuSektioner = [
    {
      titel: 'SAGSBEHANDLING',
      items: [
        { id: 'sagsoversigt', navn: 'Sagsoversigt', ikon: LayoutGrid },
        { id: 'sagsdetaljer', navn: 'Sagsdetaljer', ikon: FileText },
        { id: 'aktiviteter', navn: 'Aktiviteter', ikon: ListChecks },
        { id: 'dokumenter', navn: 'Dokumenter', ikon: Folder },
      ],
    },
    {
      titel: 'REGISTER',
      items: [
        { id: 'virksomheder', navn: 'Virksomheder', ikon: Building2 },
        { id: 'kontakter', navn: 'Kontakter', ikon: Users },
      ],
    },
    {
      titel: 'SKABELONER',
      items: [
        { id: 'blokinfo_skabeloner', navn: 'BlokInfo Skabeloner', ikon: SquareStack },
        { id: 'aktivitetsskabeloner', navn: 'Aktivitetsskabeloner', ikon: CheckSquare },
        { id: 'dokumentskabeloner', navn: 'Dokumentskabeloner', ikon: FileStack },
      ],
    },
    {
      titel: 'SYSTEM',
      items: [
        { id: 'min_konto', navn: 'Min Konto', ikon: UserCircle },
        { id: 'log_ud', navn: 'Log ud', ikon: LogOut },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-[auto_1fr_auto] h-screen bg-gray-100">
      {/* @# 2025-09-15 18:20 - Ændret fra w-20 til w-16 for lukket tilstand. */}
      <aside className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ${erMenuAaben ? 'w-56' : 'w-16'}`}>
        <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16">
          <button onClick={() => setErMenuAaben(!erMenuAaben)} className="p-2 rounded-md hover:bg-gray-700">
            {erMenuAaben ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto">
          {menuSektioner.map((sektion) => (
            <div key={sektion.titel} className={erMenuAaben ? 'mt-4' : 'mt-2'}>
              {erMenuAaben && <h2 className="px-4 text-xs font-bold uppercase text-gray-400">{sektion.titel}</h2>}
              <ul>
                {sektion.items.map(punkt => (
                  <li key={punkt.id}>
                    {/* @# 2025-11-17 21:55 - START: Betinget rendering for <Link> vs <button> */}
                    {punkt.id === 'log_ud' ? (
                      <button 
                        onClick={() => {
                          // 'setAktivSide' (som nu er 'navigateTo') kaldes kun for 'log_ud'
                          setAktivSide(punkt.id); 
                        }}
                        className={`flex items-center justify-center sm:justify-start w-full p-4 text-left hover:bg-gray-700`}
                        title={punkt.navn}
                      >
                        <punkt.ikon size={20} />
                        {erMenuAaben && <span className="ml-4">{punkt.navn}</span>}
                      </button>
                    ) : (
                      <Link
                        // @# 2025-11-17 21:55 - Tilføjet 'to' prop
                        to={`/${punkt.id}`}
                        className={`flex items-center justify-center sm:justify-start w-full p-4 text-left hover:bg-gray-700 ${aktivSide === punkt.id ? 'bg-gray-900' : ''}`}
                        title={punkt.navn}
                      >
                        <punkt.ikon size={20} />
                        {erMenuAaben && <span className="ml-4">{punkt.navn}</span>}
                      </Link>
                    )}
                    {/* @# 2025-11-17 21:55 - SLUT */}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      
      {filterSidebar}
    </div>
  );
}

export default Layout;