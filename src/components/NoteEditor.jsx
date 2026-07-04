import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../utils/i18n';

const TEXT_COLORS = [
    { label: 'Kırmızı', value: '#ef4444' },
    { label: 'Turuncu', value: '#f97316' },
    { label: 'Sarı', value: '#eab308' },
    { label: 'Yeşil', value: '#22c55e' },
    { label: 'Mavi', value: '#3b82f6' },
    { label: 'Mor', value: '#a855f7' },
    { label: 'Pembe', value: '#ec4899' },
    { label: 'Camgöbeği', value: '#06b6d4' },
    { label: 'Beyaz', value: '#f1f5f9' },
    { label: 'Gri', value: '#94a3b8' },
];

const HIGHLIGHT_COLORS = [
    { label: 'Sarı', value: '#fef08a' },
    { label: 'Yeşil', value: '#bbf7d0' },
    { label: 'Mavi', value: '#bfdbfe' },
    { label: 'Pembe', value: '#fecdd3' },
    { label: 'Mor', value: '#e9d5ff' },
    { label: 'Turuncu', value: '#fed7aa' },
];

const FONT_SIZES = [
    { label: 'Küçük', value: '1' },
    { label: 'Normal', value: '3' },
    { label: 'Büyük', value: '5' },
    { label: 'Çok Büyük', value: '7' },
];

export default function NoteEditor({ initialData, onSave, onCancel, onDelete, lang = 'tr', isFullscreen, onToggleFullscreen }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });
    const editorRef = useRef(null);
    const colorPickerRef = useRef(null);
    const highlightPickerRef = useRef(null);
    const t = translations[lang];

    // Set initial content
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialData?.content || '';
            updateCounts();
            editorRef.current.focus();
        }
    }, []);

    // Close pickers on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
                setShowColorPicker(false);
            }
            if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target)) {
                setShowHighlightPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const updateCounts = () => {
        if (editorRef.current) {
            const text = editorRef.current.innerText || '';
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            setWordCount(words);
            setCharCount(text.length);
        }
    };

    const updateActiveFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikeThrough: document.queryCommandState('strikeThrough'),
        });
    };

    const execCmd = (cmd, value = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value);
        updateActiveFormats();
        updateCounts();
    };

    const handleSave = () => {
        const content = editorRef.current?.innerHTML || '';
        onSave({ title, content });
    };

    const handleKeyDown = (e) => {
        // Ctrl+B = Bold
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); execCmd('bold'); }
        // Ctrl+I = Italic
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); execCmd('italic'); }
        // Ctrl+U = Underline
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); execCmd('underline'); }
        // Ctrl+S = Save
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
    };

    const ToolbarBtn = ({ onClick, title: tip, active, children, style }) => (
        <button
            type="button"
            className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
            onClick={onClick}
            title={tip}
            style={style}
            onMouseDown={(e) => e.preventDefault()} // Prevent editor losing focus
        >
            {children}
        </button>
    );

    return (
        <div className="editor-screen">
            {/* ── TOP BAR ── */}
            <div className="editor-topbar">
                <div className="editor-topbar-left">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onCancel}
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                        ← {t.cancel}
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', flexShrink: 0 }} />
                    <span className="editor-label" style={{ flexShrink: 0 }}>
                        {initialData ? t.editNote : t.createNote}
                    </span>
                    <input
                        type="text"
                        className="editor-title-input"
                        placeholder="Başlık yaz..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>
                <div className="editor-topbar-right">
                    {/* Fullscreen toggle */}
                    {onToggleFullscreen && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onToggleFullscreen}
                            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                            style={{ padding: '0.5rem 0.75rem' }}
                        >
                            {isFullscreen ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                </svg>
                            )}
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onDelete}
                            style={{ color: 'var(--danger)', borderColor: 'rgba(255,71,87,0.3)', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                            Sil
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        style={{ padding: '0.6rem 1.5rem' }}
                    >
                        {t.save}
                    </button>
                </div>
            </div>

            {/* ── TOOLBAR ── */}
            <div className="editor-toolbar">
                {/* Bold */}
                <ToolbarBtn onClick={() => execCmd('bold')} title="Kalın (Ctrl+B)" active={activeFormats.bold}>
                    <strong>B</strong>
                </ToolbarBtn>

                {/* Italic */}
                <ToolbarBtn onClick={() => execCmd('italic')} title="İtalik (Ctrl+I)" active={activeFormats.italic}>
                    <em>İ</em>
                </ToolbarBtn>

                {/* Underline */}
                <ToolbarBtn onClick={() => execCmd('underline')} title="Altı Çizili (Ctrl+U)" active={activeFormats.underline}>
                    <span style={{ textDecoration: 'underline' }}>A</span>
                </ToolbarBtn>

                {/* Strikethrough */}
                <ToolbarBtn onClick={() => execCmd('strikeThrough')} title="Üstü Çizili" active={activeFormats.strikeThrough}>
                    <span style={{ textDecoration: 'line-through' }}>S</span>
                </ToolbarBtn>

                <div className="toolbar-separator" />

                {/* Font Size */}
                <select
                    className="toolbar-select"
                    title="Yazı Boyutu"
                    onChange={e => execCmd('fontSize', e.target.value)}
                    defaultValue="3"
                    onMouseDown={e => e.stopPropagation()}
                >
                    {FONT_SIZES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                <div className="toolbar-separator" />

                {/* Text Align */}
                <ToolbarBtn onClick={() => execCmd('justifyLeft')} title="Sola Hizala">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="17" y1="10" x2="3" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="17" y1="18" x2="3" y2="18"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('justifyCenter')} title="Ortala">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="10" x2="6" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="18" y1="18" x2="6" y2="18"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('justifyRight')} title="Sağa Hizala">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="21" y1="10" x2="7" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="21" y1="18" x2="7" y2="18"/>
                    </svg>
                </ToolbarBtn>

                <div className="toolbar-separator" />

                {/* Lists */}
                <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} title="Madde İşaretli Liste">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('insertOrderedList')} title="Numaralı Liste">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="10" y1="6" x2="21" y2="6"/>
                        <line x1="10" y1="12" x2="21" y2="12"/>
                        <line x1="10" y1="18" x2="21" y2="18"/>
                        <path d="M4 6h1v4"/>
                        <path d="M4 10h2"/>
                        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
                    </svg>
                </ToolbarBtn>

                <div className="toolbar-separator" />

                {/* Text Color */}
                <div className="toolbar-color-wrap" ref={colorPickerRef}>
                    <ToolbarBtn
                        onClick={() => { setShowColorPicker(p => !p); setShowHighlightPicker(false); }}
                        title="Yazı Rengi"
                    >
                        <span className="toolbar-color-icon">
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>A</span>
                            <span className="toolbar-color-bar" id="text-color-bar" style={{ background: '#6c63ff' }} />
                        </span>
                    </ToolbarBtn>
                    {showColorPicker && (
                        <div className="color-picker-panel">
                            <div className="color-picker-label">Yazı Rengi</div>
                            <div className="color-picker-grid">
                                {TEXT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        className="color-swatch"
                                        style={{ background: c.value }}
                                        title={c.label}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            execCmd('foreColor', c.value);
                                            // Update indicator
                                            const bar = document.getElementById('text-color-bar');
                                            if (bar) bar.style.background = c.value;
                                            setShowColorPicker(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Highlight / Background Color */}
                <div className="toolbar-color-wrap" ref={highlightPickerRef}>
                    <ToolbarBtn
                        onClick={() => { setShowHighlightPicker(p => !p); setShowColorPicker(false); }}
                        title="Arka Plan Rengi (Vurgula)"
                    >
                        <span className="toolbar-color-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                            <span className="toolbar-color-bar" id="highlight-color-bar" style={{ background: '#fef08a' }} />
                        </span>
                    </ToolbarBtn>
                    {showHighlightPicker && (
                        <div className="color-picker-panel">
                            <div className="color-picker-label">Vurgu Rengi</div>
                            <div className="color-picker-grid">
                                {HIGHLIGHT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        className="color-swatch"
                                        style={{ background: c.value }}
                                        title={c.label}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            execCmd('hiliteColor', c.value);
                                            const bar = document.getElementById('highlight-color-bar');
                                            if (bar) bar.style.background = c.value;
                                            setShowHighlightPicker(false);
                                        }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    className="color-swatch color-swatch-none"
                                    title="Vurguyu Kaldır"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        execCmd('hiliteColor', 'transparent');
                                        setShowHighlightPicker(false);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="toolbar-separator" />

                {/* Clear Formatting */}
                <ToolbarBtn onClick={() => execCmd('removeFormat')} title="Biçimlendirmeyi Temizle">
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tx</span>
                </ToolbarBtn>

                {/* Keyboard shortcuts hint */}
                <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                    <span><kbd className="kbd">Ctrl+B</kbd> Kalın</span>
                    <span><kbd className="kbd">Ctrl+I</kbd> İtalik</span>
                    <span><kbd className="kbd">Ctrl+S</kbd> Kaydet</span>
                </div>
            </div>

            {/* ── EDITOR AREA ── */}
            <div className="editor-body">
                <div
                    ref={editorRef}
                    className="editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={updateCounts}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    onKeyDown={handleKeyDown}
                    data-placeholder={"Notunu buraya yaz...\n\nMetni seçip üstteki araçlarla biçimlendirebilirsin."}
                />
            </div>

            {/* ── STATUS BAR ── */}
            <div className="editor-statusbar">
                <div className="editor-status-info">
                    <div className="editor-status-item">
                        <div className="editor-status-dot" />
                        <span>Hazır</span>
                    </div>
                    <div className="editor-status-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>{wordCount} kelime</span>
                    </div>
                    <div className="editor-status-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 7 4 4 20 4 20 7"/>
                            <line x1="9" y1="20" x2="15" y2="20"/>
                            <line x1="12" y1="4" x2="12" y2="20"/>
                        </svg>
                        <span>{charCount} karakter</span>
                    </div>
                    {initialData?.date && (
                        <div className="editor-status-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>{new Date(initialData.date).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                        </div>
                    )}
                </div>
                <div className="editor-status-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Uçtan uca şifreli</span>
                </div>
            </div>
        </div>
    );
}
