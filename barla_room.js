/* ============================================================
   NUR KORİDORU - 3D BÜYÜK BARLA ÇALIŞMA ODASI
   Dört Duvarda Ahşap Raflar & Sesli Risale Kütüphanesi Motoru
   ============================================================ */

(function(){
  "use strict";

  // Durum Değişkenleri
  var isRoomOpen = false;
  var scene, camera, renderer;
  var animFrameId = null;
  var containerEl, canvasEl;
  var raycaster, mouse;
  var isDragging = false;
  var prevMouseX = 0, prevMouseY = 0;
  var lon = -90, lat = 0; // Başlangıçta masaya (Kuzey, Z=-) bakış
  var targetLon = -90, targetLat = 0;
  var fov = 60;

  // Kamera Presetleri
  var cameraPresets = {
    desk: { lon: -90, lat: -4, distance: 3.8, targetY: 1.45 },
    west: { lon: 180, lat: 5, distance: 4.2, targetY: 1.8 },
    east: { lon: 0, lat: 5, distance: 4.2, targetY: 1.8 },
    south: { lon: 90, lat: 2, distance: 4.2, targetY: 1.8 },
    overview: { lon: -125, lat: 18, distance: 6.0, targetY: 1.6 }
  };
  var currentPreset = "desk";
  var isTransitioningCamera = false;
  var camTransProgress = 1.0;

  // 3D Nesneler
  var roomGroup = null;
  var shelfBooks = [];
  var hoveredBook = null;
  var selectedBook = null;
  var lampLight = null;
  var lampFlameMesh = null;
  var windowBeamMesh = null;

  // Üstad Canlı Portre Tuvali ve Dokusu
  var ustadMesh = null;
  var ustadCanvas = null;
  var ustadCtx = null;
  var ustadTexture = null;
  var ustadImg = new Image();
  var ustadImgLoaded = false;
  ustadImg.src = "ustad_seated_clean.png?v=4.5";
  ustadImg.onload = function(){
    ustadImgLoaded = true;
  };

  // Sesli Risale Eserleri ve Duvar Eşleştirmesi (YALNIZCA SESLİ ESERLER)
  var AUDIO_WALLS_DATA = [
    {
      wall: "north", // Ön Duvar (Masa yanı)
      name: "Ön Duvar (Masa ve Mihrap)",
      bays: [
        {
          title: "Sözler",
          volumes: ["1. Cilt: 1-14. Söz", "2. Cilt: 15-24. Söz", "3. Cilt: 25. Söz (İ'caz)", "4. Cilt: 26-30. Söz", "5. Cilt: 31-33. Söz"],
          trackFilter: "Sözler",
          color: "#7A1620",
          desc: "İman Hakikatleri ve Kur'anî Bürhanlar (117 Sesli Bölüm)"
        },
        {
          title: "Mektubat",
          volumes: ["1. Cilt: 1-15. Mektup", "2. Cilt: 16-23. Mektup", "3. Cilt: 24-29. Mektup", "4. Cilt: Hakikat Çekirdekleri"],
          trackFilter: "Mektubat",
          color: "#1c3b2b",
          desc: "Tevhid, Sünnet ve İrşad Mektupları"
        }
      ]
    },
    {
      wall: "west", // Sol Duvar (Lem'alar & Lâhikalar)
      name: "Sol Duvar (Lem'alar & Lâhika Rafları)",
      bays: [
        {
          title: "Lem'alar",
          volumes: ["1. Cilt: 1-10. Lem'a", "2. Cilt: 11-16. Lem'a (Sünnet)", "3. Cilt: 17-25. Lem'a (Hastalar)", "4. Cilt: 26-30. Lem'a (İhlas)"],
          trackFilter: "Lem'alar",
          color: "#1a2c42",
          desc: "Nübüvvet Sünnetleri ve Hikmet Parıltıları (77 Sesli Bölüm)"
        },
        {
          title: "Barla Lâhikası",
          volumes: ["1. Cilt: Barla Mektupları", "2. Cilt: İntişar ve Hizmet"],
          trackFilter: "Barla Lâhikası",
          color: "#4a2a12",
          desc: "Nur'un İlk Telif Dönemi ve Sadık Talebeleri (40 Sesli Bölüm)"
        },
        {
          title: "Kastamonu Lâhikası",
          volumes: ["1. Cilt: Kastamonu Mektupları", "2. Cilt: İhlas ve Uhuvvet"],
          trackFilter: "Kastamonu Lâhikası",
          color: "#3a1d28",
          desc: "Hizmet Rehberi ve Manevi İstikamet (26 Sesli Bölüm)"
        },
        {
          title: "Emirdağ Lâhikası",
          volumes: ["1. Cilt: Emirdağ 1", "2. Cilt: Emirdağ 2 (Âlem-i İslam)"],
          trackFilter: "Emirdağ Lâhikası",
          color: "#28341b",
          desc: "Son Dönem Mektupları ve Vasiyetler (61 Sesli Bölüm)"
        }
      ]
    },
    {
      wall: "east", // Sağ Duvar (Güneşli Pencere Yanı: Şualar & Asa-yı Musa)
      name: "Sağ Duvar (Şualar & Asa-yı Musa)",
      bays: [
        {
          title: "Şualar",
          volumes: ["1. Cilt: 1-6. Şua", "2. Cilt: 7. Şua (Âyetü'l-Kübra)", "3. Cilt: 11. Şua (Meyve)", "4. Cilt: 13-15. Şua (Afyon)"],
          trackFilter: "Şualar",
          color: "#541620",
          desc: "Tevhid Bürhanları ve Âyetü'l-Kübra (101 Sesli Bölüm)"
        },
        {
          title: "Asa-yı Musa",
          volumes: ["1. Kısım: Meyve Risalesi", "2. Kısım: Hüccetü'l-Bâliğa"],
          trackFilter: "Asa-yı Musa",
          color: "#422812",
          desc: "İman Kurtarma Rehberi ve Gençlik Rehberi (47 Sesli Bölüm)"
        },
        {
          title: "İman ve Küfür Muvazeneleri",
          volumes: ["1. Cilt: Nur'un İlk Kapısı", "2. Cilt: Muvazeneler"],
          trackFilter: "İman ve Küfür Muvazeneleri",
          color: "#251829",
          desc: "İman ve Dalalet Mukayesesi (33 Sesli Bölüm)"
        }
      ]
    },
    {
      wall: "south", // Arka Duvar (Giriş Kapısı Yanı)
      name: "Arka Duvar (Tarihçe & Mesnevi Rafları)",
      bays: [
        {
          title: "Tarihçe-i Hayat",
          volumes: ["1. Cilt: İlk Hayatı & Barla", "2. Cilt: Eskişehir & Kastamonu", "3. Cilt: Denizli & Afyon", "4. Cilt: Son Yıllar & Tahliller"],
          trackFilter: "Tarihçe-i Hayat",
          color: "#46181f",
          desc: "Bediüzzaman'ın Hayatı ve Dava Mücadelesi (86 Sesli Bölüm)"
        },
        {
          title: "Mesnevi-i Nuriye",
          volumes: ["1. Cilt: Hubab & Habbe", "2. Cilt: Zühre & Şule", "3. Cilt: Katre & Şemme"],
          trackFilter: "Mesnevi-i Nuriye",
          color: "#182a3a",
          desc: "Arapça Fidanlık ve Kalbî Ma'rifetullah (27 Sesli Bölüm)"
        },
        {
          title: "İşaratü'l-İ'caz",
          volumes: ["1. Cilt: Fatiha Tefsiri", "2. Cilt: Bakara Tefsiri"],
          trackFilter: "İşaratü'l-İ'caz",
          color: "#2b2214",
          desc: "Harp Cephesinde Yazılan Kur'an Tefsiri (42 Sesli Bölüm)"
        },
        {
          title: "Sikke-i Tasdik-i Gaybî",
          volumes: ["1. Cilt: Gaybî İşaretler", "2. Cilt: Tasdik Mektupları"],
          trackFilter: "Sikke-i Tasdik-i Gaybî",
          color: "#381a24",
          desc: "Kur'an ve Hadis Gaybî İşaretleri (27 Sesli Bölüm)"
        }
      ]
    }
  ];

  /* ── 1. PROCEDURAL DOKU ÜRETİCİLERİ ───────────────────────── */
  var texCache = {};

  // Geleneksel Isparta / Barla El Dokuma Kilimi Dokusu
  function getCarpetTex(){
    if(texCache.carpet) return texCache.carpet;
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    var cx = c.getContext("2d");

    // Zemin kadife bordo
    cx.fillStyle = "#4a1017";
    cx.fillRect(0, 0, 1024, 1024);

    // Bordürler
    for(var b = 0; b < 4; b++){
      var inset = b * 32;
      cx.strokeStyle = b % 2 === 0 ? "#d4af37" : "#1f2d3d";
      cx.lineWidth = b % 2 === 0 ? 8 : 16;
      cx.strokeRect(inset, inset, 1024 - inset * 2, 1024 - inset * 2);
    }

    // Geleneksel geometrik mihrab & baklava motifi
    cx.fillStyle = "#6d1924";
    cx.fillRect(160, 160, 704, 704);

    cx.strokeStyle = "rgba(212, 175, 55, 0.75)";
    cx.lineWidth = 10;
    cx.beginPath();
    // Büyük merkezi baklava
    cx.moveTo(512, 220);
    cx.lineTo(780, 512);
    cx.lineTo(512, 804);
    cx.lineTo(244, 512);
    cx.closePath();
    cx.stroke();

    // İç madalyon
    cx.fillStyle = "#1e2a38";
    cx.fill();

    // Merkezi yıldız
    cx.fillStyle = "#d4af37";
    cx.beginPath();
    cx.arc(512, 512, 60, 0, Math.PI * 2);
    cx.fill();

    // Yün dokuma greni
    var id = cx.getImageData(0, 0, 1024, 1024);
    var d = id.data;
    for(var i = 0; i < d.length; i += 4){
      var noise = (Math.random() - 0.5) * 35;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise));
    }
    cx.putImageData(id, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    texCache.carpet = tex;
    return tex;
  }

  // Ahşap Zemin / Mertek Kiriş Dokusu
  function getWoodTex(colorBase, darkGrain){
    var k = colorBase + "_" + darkGrain;
    if(texCache[k]) return texCache[k];
    var c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    var cx = c.getContext("2d");

    cx.fillStyle = colorBase;
    cx.fillRect(0, 0, 512, 512);

    // Ahşap damarları
    cx.strokeStyle = darkGrain;
    for(var i = 0; i < 60; i++){
      cx.lineWidth = 1 + Math.random() * 3;
      cx.globalAlpha = 0.15 + Math.random() * 0.25;
      cx.beginPath();
      var y = i * (512 / 60);
      cx.moveTo(0, y);
      cx.bezierCurveTo(150, y + (Math.random()-0.5)*30, 350, y + (Math.random()-0.5)*30, 512, y);
      cx.stroke();
    }
    cx.globalAlpha = 1.0;

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    texCache[k] = tex;
    return tex;
  }

  // Hakiki Ciltli Sesli Risale Kitap Sırtı Dokusu (Gold Calligraphy)
  function getSpineTexture(title, volLabel, colorHex){
    var key = title + "_" + (volLabel || "");
    if(texCache[key]) return texCache[key];

    var c = document.createElement("canvas");
    c.width = 128; c.height = 512;
    var cx = c.getContext("2d");

    // Deri zemin rengi
    var grad = cx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "#0e0608");
    grad.addColorStop(0.3, colorHex || "#7a1620");
    grad.addColorStop(0.7, colorHex || "#7a1620");
    grad.addColorStop(1, "#0e0608");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 128, 512);

    // Altın bordür çizgileri
    cx.strokeStyle = "#ffd700";
    cx.lineWidth = 3;
    cx.strokeRect(8, 14, 112, 484);

    cx.lineWidth = 1.2;
    cx.strokeRect(12, 18, 104, 476);

    // Üst & Alt Şemse / Hilal motifi
    [32, 480].forEach(function(y){
      cx.fillStyle = "#ffd700";
      cx.beginPath();
      cx.arc(64, y, 9, 0, Math.PI * 2);
      cx.fill();
    });

    // Cilt başlığı (Dikey hat sanatı)
    cx.save();
    cx.translate(64, 256);
    cx.rotate(Math.PI / 2);
    cx.fillStyle = "#fff8db";
    cx.shadowColor = "#ffd700";
    cx.shadowBlur = 6;
    cx.textAlign = "center";
    cx.textBaseline = "middle";

    // Başlık boyutu
    var fontSize = title.length > 14 ? 26 : 32;
    cx.font = "bold " + fontSize + "px 'Amiri', 'Cinzel', serif";
    cx.fillText(title, 0, -4);

    if(volLabel){
      cx.font = "italic 16px 'Instrument Sans', sans-serif";
      cx.fillStyle = "#e0cf9b";
      cx.shadowBlur = 0;
      cx.fillText(volLabel, 0, 24);
    }
    cx.restore();

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    texCache[key] = tex;
    return tex;
  }

  /* ── 2. 3D BARLA ODASI İNŞASI ─────────────────────────────── */
  function buildBarlaRoom(){
    roomGroup = new THREE.Group();
    shelfBooks = [];

    var roomW = 12, roomD = 12, roomH = 4.2;

    // 1. Zemin (Ahşap Parke + Kilim)
    var floorTex = getWoodTex("#362313", "#1e1208");
    floorTex.repeat.set(8, 8);
    var floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.75,
      metalness: 0.05
    });
    var floorGeo = new THREE.PlaneGeometry(roomW, roomD);
    var floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // Kilim (Masanın ortasında serili)
    var carpetTex = getCarpetTex();
    var carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.88,
      metalness: 0.02
    });
    var carpetGeo = new THREE.PlaneGeometry(7.2, 7.2);
    var carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.015, -0.4);
    carpetMesh.receiveShadow = true;
    roomGroup.add(carpetMesh);

    // 2. Tavan ve Ahşap Mertek Kirişleri
    var ceilingTex = getWoodTex("#402a18", "#221308");
    ceilingTex.repeat.set(6, 6);
    var ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.85 });
    var ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = roomH;
    roomGroup.add(ceilingMesh);

    // 5 adet kalın ahşap tavan mertek kirişi
    var beamMat = new THREE.MeshStandardMaterial({ color: 0x2e190d, roughness: 0.8 });
    for(var bi = -2; bi <= 2; bi++){
      var beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.28, 0.32), beamMat);
      beam.position.set(0, roomH - 0.14, bi * 2.2);
      roomGroup.add(beam);
    }

    // 3. Duvarlar (Sıvalı Barla Taş/Kerpiç Dokusu)
    var wallMat = new THREE.MeshStandardMaterial({
      color: 0xdfd4be, // Sıcak kireç sıva
      roughness: 0.95,
      metalness: 0.0
    });

    // Kuzey Duvarı (Ön - Masa Duvarı)
    var northWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    northWall.position.set(0, roomH / 2, -roomD / 2);
    roomGroup.add(northWall);

    // Güney Duvarı (Arka - Kapı Duvarı)
    var southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    southWall.position.set(0, roomH / 2, roomD / 2);
    southWall.rotation.y = Math.PI;
    roomGroup.add(southWall);

    // Doğu Duvarı (Sağ - Pencere Duvarı)
    var eastWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    eastWall.position.set(roomW / 2, roomH / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    roomGroup.add(eastWall);

    // Batı Duvarı (Sol - Kitaplık Duvarı)
    var westWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    westWall.position.set(-roomW / 2, roomH / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    roomGroup.add(westWall);

    // Süpürgelikler ve Ahşap Kuşaklar
    var trimMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.7 });
    var baseTrimN = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 0.08), trimMat);
    baseTrimN.position.set(0, 0.11, -roomD / 2 + 0.04);
    roomGroup.add(baseTrimN);

    // 4. Doğu Duvarındaki Ahşap Kafesli Barla Penceresi
    buildBarlaWindow(roomW / 2 - 0.04, 2.1, 0);

    // 5. Güney Duvarındaki Ahşap Barla Kapısı
    buildBarlaDoor(0, 1.4, roomD / 2 - 0.04);

    // 6. DÖRT DUVARDA SESLİ RİSALE KÜTÜPHANE RAFLARI
    buildAllFourWallShelves(roomW, roomD);

    // 7. ÇALIŞMA MASASI, KANDİL VE CANLI ÜSTAD BEDİÜZZAMAN
    buildUstadDeskCenterpiece();

    scene.add(roomGroup);
  }

  // Ahşap Kafesli Barla Penceresi
  function buildBarlaWindow(wx, wy, wz){
    var winGroup = new THREE.Group();
    winGroup.position.set(wx, wy, wz);
    winGroup.rotation.y = -Math.PI / 2;

    var frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2112, roughness: 0.7 });
    var winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.14), frameMat);
    winGroup.add(winFrame);

    // Ahşap kafes şebekesi (Lattice)
    var latticeMat = new THREE.MeshStandardMaterial({
      color: 0x22130a,
      roughness: 0.8
    });
    for(var k = -5; k <= 5; k++){
      var barH = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 0.04), latticeMat);
      barH.position.set(0, k * 0.18, 0.02);
      winGroup.add(barH);

      var barV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.04), latticeMat);
      barV.position.set(k * 0.18, 0, 0.02);
      winGroup.add(barV);
    }

    // Pencereden giren parlak sabah ışığı (Güneş Işığı)
    var sunLight = new THREE.DirectionalLight(0xffe2a4, 1.6);
    sunLight.position.set(wx + 4, wy + 3, wz - 1);
    sunLight.target.position.set(0, 1, -2);
    scene.add(sunLight);
    scene.add(sunLight.target);

    roomGroup.add(winGroup);
  }

  // Barla Oda Kapısı
  function buildBarlaDoor(dx, dy, dz){
    var doorGroup = new THREE.Group();
    doorGroup.position.set(dx, dy, dz);

    var doorMat = new THREE.MeshStandardMaterial({ color: 0x381f10, roughness: 0.75 });
    var door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.08), doorMat);
    doorGroup.add(door);

    // Kemerli kapı pervazı
    var casingMat = new THREE.MeshStandardMaterial({ color: 0x2a160b, roughness: 0.8 });
    var casing = new THREE.Mesh(new THREE.BoxGeometry(1.85, 2.85, 0.12), casingMat);
    casing.position.z = -0.02;
    doorGroup.add(casing);

    // Pirinç kapı tokmağı
    var handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
    var handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), handleMat);
    handle.position.set(0.6, 0, -0.06);
    doorGroup.add(handle);

    roomGroup.add(doorGroup);
  }

  // Dört Duvardaki Sesli Kitaplık Rafları
  function buildAllFourWallShelves(roomW, roomD){
    AUDIO_WALLS_DATA.forEach(function(wallData){
      var wallName = wallData.wall;

      if(wallName === "north"){
        // Ön Duvar (Masanın solu ve sağı)
        buildShelfSection(-3.4, 0, -5.85, 2.6, 3, 0, wallData.bays.slice(0, 1)); // Sol (Sözler)
        buildShelfSection(3.4, 0, -5.85, 2.6, 3, 0, wallData.bays.slice(1, 2));  // Sağ (Mektubat)
      }
      else if(wallName === "west"){
        // Sol Duvar (Lem'alar & Lâhikalar boydan boya)
        buildShelfSection(-5.85, 0, -2.4, 2.6, 3, Math.PI / 2, wallData.bays.slice(0, 2));
        buildShelfSection(-5.85, 0, 2.4, 2.6, 3, Math.PI / 2, wallData.bays.slice(2, 4));
      }
      else if(wallName === "east"){
        // Sağ Duvar (Pencerenin iki yanı: Şualar, Asa-yı Musa)
        buildShelfSection(5.85, 0, -2.8, 2.2, 3, -Math.PI / 2, wallData.bays.slice(0, 2));
        buildShelfSection(5.85, 0, 2.8, 2.2, 3, -Math.PI / 2, wallData.bays.slice(2, 3));
      }
      else if(wallName === "south"){
        // Arka Duvar (Kapının iki yanı: Tarihçe, Mesnevi, İşarat, Sikke)
        buildShelfSection(-3.2, 0, 5.85, 2.5, 3, Math.PI, wallData.bays.slice(0, 2));
        buildShelfSection(3.2, 0, 5.85, 2.5, 3, Math.PI, wallData.bays.slice(2, 4));
      }
    });
  }

  // Belirli Bir Duvar Dilimine Ahşap Raf ve Sesli Kitapları Diz
  function buildShelfSection(x, y, z, width, tiers, rotY, bays){
    var shelfSection = new THREE.Group();
    shelfSection.position.set(x, y, z);
    shelfSection.rotation.y = rotY;

    var woodMat = new THREE.MeshStandardMaterial({ color: 0x331c0e, roughness: 0.72 });
    var tierH = 0.95;
    var depth = 0.42;

    // Yan dikmeler
    [-width/2, width/2].forEach(function(px){
      var upright = new THREE.Mesh(new THREE.BoxGeometry(0.08, tiers * tierH + 0.3, depth), woodMat);
      upright.position.set(px, (tiers * tierH + 0.3) / 2, 0);
      shelfSection.add(upright);
    });

    // Yatay ahşap raflar
    for(var t = 0; t <= tiers; t++){
      var plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), woodMat);
      plank.position.set(0, t * tierH + 0.03, 0);
      shelfSection.add(plank);
    }

    // Taç oyması (Üst kemer)
    var crown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.16, depth + 0.06), woodMat);
    crown.position.set(0, tiers * tierH + 0.35, 0);
    shelfSection.add(crown);

    // KİTAPLARI RAFLARA YERLEŞTİR
    if(bays && bays.length){
      var bayIdx = 0;
      for(var tier = 0; tier < tiers; tier++){
        var shelfY = tier * tierH + 0.06;
        var currentBay = bays[bayIdx % bays.length];
        bayIdx++;

        // Bu rafa kaç cilt dizilecek
        var vols = currentBay.volumes || [currentBay.title];
        var copies = Math.max(vols.length, 6);
        var bookW = (width * 0.85) / copies;

        for(var i = 0; i < copies; i++){
          var volLabel = vols[i % vols.length];
          var bw = Math.min(0.16, bookW * 0.92);
          var bh = 0.62 + (i % 3) * 0.05;
          var bd = 0.32;

          var bx = -width * 0.4 + i * (width * 0.8 / copies) + bw / 2;
          var by = shelfY + bh / 2;
          var bz = 0.04;

          var spineTex = getSpineTexture(currentBay.title, volLabel, currentBay.color);
          var spineMat = new THREE.MeshStandardMaterial({
            map: spineTex,
            roughness: 0.48,
            metalness: 0.12,
            emissive: new THREE.Color(0x000000)
          });
          var leatherMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentBay.color).multiplyScalar(0.7),
            roughness: 0.65
          });

          // [right, left, top, bottom, front, back]
          var materials = [leatherMat, leatherMat, leatherMat, leatherMat, spineMat, leatherMat];
          var bookMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), materials);

          bookMesh.position.set(bx, by, bz);

          // Raycast ve tıklama bilgileri
          bookMesh.userData = {
            isAudioShelfBook: true,
            title: currentBay.title,
            volLabel: volLabel,
            trackFilter: currentBay.trackFilter,
            desc: currentBay.desc,
            basePos: bookMesh.position.clone(),
            pullT: 0,
            spineMat: spineMat
          };

          shelfSection.add(bookMesh);
          shelfBooks.push(bookMesh);
        }
      }
    }

    roomGroup.add(shelfSection);
  }

  /* ── 3. ÇALIŞMA MASASI, KOLTUK, KANDİL VE OTURAN 3D ÜSTAD ───────── */
  function getOpenRisaleTexture(){
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    var ctx = c.getContext("2d");
    
    // Antik krem parşömen
    var bgGrad = ctx.createLinearGradient(0, 0, 1024, 0);
    bgGrad.addColorStop(0, "#e8dcbe");
    bgGrad.addColorStop(0.48, "#f6edd5");
    bgGrad.addColorStop(0.50, "#c4b595");
    bgGrad.addColorStop(0.52, "#f6edd5");
    bgGrad.addColorStop(1, "#e8dcbe");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Varaklı bordür
    [24, 536].forEach(function(ox){
      ctx.strokeStyle = "#c9a038";
      ctx.lineWidth = 4;
      ctx.strokeRect(ox, 24, 464, 464);
      ctx.strokeStyle = "#8a1c28";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + 8, 32, 448, 448);

      ctx.fillStyle = "#c9a038";
      ctx.font = "bold 16px serif";
      ctx.fillText("❖", ox + 14, 46);
      ctx.fillText("❖", ox + 450, 46);
      ctx.fillText("❖", ox + 14, 474);
      ctx.fillText("❖", ox + 450, 474);
    });

    // Besmele (Sağ sayfa)
    ctx.fillStyle = "#8a1c28";
    ctx.font = "bold 26px 'Amiri', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ", 768, 75);

    ctx.fillStyle = "#7a1620";
    ctx.font = "bold 20px 'Cinzel', serif";
    ctx.fillText("BİRİNCİ SÖZ", 768, 112);

    ctx.strokeStyle = "#c9a038";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(580, 126); ctx.lineTo(956, 126);
    ctx.stroke();

    var rightLines = [
      "Bismillah her hayrın başıdır. Biz dahi başta ona başlarız.",
      "Bilmeli ki ey nefsim, şu mübarek kelime İslâm nişanı olduğu gibi,",
      "bütün mevcudatın lisan-ı haliyle vird-i zebanıdır.",
      "Bismillah ne büyük tükenmez bir kuvvet, ne çok bitmez bir bereket",
      "olduğunu anlamak istersen, şu temsilî hikâyeciğe bak, dinle:",
      "Bedevî Arab çöllerinde seyahat eden adama gerektir ki,",
      "bir kabile reisinin ismini alsın ve himayesine girsin.",
      "Tâ şakilerin şerrinden kurtulup hâcatını tedarik edebilsin.",
      "Yoksa tek başıyla hadsiz düşman ve ihtiyacatına karşı perişan olur.",
      "İşte böyle bir seyahat için iki adam sahraya çıkıp giderler..."
    ];
    ctx.fillStyle = "#2c2217";
    ctx.font = "14px 'Amiri', Georgia, serif";
    rightLines.forEach(function(ln, idx){
      ctx.fillText(ln, 768, 155 + idx * 28);
    });

    // Sol Sayfa
    ctx.fillStyle = "#7a1620";
    ctx.font = "bold 18px 'Cinzel', serif";
    ctx.fillText("RİSALE-İ NUR KÜLLİYATI", 256, 75);
    ctx.strokeStyle = "#c9a038";
    ctx.beginPath();
    ctx.moveTo(68, 90); ctx.lineTo(444, 90);
    ctx.stroke();

    var leftLines = [
      "İşte ey mağrur nefsim! Sen o seyyahsın. Şu dünya ise bir çöldür.",
      "Aczin ve fakrın hadsizdir. Düşmanın, hacatın nihayetsizdir.",
      "Madem öyledir; şu sahranın Mâlik-i Ebedîsi ve Hâkim-i Ezelîsinin",
      "ismini al. Tâ bütün kâinatın dilenciliğinden ve her hâdisatın",
      "karşısında titremekten kurtulasın.",
      "Evet, bu kelime öyle mübarek bir definedir ki: Senin nihayetsiz",
      "aczin ve fakrın, seni nihayetsiz kudret ve rahmete raptedip",
      "Kadir-i Rahîm'in dergâhında aczi, fakrı en makbul bir şefaatçi yapar.",
      "Evet, bu kelime ile hareket eden o adama benzer ki,",
      "askere kaydolur, devlet namına hareket eder.",
      "Hiçbir kimseden pervası kalmaz. Kanun namına, devlet namına der,",
      "her işi biter, her şeye karşı mukavemet eder..."
    ];
    ctx.fillStyle = "#2c2217";
    ctx.font = "14px 'Amiri', Georgia, serif";
    leftLines.forEach(function(ln, idx){
      ctx.fillText(ln, 256, 120 + idx * 28);
    });

    ctx.fillStyle = "#8a6b28";
    ctx.font = "12px serif";
    ctx.fillText("• 1 •", 256, 470);
    ctx.fillText("• 2 •", 768, 470);

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function buildUstadDeskCenterpiece(){
    var deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, -3.75); // Kuzey duvarının önü

    var walnutMat = new THREE.MeshStandardMaterial({ color: 0x361f12, roughness: 0.55 });
    var darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x24140b, roughness: 0.65 });

    // 1. Antik Çalışma Masası Tablası
    var tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 1.45), walnutMat);
    tableTop.position.set(0, 0.88, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    deskGroup.add(tableTop);

    // Masa Kenar Profili
    var tableTrim = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.04, 1.49), darkWoodMat);
    tableTrim.position.set(0, 0.84, 0);
    deskGroup.add(tableTrim);

    // Masa Bacakları (4 Adet torna bacak)
    [[-1.38, -0.58], [1.38, -0.58], [-1.38, 0.58], [1.38, 0.58]].forEach(function(pos){
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.88, 12), walnutMat);
      leg.position.set(pos[0], 0.44, pos[1]);
      leg.castShadow = true;
      deskGroup.add(leg);
    });

    // 2. Antik Çalışma Koltuğu (Üstad'ın oturduğu gerçek 3D ahşap koltuk)
    var chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -0.52);

    var chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.95), darkWoodMat);
    chairSeat.position.set(0, 0.54, 0);
    chairGroup.add(chairSeat);

    var velvetMat = new THREE.MeshStandardMaterial({ color: 0x4a121a, roughness: 0.85 });
    var cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.82), velvetMat);
    cushion.position.set(0, 0.60, 0);
    chairGroup.add(cushion);

    [[-0.5, -0.38], [0.5, -0.38], [-0.5, 0.38], [0.5, 0.38]].forEach(function(pos){
      var cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.54, 8), darkWoodMat);
      cLeg.position.set(pos[0], 0.27, pos[1]);
      chairGroup.add(cLeg);
    });

    [-0.52, 0.52].forEach(function(px){
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), darkWoodMat);
      post.position.set(px, 1.25, -0.4);
      chairGroup.add(post);

      var finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), darkWoodMat);
      finial.position.set(px, 1.94, -0.4);
      chairGroup.add(finial);
    });

    var backTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.06), darkWoodMat);
    backTop.position.set(0, 1.84, -0.4);
    chairGroup.add(backTop);

    var backCushion = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.9, 0.04), velvetMat);
    backCushion.position.set(0, 1.28, -0.39);
    chairGroup.add(backCushion);

    [-0.56, 0.56].forEach(function(ax){
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.75), darkWoodMat);
      arm.position.set(ax, 0.86, -0.02);
      chairGroup.add(arm);

      var armSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), darkWoodMat);
      armSupport.position.set(ax, 0.70, 0.26);
      chairGroup.add(armSupport);
    });

    deskGroup.add(chairGroup);

    // 3. Masadaki Açık Risale-i Nur Cildi (3D Rahle & Hat Yazılı Sayfalar)
    var rahleGroup = new THREE.Group();
    rahleGroup.position.set(0, 0.92, 0.22);
    rahleGroup.rotation.x = -0.15;

    var rahleBase = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.03, 0.65), darkWoodMat);
    rahleGroup.add(rahleBase);

    var openBookMat = new THREE.MeshStandardMaterial({
      map: getOpenRisaleTexture(),
      roughness: 0.75,
      metalness: 0.02
    });
    var pagesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.58), openBookMat);
    pagesMesh.position.set(0, 0.035, 0);
    rahleGroup.add(pagesMesh);

    var ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4 });
    var ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.62), ribbonMat);
    ribbon.position.set(0, 0.06, 0.03);
    rahleGroup.add(ribbon);

    deskGroup.add(rahleGroup);

    // 4. Masadaki Pirinç Kandil / Gaz Lambası
    var brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    var lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 16), brassMat);
    lampBase.position.set(-1.05, 1.03, 0.25);
    deskGroup.add(lampBase);

    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      transmission: 0.9
    });
    var lampChimney = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 16), glassMat);
    lampChimney.position.set(-1.05, 1.25, 0.25);
    deskGroup.add(lampChimney);

    // Kandil alevi ışığı (PointLight)
    lampLight = new THREE.PointLight(0xff9922, 2.2, 7.5, 1.4);
    lampLight.position.set(-1.05, 1.22, 0.25);
    deskGroup.add(lampLight);

    var flameMat = new THREE.MeshBasicMaterial({ color: 0xffe680 });
    lampFlameMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), flameMat);
    lampFlameMesh.position.set(-1.05, 1.22, 0.25);
    deskGroup.add(lampFlameMesh);

    // 5. 3D OTURAN ÜSTAD BEDİÜZZAMAN FİGÜRÜ (Şeffaf / Saydam, Arka Resimsiz)
    ustadCanvas = document.createElement("canvas");
    ustadCanvas.width = 896;
    ustadCanvas.height = 1200;
    ustadCtx = ustadCanvas.getContext("2d");

    ustadTexture = new THREE.CanvasTexture(ustadCanvas);
    ustadTexture.anisotropy = 8;

    var ustadMat = new THREE.MeshStandardMaterial({
      map: ustadTexture,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    var ustadGeo = new THREE.PlaneGeometry(1.65, 2.20);
    ustadMesh = new THREE.Mesh(ustadGeo, ustadMat);
    // Üstad masanın arkasındaki koltuğa oturur, elleri masa tablasının üzerinde durur
    ustadMesh.position.set(0, 1.62, -0.36);
    deskGroup.add(ustadMesh);

    roomGroup.add(deskGroup);
  }

  /* ── 4. CANLI ÜSTAD RENDER DÖNGÜSÜ (Lip-Sync & Kandil) ─────── */
  function updateUstadCanvasFrame(){
    if(!ustadCtx || !ustadImgLoaded) return;

    var cw = ustadCanvas.width;
    var ch = ustadCanvas.height;

    var mouthOpen = window.__liveMouthOpen || 0;
    var isBlinking = window.__liveIsBlinking || false;
    var blinkProgress = window.__liveBlinkProgress || 0;
    var headNod = window.__liveHeadNod || 0;

    var now = Date.now();
    var breathY = Math.sin(now * 0.0025) * 1.5;
    var nodY = headNod * 2.0;

    ustadCtx.clearRect(0, 0, cw, ch);
    ustadCtx.drawImage(ustadImg, 0, breathY + nodY, cw, ch);

    // Dudak Senkronizasyonu (ustad_seated_clean.png: ağız merkezi x=525, y=482)
    if(mouthOpen > 0.015){
      var drop = mouthOpen * 11.0;

      // Ağız içi karanlık boşluğu
      ustadCtx.save();
      ustadCtx.beginPath();
      ustadCtx.ellipse(525, 482 + drop * 0.40 + breathY + nodY, 22, Math.max(1.5, drop * 0.75), 0, 0, Math.PI * 2);
      ustadCtx.fillStyle = "#140808";
      ustadCtx.fill();
      ustadCtx.restore();

      // Alt dudak ve bıyık altı / çene dokusu
      var sx = 475, sy = 482, sw = 100, sh = 55;
      var dx = sx, dy = sy + drop + breathY + nodY, dw = sw, dh = sh;
      ustadCtx.save();
      ustadCtx.beginPath();
      ustadCtx.ellipse(dx + dw / 2, dy + dh * 0.45, dw * 0.52, dh * 0.50, 0, 0, Math.PI * 2);
      ustadCtx.clip();
      ustadCtx.drawImage(ustadImg, sx, sy, sw, sh, dx, dy, dw, dh);
      ustadCtx.restore();
    }

    ustadTexture.needsUpdate = true;
  }

  /* ── 5. KAMERA & ORBIT ETKİLEŞİMİ ──────────────────────────── */
  function updateCameraTarget(){
    if(isTransitioningCamera){
      camTransProgress += 0.035;
      if(camTransProgress >= 1.0){
        camTransProgress = 1.0;
        isTransitioningCamera = false;
      }
    }

    // Yumuşatılmış açı geçişi
    lon += (targetLon - lon) * 0.08;
    lat += (targetLat - lat) * 0.08;
    lat = Math.max(-45, Math.min(45, lat));

    var phi = THREE.MathUtils.degToRad(90 - lat);
    var theta = THREE.MathUtils.degToRad(lon);

    var cx = 0, cy = 1.6, cz = -0.5; // Oda merkezi göz hizası
    var lookDist = 5.0;

    var targetX = cx + lookDist * Math.sin(phi) * Math.cos(theta);
    var targetY = cy + lookDist * Math.cos(phi);
    var targetZ = cz + lookDist * Math.sin(phi) * Math.sin(theta);

    camera.position.set(cx, cy, cz);
    camera.lookAt(targetX, targetY, targetZ);
  }

  function setCameraPreset(presetKey){
    var p = cameraPresets[presetKey];
    if(!p) return;
    currentPreset = presetKey;
    targetLon = p.lon;
    targetLat = p.lat;
    isTransitioningCamera = true;
    camTransProgress = 0;

    // Aktif buton görselini güncelle
    var btns = document.querySelectorAll(".br-preset-btn");
    btns.forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-preset") === presetKey);
    });
  }

  /* ── 6. KİTAP RAYCAST VE RAFTAN SEÇME ─────────────────────── */
  function handlePointerMove(e){
    if(!isRoomOpen || !renderer) return;

    var rect = canvasEl.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Sürükleme ile 360° bakış
    if(isDragging){
      var dx = e.clientX - prevMouseX;
      var dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetLon += dx * 0.22;
      targetLat += dy * 0.18;
      return;
    }

    // Raftaki kitapları tespit et
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(shelfBooks);

    if(hits.length > 0){
      var hitObj = hits[0].object;
      if(hitObj !== hoveredBook){
        resetHoveredBook();
        hoveredBook = hitObj;
        canvasEl.style.cursor = "pointer";
      }
      showShelfBookTooltip(hoveredBook, e.clientX, e.clientY);
    } else {
      if(hoveredBook){
        resetHoveredBook();
      }
      hideShelfBookTooltip();
    }
  }

  function resetHoveredBook(){
    if(hoveredBook && hoveredBook.userData){
      if(hoveredBook !== selectedBook){
        hoveredBook.userData.spineMat.emissive.setHex(0x000000);
      }
      hoveredBook = null;
    }
    if(canvasEl) canvasEl.style.cursor = "default";
  }

  function showShelfBookTooltip(book, cx, cy){
    var tip = document.getElementById("barlaShelfTooltip");
    if(!tip || !book || !book.userData) return;

    var u = book.userData;
    var titleEl = document.getElementById("bstTitle");
    var subEl = document.getElementById("bstSub");
    var hintEl = document.getElementById("bstHint");

    if(titleEl) titleEl.textContent = u.title;
    if(subEl) subEl.textContent = (u.volLabel ? u.volLabel + " · " : "") + (u.desc || "Sesli Eser");
    if(hintEl) hintEl.textContent = "✦ Raftan Seç & Dinle ↵";

    tip.style.left = cx + "px";
    tip.style.top = (cy - 16) + "px";
    tip.classList.add("active");
  }

  function hideShelfBookTooltip(){
    var tip = document.getElementById("barlaShelfTooltip");
    if(tip) tip.classList.remove("active");
  }

  // Raftaki Kitaba Tıklama Olayı (Bölümleri Aç ve Çal)
  function handlePointerClick(e){
    if(!isRoomOpen || isDragging) return;

    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(shelfBooks);

    if(hits.length > 0){
      var book = hits[0].object;
      onShelfBookSelected(book);
    }
  }

  function onShelfBookSelected(book){
    if(!book || !book.userData) return;
    selectedBook = book;
    var u = book.userData;

    // Raftan öne fırlama animasyonu
    book.userData.pullT = 1.0;
    book.userData.spineMat.emissive.setHex(0xd4af37);

    // Sağ taraftaki bölüm çekmecesini bu kitaba göre doldur ve aç
    openShelfChapterDrawer(u.title, u.trackFilter);

    // İlk parçayı çalmaya başla ve kamerayı masaya/Üstad'a yönlendir
    playFirstTrackOfBook(u.trackFilter || u.title);

    // Bildirim
    if(typeof showToast === "function"){
      showToast("📖 " + u.title + " raftan alındı. Sesli okuma başlıyor...");
    }
  }

  function getAvailableTracks(){
    if(window.TalkingPortrait && window.TalkingPortrait.getPlaylist){
      var p = window.TalkingPortrait.getPlaylist();
      if(p && p.length) return p;
    }
    if(window.DEFAULT_AUDIO_CATALOG && window.DEFAULT_AUDIO_CATALOG.length){
      return window.DEFAULT_AUDIO_CATALOG;
    }
    if(window.nurPlaylist && window.nurPlaylist.length){
      return window.nurPlaylist;
    }
    if(window.__AUDIO_CATALOG && window.__AUDIO_CATALOG.length){
      return window.__AUDIO_CATALOG;
    }
    return [];
  }

  function playTrackInBarlaRoom(track){
    if(!track) return;
    if(window.TalkingPortrait && window.TalkingPortrait.playTrack){
      window.TalkingPortrait.playTrack(track);
    }
    updateBarlaPlayerUI(track);
    setCameraPreset("desk");
  }

  function updateBarlaPlayerUI(track){
    if(!track) return;
    var bTag = document.getElementById("brpBookTag");
    var tTitle = document.getElementById("brpTrackTitle");
    if(bTag) bTag.textContent = "📖 " + (track.bookTitle || "Risale-i Nur");
    if(tTitle) tTitle.textContent = track.subTitle || track.title || "Sesli Risale";

    var playBtn = document.getElementById("brpPlayBtn");
    if(playBtn){
      playBtn.innerHTML = "<span>⏸</span> Duraklat";
      playBtn.classList.add("playing");
    }
  }

  // Bu Eserin Ses Dosyalarını Çekmecede Göster
  function openShelfChapterDrawer(bookTitle, trackFilter){
    var drawer = document.getElementById("barlaShelfDrawer");
    var drawerTitle = document.getElementById("bsdTitle");
    var drawerList = document.getElementById("bsdList");

    if(!drawer || !drawerList) return;

    var allTracks = getAvailableTracks();

    function normalizeStr(str){
      return (str || "").toLowerCase()
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/['’`^]/g, "");
    }

    var isAll = !trackFilter || bookTitle === "Tüm Külliyat" || trackFilter === "";
    var qFilter = normalizeStr(trackFilter || bookTitle || "");
    var matchedTracks = allTracks.filter(function(t){
      if(isAll) return true;
      var bt = normalizeStr(t.bookTitle || "");
      return bt.includes(qFilter) || qFilter.includes(bt);
    });

    if(drawerTitle){
      drawerTitle.textContent = "📚 " + (isAll ? "Tüm Külliyat" : bookTitle) + " (" + matchedTracks.length + " Bölüm)";
    }
    drawerList.innerHTML = "";

    if(matchedTracks.length === 0){
      drawerList.innerHTML = "<div class='bsd-empty'>Bu esere ait ses kaydı bulunamadı.</div>";
    } else {
      matchedTracks.forEach(function(track, idx){
        var item = document.createElement("div");
        item.className = "bsd-item";
        item.innerHTML = 
          "<button type='button' class='bsd-play-icon'>▶</button>" +
          "<div class='bsd-meta'>" +
            "<div class='bsd-name'>" + (track.subTitle || track.title || ("Bölüm " + (idx + 1))) + "</div>" +
            "<div class='bsd-dur'>" + (track.bookTitle ? "📖 " + track.bookTitle + " &bull; " : "") + (track.duration || "Sesli Kayıt") + "</div>" +
          "</div>";

        item.addEventListener("click", function(){
          playTrackInBarlaRoom(track);
        });

        drawerList.appendChild(item);
      });
    }

    drawer.classList.add("open");
  }

  function playFirstTrackOfBook(bookTitle){
    var allTracks = getAvailableTracks();
    var q = (bookTitle || "").toLowerCase();
    var found = allTracks.find(function(t){
      return (t.bookTitle || "").toLowerCase().includes(q);
    });

    if(found){
      playTrackInBarlaRoom(found);
    }
  }

  /* ── 7. ANİMASYON & THREE.JS RENDER DÖNGÜSÜ ────────────────── */
  function animateBarlaRoom(){
    if(!isRoomOpen) return;

    // 1. Kamera hedef açısına yumuşak yaklaşım
    updateCameraTarget();

    // 2. Kitapların raftan öne çekilme animasyonu (pull-out)
    shelfBooks.forEach(function(b){
      var u = b.userData;
      if(u && u.basePos){
        var targetOffset = (b === hoveredBook || b === selectedBook) ? 0.16 : 0;
        u.pullT += (targetOffset - u.pullT) * 0.15;
        b.position.z = u.basePos.z + u.pullT;
      }
    });

    // 3. Masadaki Kandil Işığı ve Alevi Titreşimi
    if(lampLight){
      var now = Date.now();
      var flk = Math.sin(now * 0.009) * 0.18 + Math.sin(now * 0.021) * 0.08 + (Math.random() - 0.5) * 0.04;
      lampLight.intensity = 1.7 + flk;
      if(lampFlameMesh){
        lampFlameMesh.scale.set(1 + flk * 0.4, 1 + flk * 0.6, 1 + flk * 0.4);
      }
    }

    // 4. Masadaki Canlı Üstad Tuvalini Güncelle
    updateUstadCanvasFrame();

    // 5. Barla Ses Oynatıcı Çubuğu Canlı Senkronizasyonu
    var audioEl = (window.TalkingPortrait && window.TalkingPortrait.getAudioElement) ? 
                  window.TalkingPortrait.getAudioElement() : document.getElementById("risaleAudioSource");
    if(audioEl && !audioEl.paused){
      var cur = audioEl.currentTime || 0;
      var tot = audioEl.duration || 0;
      var fillEl = document.getElementById("brpProgressFill");
      var curTimeEl = document.getElementById("brpCurrentTime");
      var totTimeEl = document.getElementById("brpTotalTime");
      if(fillEl && tot > 0){
        fillEl.style.width = (cur / tot * 100) + "%";
      }
      function fmt(sec){
        if(isNaN(sec) || !isFinite(sec)) return "00:00";
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
      }
      if(curTimeEl) curTimeEl.textContent = fmt(cur);
      if(totTimeEl && tot > 0) totTimeEl.textContent = fmt(tot);

      var playBtn = document.getElementById("brpPlayBtn");
      if(playBtn && !playBtn.classList.contains("playing")){
        playBtn.innerHTML = "<span>⏸</span> Duraklat";
        playBtn.classList.add("playing");
      }
    } else {
      var playBtn = document.getElementById("brpPlayBtn");
      if(playBtn && playBtn.classList.contains("playing")){
        playBtn.innerHTML = "<span>▶</span> Dinle";
        playBtn.classList.remove("playing");
      }
    }

    // 6. Render
    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(animateBarlaRoom);
  }

  /* ── 8. ODAYA GİRİŞ & ÇIKIŞ YÖNETİMİ ──────────────────────── */
  function openBarlaRoom(){
    if(isRoomOpen) return;
    isRoomOpen = true;

    containerEl = document.getElementById("barlaRoomContainer");
    if(containerEl){
      containerEl.classList.add("open");
    }

    initThreeScene();
    setCameraPreset("desk");
    animateBarlaRoom();

    // Arka plandaki koridor animasyonunu duraklat (performans tasarrufu)
    window.__isBarlaRoomActive = true;
  }

  function closeBarlaRoom(){
    if(!isRoomOpen) return;
    isRoomOpen = false;

    if(animFrameId) cancelAnimationFrame(animFrameId);

    containerEl = document.getElementById("barlaRoomContainer");
    if(containerEl){
      containerEl.classList.remove("open");
    }

    var drawer = document.getElementById("barlaShelfDrawer");
    if(drawer) drawer.classList.remove("open");

    hideShelfBookTooltip();
    window.__isBarlaRoomActive = false;
  }

  /* ── 9. THREE.JS SAHNE BAŞLATMA ───────────────────────────── */
  function initThreeScene(){
    canvasEl = document.getElementById("barlaRoomCanvas");
    if(!canvasEl) return;

    var width = window.innerWidth;
    var height = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0906);
    scene.fog = new THREE.FogExp2(0x0e0906, 0.035);

    camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 50);
    camera.position.set(0, 1.6, -0.5);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Ortam Işığı
    var ambient = new THREE.AmbientLight(0xfff0dd, 0.65);
    scene.add(ambient);

    // Duvar aydınlatmaları (Rafları ve ciltleri net okumak için)
    var fillNorth = new THREE.PointLight(0xffdfaa, 0.9, 8);
    fillNorth.position.set(0, 2.5, -4);
    scene.add(fillNorth);

    var fillWest = new THREE.PointLight(0xffdfaa, 0.8, 8);
    fillWest.position.set(-4, 2.5, 0);
    scene.add(fillWest);

    var fillEast = new THREE.PointLight(0xffdfaa, 0.8, 8);
    fillEast.position.set(4, 2.5, 0);
    scene.add(fillEast);

    var fillSouth = new THREE.PointLight(0xffdfaa, 0.7, 8);
    fillSouth.position.set(0, 2.5, 4);
    scene.add(fillSouth);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Odayı ve Dört Duvarı İnşa Et
    buildBarlaRoom();

    // Etkileşim Dinleyicileri
    window.addEventListener("resize", onWindowResize);

    canvasEl.addEventListener("mousedown", function(e){
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener("mouseup", function(){
      isDragging = false;
    });

    canvasEl.addEventListener("mousemove", handlePointerMove);
    canvasEl.addEventListener("click", handlePointerClick);
  }

  function onWindowResize(){
    if(!renderer || !camera || !isRoomOpen) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ── 10. DOM ELEMANLARI & KONSOL BAĞLANTISI ────────────────── */
  function initDOMBindings(){
    // Preset Butonları
    var presetBtns = document.querySelectorAll(".br-preset-btn");
    presetBtns.forEach(function(btn){
      btn.addEventListener("click", function(){
        var p = btn.getAttribute("data-preset");
        setCameraPreset(p);
      });
    });

    // Kapat Butonu
    var closeBtn = document.getElementById("barlaRoomCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closeBarlaRoom);

    // Çekmece Kapat Butonu
    var drawerCloseBtn = document.getElementById("bsdCloseBtn");
    if(drawerCloseBtn){
      drawerCloseBtn.addEventListener("click", function(){
        var drawer = document.getElementById("barlaShelfDrawer");
        if(drawer) drawer.classList.remove("open");
      });
    }

    // Çalma Listesi Çekmecesi Aç/Kapat
    var drawerToggleBtn = document.getElementById("barlaDrawerToggleBtn");
    if(drawerToggleBtn){
      drawerToggleBtn.addEventListener("click", function(){
        var drawer = document.getElementById("barlaShelfDrawer");
        if(drawer){
          drawer.classList.toggle("open");
          if(drawer.classList.contains("open")){
            openShelfChapterDrawer("Tüm Külliyat", "");
          }
        }
      });
    }

    // Çekmece İçi Arama Kutusu
    var searchInput = document.getElementById("bsdSearchInput");
    if(searchInput){
      function norm(s){
        return (s || "").toLowerCase()
          .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
          .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
          .replace(/['’`^]/g, "");
      }
      searchInput.addEventListener("input", function(){
        var q = norm(searchInput.value.trim());
        var drawerList = document.getElementById("bsdList");
        if(!drawerList) return;
        var items = drawerList.querySelectorAll(".bsd-item");
        items.forEach(function(it){
          var txt = norm(it.textContent);
          it.style.display = txt.includes(q) ? "flex" : "none";
        });
      });
    }

    // Header Butonunu Bağla
    var headerBtn = document.getElementById("headerAudioPortraitBtn");
    if(headerBtn){
      headerBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        openBarlaRoom();
      });
    }

    // Barla Player Çubuğu Düğmeleri
    var brpPlayBtn = document.getElementById("brpPlayBtn");
    if(brpPlayBtn){
      brpPlayBtn.addEventListener("click", function(){
        if(window.TalkingPortrait && window.TalkingPortrait.togglePlay){
          window.TalkingPortrait.togglePlay();
        }
      });
    }
    var brpPrevBtn = document.getElementById("brpPrevBtn");
    if(brpPrevBtn){
      brpPrevBtn.addEventListener("click", function(){
        var tracks = getAvailableTracks();
        var cur = (window.TalkingPortrait && window.TalkingPortrait.getCurrentTrack) ? window.TalkingPortrait.getCurrentTrack() : null;
        var idx = cur ? tracks.findIndex(function(t){ return t.id === cur.id; }) : -1;
        if(idx > 0){
          playTrackInBarlaRoom(tracks[idx - 1]);
        }
      });
    }
    var brpNextBtn = document.getElementById("brpNextBtn");
    if(brpNextBtn){
      brpNextBtn.addEventListener("click", function(){
        var tracks = getAvailableTracks();
        var cur = (window.TalkingPortrait && window.TalkingPortrait.getCurrentTrack) ? window.TalkingPortrait.getCurrentTrack() : null;
        var idx = cur ? tracks.findIndex(function(t){ return t.id === cur.id; }) : -1;
        if(idx >= 0 && idx < tracks.length - 1){
          playTrackInBarlaRoom(tracks[idx + 1]);
        }
      });
    }
    var brpTrack = document.getElementById("brpProgressTrack");
    if(brpTrack){
      brpTrack.addEventListener("click", function(e){
        var audioEl = (window.TalkingPortrait && window.TalkingPortrait.getAudioElement) ? 
                      window.TalkingPortrait.getAudioElement() : document.getElementById("risaleAudioSource");
        if(!audioEl || !audioEl.duration) return;
        var rect = brpTrack.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        audioEl.currentTime = Math.max(0, Math.min(1, pct)) * audioEl.duration;
      });
    }
    var brpVol = document.getElementById("brpVolSlider");
    if(brpVol){
      brpVol.addEventListener("input", function(){
        var audioEl = (window.TalkingPortrait && window.TalkingPortrait.getAudioElement) ? 
                      window.TalkingPortrait.getAudioElement() : document.getElementById("risaleAudioSource");
        if(audioEl){
          audioEl.volume = brpVol.value / 100;
        }
      });
    }
    var brpMute = document.getElementById("brpMuteBtn");
    if(brpMute){
      brpMute.addEventListener("click", function(){
        var audioEl = (window.TalkingPortrait && window.TalkingPortrait.getAudioElement) ? 
                      window.TalkingPortrait.getAudioElement() : document.getElementById("risaleAudioSource");
        if(audioEl){
          audioEl.muted = !audioEl.muted;
          brpMute.textContent = audioEl.muted ? "🔇" : "🔊";
        }
      });
    }
  }

  // Dışa Açılan API
  window.BarlaRoom = {
    open: openBarlaRoom,
    close: closeBarlaRoom,
    setPreset: setCameraPreset,
    isOpen: function(){ return isRoomOpen; }
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initDOMBindings);
  } else {
    initDOMBindings();
  }
})();
