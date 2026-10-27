// Not içeriği için HTML temizleyici (izin listesi yaklaşımı).
// DOMParser ile ayrıştırılan belge "etkisiz"dir: içindeki script'ler çalışmaz,
// resimler yüklenmez. Temizlenen içerik yeni ve güvenli öğelerle yeniden kurulur.

// İçerikleriyle birlikte tamamen atılan öğeler
const DROP = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'NOSCRIPT',
    'TEMPLATE', 'SVG', 'MATH', 'HEAD', 'TITLE', 'META', 'LINK', 'BASE',
    'BUTTON', 'INPUT', 'SELECT', 'OPTION', 'TEXTAREA', 'FORM',
    'IMG', 'PICTURE', 'VIDEO', 'AUDIO', 'SOURCE', 'TRACK', 'CANVAS', 'MAP', 'AREA',
]);

// Olduğu gibi korunan biçimlendirme öğeleri
const KEEP = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP',
    'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
]);

// Satır yapısı korunsun diye <div>'e dönüştürülen blok öğeler
const TO_DIV = new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER',
    'ASIDE', 'NAV', 'MAIN', 'FIGURE', 'FIGCAPTION', 'TABLE', 'TR', 'DL', 'DT', 'DD', 'ADDRESS',
]);

const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)|transparent|[a-z]{3,20})$/i;
const ALIGN_RE = /^(left|right|center|justify|start|end)$/i;
const FONT_SIZE_RE = /^[1-7]$/;

function copyAllowedAttributes(src, out, keepStyles) {
    if (!keepStyles) return;
    const tag = src.nodeName;

    // Editörün kendi ürettiği biçimler: <font color size>, background-color, hizalama
    if (tag === 'FONT') {
        const color = src.getAttribute('color');
        const size = src.getAttribute('size');
        if (color && COLOR_RE.test(color.trim())) out.setAttribute('color', color.trim());
        if (size && FONT_SIZE_RE.test(size.trim())) out.setAttribute('size', size.trim());
    }
    if (tag === 'SPAN' || tag === 'FONT') {
        const bg = src.style.backgroundColor;
        const color = src.style.color;
        if (bg && COLOR_RE.test(bg)) out.style.backgroundColor = bg;
        if (color && COLOR_RE.test(color)) out.style.color = color;
    }
    if (tag === 'DIV' || tag === 'P' || tag === 'LI') {
        const align = src.style.textAlign;
        if (align && ALIGN_RE.test(align)) out.style.textAlign = align;
    }
}

function cleanChildren(srcParent, outParent, doc, keepStyles) {
    for (const node of Array.from(srcParent.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            outParent.appendChild(doc.createTextNode(node.nodeValue));
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue; // yorumlar vb.

        const tag = node.nodeName.toUpperCase();
        if (DROP.has(tag)) continue;

        let outTag = null;
        if (KEEP.has(tag)) outTag = tag;
        else if (TO_DIV.has(tag)) outTag = 'DIV';
        else if (keepStyles && (tag === 'FONT' || tag === 'SPAN')) outTag = tag;

        if (outTag) {
            const el = doc.createElement(outTag.toLowerCase());
            copyAllowedAttributes(node, el, keepStyles);
            cleanChildren(node, el, doc, keepStyles);
            outParent.appendChild(el);
        } else {
            // Tanınmayan öğe (a, span, table hücresi...): kabuğu at, içeriği koru
            cleanChildren(node, outParent, doc, keepStyles);
        }
    }
}

/**
 * HTML'i izin listesine göre temizler.
 * keepStyles=true: kayıtlı not içeriği (editör renkleri, boyut, hizalama korunur)
 * keepStyles=false: yapıştırılan içerik (yalnızca temel biçim: kalın, italik, liste...)
 */
export function sanitizeHtml(html, { keepStyles = true } = {}) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const out = doc.createElement('div');
    cleanChildren(doc.body, out, doc, keepStyles);
    return out.innerHTML;
}

/** Düz metni güvenli HTML'e çevirir (satır sonları korunur). */
export function textToHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\r\n?/g, '\n')
        .replace(/\n/g, '<br>');
}

/** Önizleme ve arama için HTML'den düz metin çıkarır — hiçbir şey çalıştırmaz/yüklemez. */
export function htmlToText(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    // Script/stil gibi öğelerin içindeki kod metin olarak görünmesin
    doc.querySelectorAll('script, style, template, noscript, iframe, object, svg, math')
        .forEach(el => el.remove());
    // Blok sonlarında kelimeler birbirine yapışmasın
    doc.querySelectorAll('br, p, div, li, h1, h2, h3, h4, h5, h6, blockquote, tr')
        .forEach(el => el.after(doc.createTextNode(' ')));
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
