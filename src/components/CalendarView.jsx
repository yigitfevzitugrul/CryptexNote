import React, { useMemo, useState } from 'react';
import { translations } from '../utils/i18n';
import { MOODS, getMood } from '../utils/moods';
import Icon, { MoodFace } from './Icon';

const DAY_MS = 86400000;

// Yerel saate göre gün anahtarı: "2026-10-27"
function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Notun yazıldığı gün (eski notlarda createdAt yoksa son düzenleme tarihi)
const noteDay = (note) => dayKey(new Date(note.createdAt || note.date));

// Bugün (ya da bugün henüz yazılmadıysa dün) biten ardışık günler
function currentStreak(days) {
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(dayKey(cursor))) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return count;
}

function longestStreak(days) {
    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const key of sorted) {
        const date = keyToDate(key);
        // Yaz saati geçişlerinde de doğru olsun diye yuvarlanır
        run = prev && Math.round((date - prev) / DAY_MS) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = date;
    }
    return best;
}

export default function CalendarView({ notes, lang, onOpenNote }) {
    const t = translations[lang] || translations.tr;
    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
    const weekStart = lang === 'tr' ? 1 : 0; // TR: pazartesi, EN: pazar

    const todayKey = dayKey(new Date());
    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedKey, setSelectedKey] = useState(todayKey);

    const byDay = useMemo(() => {
        const map = new Map();
        for (const note of notes) {
            const key = noteDay(note);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(note);
        }
        for (const list of map.values()) {
            list.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
        }
        return map;
    }, [notes]);

    const days = useMemo(() => new Set(byDay.keys()), [byDay]);
    const streak = useMemo(() => currentStreak(days), [days]);
    const longest = useMemo(() => longestStreak(days), [days]);
    const wroteToday = days.has(todayKey);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (cursor.getDay() - weekStart + 7) % 7;

    const cells = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    // 7 Ocak 2024 bir pazar günüdür; hafta günü adları buradan üretilir
    const weekdayNames = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 7 + ((weekStart + i) % 7)).toLocaleDateString(locale, { weekday: 'short' })
    );

    // Bu ayın notları ve ruh hâli dağılımı
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const monthNotes = notes.filter(n => noteDay(n).startsWith(monthPrefix));
    const moodCounts = MOODS.map(m => ({ ...m, count: monthNotes.filter(n => n.mood === m.id).length }));
    const moodTotal = moodCounts.reduce((sum, m) => sum + m.count, 0);

    const selectedNotes = byDay.get(selectedKey) || [];
    const selectedDate = keyToDate(selectedKey);

    const goMonth = (delta) => setCursor(new Date(year, month + delta, 1));
    const goToday = () => {
        const now = new Date();
        setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedKey(dayKey(now));
    };

    const countLabel = (n) => `${n} ${n === 1 ? t.notesCountOne : t.notesCount}`;

    let streakMessage = t.streakNone;
    if (streak > 0) streakMessage = wroteToday ? t.streakToday : t.streakKeep;

    return (
        <div>
            <header className="page-header">
                <div>
                    <span className="eyebrow">{t.calendarSubtitle}</span>
                    <h1 className="page-title">{t.calendar}</h1>
                </div>
            </header>

            <div className="calendar-layout">
                {/* ── AY TAKVİMİ ── */}
                <section className="calendar-card clay" aria-label={t.calendar}>
                    <div className="calendar-head">
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => goMonth(-1)} aria-label={t.prevMonth} title={t.prevMonth}>
                            <Icon name="chevronLeft" size={18} strokeWidth={2.4} />
                        </button>
                        <h2 className="calendar-month" aria-live="polite">
                            {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                        </h2>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => goMonth(1)} aria-label={t.nextMonth} title={t.nextMonth}>
                            <Icon name="chevronRight" size={18} strokeWidth={2.4} />
                        </button>
                        <button type="button" className="btn btn-secondary calendar-today-btn" onClick={goToday}>
                            {t.today}
                        </button>
                    </div>

                    <div className="calendar-grid" role="grid">
                        <div className="calendar-row" role="row">
                            {weekdayNames.map(name => (
                                <span key={name} className="calendar-weekday" role="columnheader">{name}</span>
                            ))}
                        </div>
                        {Array.from({ length: cells.length / 7 }, (_, row) => (
                            <div className="calendar-row" role="row" key={row}>
                                {cells.slice(row * 7, row * 7 + 7).map((date, i) => {
                                    if (!date) return <span key={`empty-${i}`} className="calendar-cell empty" role="gridcell" />;
                                    const key = dayKey(date);
                                    const dayNotes = byDay.get(key) || [];
                                    const label = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
                                    return (
                                        <span key={key} role="gridcell">
                                            <button
                                                type="button"
                                                className={[
                                                    'calendar-cell',
                                                    dayNotes.length ? 'has-notes' : '',
                                                    key === todayKey ? 'is-today' : '',
                                                    key === selectedKey ? 'is-selected' : '',
                                                ].join(' ')}
                                                onClick={() => setSelectedKey(key)}
                                                aria-pressed={key === selectedKey}
                                                aria-current={key === todayKey ? 'date' : undefined}
                                                aria-label={dayNotes.length ? `${label}, ${countLabel(dayNotes.length)}` : label}
                                            >
                                                <span className="calendar-day-num">{date.getDate()}</span>
                                                {dayNotes.length > 0 && (
                                                    <span className="calendar-dots" aria-hidden="true">
                                                        {dayNotes.slice(0, 3).map(n => (
                                                            <span key={n.id} className="calendar-dot" data-tone={getMood(n.mood)?.tone || 'none'} />
                                                        ))}
                                                        {dayNotes.length > 3 && <span className="calendar-more">+</span>}
                                                    </span>
                                                )}
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="calendar-legend" aria-hidden="true">
                        {MOODS.map(m => (
                            <span key={m.id}>
                                <span className="calendar-dot" data-tone={m.tone} />
                                {t[m.labelKey]}
                            </span>
                        ))}
                        <span>
                            <span className="calendar-dot" data-tone="none" />
                            {t.noMood}
                        </span>
                    </div>
                </section>

                <div className="calendar-side">
                    {/* ── YAZMA SERİSİ ── */}
                    <section className="streak-card clay">
                        <span className="streak-icon" data-active={streak > 0}>
                            <Icon name="flame" size={26} strokeWidth={2} />
                        </span>
                        <div>
                            <div className="streak-value">
                                {streak} <span>{t.streakUnit}</span>
                            </div>
                            <p className="streak-message">{streakMessage}</p>
                            {longest > 0 && (
                                <p className="eyebrow">{t.longestStreak}: {longest} {t.days}</p>
                            )}
                        </div>
                    </section>

                    {/* ── AYIN RUH HÂLİ ── */}
                    <section className="mood-summary clay">
                        <h3 className="side-title">{t.moodThisMonth}</h3>
                        <p className="eyebrow">{t.monthEntries}: {monthNotes.length}</p>
                        {moodTotal === 0 ? (
                            <p className="side-empty">{t.noMoodData}</p>
                        ) : (
                            <>
                                <div className="mood-bar" role="img" aria-label={moodCounts.filter(m => m.count).map(m => `${t[m.labelKey]}: ${m.count}`).join(', ')}>
                                    {moodCounts.filter(m => m.count).map(m => (
                                        <span key={m.id} data-tone={m.tone} style={{ flexGrow: m.count }} />
                                    ))}
                                </div>
                                <ul className="mood-list">
                                    {moodCounts.filter(m => m.count).map(m => (
                                        <li key={m.id}>
                                            <span className="mood-chip" data-tone={m.tone}>
                                                <MoodFace mood={m.id} size={16} />
                                                {t[m.labelKey]}
                                            </span>
                                            <strong>{m.count}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </section>

                    {/* ── SEÇİLEN GÜN ── */}
                    <section className="day-panel clay" aria-live="polite">
                        <h3 className="side-title">
                            {selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        {selectedNotes.length === 0 ? (
                            <p className="side-empty">{t.dayEmpty}</p>
                        ) : (
                            <ul className="day-notes">
                                {selectedNotes.map(note => {
                                    const mood = getMood(note.mood);
                                    return (
                                        <li key={note.id}>
                                            <button type="button" className="day-note" onClick={() => onOpenNote(note)}>
                                                <span className="day-note-time">
                                                    {new Date(note.createdAt || note.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className={`day-note-title ${note.title ? '' : 'untitled'}`}>
                                                    {note.title || t.untitled}
                                                </span>
                                                {mood && (
                                                    <span className="mood-dot" data-tone={mood.tone} title={t[mood.labelKey]}>
                                                        <MoodFace mood={note.mood} size={18} />
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
