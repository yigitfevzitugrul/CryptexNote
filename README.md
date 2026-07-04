# Şifreli Günlük Uygulaması

Bu uygulama uçtan uca şifreleme (End-to-End Encryption) kullanan güvenli bir not defteridir. Notlarınız tarayıcınızın yerel depolama alanında (LocalStorage) sadece sizin şifrenizle çözülebilecek şifreli bir formatta saklanır.

## Özellikler
- **Tam Güvenlik**: Not içerikleri AES-GCM ile şifrelenir. Şifrenizi bilmeden kimse (veritabanına erişimi olsa bile) notlarınızı okuyamaz.
- **Modern Tasarım**: Koyu mod, glassmorphism efektleri ve responsive tasarım.
- **Kullanıcı Yönetimi**: Cihaz başına tek oturum mantığı ile çalışır. İlk girişte belirlediğiniz şifre "master key" olur.

## Kurulum ve Çalıştırma

Gerekli paketleri yüklemek ve uygulamayı başlatmak için terminalde şu komutları çalıştırın:

```bash
npm install
npm run dev
```

## Önemli Uyarı
Şifrenizi unutursanız notlarınıza **asla** erişemezsiniz. Şifre sıfırlama mekanizması yoktur çünkü şifreniz aynı zamanda şifreleme anahtarınızdır.
