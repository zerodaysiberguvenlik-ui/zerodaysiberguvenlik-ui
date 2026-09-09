# -*- coding: utf-8 -*-
"""
D: diskindeki Risale-i Nur MP3 ses külliyatını (684 dosya) tarayıp
kütüphaneye hazır hale getiren katalog üretici.
"""
import os
import json
import re

D_ROOT = "D:/"

BOOK_MAP = {
    "sozler-mono": "S\u00f6zler",
    "lemalar-mono": "Lem'alar",
    "sualar-mono": "\u015eualar",
    "asamusa-mono": "Asa-y\u0131 Musa",
    "barla-mono": "Barla L\u00e2hikas\u0131",
    "kastamonu-mono": "Kastamonu L\u00e2hikas\u0131",
    "emirdag1-mono": "Emirda\u011f L\u00e2hikas\u0131 1",
    "emirdag2-mono": "Emirda\u011f L\u00e2hikas\u0131 2",
    "tarihce-mono": "Tarih\u00e7e-i Hayat",
    "mesnevi-mono": "Mesnevi-i Nuriye",
    "isarat-mono": "\u0130\u015farat\u00fc'l-\u0130'caz",
    "sikke-mono": "Sikke-i Tasdik-i Gayb\u00ee",
    "ikm-mono": "\u0130man ve K\u00fcf\u00fcr Muvazeneleri"
}

def clean_title(f, folder_key, idx):
    name = f.replace(".mp3", "")
    # Prefixleri kaldır (sozler-p001-, lem-p01-, asa-p01-, vb.)
    name = re.sub(r'^[a-zA-Z0-9]+-p\d+-', '', name)
    # Köseoğlu / son ekleri kaldır
    name = re.sub(r'-koseoglu$', '', name, flags=re.IGNORECASE)

    # 1l -> 1. Lem'a
    m_lem = re.match(r'^(\d+)l$', name)
    if m_lem:
        return f"{m_lem.group(1)}. Lem'a"

    # Sayfa aralığı kontrolü (s1-9-takdim vb.)
    m_s = re.match(r'^s(\d+)-(\d+)(.*)$', name)
    if m_s:
        rest = m_s.group(3).strip(' -_')
        if rest:
            rest_clean = rest.replace('-', ' ').replace('_', ' ').title()
            return f"{rest_clean} (s. {m_s.group(1)}-{m_s.group(2)})"
        return f"Mektuplar (s. {m_s.group(1)}-{m_s.group(2)})"

    if not name or name.strip() == "":
        return f"{idx + 1}. B\u00f6l\u00fcm"

    # Kelimeleri ayrıştır
    parts = name.replace('-', ' ').replace('_', ' ').replace('.', '. ').split()
    title = ' '.join(parts).title()

    # Türkçe Risale terim düzeltmeleri
    replacements = [
        ("Soz", "S\u00f6z"),
        ("Sua", "\u015eua"),
        ("Lemanin", "Lem'an\u0131n"),
        ("Lema", "Lem'a"),
        ("Onsoz", "\u00d6ns\u00f6z"),
        ("Giris", "Giri\u015f"),
        ("Hayati", "Hayat\u0131"),
        ("Kuran", "Kur'an"),
        ("Bediuzzaman", "Bed\u00ee\u00fczzaman"),
        ("Rn", "Risale-i Nur"),
        ("Sefkat", "\u015eefkat"),
        ("Fikralar", "F\u0131kralar"),
        ("Muhim", "M\u00fchim"),
        ("Ibadet", "\u0130badet"),
        ("Namaz", "Namaz"),
        ("Hakikat", "Hakikat"),
        ("Nuriye", "Nuriye"),
        ("Icaz", "\u0130'caz"),
        ("Isarat", "\u0130\u015farat"),
        ("Ittihad", "\u0130ttihad"),
        ("Uhuvvet", "Uhuvvet"),
        ("Ihlas", "\u0130hl\u00e2s"),
        ("Hasir", "Ha\u015fir"),
        ("Kader", "Kader"),
        ("Mucizat", "Muciz\u00e2t"),
        ("Ahmediye", "Ahmediye"),
        ("Kuraniye", "Kur'\u00e2niye")
    ]
    for old, new in replacements:
        title = title.replace(old, new)

    return title.strip()

def build():
    catalog = []
    total_found = 0

    for folder_key, book_title in BOOK_MAP.items():
        folder_path = os.path.join(D_ROOT, folder_key)
        if not os.path.exists(folder_path):
            continue

        file_list = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.lower().endswith(".mp3"):
                    full_p = os.path.join(root, file)
                    rel_to_d = os.path.relpath(full_p, D_ROOT).replace("\\", "/")
                    file_list.append((file, full_p, rel_to_d))

        # Dosya adına göre sırala
        file_list.sort(key=lambda x: x[0])

        for idx, (f, full_path, rel_to_d) in enumerate(file_list):
            size_mb = f"{os.path.getsize(full_path) / (1024 * 1024):.1f} MB"
            sub_title = clean_title(f, folder_key, idx)
            track_id = f"d_{folder_key}_{f.replace('.mp3', '')}"
            catalog.append({
                "id": track_id,
                "bookTitle": book_title,
                "subTitle": sub_title,
                "fileName": f,
                "audioUrl": f"audio_depo/{rel_to_d}",
                "duration": size_mb,
                "isServerTrack": True
            })
            total_found += 1

    with open("audio_catalog.json", "w", encoding="utf-8") as out:
        json.dump(catalog, out, ensure_ascii=False, indent=2)

    print(f"Toplam {total_found} sesli bolum audio_catalog.json dosyasina kaydedildi.")

if __name__ == "__main__":
    build()
