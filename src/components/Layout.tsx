// --- Fil: src/components/Layout.tsx ---
// @# 2025-09-15 18:20 - Justeret bredden på den lukkede venstre sidebar fra w-20 til w-16.
// @# 2025-11-17 21:55 - Importeret 'Link' og erstattet <button> med <Link> for navigation.
import React, { useState, ReactNode } from 'react';
// @# 2025-11-17 21:55 - Importeret 'Link'
import { Link } from 'react-router-dom';
import { Menu, ChevronLeft, LayoutGrid, FileText, Folder, ListChecks, Building2, Users, SquareStack, CheckSquare, FileStack, UserCircle, LogOut, Mail, ShieldAlert } from 'lucide-react';
import { useAppState } from '../StateContext';

interface LayoutProps {
  children: ReactNode;
  aktivSide: string;
  // @# 2025-11-17 21:55 - setAktivSide bruges nu kun til 'Log ud' (via navigateTo)
  setAktivSide: (side: string) => void;
  filterSidebar?: ReactNode;
}

function Layout({ children, aktivSide, setAktivSide, filterSidebar }: LayoutProps): React.ReactElement {
  const { state } = useAppState();
  const { currentUser } = state;
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
        // @# 2025-12-07 - Ny side
        { id: 'medarbejdere', navn: 'Medarbejdere', ikon: UserCircle },
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
      titel: 'KOMMUNIKATION',  // <--- NY SEKTION
      items: [
        { id: 'emails', navn: 'E-mail Test', ikon: Mail },
      ],
    },
    // @# SYSTEM sektion fjernet fra scrollable liste, da den nu ligger i bunden
  ];

  // @# Tilføj Admin sektion hvis superbruger
  if (currentUser?.is_superuser) {
    menuSektioner.push({
      titel: 'ADMINISTRATION',
      items: [
        { id: 'admin/users', navn: 'Brugerstyring', ikon: ShieldAlert } // Kræver ShieldAlert import
      ]
    });
  }

  return (
    <div className="grid grid-cols-[auto_1fr_auto] h-screen bg-gray-100">
      {/* @# 2025-09-15 18:20 - Ændret fra w-20 til w-16 for lukket tilstand. */}
      <aside className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ${erMenuAaben ? 'w-56' : 'w-16'}`}>
        <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16">
          <button onClick={() => setErMenuAaben(!erMenuAaben)} className="p-2 rounded-md hover:bg-gray-700" title={erMenuAaben ? "Luk menu" : "Åbn menu"}>
            {erMenuAaben ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>


        <nav className="flex-grow overflow-y-auto">
          {menuSektioner.map((sektion, index) => (
            <div key={sektion.titel} className={erMenuAaben ? 'mt-4' : 'mt-2'}>
              {erMenuAaben ? (
                <h2 className="px-4 text-xs font-bold uppercase text-gray-400">{sektion.titel}</h2>
              ) : (
                /* Vis en tydelig streg mellem grupperne når menuen er lukket */
                index > 0 && <div className="border-t-2 border-gray-500 mx-2 my-2 opacity-75"></div>
              )}
              <ul>
                {sektion.items.map(punkt => (
                  <li key={punkt.id}>
                    <Link
                      to={`/${punkt.id}`}
                      className={`flex items-center justify-center sm:justify-start w-full p-3 text-left hover:bg-gray-700 ${aktivSide === punkt.id ? 'bg-gray-900' : ''}`}
                      title={punkt.navn}
                    >
                      <punkt.ikon size={20} />
                      {erMenuAaben && <span className="ml-4">{punkt.navn}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* @# Fixed Bottom Section: User & Logout */}
        <div className="mt-auto border-t border-gray-700 p-2">

          {/* User Profile */}
          <Link to="/min_konto" className={`flex items-center ${erMenuAaben ? 'px-2 py-3' : 'justify-center py-2'} rounded-md hover:bg-gray-700 transition-colors mb-2`} title="Min Konto">
            <div className="bg-blue-600 rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-sm text-white">
              {currentUser?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            {erMenuAaben && (
              <div className="ml-3 overflow-hidden whitespace-nowrap">
                <p className="text-sm font-medium truncate text-gray-100">{currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser?.username}</p>
                <p className="text-xs text-gray-400 truncate w-32">{currentUser?.email}</p>
              </div>
            )}
          </Link>

          {/* Logout Button */}
          <button
            onClick={() => setAktivSide('log_ud')}
            className={`flex items-center ${erMenuAaben ? 'px-2 py-3 w-full' : 'justify-center py-2'} rounded-md hover:bg-red-900/50 text-gray-300 hover:text-white transition-colors`}
            title="Log ud"
          >
            <LogOut size={20} />
            {erMenuAaben && <span className="ml-4">Log ud</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {filterSidebar}
    </div>
  );
}

export default Layout;