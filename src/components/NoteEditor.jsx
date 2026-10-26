import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../utils/i18n';
import Icon from './Icon';

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
    { key: 'sizeSmall', value: '1' },
    { key: 'sizeNormal', value: '3' },
    { key: 'sizeLarge', value: '5' },
    { key: 'sizeHuge', value: '7' },
];

function ToolbarBtn({ onClick, title: tip, active, children, ariaExpanded }) {
    return (
        <button
            type="button"
            className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
            onClick={onClick}
            title={tip}
            aria-label={tip}
            aria-pressed={active === undefined ? undefined : active}
            aria-expanded={ariaExpanded}
            onMouseDown={(e) => e.preventDefault()} // Prevent editor losing focus
        >
            {children}
        </button>
    );
}

export default function NoteEditor({ initialData, onSave, onCancel, onDelete, lang = 'tr', isFullscreen, onToggleFullscreen }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [textColor, setTextColor] = useState('#d97706');
    const [highlightColor, setHighlightColor] = useState('#fef08a');
    const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });
    // Mevcut notlar okuma modunda, yeni notlar düzenleme modunda açılır
    const [isReading, setIsReading] = useState(!!initialData);
    const [isDirty, setIsDirty] = useState(false);
    const editorRef = useRef(null);
    const colorPickerRef = useRef(null);
    const highlightPickerRef = useRef(null);
    const t = translations[lang] || translations.tr;
    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

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

    // Set initial content
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialData?.content || '';
            updateCounts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Düzenleme moduna geçince yazı alanına odaklan, okuma modunda renk panellerini kapat
    useEffect(() => {
        if (isReading) {
            setShowColorPicker(false);
            setShowHighlightPicker(false);
        } else {
            editorRef.current?.focus();
        }
    }, [isReading]);

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

    const execCmd = (cmd, value = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value);
        setIsDirty(true);
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

    // Başlık alanında da Ctrl+S kaydetsin, Enter yazı alanına geçsin
    const handleTitleKeyDown = (e) => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
        if (e.key === 'Enter') { e.preventDefault(); editorRef.current?.focus(); }
    };

    // Ctrl+E: mod değiştir. Ctrl+S yazı alanında/başlıkta işlenmediyse (ör. okuma modu) burada yakalanır.
    useEffect(() => {
        const handleGlobalKey = (e) => {
            if (!e.ctrlKey || e.defaultPrevented) return;
            const key = e.key.toLowerCase();
            if (key === 'e') {
                e.preventDefault();
                setIsReading(r => !r);
            } else if (key === 's') {
                e.preventDefault();
                if (!isReading || isDirty) handleSave();
            }
        };
        document.addEventListener('keydown', handleGlobalKey);
        return () => document.removeEventListener('keydown', handleGlobalKey);
    });

    return (
        <div className="editor-screen">
            {/* ── TOP BAR ── */}
            <header className="editor-topbar clay">
                <div className="editor-topbar-left">
                    <button type="button" className="btn btn-ghost" onClick={onCancel} title={t.cancel}>
                        <Icon name="arrowLeft" size={16} />
                        {t.back}
                    </button>
                    <div className="topbar-divider" />
                    <div className="mode-switch" role="group" aria-label={`${t.modeSwitch} (Ctrl+E)`}>
                        <button
                            type="button"
                            className={`mode-switch-btn ${isReading ? 'active' : ''}`}
                            aria-pressed={isReading}
                            onClick={() => setIsReading(true)}
                            title={`${t.readMode} (Ctrl+E)`}
                        >
                            <Icon name="book" size={16} />
                            <span className="mode-switch-label">{t.readMode}</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-switch-btn ${!isReading ? 'active' : ''}`}
                            aria-pressed={!isReading}
                            onClick={() => setIsReading(false)}
                            title={`${t.editMode} (Ctrl+E)`}
                        >
                            <Icon name="pencil" size={16} />
                            <span className="mode-switch-label">{t.editMode}</span>
                        </button>
                    </div>
                    {!initialData && (
                        <span className="pill editor-mode-label">{t.newEntry}</span>
                    )}
                </div>
                <div className="editor-topbar-right">
                    {onToggleFullscreen && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={onToggleFullscreen}
                            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                            aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
                        >
                            <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={17} />
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
                            <Icon name="trash" size={16} />
                            {t.delete}
                        </button>
                    )}
                    {(!isReading || isDirty) && (
                        <button type="button" className="btn btn-primary" onClick={handleSave}>
                            <Icon name="lock" size={15} />
                            {t.save}
                        </button>
                    )}
                </div>
            </header>

            {/* ── TOOLBAR (yalnızca düzenleme modunda) ── */}
            {!isReading && (
                <div className="editor-toolbar clay" role="toolbar" aria-label={t.editNote}>
                    <ToolbarBtn onClick={() => execCmd('bold')} title={`${t.bold} (Ctrl+B)`} active={activeFormats.bold}>
                        <strong className="toolbar-glyph">B</strong>
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('italic')} title={`${t.italic} (Ctrl+I)`} active={activeFormats.italic}>
                        <em className="toolbar-glyph">I</em>
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('underline')} title={`${t.underline} (Ctrl+U)`} active={activeFormats.underline}>
                        <span className="toolbar-glyph" style={{ textDecoration: 'underline' }}>U</span>
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('strikeThrough')} title={t.strike} active={activeFormats.strikeThrough}>
                        <span className="toolbar-glyph" style={{ textDecoration: 'line-through' }}>S</span>
                    </ToolbarBtn>

                    <div className="toolbar-separator" />

                    <select
                        className="toolbar-select"
                        title={t.fontSize}
                        aria-label={t.fontSize}
                        onChange={e => execCmd('fontSize', e.target.value)}
                        defaultValue="3"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {FONT_SIZES.map(s => (
                            <option key={s.value} value={s.value}>{t[s.key]}</option>
                        ))}
                    </select>

                    <div className="toolbar-separator" />

                    <ToolbarBtn onClick={() => execCmd('justifyLeft')} title={t.alignLeft}>
                        <Icon name="alignLeft" size={16} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('justifyCenter')} title={t.alignCenter}>
                        <Icon name="alignCenter" size={16} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('justifyRight')} title={t.alignRight}>
                        <Icon name="alignRight" size={16} />
                    </ToolbarBtn>

                    <div className="toolbar-separator" />

                    <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} title={t.bulletList}>
                        <Icon name="list" size={16} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => execCmd('insertOrderedList')} title={t.numberList}>
                        <Icon name="listOrdered" size={16} />
                    </ToolbarBtn>

                    <div className="toolbar-separator" />

                    {/* Text Color */}
                    <div className="toolbar-color-wrap" ref={colorPickerRef}>
                        <ToolbarBtn
                            onClick={() => { setShowColorPicker(p => !p); setShowHighlightPicker(false); }}
                            title={t.textColor}
                            ariaExpanded={showColorPicker}
                        >
                            <span className="toolbar-color-icon">
                                <span className="toolbar-glyph" style={{ fontWeight: 600 }}>A</span>
                                <span className="toolbar-color-bar" style={{ background: textColor }} />
                            </span>
                        </ToolbarBtn>
                        {showColorPicker && (
                            <div className="color-picker-panel">
                                <div className="eyebrow">{t.textColor}</div>
                                <div className="color-picker-grid">
                                    {TEXT_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            className="color-swatch"
                                            style={{ background: c.value }}
                                            title={c.label}
                                            aria-label={c.label}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                execCmd('foreColor', c.value);
                                                setTextColor(c.value);
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
                            title={t.highlight}
                            ariaExpanded={showHighlightPicker}
                        >
                            <span className="toolbar-color-icon">
                                <Icon name="highlighter" size={15} />
                                <span className="toolbar-color-bar" style={{ background: highlightColor }} />
                            </span>
                        </ToolbarBtn>
                        {showHighlightPicker && (
                            <div className="color-picker-panel">
                                <div className="eyebrow">{t.highlight}</div>
                                <div className="color-picker-grid">
                                    {HIGHLIGHT_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            className="color-swatch"
                                            style={{ background: c.value }}
                                            title={c.label}
                                            aria-label={c.label}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                execCmd('hiliteColor', c.value);
                                                setHighlightColor(c.value);
                                                setShowHighlightPicker(false);
                                            }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        className="color-swatch color-swatch-none"
                                        title={t.removeHighlight}
                                        aria-label={t.removeHighlight}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            execCmd('hiliteColor', 'transparent');
                                            setShowHighlightPicker(false);
                                        }}
                                    >
                                        <Icon name="x" size={13} strokeWidth={2.4} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="toolbar-separator" />

                    <ToolbarBtn onClick={() => execCmd('removeFormat')} title={t.clearFormat}>
                        <Icon name="eraser" size={16} />
                    </ToolbarBtn>

                    <div className="toolbar-hints" aria-hidden="true">
                        <span><kbd className="kbd">Ctrl+B</kbd>{t.bold}</span>
                        <span><kbd className="kbd">Ctrl+I</kbd>{t.italic}</span>
                        <span><kbd className="kbd">Ctrl+S</kbd>{t.save}</span>
                        <span><kbd className="kbd">Ctrl+E</kbd>{t.readMode}</span>
                    </div>
                </div>
            )}

            {/* ── EDITOR AREA ── */}
            <div className="editor-body">
                <div className={`editor-sheet clay ${isReading ? 'is-reading' : ''}`}>
                    <span className="eyebrow">
                        {(initialData?.date ? new Date(initialData.date) : new Date())
                            .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {isReading ? (
                        <h1 className={`editor-title-input editor-title-read ${title ? '' : 'untitled'}`}>
                            {title || t.untitled}
                        </h1>
                    ) : (
                        <>
                            <label htmlFor="note-title" className="visually-hidden">{t.titleInputPlaceholder}</label>
                            <input
                                id="note-title"
                                type="text"
                                className="editor-title-input"
                                placeholder={t.titleInputPlaceholder}
                                value={title}
                                onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
                                onKeyDown={handleTitleKeyDown}
                            />
                        </>
                    )}
                    <div
                        ref={editorRef}
                        className="editor-content"
                        contentEditable={!isReading}
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        aria-readonly={isReading}
                        aria-label={t.contentPlaceholder}
                        onInput={() => { updateCounts(); setIsDirty(true); }}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        onKeyDown={handleKeyDown}
                        data-placeholder={isReading ? t.emptyNoteRead : t.editorPlaceholder}
                    />
                </div>
            </div>

            {/* ── STATUS BAR ── */}
            <footer className="editor-statusbar eyebrow">
                <div className="editor-status-info">
                    <span className="editor-status-item">
                        <span className={`editor-status-dot ${isDirty ? 'dirty' : ''}`} aria-hidden="true" />
                        {isReading ? t.readingModeStatus : t.editingModeStatus}
                        {isDirty && ` · ${t.unsaved}`}
                    </span>
                    <span className="editor-status-item">{wordCount} {t.words}</span>
                    <span className="editor-status-item">{charCount} {t.chars}</span>
                    {initialData?.date && (
                        <span className="editor-status-item">
                            <Icon name="clock" size={12} />
                            {new Date(initialData.date).toLocaleString(locale)}
                        </span>
                    )}
                </div>
                <span className="editor-status-item sealed">
                    <Icon name="lock" size={12} />
                    AES-GCM 256
                </span>
            </footer>
        </div>
    );
}
