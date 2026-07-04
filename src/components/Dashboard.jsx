import React, { useEffect, useState } from 'react';
import { encryptData, decryptData } from '../utils/crypto';
import { loadRawNotes, saveRawNotes } from '../utils/storage';
import { translations } from '../utils/i18n';
import NoteEditor from './NoteEditor';
import Settings from './Settings';
import ConfirmModal from './ConfirmModal';

export default function Dashboard({ encryptionKey, username, onLogout, lang, setLang, theme, setTheme, onPasswordChanged }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNote, setEditingNote] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [currentView, setCurrentView] = useState('notes');
    const [modal, setModal] = useState({ isOpen: false, noteId: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const t = translations[lang] || translations['tr'];
    if (!t) return <div style={{ color: 'white' }}>Dil dosyası yüklenemedi / Language file error</div>;

    // Fullscreen handling
    useEffect(() => {
        const api = window.electronAPI;
        if (!api) return;
        // Get initial state
        api.isFullscreen().then(setIsFullscreen);
        // Listen for changes
        const cleanup = api.onFullscreenChange((fs) => setIsFullscreen(fs));
        return cleanup;
    }, []);

    const toggleFullscreen = () => {
        if (window.electronAPI) {
            window.electronAPI.toggleFullscreen().then((fs) => setIsFullscreen(fs));
        } else {
            // Web fallback
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    useEffect(() => {
        loadNotes();
    }, [encryptionKey]);

    async function loadNotes() {
        setLoading(true);
        try {
            const raw = loadRawNotes();
            if (!Array.isArray(raw)) {
                console.warn("Raw notes is not an array, resetting.");
                setNotes([]);
                return;
            }

            const decrypted = await Promise.all(raw.map(async (item) => {
                try {
                    if (!item || !item.encryptedData) return null;
                    const json = await decryptData(item.encryptedData, encryptionKey);
                    if (!json) return null;
                    return { ...JSON.parse(json), id: item.id };
                } catch (e) {
                    console.error("Failed to decrypt note", item.id);
                    return null;
                }
            }));
            setNotes(decrypted.filter(n => n !== null).sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (e) {
            console.error(e);
            alert("Notlar yüklenirken hata oluştu: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(noteData) {
        const newNote = {
            title: noteData.title,
            content: noteData.content,
            date: new Date().toISOString()
        };

        const encryptedData = await encryptData(JSON.stringify(newNote), encryptionKey);

        let newRawNotes;
        const raw = loadRawNotes();

        if (editingNote) {
            newRawNotes = raw.map(n =>
                n.id === editingNote.id ? { id: n.id, encryptedData } : n
            );
        } else {
            const id = crypto.randomUUID();
            newRawNotes = [...raw, { id, encryptedData }];
        }

        saveRawNotes(newRawNotes);
        await loadNotes();
        setEditingNote(null);
        setIsCreating(false);
    }

    function confirmDelete(id) {
        setModal({ isOpen: true, noteId: id });
    }

    async function handleDeleteConfirmed() {
        if (!modal.noteId) return;

        const raw = loadRawNotes();
        const newRaw = raw.filter(n => n.id !== modal.noteId);
        saveRawNotes(newRaw);
        await loadNotes();

        if (editingNote?.id === modal.noteId) {
            setEditingNote(null);
            setIsCreating(false);
        }

        setModal({ isOpen: false, noteId: null });
    }

    // Avatar initials
    const initials = username
        ? username.slice(0, 2).toUpperCase()
        : 'KL';

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner" />
            <p className="loading-text">{t.processing}</p>
        </div>
    );

    if (isCreating || editingNote) {
        return (
            <>
                <NoteEditor
                    initialData={editingNote}
                    onSave={handleSave}
                    onCancel={() => {
                        setEditingNote(null);
                        setIsCreating(false);
                    }}
                    onDelete={editingNote ? () => confirmDelete(editingNote.id) : null}
                    lang={lang}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                />

                <ConfirmModal
                    isOpen={modal.isOpen}
                    onClose={() => setModal({ isOpen: false, noteId: null })}
                    onConfirm={handleDeleteConfirmed}
                    title={t.deleteNoteTitle || "Notu Sil"}
                    message={t.deleteConfirm || "Bu notu silmek istediğinize emin misiniz?"}
                    confirmText={t.delete || "Sil"}
                    cancelText={t.cancel || "İptal"}
                />
            </>
        );
    }

    // Strip HTML tags to get plain text for preview/search
    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    // Filter notes by search
    const filteredNotes = notes.filter(note =>
        !searchQuery ||
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stripHtml(note.content)?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} sa önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');
    };

    return (
        <div className="app-layout">
            {/* SIDEBAR */}
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <span className="sidebar-title">Günlük</span>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <span className="nav-section-label">Menü</span>
                    <button
                        className={`nav-item ${currentView === 'notes' ? 'active' : ''}`}
                        onClick={() => setCurrentView('notes')}
                    >
                        <span className="nav-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </span>
                        {t.notes}
                        {notes.length > 0 && (
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: currentView === 'notes' ? 'rgba(255,255,255,0.2)' : 'var(--accent-subtle)',
                                color: currentView === 'notes' ? 'white' : 'var(--accent-light)',
                                padding: '0.1rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                            }}>
                                {notes.length}
                            </span>
                        )}
                    </button>
                    <button
                        className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                    >
                        <span className="nav-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </span>
                        {t.settings}
                    </button>
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    {/* Fullscreen toggle */}
                    <button
                        className="nav-item"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                    >
                        <span className="nav-item-icon">
                            {isFullscreen ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                </svg>
                            )}
                        </span>
                        {isFullscreen ? 'Küçült' : 'Tam Ekran'}
                    </button>

                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">{initials}</div>
                        <div>
                            <div className="sidebar-user-name">{username}</div>
                            <div className="sidebar-user-role">Şifreli Oturum</div>
                        </div>
                    </div>
                    <button
                        className="nav-item danger"
                        onClick={onLogout}
                    >
                        <span className="nav-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                <polyline points="16 17 21 12 16 7"/>
                                <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                        </span>
                        {t.logout}
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="main-content">
                {currentView === 'notes' && (
                    <div className="page-wrapper">
                        {/* Header */}
                        <div className="header-bar">
                            <div>
                                <h1 className="header-title">{t.myNotes}</h1>
                                <p className="header-subtitle">
                                    {notes.length} not · Uçtan uca şifreli
                                </p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => setIsCreating(true)}
                            >
                                + {t.newNote}
                            </button>
                        </div>

                        {/* Stats bar */}
                        {notes.length > 0 && (
                            <div className="stats-bar">
                                <div className="stat-card">
                                    <div className="stat-icon stat-icon-accent">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="stat-value">{notes.length}</div>
                                        <div className="stat-label">Toplam Not</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon stat-icon-purple">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="stat-value">{notes.length}</div>
                                        <div className="stat-label">Şifreli</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon stat-icon-success">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="stat-value" style={{ fontSize: '1rem' }}>
                                            {notes[0] ? formatDate(notes[0].date) : '-'}
                                        </div>
                                        <div className="stat-label">Son Güncelleme</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search toolbar */}
                        {notes.length > 0 && (
                            <div className="notes-toolbar">
                                <div className="search-bar">
                                    <span className="search-bar-icon">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"/>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Notlarda ara..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', paddingLeft: '2.5rem' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes grid */}
                        <div className="note-grid">
                            {filteredNotes.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10 9 9 9 8 9"/>
                                        </svg>
                                    </div>
                                    <div className="empty-state-title">
                                        {searchQuery ? 'Sonuç bulunamadı' : 'Henüz notun yok'}
                                    </div>
                                    <p className="empty-state-text">
                                        {searchQuery
                                            ? `"${searchQuery}" için eşleşen not bulunamadı`
                                            : t.noNotes
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setIsCreating(true)}
                                        >
                                            + İlk Notunu Oluştur
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredNotes.map((note, idx) => (
                                    <div
                                        key={note.id}
                                        className="note-card"
                                        onClick={() => setEditingNote(note)}
                                        style={{ animationDelay: `${idx * 0.04}s` }}
                                    >
                                        <div className="note-card-header">
                                            <div className="note-title">
                                                {note.title || 'İsimsiz Not'}
                                            </div>
                                            <button
                                                className="note-delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    confirmDelete(note.id);
                                                }}
                                                title="Sil"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                    <path d="M10 11v6"/>
                                                    <path d="M14 11v6"/>
                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                </svg>
                                            </button>
                                        </div>

                                        {note.content && (
                                            <div className="note-preview">
                                                {stripHtml(note.content)}
                                            </div>
                                        )}

                                        <div className="note-footer">
                                            <div className="note-date">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <polyline points="12 6 12 12 16 14"/>
                                                </svg>
                                                {formatDate(note.date)}
                                            </div>
                                            <span className="note-card-badge">şifreli</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'settings' && (
                    <div className="page-wrapper">
                        <Settings
                            lang={lang}
                            setLang={setLang}
                            theme={theme}
                            setTheme={setTheme}
                            onPasswordChanged={onPasswordChanged}
                        />
                    </div>
                )}
            </main>

            <ConfirmModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ isOpen: false, noteId: null })}
                onConfirm={handleDeleteConfirmed}
                title={t.deleteNoteTitle || "Notu Sil"}
                message={t.deleteConfirm || "Bu notu silmek istediğinize emin misiniz?"}
                confirmText={t.delete || "Sil"}
                cancelText={t.cancel || "İptal"}
            />
        </div>
    );
}
