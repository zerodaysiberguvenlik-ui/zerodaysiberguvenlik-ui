# 🕯️ Nur Koridoru — 3D Sesli Risale-i Nur Kütüphanesi

Modern **Three.js (WebGL)**, interaktif 3D atmosferik aydınlatma, uzamsal ses sentezi (Web Audio API) ve antika iki sayfalık açık rahle cilt düzenine sahip dijital Risale-i Nur kütüphanesi.

---

## ✨ Öne Çıkan Özellikler

- 📜 **3D Sonsuz Koridor & Manevi Yolculuk:**
  - Bediüzzaman Said Nursî'nin koridorda ziyaretçinin önünde süzülen yürüyüş animasyonu (gerçekçi adım yaylanması, zemin temas gölgesi ve manevi fener ışığı).
  - Koridorun sonunda altın varaklı galeri çerçevesi ve spot ışığıyla aydınlatılan portresi.
- 🕯️ **Fareye Bağlı Dinamik Gaz Lambası:**
  - Fare hareketini 3D hacimde takip eden `THREE.PointLight` ve gerçekçi alev titreşimi (`flame flicker`).
  - Ekranda farenin arkasından süzülen çok katmanlı vintage ışık aurası (`#candle`).
- 📚 **3D Altın İşlemeli Kitap Çarkları (Carousel):**
  - Her bir rafta (Ana Külliyat, Hayat & Lahikalar, Diğer Risaleler) serbestçe dönebilen, altın varaklı ve kabartmalı 3D ciltler.
  - Tıklanan kitabın kameraya doğru uçup kapağının 3D olarak açılması ve sayfaların havalanması.
- 📖 **Antika Rahle Düzeninde Çift Sayfalı Açık Cilt Okuyucu:**
  - Sol ve sağ sayfaların tıpkı hakiki bir ciltli kitap gibi yan yana açıldığı geniş açık cilt tasarımı.
  - Asil bordo deri kapak astarı, altın dikiş payı ve ortadan sarkan kırmızı ipek saten ayraç kurdelesi.
  - Altın tezhip çerçeveleri, hat işlemeli Besmele-i Şerif ve süslü damla harfler.
  - Bütün eserler için zengin, hakiki ve orijinal Risale-i Nur fasıl metinleri.
  - Çift çift sayfa çevirme ve gerçek kâğıt sesi (`playTurn()`).
- ✦ **Günün Vecizesi & Hikmet Mührü:**
  - Koridorda süzülen 3D altın mühür ve üst menüdeki `✦ Hikmet Mührü` butonu.
  - Risale-i Nur Külliyatı'ndan seçilmiş derin hikmetler, kristal çan sesi (`playChime()`), tek tıkla panoya kopyalama ve doğrudan o eserin okuyucusunu açma.
- 🎵 **Entegre Ambiyans ve Ses Sentezi:**
  - Dış ses dosyası gerektirmeyen, doğrudan Web Audio API ile gerçek zamanlı sentezlenen derin lo-fi kütüphane uğultusu ve sayfa çevirme efektleri.
- 📂 **Kendi PDF Kitabını Ekleme (Kitaplığım):**
  - Sağ alttaki `+` butonu ile PDF dosyası yükleme ve kütüphanede saklama.

---

## 🚀 Başlangıç ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için:

```bash
# Python ile yerel sunucu başlatın:
python -m http.server 8080
```

Tarayıcınızda açın:
```
http://localhost:8080/
```

Veya Windows'ta doğrudan klasördeki `BASLAT.bat` dosyasına çift tıklayabilirsiniz.

---

## 🛠️ Teknolojiler

- **Vanilla HTML5 & CSS3** (Özel tipografi, derin cam efekti, antika parşömen teması)
- **Three.js (r128)** (WebGL 3D mimari koridor, dinamik ışıklar, 3D kitap açılışı)
- **Web Audio API** (Sıfır gecikmeli gerçek zamanlı ses sentezi)
- **PDF.js** (İstemci taraflı PDF sayfa ayrıştırma)

---

&copy; 2026 Nur Koridoru — Sesli Risale-i Nur Deneyimi
