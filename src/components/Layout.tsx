// --- Fil: src/components/Layout.tsx ---
// @# 2025-09-15 18:20 - Justeret bredden på den lukkede venstre sidebar fra w-20 til w-16.
// @# 2025-11-17 21:55 - Importeret 'Link' og erstattet <button> med <Link> for navigation.
import React, { useState, ReactNode, useEffect } from 'react';
// @# 2025-11-17 21:55 - Importeret 'Link'
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronLeft, ChevronDown, LayoutGrid, FileText, Folder, ListChecks, Building2, Users, SquareStack, CheckSquare, FileStack, UserCircle, LogOut, Mail, ShieldAlert, Settings, Inbox, MailPlus, MessageSquare, MessageCircleHeart, LibraryBig, SquareTerminal, ReceiptText, Database } from 'lucide-react';
import { useAppState } from '../StateContext';
import { api } from '../api';
import { KommunikationService } from '../services/KommunikationService';
import { APP_VERSION } from '../version';

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
  const location = useLocation(); // Ensure useLocation is imported/used if needed for re-fetching on nav, or just interval
  const [erMenuAaben, setErMenuAaben] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Collapsible sections – only sections with sektionIkon are collapsible
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('menu_collapsed_sections');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toggleSection = (titel: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [titel]: !prev[titel] };
      localStorage.setItem('menu_collapsed_sections', JSON.stringify(next));
      return next;
    });
  };
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const fetchUnread = async () => {
      try {
        const data = await KommunikationService.getUnreadCount();
        if (isActive) setUnreadCount(data.unread_count);
      } catch (e) { /* silent fail */ }
    };

    let isActive = true;

    const startPolling = async () => {
      // 0. Tjek Version (Tvunget refresh hvis ny version)
      try {
        const vRes = await api.get<any>('/kerne/global-variables/APP_VERSION/');
        if (vRes && vRes.vaerdi && vRes.vaerdi !== APP_VERSION) {
          console.log(`Ny version fundet! Server: ${vRes.vaerdi}, Lokal: ${APP_VERSION}. Genindlæser...`);

          // Forsøg at rydde caches før reload
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Afregistrer Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          // Ryd local storage for at være helt sikker (valgfrit, men godt for "nuking")
          // localStorage.clear(); 

          window.location.reload();
          return; // Stop her
        }
      } catch (e) {
        // Hvis variablen ikke findes, opret den (så vi har et sted at styre det fra)
        try {
          await api.post('/kerne/global-variables/', {
            noegle: 'APP_VERSION',
            vaerdi: APP_VERSION,
            beskrivelse: 'Nuværende påkrævede version af appen'
          });
        } catch (err) { /* silent fail */ }
      }

      // 1. Hent med det samme
      await fetchUnread();
      if (!isActive) return;

      // 2. Hent interval-indstilling (eller brug default 30s)
      let intervalMs = 30000;
      try {
        const response = await api.get<any>('/kerne/global-variables/NOTIFICATION_INTERVAL/');
        if (!isActive) return;
        if (response && response.vaerdi) {
          const parsed = parseInt(response.vaerdi, 10);
          if (!isNaN(parsed) && parsed >= 5000) { // Mindst 5 sekunder
            intervalMs = parsed;
          }
        }
      } catch (error: any) {
        if (!isActive) return;
        if (error.response?.status === 404 || error.message?.includes('404')) {
          try {
            await api.post('/kerne/global-variables/', {
              noegle: 'NOTIFICATION_INTERVAL',
              vaerdi: '30000',
              beskrivelse: 'Interval for tjek af ulæste beskeder (ms)'
            });
          } catch (createError) { /* ignore */ }
        }
      }

      // 3. Start interval (hvis vi stadig er logget ind / komponenten er aktiv)
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(fetchUnread, intervalMs);
    };

    startPolling();

    return () => {
      isActive = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentUser]);
  const menuSektioner = [
    {
      titel: 'SAGSBEHANDLING',
      items: [
        { id: 'sagsoversigt', navn: 'Sagsoversigt', ikon: LayoutGrid },
        { id: 'fakturaoversigt', navn: 'Fakturaoversigt', ikon: ReceiptText },
        { id: 'sagsdetaljer', navn: 'Sagsdetaljer', ikon: FileText },
        { id: 'aktiviteter', navn: 'Aktiviteter', ikon: ListChecks },
        { id: 'dokumenter', navn: 'Dokumenter', ikon: Folder },
        { id: 'sags_mail', navn: 'Sags Mail', ikon: Inbox },
        { id: 'mail_kurv', navn: 'Mail Kurv', ikon: MailPlus },
      ],
    },
    {
      titel: 'REGISTER',
      sektionIkon: Database,
      items: [
        { id: 'virksomheder', navn: 'Virksomheder', ikon: Building2 },
        { id: 'kontakter', navn: 'Kontakter', ikon: Users },
        // @# 2025-12-07 - Ny side
        { id: 'medarbejdere', navn: 'Medarbejdere', ikon: UserCircle },
        { id: 'vidensbank', navn: 'Vidensbank', ikon: LibraryBig },
        { id: 'kommunikation', navn: 'Intern Chat', ikon: MessageCircleHeart },
      ],
    },
    {
      titel: 'SKABELONER',
      items: [
        { id: 'skabeloner', navn: 'Skabeloner', ikon: SquareStack },
      ],
    },
    {
      titel: 'KOMMUNIKATION',
      items: [
        { id: 'mail', navn: 'Mail', ikon: Mail },
      ],
    },
    {
      titel: 'UDVIKLING',
      items: [
        { id: 'opgaver', navn: 'Opgaver', ikon: SquareTerminal },
      ],
    },
    // @# SYSTEM sektion fjernet fra scrollable liste, da den nu ligger i bunden
  ];

  // @# Tilføj Admin sektion hvis superbruger
  if (currentUser?.is_superuser) {
    menuSektioner.push({
      titel: 'ADMINISTRATION',
      items: [
        { id: 'admin/users', navn: 'Brugerstyring', ikon: ShieldAlert },
        { id: 'admin/standardmapper', navn: 'Standard Mapper', ikon: Settings }
      ]
    });
  }

  return (
    <div className="flex h-full max-h-full overflow-hidden bg-gray-100 w-full">
      {/* @# 2025-09-15 18:20 - Ændret fra w-20 til w-16 for lukket tilstand. */}
      <aside className={`bg-gray-800 text-white flex-col shrink-0 transition-all duration-300 ${erMenuAaben ? 'w-56' : 'w-16'} h-full overflow-hidden hidden md:flex`}>
        <div className={`flex items-center ${erMenuAaben ? 'justify-between px-3' : 'justify-center'} p-4 border-b border-gray-700 h-16 transition-all`}>
          {erMenuAaben && (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/LogoMGLP.svg" alt="MGLP" className="w-8 h-8 brightness-0 invert" />
              <span className="font-semibold text-lg whitespace-nowrap">MGLP Flow</span>
            </div>
          )}
          <button onClick={() => setErMenuAaben(!erMenuAaben)} className="p-2 rounded-md hover:bg-gray-700" title={erMenuAaben ? "Luk menu" : "Åbn menu"}>
            {erMenuAaben ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>


        <nav className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {menuSektioner.map((sektion, index) => (
            <div key={sektion.titel} className={erMenuAaben ? 'mt-4' : 'mt-2'}>
              {(() => {
                const isCollapsible = 'sektionIkon' in sektion && !!sektion.sektionIkon;
                if (erMenuAaben) {
                  // Expanded sidebar
                  if (!isCollapsible) {
                    return <h2 className="px-4 text-xs font-bold uppercase text-gray-400">{sektion.titel}</h2>;
                  }
                  return (
                    <button
                      onClick={() => toggleSection(sektion.titel)}
                      className="flex items-center justify-between w-full px-4 text-xs font-bold uppercase text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      <span>{sektion.titel}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${collapsedSections[sektion.titel] ? '-rotate-90' : ''}`}
                      />
                    </button>
                  );
                } else {
                  // Collapsed sidebar
                  if (!isCollapsible) {
                    return index > 0 ? <div className="border-t-2 border-gray-500 mx-2 my-1 opacity-75"></div> : null;
                  }
                  return (
                    <>
                      {index > 0 && <div className="border-t-2 border-gray-500 mx-2 my-1 opacity-75"></div>}
                      <button
                        onClick={() => toggleSection(sektion.titel)}
                        className={`flex items-center justify-center w-full p-3 transition-colors ${collapsedSections[sektion.titel] ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        title={`${collapsedSections[sektion.titel] ? 'Vis' : 'Skjul'} ${sektion.titel.toLowerCase()}`}
                      >
                        <sektion.sektionIkon size={20} />
                      </button>
                    </>
                  );
                }
              })()}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${'sektionIkon' in sektion && sektion.sektionIkon && collapsedSections[sektion.titel]
                  ? 'max-h-0 opacity-0'
                  : 'max-h-[500px] opacity-100'
                  }`}
              >
                <ul>
                  {sektion.items.map(punkt => (
                    <li key={punkt.id}>
                      <Link
                        to={`/${punkt.id}`}
                        className={`flex items-center justify-center sm:justify-start w-full p-3 text-left hover:bg-gray-700 relative ${aktivSide === punkt.id ? 'bg-gray-900' : ''}`}
                        title={punkt.navn}
                      >
                        <punkt.ikon size={20} />
                        {erMenuAaben && <span className="ml-4 flex-1">{punkt.navn}</span>}
                        {punkt.id === 'kommunikation' && unreadCount > 0 && (
                          erMenuAaben ? (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          ) : (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-800"></span>
                          )
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </nav>

        {/* @# Fixed Bottom Section: User & Logout */}
        <div className="mt-auto border-t border-gray-700 p-2">

          {/* User Profile */}
          <Link to="/min_konto" className={`flex items-center ${erMenuAaben ? 'px-2 py-3' : 'justify-center py-2'} rounded-md hover:bg-gray-700 transition-colors mb-2`} title="Min Konto">
            <div
              className="rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-sm text-white"
              style={{ backgroundColor: currentUser?.color || '#2563EB' }}
            >
              {currentUser?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            {erMenuAaben && (
              <div className="ml-3 overflow-hidden whitespace-nowrap">
                <p className="text-sm font-medium truncate text-gray-100">{currentUser?.first_name ? `${currentUser.first_name} ${currentUser?.last_name || ''}` : currentUser?.username}</p>
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

          {/* Version Info */}
          <div className={`mt-2 ${erMenuAaben ? 'px-2' : 'text-center'} text-[10px] text-gray-500 font-mono opacity-50`}>
            {erMenuAaben ? `v.${APP_VERSION}` : APP_VERSION.split('.').pop()}
          </div>
        </div>
      </aside>

      <main
        className={`flex-1 min-h-0 h-full relative ${aktivSide.includes('kommunikation') || aktivSide === 'sagsdetaljer'
          ? 'overflow-hidden flex flex-col'
          : 'overflow-y-auto overflow-x-hidden'
          }`}
      >
        {children}
      </main>

      {filterSidebar}
    </div>
  );
}

export default Layout;