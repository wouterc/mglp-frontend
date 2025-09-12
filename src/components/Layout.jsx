// --- Fil: src/components/Layout.jsx ---
// @ 2025-09-11 20:20 - Sat sidemenu til at være kollapset som standard.
import React, { useState } from 'react';
import { Menu, X, LayoutGrid, FileText, Folder, ListChecks, Building2, Users, SquareStack, CheckSquare, FileStack, UserCircle, LogOut } from 'lucide-react';

function Layout({ children, aktivSide, setAktivSide }) {
  // @ 2025-09-11 20:20 - Ændret fra 'true' til 'false'
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
    <div className="flex h-screen bg-gray-100">
      <aside className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ${erMenuAaben ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {erMenuAaben && <h1 className="text-xl font-bold">MGLP</h1>}
          <button onClick={() => setErMenuAaben(!erMenuAaben)} className="p-2 rounded-md hover:bg-gray-700">
            {erMenuAaben ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto">
          {/* //@ 2025-09-12 19:03 - Tilføjet dynamisk margin for at skabe gruppering i kollapset tilstand */}
          {menuSektioner.map((sektion, index) => (
            <div 
              key={sektion.titel} 
              // Når menuen er åben, har alle sektioner 'mt-4'.
              // Når den er kollapset, får den første sektion 'mt-2', og de efterfølgende får 'mt-6' for at skabe afstand.
              className={erMenuAaben ? 'mt-4' : (index > 0 ? 'mt-6' : 'mt-2')}
            >
              {erMenuAaben && <h2 className="px-4 text-xs font-bold uppercase text-gray-400">{sektion.titel}</h2>}
              <ul>
                {sektion.items.map(punkt => (
                  <li key={punkt.id}>
                    <button 
                      onClick={() => {
                        if (punkt.id === 'log_ud') {
                          alert('Logger ud...'); // Placeholder
                        } else {
                          setAktivSide(punkt.id);
                        }
                      }}
                      className={`flex items-center w-full p-4 text-left hover:bg-gray-700 ${aktivSide === punkt.id ? 'bg-gray-900' : ''}`}
                      title={punkt.navn}
                    >
                      <punkt.ikon size={20} />
                      {erMenuAaben && <span className="ml-4">{punkt.navn}</span>}
                    </button>
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
    </div>
  );
}

export default Layout;