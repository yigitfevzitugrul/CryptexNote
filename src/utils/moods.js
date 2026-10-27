// Ruh hâli seçenekleri — en iyiden en kötüye sıralı.
// tone: index.css'teki pastel renk (data-tone ile kullanılır)
export const MOODS = [
    { id: 'great', labelKey: 'moodGreat', tone: 'mint' },
    { id: 'good', labelKey: 'moodGood', tone: 'blue' },
    { id: 'okay', labelKey: 'moodOkay', tone: 'lilac' },
    { id: 'low', labelKey: 'moodLow', tone: 'peach' },
    { id: 'bad', labelKey: 'moodBad', tone: 'pink' },
];

export function getMood(id) {
    return MOODS.find(m => m.id === id) || null;
}
