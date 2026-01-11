import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ChatSidebar from '../components/kommunikation/ChatSidebar';
import ChatWindow from '../components/kommunikation/ChatWindow';
import MessageInput from '../components/kommunikation/MessageInput';
import { KommunikationService } from '../services/KommunikationService';
import { User, Besked, Team, MessageType } from '../types_kommunikation';
import { User as UserType } from '../types';
import TeamModal from '../components/kommunikation/TeamModal';
import ForwardMessageModal from '../components/kommunikation/ForwardMessageModal';
import Toast, { ToastType } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { api } from '../api';
import { useAppState } from '../StateContext';
import VidensbankModal from '../components/vidensbank/VidensbankModal';
import { Viden, VidensKategori } from '../types';

const KommunikationPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { currentUser, users, chatTeams: teams, chatMessages: messages, chatActiveRecipient: activeRecipient, chatActiveType: activeType, chatUnreadCounts: unreadCounts } = state;

    const setTeams = (payload: Team[]) => dispatch({ type: 'SET_CHAT_STATE', payload: { chatTeams: payload } });
    const setMessages = (payload: Besked[] | ((prev: Besked[]) => Besked[])) => {
        let newMessages: Besked[];
        if (typeof payload === 'function') {
            newMessages = payload(messages);
        } else {
            newMessages = payload;
        }

        // Deduplicate by ID
        const seen = new Set();
        const uniqueMessages = newMessages.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });

        dispatch({ type: 'SET_CHAT_STATE', payload: { chatMessages: uniqueMessages } });
    };
    const setActiveRecipient = (payload: UserType | Team | undefined) => dispatch({ type: 'SET_CHAT_STATE', payload: { chatActiveRecipient: payload } });
    const setActiveType = (payload: 'user' | 'team' | undefined) => dispatch({ type: 'SET_CHAT_STATE', payload: { chatActiveType: payload } });
    const setUnreadCounts = (payload: { [key: string]: number }) => dispatch({ type: 'SET_CHAT_STATE', payload: { chatUnreadCounts: payload } });


    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);
    const [replyToMessage, setReplyToMessage] = useState<Besked | undefined>(undefined);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Forwarding state
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<Besked | undefined>(undefined);
    const [editingMessage, setEditingMessage] = useState<Besked | undefined>(undefined);
    const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Besked[]>([]);
    const [onlyActiveChat, setOnlyActiveChat] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Vidensbank state
    const [isVidensbankModalOpen, setIsVidensbankModalOpen] = useState(false);
    const [vidensbankKategorier, setVidensbankKategorier] = useState<VidensKategori[]>([]);
    const [vidensbankDraft, setVidensbankDraft] = useState<Viden | undefined>(undefined);

    // Toast Notification
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const lastSyncRef = useRef<string>(new Date().toISOString());
    const lastActivityRef = useRef<number>(Date.now());

    // Activity tracking
    useEffect(() => {
        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('mousedown', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('touchstart', updateActivity, { passive: true });
        window.addEventListener('scroll', updateActivity, { capture: true, passive: true });

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('mousedown', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            window.removeEventListener('scroll', updateActivity, { capture: true });
        };
    }, []);

    const canMarkAsRead = () => {
        const isVisible = document.visibilityState === 'visible';
        // Check if user was active in the last 60 seconds
        const isRecentActivity = (Date.now() - lastActivityRef.current) < 60000;
        return isVisible && isRecentActivity;
    };


    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    // Lock body scroll prevents double scrollbars on this full-screen page
    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Listen for Service Worker messages (Open Chat)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'OPEN_CHAT') {
                const { afsenderId, teamId } = event.data;
                if (teamId) {
                    const team = teams.find(t => t.id === teamId);
                    if (team) {
                        setActiveRecipient(team);
                        setActiveType('team');
                    }
                } else if (afsenderId) {
                    const user = users.find(u => u.id === afsenderId);
                    if (user) {
                        setActiveRecipient(user);
                        setActiveType('user');
                    }
                }
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleMessage);
        }
        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleMessage);
            }
        };
    }, [teams, users]);

    // Initial Fetch
    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Lookups and Metadata
                const [teamsData, unreadData, katRes] = await Promise.all([
                    KommunikationService.getTeams(),
                    KommunikationService.getUnreadCountsDetailed(),
                    api.get<VidensKategori[]>('/vidensbank/kategorier/')
                ]);
                setTeams(teamsData);
                setUnreadCounts(unreadData);
                setVidensbankKategorier(katRes);

                // 2. Determine Active Recipient
                let currentRecipient = activeRecipient;
                let currentType = activeType;

                const searchParams = new URLSearchParams(location.search);
                const paramId = searchParams.get('recipientId');
                const paramType = searchParams.get('recipientType') as 'user' | 'team' | null;

                if (paramId && paramType) {
                    const id = Number(paramId);
                    if (paramType === 'user') {
                        currentRecipient = users.find(u => u.id === id);
                        currentType = 'user';
                    } else if (paramType === 'team') {
                        currentRecipient = teamsData.find((t: Team) => t.id === id);
                        currentType = 'team';
                    }
                } else if (!currentRecipient) {
                    const savedType = localStorage.getItem('chat_active_type');
                    const savedId = Number(localStorage.getItem('chat_active_id'));

                    if (savedType && savedId) {
                        if (savedType === 'user') {
                            currentRecipient = users.find((user: any) => user.id === savedId);
                            currentType = 'user';
                        } else if (savedType === 'team') {
                            currentRecipient = teamsData.find(team => team.id === savedId);
                            currentType = 'team';
                        }
                    }
                }

                // 3. Fetch Initial Messages for active chat
                if (currentRecipient && currentType) {
                    setActiveRecipient(currentRecipient);
                    setActiveType(currentType);

                    const msgs = await KommunikationService.getBeskeder(undefined, undefined, currentRecipient.id, currentType, 50);
                    // Backend returns descending for limit, so we reverse
                    setMessages(msgs.reverse());
                    setHasMore(msgs.length === 50);

                    // Mark as read on initial load ONLY if tab is active/visible
                    if (document.visibilityState === 'visible') {
                        KommunikationService.markChatAsRead(currentRecipient.id, currentType as 'user' | 'team');
                    }
                } else {
                    // Try to fetch newest globally if no chat active? 
                    // Actually usually we just start empty.
                    setMessages([]);
                }

            } catch (error) {
                console.error("Error fetching communication data", error);
            }
        };

        fetchData();
    }, [currentUser, users.length]);

    // Polling Interval
    useEffect(() => {
        if (!currentUser) return;

        const interval = setInterval(async () => {
            try {
                // 1. Poll Unread Counts (Very lightweight)
                const unreadData = await KommunikationService.getUnreadCountsDetailed();
                setUnreadCounts(unreadData);

                // 2. Poll for ALL new messages since last known ID
                // This ensures sidebar updates and current chat updates
                const lastId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) : 0;
                const newMsgs = await KommunikationService.getBeskeder(lastId);

                // 3. Poll for UPDATED messages (edits, labeling) since last check
                // We use a safe margin or just the last sync time
                const now = new Date();
                const modifiedMsgs = await KommunikationService.getModifiedBeskeder(lastSyncRef.current);
                lastSyncRef.current = now.toISOString();

                if (newMsgs.length > 0 || modifiedMsgs.length > 0) {
                    setMessages(prev => {
                        let newMessages = [...prev];

                        // Handle modifications to existing messages
                        if (modifiedMsgs.length > 0) {
                            const updatesMap = new Map(modifiedMsgs.map(m => [m.id, m]));
                            newMessages = newMessages.map(m => updatesMap.has(m.id) ? updatesMap.get(m.id)! : m);
                        }

                        // Handle completely new messages
                        if (newMsgs.length > 0) {
                            const existingIds = new Set(newMessages.map(m => m.id));
                            const uniqueNew = newMsgs.filter(m => !existingIds.has(m.id));
                            if (uniqueNew.length > 0) {
                                newMessages = [...newMessages, ...uniqueNew];
                            }
                        }

                        // Final Safety Deduplication (just in case)
                        const seen = new Set();
                        return newMessages.filter(m => {
                            if (seen.has(m.id)) return false;
                            seen.add(m.id);
                            return true;
                        });
                    });

                    // Auto-mark as read if new messages arrive for ACTIVE chat AND user is active
                    if (activeRecipient && activeType) {
                        const activeKey = activeType === 'user' ? `user-${activeRecipient.id}` : `team-${activeRecipient.id}`;
                        const hasUnread = (unreadData[activeKey] || 0) > 0;

                        if (hasUnread && canMarkAsRead()) {
                            KommunikationService.markChatAsRead(activeRecipient.id, activeType).then(() => {
                                // Refresh unread count locally for instant feedback
                                setUnreadCounts(Object.fromEntries(
                                    Object.entries(unreadData).filter(([key]) => key !== activeKey)
                                ));
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Polling error", error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentUser, messages.length]); // Re-bind on message length change to keep lastId correct

    // Effect for changing recipient
    useEffect(() => {
        if (activeRecipient && activeType) {
            setHasMore(true);
            const activeMsgs = getActiveMessages();
            // If we have few or no messages for this chat, fetch initial batch
            if (activeMsgs.length < 20) {
                KommunikationService.getBeskeder(undefined, undefined, activeRecipient.id, activeType, 50)
                    .then(msgs => {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const uniqueNew = msgs.filter(m => !existingIds.has(m.id));
                            return [...prev, ...uniqueNew.reverse()].sort((a, b) => a.id - b.id);
                        });
                        setHasMore(msgs.length === 50);
                    });
            }
        }
    }, [activeRecipient?.id]);

    const handleLoadMore = async () => {
        if (!activeRecipient || !activeType || isLoadingMore || !hasMore) return;

        const activeMsgs = getActiveMessages();
        if (activeMsgs.length === 0) return;

        const oldestId = activeMsgs[0].id;

        setIsLoadingMore(true);
        try {
            const olderMsgs = await KommunikationService.getBeskeder(undefined, undefined, activeRecipient.id, activeType, 50, oldestId);
            if (olderMsgs.length < 50) {
                setHasMore(false);
            }
            if (olderMsgs.length > 0) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueOld = olderMsgs.filter(m => !existingIds.has(m.id));
                    // Add and sort
                    return [...prev, ...uniqueOld].sort((a, b) => a.id - b.id);
                });
            }
        } catch (error) {
            console.error("Load more error", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Search effect
    useEffect(() => {
        const performSearch = async () => {
            if (!searchTerm.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                const results = await KommunikationService.getBeskeder(undefined, searchTerm);

                if (onlyActiveChat && activeRecipient) {
                    const filtered = results.filter(msg => {
                        if (activeType === 'user') {
                            const recipientId = activeRecipient.id;
                            return (msg.afsender === currentUser?.id && msg.modtager_person === recipientId) ||
                                (msg.afsender === recipientId && msg.modtager_person === currentUser?.id);
                        } else {
                            return msg.modtager_team === activeRecipient.id;
                        }
                    });
                    setSearchResults(filtered);
                } else {
                    setSearchResults(results);
                }
            } catch (error) {
                console.error("Search error", error);
            }
        };

        const timer = setTimeout(performSearch, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm, onlyActiveChat, activeRecipient, activeType, currentUser]);

    const handleSelectUser = (user: UserType) => {
        setActiveRecipient(user);
        setActiveType('user');
        setReplyToMessage(undefined);
        localStorage.setItem('chat_active_type', 'user');
        localStorage.setItem('chat_active_id', String(user.id));

        // Mark as read immediately
        KommunikationService.markChatAsRead(user.id, 'user').then(() => {
            // Update counts locally for instant feedback
            const next = { ...unreadCounts };
            delete next[`user-${user.id}`];
            setUnreadCounts(next);
        });
    };

    const handleBackToOverview = () => {
        setActiveRecipient(undefined);
        setActiveType(undefined);
    };

    const handleSelectTeam = (team: Team) => {
        setActiveRecipient(team);
        setActiveType('team');
        setReplyToMessage(undefined);
        localStorage.setItem('chat_active_type', 'team');
        localStorage.setItem('chat_active_id', String(team.id));

        // Mark as read immediately
        KommunikationService.markChatAsRead(team.id, 'team').then(() => {
            const next = { ...unreadCounts };
            delete next[`team-${team.id}`];
            setUnreadCounts(next);
        });
    };

    const handleSendMessage = async (content: string, type: MessageType, linkUrl?: string, linkTitle?: string, parentId?: number) => {
        if (!activeRecipient || !activeType) return;

        const payload: Partial<Besked> = {
            indhold: content,
            type: type,
            link_url: linkUrl,
            link_titel: linkTitle,
            parent: parentId
        };

        if (activeType === 'user') {
            payload.modtager_person = activeRecipient.id;
        } else {
            payload.modtager_team = activeRecipient.id;
        }

        const tempId = Date.now(); // Temporary ID
        const optimisticMsg: Besked = {
            id: tempId,
            indhold: content,
            type: type,
            link_url: linkUrl || undefined,
            link_titel: linkTitle || undefined,
            afsender: currentUser?.id || 0,
            modtager_person: activeType === 'user' ? activeRecipient.id : undefined,
            modtager_team: activeType === 'team' ? activeRecipient.id : undefined,
            oprettet: new Date().toISOString(),
            laest_af_mig: true,
            afsender_details: currentUser as UserType,
            laest_af_count: 1,
            opdateret: new Date().toISOString(),
            parent: parentId || undefined
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setReplyToMessage(undefined);

        try {
            const response = await KommunikationService.sendBesked(payload);
            setMessages(prev => prev.map(m => m.id === tempId ? response : m));
        } catch (error) {
            console.error("Failed to send message", error);
            showToast("Kunne ikke sende besked", "error");
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const getActiveMessages = () => {
        if (!activeRecipient || !currentUser) return [];

        if (activeType === 'user') {
            const recipientId = activeRecipient.id;
            return messages.filter(m =>
                (m.afsender === currentUser.id && m.modtager_person === recipientId) ||
                (m.afsender === recipientId && m.modtager_person === currentUser.id)
            ).sort((a, b) => a.id - b.id);
        } else {
            const teamId = activeRecipient.id;
            return messages.filter(m => m.modtager_team === teamId)
                .sort((a, b) => a.id - b.id);
        }
    };

    const handleSaveTeam = async (teamData: Partial<Team>) => {
        try {
            if (teamData.id) {
                await KommunikationService.updateTeam(teamData.id, teamData);
                showToast("Team opdateret", "success");
            } else {
                await KommunikationService.createTeam(teamData);
                showToast("Team oprettet", "success");
            }
            const updatedTeams = await KommunikationService.getTeams();
            setTeams(updatedTeams);
            setIsTeamModalOpen(false);
            setEditingTeam(undefined);

            // If the active recipient was the edited team, update it
            if (activeType === 'team' && activeRecipient?.id === teamData.id) {
                const updated = updatedTeams.find(t => t.id === teamData.id);
                if (updated) setActiveRecipient(updated);
            }
        } catch (error) {
            console.error("Failed to save team", error);
            showToast("Fejl ved gem af team", "error");
        }
    };

    // calculate breadcrumbs or other things if needed

    const location = useLocation();
    const isPopup = location.pathname.includes('chat-popup');

    const [layoutMode, setLayoutMode] = useState<'bottom' | 'right'>(() => {
        if (isPopup) return 'bottom';
        const saved = localStorage.getItem('chat_layout_mode_v2');
        return (saved === 'right' || saved === 'bottom') ? saved : 'bottom';
    });

    useEffect(() => {
        if (!isPopup) {
            localStorage.setItem('chat_layout_mode_v2', layoutMode);
        }
    }, [layoutMode, isPopup]);

    const toggleLayout = () => {
        if (isPopup) return;
        setLayoutMode(prev => prev === 'bottom' ? 'right' : 'bottom');
    };

    useEffect(() => {
        if (!isPopup) return;

        const saveWindowState = () => {
            try {
                localStorage.setItem('chatPopup_w', String(window.outerWidth));
                localStorage.setItem('chatPopup_h', String(window.outerHeight));
                localStorage.setItem('chatPopup_x', String(window.screenX));
                localStorage.setItem('chatPopup_y', String(window.screenY));
            } catch (e) {
                console.error("Failed to save window state", e);
            }
        };

        window.addEventListener('resize', saveWindowState);
        window.addEventListener('beforeunload', saveWindowState);

        return () => {
            window.removeEventListener('resize', saveWindowState);
            window.removeEventListener('beforeunload', saveWindowState);
            saveWindowState();
        };
    }, [isPopup]);

    const handleDeleteMessage = (id: number) => {
        setDeletingMessageId(id);
    };

    const handleToVidensbank = (msg: Besked) => {
        setVidensbankDraft({
            id: 0,
            titel: '',
            indhold: msg.indhold,
            kategori: '',
            oprettet: new Date().toISOString(),
            opdateret: new Date().toISOString(),
        } as any);
        setIsVidensbankModalOpen(true);
    };

    const handleVidensbankSave = () => {
        setIsVidensbankModalOpen(false);
        setVidensbankDraft(undefined);
        showToast("Artikel oprettet i Vidensbanken", "success");
    };

    const confirmDeleteMessage = async () => {
        if (!deletingMessageId) return;
        try {
            await KommunikationService.deleteBesked(deletingMessageId);
            setMessages(prev => prev.filter(m => m.id !== deletingMessageId));
            showToast("Besked slettet", "success");
        } catch (error) {
            console.error("Failed to delete message", error);
            showToast("Kunne ikke slette besked", "error");
        }
        setDeletingMessageId(null);
    };

    const handleForwardMessage = async (recipientId: number, recipientType: 'user' | 'team') => {
        if (!forwardingMessage) return;
        await executeForward(forwardingMessage, recipientId, recipientType);
        setForwardingMessage(undefined);
    };

    const executeForward = async (msg: Besked, recipientId: number, recipientType: 'user' | 'team') => {
        const payload: Partial<Besked> = {
            indhold: msg.indhold,
            type: msg.type,
            link_url: msg.link_url,
            link_titel: msg.link_titel,
        };

        if (recipientType === 'user') {
            payload.modtager_person = recipientId;
        } else {
            payload.modtager_team = recipientId;
        }

        try {
            await KommunikationService.sendBesked(payload);

            let recipientName = "ukendt modtager";
            if (recipientType === 'user') {
                const u = users.find(user => user.id === recipientId);
                if (u) recipientName = `${u.first_name} ${u.last_name}`;
            } else {
                const t = teams.find(team => team.id === recipientId);
                if (t) recipientName = t.navn;
            }

            if (activeType === recipientType && activeRecipient?.id === recipientId) {
                const msgs = await KommunikationService.getBeskeder(undefined, undefined, recipientId, recipientType, 50);
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = msgs.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNew.reverse()].sort((a, b) => a.id - b.id);
                });
            }
            showToast(`Besked videresendt til ${recipientName}`, "success");
        } catch (error) {
            console.error("Failed to forward message", error);
            showToast("Kunne ikke videresende besked", "error");
        }
    };

    const handleDropMessageOnRecipient = (messageId: number, recipientId: number, type: 'user' | 'team') => {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            executeForward(msg, recipientId, type);
        }
    };

    const handleDropMessageOnInput = (messageId: number) => {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            setReplyToMessage(msg);
        }
    };

    const handleSelectMessageSearchResult = (msg: Besked) => {
        if (msg.modtager_team) {
            const team = teams.find(t => t.id === msg.modtager_team);
            if (team) handleSelectTeam(team);
        } else {
            const recipientId = msg.afsender === currentUser?.id ? msg.modtager_person : msg.afsender;
            const user = users.find(u => u.id === recipientId);
            if (user) handleSelectUser(user);
        }
    };

    const handleEnableNotifications = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            showToast('Push notifikationer understøttes ikke i denne browser.', 'error');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            showToast('Du skal give tilladelse for at modtage notifikationer.', 'info');
            return;
        }

        try {
            const response = await api.get<{ publicKey: string }>('/kommunikation/push-subscriptions/public_key/');
            const publicKey = response.publicKey;
            if (!publicKey) {
                showToast('Kunne ikke hente VAPID nøgle.', 'error');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            const subJson = subscription.toJSON();
            await api.post('/kommunikation/push-subscriptions/', {
                endpoint: subJson.endpoint,
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
                user_agent: navigator.userAgent
            });

            showToast('Notifikationer er nu aktiveret!', 'success');
        } catch (error) {
            console.error('Push Subscription Error:', error);
            showToast('Fejl ved aktivering af notifikationer.', 'error');
        }
    };

    const performLogout = async () => {
        try {
            await api.post('/kerne/logout/');
        } catch (e) {
            console.error("Logout fejl:", e);
        }
        dispatch({ type: 'SET_CURRENT_USER', payload: null });
        window.location.href = '/login';
    };

    const handleUpdateType = async (id: number, type: MessageType) => {
        // Optimistic Update
        setMessages(prev => prev.map(m => m.id === id ? { ...m, type } : m));

        try {
            const updatedMsg = await KommunikationService.updateBesked(id, { type });
            // Confirm with server response
            setMessages(prev => prev.map(m => m.id === id ? updatedMsg : m));
        } catch (error) {
            console.error("Failed to update message type", error);
            showToast("Kunne ikke opdatere besked type", "error");
            // Revert on failure
            try {
                const original = await KommunikationService.getBesked(id);
                setMessages(prev => prev.map(m => m.id === id ? original : m));
            } catch (e) {
                // If fetch fails, we can't revert perfectly, potentially reload chat
            }
        }
    };

    const handleEditMessage = (msg: Besked) => {
        setEditingMessage(msg);
        setReplyToMessage(undefined); // Clear reply if editing
    };

    const handleUpdateMessageContent = async (id: number, content: string, type: MessageType, linkUrl?: string, linkTitle?: string) => {
        try {
            const updatedMsg = await KommunikationService.updateBesked(id, {
                indhold: content,
                type,
                link_url: linkUrl,
                link_titel: linkTitle
            });
            setMessages(prev => prev.map(m => m.id === id ? updatedMsg : m));
            setEditingMessage(undefined);
            showToast("Besked opdateret", "success");
        } catch (error) {
            console.error("Failed to update message", error);
            showToast("Kunne ikke opdatere besked", "error");
        }
    };

    if (!currentUser) return <div>Loading...</div>;

    return (
        <div className="flex flex-1 h-full overflow-hidden relative min-h-0">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
            <ChatSidebar
                currentUser={currentUser}
                users={users.filter(u => u.id !== currentUser.id)}
                teams={teams}
                onSelectUser={handleSelectUser}
                onSelectTeam={handleSelectTeam}
                activeRecipientId={activeRecipient?.id}
                activeType={activeType}
                onAddTeam={() => { setEditingTeam(undefined); setIsTeamModalOpen(true); }}
                unreadCounts={unreadCounts}
                layoutMode={layoutMode}
                onToggleLayout={toggleLayout}
                onDropMessage={handleDropMessageOnRecipient}
                isPopup={isPopup}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchResults={searchResults}
                onlyActiveChat={onlyActiveChat}
                onToggleOnlyActive={() => setOnlyActiveChat(!onlyActiveChat)}
                onSelectMessage={handleSelectMessageSearchResult}
                onEnableNotifications={handleEnableNotifications}
                onLogout={() => setShowLogoutConfirm(true)}
                className={activeRecipient ? 'hidden md:flex' : 'flex'} // Hide on mobile if chat active
            />

            <div className={`flex-1 flex min-w-0 min-h-0 overflow-hidden ${layoutMode === 'right' ? 'flex-row' : 'flex-col'} ${activeRecipient ? 'flex' : 'hidden md:flex'}`}>
                {/* Chat Window Container */}
                <div className={`flex flex-col min-w-0 min-h-0 ${layoutMode === 'right' ? 'flex-[2] border-r border-gray-200 h-full' : 'flex-1'}`}>
                    <ChatWindow
                        currentUser={currentUser}
                        recipient={activeRecipient}
                        recipientType={activeType}
                        messages={getActiveMessages()}
                        onReply={setReplyToMessage}
                        onDelete={handleDeleteMessage}
                        onForward={(msg) => { setForwardingMessage(msg); setIsForwardModalOpen(true); }}
                        onToVidensbank={handleToVidensbank}
                        onUpdateType={handleUpdateType}
                        onEdit={handleEditMessage}
                        onLoadMore={handleLoadMore}
                        isLoadingMore={isLoadingMore}
                        hasMore={hasMore}
                        onBack={handleBackToOverview} // Pass back handler
                        onSettings={() => {
                            if (activeType === 'team') {
                                setEditingTeam(activeRecipient as Team);
                                setIsTeamModalOpen(true);
                            }
                        }}
                    />
                </div>

                {/* Message Input Container */}
                {activeRecipient && (
                    <div className={`${layoutMode === 'right' ? 'flex-1 min-w-[350px] bg-white h-full flex flex-col shrink-0 border-l border-gray-200' : 'shrink-0 bg-white relative z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]'}`}>
                        <MessageInput
                            onSend={handleSendMessage}
                            replyingTo={replyToMessage}
                            onCancelReply={() => setReplyToMessage(undefined)}
                            fullHeight={layoutMode === 'right'}
                            onDropMessage={handleDropMessageOnInput}
                            initialContent={(location.state as any)?.initialMessage}
                            initialLinkUrl={(location.state as any)?.initialLinkUrl}
                            editingMessage={editingMessage}
                            onUpdate={handleUpdateMessageContent}
                            onCancelEdit={() => setEditingMessage(undefined)}
                        />
                    </div>
                )}
            </div>

            <TeamModal
                isOpen={isTeamModalOpen}
                onClose={() => { setIsTeamModalOpen(false); setEditingTeam(undefined); }}
                onSave={handleSaveTeam}
                users={users.filter(u => u.id !== currentUser.id)}
                editingTeam={editingTeam}
            />

            <ForwardMessageModal
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                onForward={handleForwardMessage}
                users={users.filter(u => u.id !== currentUser.id)}
                teams={teams}
                currentUser={currentUser}
            />

            <VidensbankModal
                isOpen={isVidensbankModalOpen}
                onClose={() => setIsVidensbankModalOpen(false)}
                onSave={handleVidensbankSave}
                editingViden={vidensbankDraft}
                kategorier={vidensbankKategorier}
            />

            <ConfirmModal
                isOpen={!!deletingMessageId}
                onClose={() => setDeletingMessageId(null)}
                onConfirm={confirmDeleteMessage}
                title="Slet besked"
                message="Er du sikker på at du vil slette denne besked? Handlingen kan ikke fortrydes."
                confirmText="Slet"
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={performLogout}
                title="Log ud"
                message="Er du sikker på, at du vil logge ud?"
                confirmText="Log ud"
                isDestructive={true}
            />
        </div>
    );
};

export default KommunikationPage;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
