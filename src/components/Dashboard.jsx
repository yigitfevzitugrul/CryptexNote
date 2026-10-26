import React, { useEffect, useState } from 'react';
import { encryptData, decryptData } from '../utils/crypto';
import { loadRawNotes, saveRawNotes } from '../utils/storage';
import { translations } from '../utils/i18n';
import NoteEditor from './NoteEditor';
import Settings from './Settings';
import ConfirmModal from './ConfirmModal';
import Icon, { Seal } from './Icon';

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
                } catch {
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
        <div className="loading-screen" role="status" aria-live="polite">
            <Seal size={48} />
            <p className="eyebrow">{t.processing}</p>
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

    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t.justNow;
        if (diffMins < 60) return `${diffMins} ${t.minAgo}`;
        if (diffHours < 24) return `${diffHours} ${t.hourAgo}`;
        if (diffDays < 7) return `${diffDays} ${t.dayAgo}`;
        return date.toLocaleDateString(locale);
    };

    // Kart üstündeki damga: "27 Eki 2026"
    const formatStamp = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="app-layout">
            {/* SIDEBAR */}
            <aside className="sidebar clay">
                <div className="brand">
                    <Seal size={34} />
                    <span className="brand-name">Günlük</span>
                </div>

                <span className="sidebar-section eyebrow">{t.menu}</span>
                <nav className="sidebar-nav" aria-label={t.menu}>
                    <button
                        type="button"
                        className={`nav-item ${currentView === 'notes' ? 'active' : ''}`}
                        onClick={() => setCurrentView('notes')}
                        aria-current={currentView === 'notes' ? 'page' : undefined}
                        title={t.notes}
                    >
                        <Icon name="notes" size={17} />
                        <span className="nav-label">{t.notes}</span>
                        {notes.length > 0 && <span className="nav-count">{notes.length}</span>}
                    </button>
                    <button
                        type="button"
                        className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                        aria-current={currentView === 'settings' ? 'page' : undefined}
                        title={t.settings}
                    >
                        <Icon name="settings" size={17} />
                        <span className="nav-label">{t.settings}</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="avatar" aria-hidden="true">{initials}</div>
                        <div>
                            <div className="sidebar-user-name">{username}</div>
                            <div className="eyebrow">{t.encryptedSession}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="nav-item"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                    >
                        <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={17} />
                        <span className="nav-label">{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
                    </button>
                    <button
                        type="button"
                        className="nav-item danger"
                        onClick={onLogout}
                        title={t.logout}
                    >
                        <Icon name="logout" size={17} />
                        <span className="nav-label">{t.logout}</span>
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="main-content">
                {currentView === 'notes' && (
                    <div className="page">
                        <header className="page-header">
                            <div>
                                <span className="eyebrow">{today}</span>
                                <h1 className="page-title">{t.myNotes}</h1>
                                <div className="page-meta">
                                    <span className="pill">{notes.length} {notes.length === 1 ? t.notesCountOne : t.notesCount}</span>
                                    {notes[0] && (
                                        <span className="pill">
                                            <Icon name="clock" size={12} />
                                            {t.lastEdited}: {formatDate(notes[0].date)}
                                        </span>
                                    )}
                                    <span className="pill">
                                        <Icon name="lock" size={13} />
                                        AES-GCM 256
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setIsCreating(true)}
                            >
                                <Icon name="plus" size={16} strokeWidth={2.2} />
                                {t.newNote}
                            </button>
                        </header>

                        {notes.length > 0 && (
                            <div className="search" role="search">
                                <Icon name="search" size={16} />
                                <label htmlFor="note-search" className="visually-hidden">{t.searchNotes}</label>
                                <input
                                    id="note-search"
                                    className="input"
                                    type="search"
                                    placeholder={t.searchNotes}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="note-grid">
                            {filteredNotes.length === 0 ? (
                                <div className="empty-state">
                                    <Seal size={52} />
                                    <div className="empty-state-title">
                                        {searchQuery ? t.noResults : t.emptyTitle}
                                    </div>
                                    <p className="empty-state-text">
                                        {searchQuery
                                            ? `"${searchQuery}" ${t.noResultsFor}`
                                            : t.noNotes
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => setIsCreating(true)}
                                        >
                                            <Icon name="plus" size={16} strokeWidth={2.2} />
                                            {t.firstNote}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredNotes.map((note, idx) => {
                                    const preview = stripHtml(note.content);
                                    return (
                                        <article
                                            key={note.id}
                                            className="note-card"
                                            style={{ animationDelay: `${Math.min(idx, 12) * 0.035}s` }}
                                        >
                                            <button
                                                type="button"
                                                className="note-card-open"
                                                onClick={() => setEditingNote(note)}
                                            >
                                                <time className="note-date" dateTime={note.date}>
                                                    {formatStamp(note.date)}
                                                </time>
                                                <span className={`note-title ${note.title ? '' : 'untitled'}`}>
                                                    {note.title || t.untitled}
                                                </span>
                                                {preview && (
                                                    <span className="note-preview">{preview}</span>
                                                )}
                                                <span className="note-footer eyebrow">
                                                    <Icon name="lock" size={12} />
                                                    {t.sealed} · {formatDate(note.date)}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className="note-delete-btn"
                                                onClick={() => confirmDelete(note.id)}
                                                aria-label={`${t.deleteNoteAria}: ${note.title || t.untitled}`}
                                                title={t.delete}
                                            >
                                                <Icon name="trash" size={15} />
                                            </button>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'settings' && (
                    <div className="page">
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
