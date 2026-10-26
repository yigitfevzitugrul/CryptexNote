# Günlük — Design System (MASTER)

Kaynak: [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) —
[educational-platform demosu](https://uupm.cc/demo/educational-platform) (Claymorphism).

## Stil: Claymorphism
- 3px koyu kenarlık (`--ink`), 6px/4px kaydırılmış **sert** gölge, alt kısımda hafif iç gölge
- Köşeler: kart 24px, buton/input 16px, küçük öğe 12px, etiketler hap şeklinde
- Etkileşim: üzerine gelince öğe 2px kayar ve gölgesi küçülür ("basılma" hissi), tıklayınca gölge kaybolur
- Pastel renkler kartlarda döngüsel kullanılır (pembe → mavi → nane → lila)

## Fontlar
| Rol | Font | Not |
|---|---|---|
| Başlık | **Baloo 2** (500–800) | Demodaki Fredoka'da **Ğ ğ Ş ş İ glifleri yok**; tarayıcıda 10 aday denendi, Baloo 2 tüm Türkçe harfleri tutarlı çizdi |
| Metin | **Nunito** (400–800) | Yuvarlak hatlı, Türkçe karakterler doğrulandı |

## Renkler
| Rol | Aydınlık (varsayılan) | Karanlık |
|---|---|---|
| `--bg` | `#FFF9F5` | `#1A1D29` |
| `--surface` | `#FFFFFF` | `#262B3B` |
| `--ink` (kenarlık + gölge) | `#2D3748` | `#A8B3CF` ("tebeşir") |
| `--text` / `--text-muted` | `#2D3748` / `#58657A` | `#F1F5F9` / `#A7B0C0` |
| Pembe / Mavi / Nane / Lila | `#FDBCB4` `#ADD8E6` `#98FF98` `#E6E6FA` | `#F4A39A` `#8EC5DA` `#7DE38D` `#B9B5E8` |
| Ana buton (CTA) | `#22C55E` | `#22C55E` |

**Erişilebilirlik sapması:** Demoda yeşil buton üstünde beyaz yazı var (2.28:1, okunmuyor).
Burada koyu yazı kullanıldı (5.26:1). Pastel zeminlerdeki tüm yazılar ≥ 6:1.

## Kontrol listesi
- [x] İkonlar SVG (emoji yok)
- [x] Metin kontrastı ≥ 4.5:1 (iki temada)
- [x] Görünür odak halkası (3px yeşil)
- [x] `prefers-reduced-motion` desteği
- [x] 375px genişlikte yatay taşma yok
