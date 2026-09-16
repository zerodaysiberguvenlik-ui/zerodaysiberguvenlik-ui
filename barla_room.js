/* ============================================================
   NUR KORİDORU - 3D NOSTALJİK BARLA KIŞ ÇALIŞMA ODASI
   360° Gezilebilir Oda, Kuzine Soba, Canlı Ateş, Çaydanlık Buharı,
   Karlı Köy Penceresi, Rahle Başında Üstad & 684 Sesli Risale
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
  var lon = -80, lat = -4; // Başlangıçta rahle başındaki Üstad'a bakış
  var targetLon = -80, targetLat = -4;
  var fov = 52;
  var targetFov = 52;

  // Kamera Presetleri (360° İnceleme)
  var cameraPresets = {
    desk: { lon: -80, lat: -4, fov: 52 },       // Rahle & Üstad
    stove: { lon: -125, lat: -6, fov: 48 },     // Kuzine Soba, Çaydanlık & Kedi
    window: { lon: -56, lat: 4, fov: 46 },      // Karlı Köy Penceresi & Düşen Karlar
    west: { lon: 180, lat: 0, fov: 56 },       // Sol Duvar: Lem'alar & Lâhikalar
    east: { lon: 0, lat: 0, fov: 56 },         // Sağ Duvar: Şualar & Asa-yı Musa
    south: { lon: 90, lat: 0, fov: 56 },       // Arka Duvar: Tarihçe & Barla Kapısı
    overview: { lon: -88, lat: 8, fov: 68 }     // 360° Tüm Oda Kuşbakışı
  };
  var currentPreset = "desk";
  var isTransitioningCamera = false;
  var camTransProgress = 1.0;

  // 3D Sahne Nesneleri
  var roomGroup = null;
  var shelfBooks = [];
  var hoveredBook = null;
  var selectedBook = null;

  // Canlı Işık ve Parçacık Sistemleri
  var stoveLight = null;
  var ceilingLampLight = null;
  var steamParticles = null;
  var steamGeo = null;
  var steamData = [];
  var snowParticles = null;
  var snowGeo = null;
  var snowData = [];

  // Ana Kış Odası & Üstad Canlı Tuvali
  var roomCanvas = null;
  var roomCtx = null;
  var roomTexture = null;
  var roomMesh = null;
  var roomImg = new Image();
  var roomImgLoaded = false;
  roomImg.src = "barla_cozy_room.jpg?v=5.0";
  roomImg.onload = function(){
    roomImgLoaded = true;
  };

  // Sesli Risale Eserleri ve Duvar Eşleştirmesi (YALNIZCA SESLİ ESERLER)
  var AUDIO_WALLS_DATA = [
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
          volumes: ["1. Cilt: Emirdağ Mektupları", "2. Cilt: İttihad ve Uhuvvet"],
          trackFilter: "Emirdağ Lâhikası",
          color: "#283424",
          desc: "Alem-i İslam ve Nur Talebeleri Mektupları (25 Sesli Bölüm)"
        }
      ]
    },
    {
      wall: "east", // Sağ Duvar (Şualar, Asa-yı Musa, İman Hakikatleri)
      name: "Sağ Duvar (Şualar & Asa-yı Musa)",
      bays: [
        {
          title: "Şualar",
          volumes: ["1. Cilt: 1-6. Şua", "2. Cilt: 7. Şua (Ayetü'l-Kübra)", "3. Cilt: 9-11. Şua (Meyve)", "4. Cilt: 13-14. Şua (Afyon)"],
          trackFilter: "Şualar",
          color: "#1d3246",
          desc: "Tevhid Bürhanları ve Mahkeme Müdafaaları (133 Sesli Bölüm)"
        },
        {
          title: "Asa-yı Musa",
          volumes: ["1. Cilt: Meyve Risalesi", "2. Cilt: Hüccetü'l-Bâliğa"],
          trackFilter: "Asa-yı Musa",
          color: "#452e18",
          desc: "Gençlik Rehberi ve İman Delilleri (36 Sesli Bölüm)"
        },
        {
          title: "Gençlik Rehberi",
          volumes: ["1. Cilt: Gençlik Rehberi"],
          trackFilter: "Gençlik Rehberi",
          color: "#243c2c",
          desc: "Gençliğin İstikamet ve Ebedî Saadet Rehberi (23 Sesli Bölüm)"
        }
      ]
    },
    {
      wall: "south", // Arka Duvar (Kapı Yanı: Tarihçe, Mesnevi, İşarat, Sikke)
      name: "Arka Duvar (Tarihçe-i Hayat & Mesnevi-i Nuriye)",
      bays: [
        {
          title: "Tarihçe-i Hayat",
          volumes: ["1. Cilt: İlk Hayatı & Barla", "2. Cilt: Eskişehir & Kastamonu", "3. Cilt: Denizli & Afyon", "4. Cilt: Isparta & Son Dönem"],
          trackFilter: "Tarihçe-i Hayat",
          color: "#3e1c22",
          desc: "Bediüzzaman'ın İlmî ve Manevi Mücadele Tarihi (65 Sesli Bölüm)"
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

  /* ── 1. PROCEDURAL DOKULAR (Halı, Ahşap ve Hat Levhası) ───── */
  var texCache = {};

  // Geleneksel Anadolu Kırmızı Dokuma Halısı Dokusu
  function getAnatolianRugTex(){
    if(texCache.rug) return texCache.rug;
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    var cx = c.getContext("2d");

    // Zemin geleneksel kök boya kiremit/bordo
    cx.fillStyle = "#5c131a";
    cx.fillRect(0, 0, 1024, 1024);

    // Dış bordürler (Altın & lacivert)
    for(var b = 0; b < 4; b++){
      var inset = b * 26;
      cx.strokeStyle = b % 2 === 0 ? "#c99a38" : "#1b2633";
      cx.lineWidth = b % 2 === 0 ? 8 : 14;
      cx.strokeRect(inset, inset, 1024 - inset * 2, 1024 - inset * 2);
    }

    // İç geometrik mihrap ve baklava motifleri
    cx.fillStyle = "#7b1c26";
    cx.fillRect(130, 130, 764, 764);

    cx.strokeStyle = "#e5b74c";
    cx.lineWidth = 8;
    cx.beginPath();
    cx.moveTo(512, 170);
    cx.lineTo(840, 512);
    cx.lineTo(512, 854);
    cx.lineTo(184, 512);
    cx.closePath();
    cx.stroke();

    // Merkezi lacivert göbek
    cx.fillStyle = "#162330";
    cx.fill();

    // Yıldız motifi
    cx.fillStyle = "#d4af37";
    cx.beginPath();
    cx.arc(512, 512, 55, 0, Math.PI * 2);
    cx.fill();

    // Dokuma yün gren efekti
    var id = cx.getImageData(0, 0, 1024, 1024);
    var d = id.data;
    for(var i = 0; i < d.length; i += 4){
      var noise = (Math.random() - 0.5) * 32;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise));
    }
    cx.putImageData(id, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    texCache.rug = tex;
    return tex;
  }

  // Ahşap Zemin ve Tavan Kirişi Dokusu
  function getWoodPlankTex(baseHex, grainHex){
    var k = baseHex + "_" + grainHex;
    if(texCache[k]) return texCache[k];
    var c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    var cx = c.getContext("2d");

    cx.fillStyle = baseHex;
    cx.fillRect(0, 0, 512, 512);

    cx.strokeStyle = grainHex;
    for(var i = 0; i < 50; i++){
      var y = Math.random() * 512;
      cx.lineWidth = 1 + Math.random() * 2;
      cx.beginPath();
      cx.moveTo(0, y);
      cx.bezierCurveTo(170, y + (Math.random() - 0.5) * 16, 340, y + (Math.random() - 0.5) * 16, 512, y);
      cx.stroke();
    }

    // Tahta derz çizgileri
    cx.strokeStyle = "rgba(0,0,0,0.4)";
    cx.lineWidth = 3;
    for(var p = 0; p <= 512; p += 64){
      cx.beginPath();
      cx.moveTo(0, p);
      cx.lineTo(512, p);
      cx.stroke();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    texCache[k] = tex;
    return tex;
  }

  // Kitap Sırtı Dokusu
  function getBookSpineTex(title, volLabel, colorHex){
    var c = document.createElement("canvas");
    c.width = 128; c.height = 512;
    var cx = c.getContext("2d");

    var grad = cx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "#080504");
    grad.addColorStop(0.25, colorHex);
    grad.addColorStop(0.75, colorHex);
    grad.addColorStop(1, "#080504");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 128, 512);

    // Varaklı altın bordürler
    cx.strokeStyle = "#d4af37";
    cx.lineWidth = 3;
    cx.strokeRect(6, 12, 116, 488);
    cx.strokeRect(12, 20, 104, 472);

    // Eser Başlığı
    cx.save();
    cx.translate(64, 256);
    cx.rotate(Math.PI / 2);
    cx.fillStyle = "#f9df88";
    cx.font = "bold 24px 'Cinzel', 'Amiri', serif";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillText(title, 0, 0);

    if(volLabel){
      cx.font = "14px 'Cinzel', serif";
      cx.fillStyle = "#c99a38";
      cx.fillText(volLabel, 0, 26);
    }
    cx.restore();

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Hat Levhası ("Lafzullah" & "Kelime-i Tevhid")
  function getCalligraphyTex(text, subText){
    var c = document.createElement("canvas");
    c.width = 512; c.height = 384;
    var cx = c.getContext("2d");

    // Ahşap altın varak çerçeve
    cx.fillStyle = "#1e130a";
    cx.fillRect(0, 0, 512, 384);
    cx.strokeStyle = "#c99a38";
    cx.lineWidth = 12;
    cx.strokeRect(10, 10, 492, 364);

    // Zemin siyah kadife
    cx.fillStyle = "#0c0806";
    cx.fillRect(24, 24, 464, 336);

    cx.fillStyle = "#f5d77f";
    cx.textAlign = "center";
    cx.font = "bold 56px 'Amiri', Georgia, serif";
    cx.fillText(text, 256, 190);

    if(subText){
      cx.font = "bold 24px 'Cinzel', serif";
      cx.fillStyle = "#c99a38";
      cx.fillText(subText, 256, 265);
    }

    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  // Yumuşak Dairesel Parçacık Dokusu (Buhar ve Kar Taneleri İçin)
  function getSoftCircleTex(){
    if(texCache.softCircle) return texCache.softCircle;
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var cx = c.getContext("2d");
    var grad = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.35, "rgba(255, 255, 255, 0.7)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    texCache.softCircle = tex;
    return tex;
  }

  /* ── 2. SAHNE, IŞIKLAR VE 3D KIŞ ODASI İNŞASI ─────────────── */
  function initThreeScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0705);
    scene.fog = new THREE.FogExp2(0x0a0705, 0.015);

    camera = new THREE.PerspectiveCamera(fov, containerEl.clientWidth / containerEl.clientHeight, 0.1, 100);
    camera.position.set(0, 1.4, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupRoomLighting();
    buildCozyWinterRoom();
    setupAtmosphericParticles();
  }

  // Sahne Işıklandırması (Sıcak Barla Kış Ambiyansı)
  function setupRoomLighting(){
    // Sıcak ortam ışığı (Kuzine soba & tavan lambası sıcaklığı)
    var ambient = new THREE.AmbientLight(0xffecd0, 0.75);
    scene.add(ambient);

    // Tavan Asma Sarkıt Lambası (Warm Amber Pendant Light)
    ceilingLampLight = new THREE.PointLight(0xffdf99, 1.8, 14, 1.5);
    ceilingLampLight.position.set(0.6, 3.6, -2.2);
    ceilingLampLight.castShadow = true;
    scene.add(ceilingLampLight);

    // Kuzine Soba İçindeki Canlı Odun Ateşi Işığı (Flickering Stove Fire)
    stoveLight = new THREE.PointLight(0xff6a14, 2.4, 7.5, 1.8);
    stoveLight.position.set(-2.65, 0.75, -3.9);
    stoveLight.castShadow = true;
    scene.add(stoveLight);

    // Karlı Pencereden Giren Gece/Ay Parıltısı
    var moonLight = new THREE.DirectionalLight(0x8eb4e6, 0.65);
    moonLight.position.set(4.0, 4.0, -6.0);
    moonLight.target.position.set(1.5, 1.5, -3.5);
    scene.add(moonLight);
    scene.add(moonLight.target);
  }

  // Barla Kış Odası 3D Mimarisi
  function buildCozyWinterRoom(){
    roomGroup = new THREE.Group();
    shelfBooks = [];

    var roomW = 10.0;
    var roomH = 4.8;
    var roomD = 9.0;

    // 1. AHŞAP TABAN VE GELENEKSEL KIRMIZI KİLİMLER
    var floorTex = getWoodPlankTex("#3d2415", "#1c0f08");
    floorTex.repeat.set(8, 8);
    var floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 });
    var floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // Zemin Boyunca Serili Geleneksel Anadolu Halısı
    var rugTex = getAnatolianRugTex();
    rugTex.repeat.set(2, 2);
    var rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.9 });
    var rugMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 6.8), rugMat);
    rugMesh.rotation.x = -Math.PI / 2;
    rugMesh.position.set(0, 0.015, -0.6);
    rugMesh.receiveShadow = true;
    roomGroup.add(rugMesh);

    // 2. AHŞAP TAVAN VE MERTEK KİRİŞLERİ
    var ceilingTex = getWoodPlankTex("#2f1c10", "#140a05");
    ceilingTex.repeat.set(6, 6);
    var ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.85 });
    var ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = roomH;
    roomGroup.add(ceilingMesh);

    // 5 Adet Kalın Ahşap Tavan Mertek Kirişi
    var beamMat = new THREE.MeshStandardMaterial({ color: 0x24140a, roughness: 0.8 });
    for(var bi = -2; bi <= 2; bi++){
      var beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.28, 0.32), beamMat);
      beam.position.set(0, roomH - 0.14, bi * 2.1);
      roomGroup.add(beam);
    }

    // 3D Tavan Asma Lambası (Vintage Desenli Başlık)
    var shadeMat = new THREE.MeshStandardMaterial({ color: 0xf5ecd7, roughness: 0.4, emissive: 0xd4af37, emissiveIntensity: 0.3 });
    var shadeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.32, 16, 1, true), shadeMat);
    shadeMesh.position.set(0.6, roomH - 1.1, -2.2);
    shadeMesh.rotation.x = Math.PI;
    roomGroup.add(shadeMesh);

    var cordMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    var cordMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.95, 8), cordMat);
    cordMesh.position.set(0.6, roomH - 0.55, -2.2);
    roomGroup.add(cordMesh);

    // 3. DUVARLAR
    var timberMat = new THREE.MeshStandardMaterial({ color: 0xd6c6aa, roughness: 0.92 }); // Sıcak kiremit-bej sıva

    // Güney Duvarı (Arka Duvar - Kapı ve Kitaplık)
    var southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), timberMat);
    southWall.position.set(0, roomH / 2, roomD / 2);
    southWall.rotation.y = Math.PI;
    roomGroup.add(southWall);

    // Batı Duvarı (Sol Duvar - Lem'alar & Lâhikalar)
    var westWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), timberMat);
    westWall.position.set(-roomW / 2, roomH / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    roomGroup.add(westWall);

    // Doğu Duvarı (Sağ Duvar - Şualar & Asa-yı Musa)
    var eastWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), timberMat);
    eastWall.position.set(roomW / 2, roomH / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    roomGroup.add(eastWall);

    // 4. KUZEY DUVARI: NOSTALJİK KIŞ ODASI & RAHLE BAŞINDA ÜSTAD MERKEZİ
    // (16:9 Oranında barla_cozy_room.jpg + Canlı Lip-Sync ve Nefes Motoru)
    roomCanvas = document.createElement("canvas");
    roomCanvas.width = 1376;
    roomCanvas.height = 768;
    roomCtx = roomCanvas.getContext("2d");

    roomTexture = new THREE.CanvasTexture(roomCanvas);
    roomTexture.anisotropy = 8;

    var northMat = new THREE.MeshStandardMaterial({
      map: roomTexture,
      roughness: 0.65,
      metalness: 0.02
    });

    // Kuzey ana duvarı (Ön cephe)
    var northWallW = roomW;
    var northWallH = roomW * (768 / 1376); // 16:9 oran uyumu (~5.58m)
    var northWallGeo = new THREE.PlaneGeometry(northWallW, northWallH);
    roomMesh = new THREE.Mesh(northWallGeo, northMat);
    roomMesh.position.set(0, northWallH / 2 - 0.15, -roomD / 2);
    roomGroup.add(roomMesh);

    // 5. SOL, SAĞ VE ARKA DUVARDA SESLİ RİSALE KÜTÜPHANE RAFLARI
    build360WallShelves(roomW, roomD);

    // 6. DUVARLARA NOSTALJİK HAT LEVHALARI VE SAAT
    addWallDecorations(roomW, roomD);

    scene.add(roomGroup);
  }

  // Sol, Sağ ve Arka Duvarlara Ahşap Kitaplıklar ve 684 Sesli Bölümü Diz
  function build360WallShelves(roomW, roomD){
    AUDIO_WALLS_DATA.forEach(function(wallData){
      if(wallData.wall === "west"){
        // Sol Duvar (Lem'alar, Barla & Kastamonu Lâhikaları)
        buildShelfBlock(-roomW / 2 + 0.35, 0, -1.8, 2.6, 3, Math.PI / 2, wallData.bays.slice(0, 2));
        buildShelfBlock(-roomW / 2 + 0.35, 0, 1.8, 2.6, 3, Math.PI / 2, wallData.bays.slice(2, 4));
      }
      else if(wallData.wall === "east"){
        // Sağ Duvar (Şualar, Asa-yı Musa & Gençlik Rehberi)
        buildShelfBlock(roomW / 2 - 0.35, 0, -1.8, 2.6, 3, -Math.PI / 2, wallData.bays.slice(0, 2));
        buildShelfBlock(roomW / 2 - 0.35, 0, 1.8, 2.4, 3, -Math.PI / 2, wallData.bays.slice(2, 3));
      }
      else if(wallData.wall === "south"){
        // Arka Duvar (Tarihçe-i Hayat, Mesnevi, İşaratü'l-İ'caz)
        buildShelfBlock(-2.8, 0, roomD / 2 - 0.35, 2.5, 3, Math.PI, wallData.bays.slice(0, 2));
        buildShelfBlock(2.8, 0, roomD / 2 - 0.35, 2.5, 3, Math.PI, wallData.bays.slice(2, 4));
      }
    });
  }

  function buildShelfBlock(x, y, z, width, tiers, rotY, bays){
    var shelf = new THREE.Group();
    shelf.position.set(x, y, z);
    shelf.rotation.y = rotY;

    var woodMat = new THREE.MeshStandardMaterial({ color: 0x361f12, roughness: 0.7 });
    var tierH = 0.92;
    var depth = 0.42;

    // Yan dikmeler
    [-width/2, width/2].forEach(function(px){
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.08, tiers * tierH + 0.25, depth), woodMat);
      post.position.set(px, (tiers * tierH + 0.25) / 2, 0);
      shelf.add(post);
    });

    // Raflar
    for(var t = 0; t <= tiers; t++){
      var plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), woodMat);
      plank.position.set(0, t * tierH + 0.025, 0);
      shelf.add(plank);
    }

    // Taç Kemer
    var crown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.14, depth + 0.05), woodMat);
    crown.position.set(0, tiers * tierH + 0.32, 0);
    shelf.add(crown);

    // Ciltleri Yerleştir
    if(bays && bays.length){
      var bayIdx = 0;
      for(var tr = 0; tr < tiers; tr++){
        var shelfY = tr * tierH + 0.05;
        var bay = bays[bayIdx % bays.length];
        bayIdx++;

        var vols = bay.volumes || [bay.title];
        var copies = Math.max(vols.length, 5);
        var bookW = (width * 0.85) / copies;

        for(var i = 0; i < copies; i++){
          var volLabel = vols[i % vols.length];
          var bw = Math.min(0.15, bookW * 0.92);
          var bh = 0.58 + (i % 3) * 0.04;
          var bd = 0.30;
          var bx = -width * 0.4 + i * (width * 0.8 / copies) + bw / 2;

          var spineTex = getBookSpineTex(bay.title, volLabel, bay.color || "#7a1620");
          var spineMat = new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.65 });
          var coverMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.75 });
          var pagesMat = new THREE.MeshStandardMaterial({ color: 0xf5edd6, roughness: 0.9 });

          var materials = [coverMat, coverMat, pagesMat, pagesMat, spineMat, coverMat];
          var bookMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), materials);
          bookMesh.position.set(bx, shelfY + bh / 2, 0.04);

          bookMesh.userData = {
            title: bay.title,
            volLabel: volLabel,
            trackFilter: bay.trackFilter || bay.title,
            desc: bay.desc,
            spineMat: spineMat,
            basePos: bookMesh.position.clone(),
            pullT: 0
          };

          shelf.add(bookMesh);
          shelfBooks.push(bookMesh);
        }
      }
    }

    roomGroup.add(shelf);
  }

  // Duvar Süslemeleri (Hat Levhası & Barla Kapısı)
  function addWallDecorations(roomW, roomD){
    // Sol duvarda Lafzullah Levhası
    var allahTex = getCalligraphyTex("الله", "Celle Celâlühû");
    var allahMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: allahTex }));
    allahMesh.position.set(-roomW / 2 + 0.06, 3.1, 0);
    allahMesh.rotation.y = Math.PI / 2;
    roomGroup.add(allahMesh);

    // Sağ duvarda Kelime-i Tevhid Levhası
    var tevhidTex = getCalligraphyTex("لَا إِلٰهَ إِلَّا الله", "Bediüzzaman Barla");
    var tevhidMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ map: tevhidTex }));
    tevhidMesh.position.set(roomW / 2 - 0.06, 3.1, 0);
    tevhidMesh.rotation.y = -Math.PI / 2;
    roomGroup.add(tevhidMesh);

    // Arka duvarda Barla Giriş Kapısı
    var doorMat = new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.8 });
    var doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.08), doorMat);
    doorMesh.position.set(0, 1.35, roomD / 2 - 0.04);
    roomGroup.add(doorMesh);
  }

  /* ── 3. CANLI BUHAR & KAR YAĞIŞI PARÇACIKLARI ──────────────── */
  function setupAtmosphericParticles(){
    // 1. Çaydanlıktan Tüten Canlı Buhar Parçacıkları (Kuzine Soba Üzeri)
    var steamCount = 35;
    steamGeo = new THREE.BufferGeometry();
    var steamPos = new Float32Array(steamCount * 3);
    steamData = [];

    // Çaydanlığın soba üzerindeki konumu
    var kettleX = -2.62, kettleY = 1.48, kettleZ = -4.15;

    for(var s = 0; s < steamCount; s++){
      var life = Math.random();
      steamPos[s * 3] = kettleX + (Math.random() - 0.5) * 0.06;
      steamPos[s * 3 + 1] = kettleY + life * 0.9;
      steamPos[s * 3 + 2] = kettleZ + (Math.random() - 0.5) * 0.06;

      steamData.push({
        baseX: kettleX,
        baseY: kettleY,
        baseZ: kettleZ,
        life: life,
        speed: 0.008 + Math.random() * 0.007,
        driftX: (Math.random() - 0.5) * 0.004,
        scale: 0.04 + Math.random() * 0.05
      });
    }
    steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPos, 3));

    var softParticleTex = getSoftCircleTex();

    var steamMat = new THREE.PointsMaterial({
      map: softParticleTex,
      color: 0xfff4e6,
      size: 0.18,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    steamParticles = new THREE.Points(steamGeo, steamMat);
    scene.add(steamParticles);

    // 2. Pencereden Dışarıda Süzülen Canlı Kar Taneleri (Yalnızca Pencere Camı Alanında)
    var snowCount = 85;
    snowGeo = new THREE.BufferGeometry();
    var snowPos = new Float32Array(snowCount * 3);
    snowData = [];

    // Pencere camı alanı: x = 2.1..4.4, y = 1.9..3.8, z = -4.2
    for(var k = 0; k < snowCount; k++){
      var sx = 2.1 + Math.random() * 2.3;
      var sy = 1.9 + Math.random() * 1.9;
      var sz = -4.25 + (Math.random() - 0.5) * 0.1;

      snowPos[k * 3] = sx;
      snowPos[k * 3 + 1] = sy;
      snowPos[k * 3 + 2] = sz;

      snowData.push({
        x: sx,
        y: sy,
        z: sz,
        fallSpeed: 0.004 + Math.random() * 0.005,
        swaySpeed: 0.002 + Math.random() * 0.003,
        swayAmp: 0.002 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2
      });
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));

    var snowMat = new THREE.PointsMaterial({
      map: softParticleTex,
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    snowParticles = new THREE.Points(snowGeo, snowMat);
    scene.add(snowParticles);
  }

  function updateAtmosphericParticles(){
    var now = Date.now();

    // Çaydanlık Buharı Güncellemesi
    if(steamGeo && steamParticles){
      var sPos = steamGeo.attributes.position.array;
      for(var s = 0; s < steamData.length; s++){
        var sd = steamData[s];
        sd.life += sd.speed;
        if(sd.life >= 1.0){
          sd.life = 0;
          sPos[s * 3] = sd.baseX + (Math.random() - 0.5) * 0.05;
          sPos[s * 3 + 1] = sd.baseY;
          sPos[s * 3 + 2] = sd.baseZ + (Math.random() - 0.5) * 0.05;
        } else {
          sPos[s * 3] += sd.driftX + Math.sin(now * 0.003 + s) * 0.001;
          sPos[s * 3 + 1] = sd.baseY + sd.life * 0.95;
          sPos[s * 3 + 2] += (Math.random() - 0.5) * 0.001;
        }
      }
      steamGeo.attributes.position.needsUpdate = true;
    }

    // Kar Yağışı Güncellemesi
    if(snowGeo && snowParticles){
      var snPos = snowGeo.attributes.position.array;
      for(var k = 0; k < snowData.length; k++){
        var snd = snowData[k];
        snd.y -= snd.fallSpeed;
        snd.x += Math.sin(now * snd.swaySpeed + snd.phase) * snd.swayAmp;

        if(snd.y < 1.4){
          snd.y = 3.8;
          snd.x = 1.2 + Math.random() * 3.0;
        }

        snPos[k * 3] = snd.x;
        snPos[k * 3 + 1] = snd.y;
        snPos[k * 3 + 2] = snd.z;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
  }

  /* ── 4. CANLI ÜSTAD RENDER DÖNGÜSÜ (Lip-Sync & Nefes) ───────── */
  function updateCozyRoomCanvas(){
    if(!roomCtx || !roomImgLoaded) return;

    var cw = roomCanvas.width;
    var ch = roomCanvas.height;

    var mouthOpen = window.__liveMouthOpen || 0;
    var headNod = window.__liveHeadNod || 0;

    var now = Date.now();
    var breathY = Math.sin(now * 0.0022) * 1.0;
    var nodY = headNod * 1.5;

    roomCtx.clearRect(0, 0, cw, ch);
    roomCtx.drawImage(roomImg, 0, 0, cw, ch);

    // Canlı Dudak Senkronu (barla_cozy_room.jpg: ağız merkezi x=840, y=445)
    if(mouthOpen > 0.012){
      var drop = mouthOpen * 8.0;

      // Ağız içi karanlık boşluğu
      roomCtx.save();
      roomCtx.beginPath();
      roomCtx.ellipse(840, 445 + drop * 0.40 + breathY + nodY, 15, Math.max(1.0, drop * 0.65), 0, 0, Math.PI * 2);
      roomCtx.fillStyle = "#140808";
      roomCtx.fill();
      roomCtx.restore();

      // Alt dudak ve sakal ucu dokusu
      var sx = 815, sy = 445, sw = 50, sh = 35;
      var dx = sx, dy = sy + drop + breathY + nodY, dw = sw, dh = sh;
      roomCtx.save();
      roomCtx.beginPath();
      roomCtx.ellipse(dx + dw / 2, dy + dh * 0.45, dw * 0.52, dh * 0.50, 0, 0, Math.PI * 2);
      roomCtx.clip();
      roomCtx.drawImage(roomImg, sx, sy, sw, sh, dx, dy, dw, dh);
      roomCtx.restore();
    }

    roomTexture.needsUpdate = true;
  }

  /* ── 5. 360° KAMERA ETKİLEŞİMİ & PRESET GEÇİŞLERİ ──────────── */
  function updateCameraTarget(){
    if(isTransitioningCamera){
      camTransProgress += 0.04;
      if(camTransProgress >= 1.0){
        camTransProgress = 1.0;
        isTransitioningCamera = false;
      }
    }

    // Yumuşatılmış açı ve zoom geçişi
    lon += (targetLon - lon) * 0.09;
    lat += (targetLat - lat) * 0.09;
    lat = Math.max(-65, Math.min(65, lat)); // Halıdan tavana geniş açı

    fov += (targetFov - fov) * 0.09;
    if(camera.fov !== fov){
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    var phi = THREE.MathUtils.degToRad(90 - lat);
    var theta = THREE.MathUtils.degToRad(lon);

    var cx = 0, cy = 1.55, cz = 0; // Oda merkezindeki göz hizası
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
    if(p.fov) targetFov = p.fov;
    isTransitioningCamera = true;
    camTransProgress = 0;

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

    // Sürükleme ile 360° kesintisiz bakış
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

    book.userData.pullT = 1.0;
    book.userData.spineMat.emissive.setHex(0xd4af37);

    openShelfChapterDrawer(u.title, u.trackFilter);
    playFirstTrackOfBook(u.trackFilter || u.title);

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

    var bar = document.getElementById("brPlayerBar");
    if(bar) bar.classList.add("active");
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

    // 1. Kamera hedef açısına yaklaşım
    updateCameraTarget();

    // 2. Kitapların raftan öne çekilme animasyonu
    shelfBooks.forEach(function(b){
      var u = b.userData;
      if(u && u.basePos){
        var targetOffset = (b === hoveredBook || b === selectedBook) ? 0.16 : 0;
        u.pullT += (targetOffset - u.pullT) * 0.15;
        b.position.z = u.basePos.z + u.pullT;
      }
    });

    // 3. Kuzine Soba Ateşinin Gerçekçi Titreşimi
    if(stoveLight){
      var now = Date.now();
      var flk = Math.sin(now * 0.012) * 0.28 + Math.sin(now * 0.027) * 0.12 + (Math.random() - 0.5) * 0.08;
      stoveLight.intensity = 2.2 + flk;
    }

    // 4. Çaydanlık Buharı & Kar Yağışı
    updateAtmosphericParticles();

    // 5. Rahle Başındaki Canlı Üstad Tuvalini Güncelle (Lip-Sync)
    updateCozyRoomCanvas();

    // 6. Barla Ses Oynatıcı Çubuğu Canlı Senkronizasyonu
    var audioEl = (window.TalkingPortrait && window.TalkingPortrait.getAudioElement) ? 
                  window.TalkingPortrait.getAudioElement() : document.getElementById("risaleAudioSource");
    if(audioEl && !audioEl.paused){
      var cur = audioEl.currentTime || 0;
      var tot = audioEl.duration || 0;
      var fillEl = document.getElementById("brpProgressFill");
      var curEl = document.getElementById("brpCurrentTime");
      var totEl = document.getElementById("brpTotalTime");
      if(fillEl && tot > 0){
        fillEl.style.width = (cur / tot * 100) + "%";
      }
      if(curEl) curEl.textContent = formatTime(cur);
      if(totEl && tot > 0) totEl.textContent = formatTime(tot);

      var playBtn = document.getElementById("brpPlayBtn");
      if(playBtn && !playBtn.classList.contains("playing")){
        playBtn.classList.add("playing");
        playBtn.innerHTML = "<span>⏸</span> Duraklat";
      }
    } else {
      var playBtn = document.getElementById("brpPlayBtn");
      if(playBtn && playBtn.classList.contains("playing") && audioEl && audioEl.paused){
        playBtn.classList.remove("playing");
        playBtn.innerHTML = "<span>▶</span> Dinle";
      }
    }

    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(animateBarlaRoom);
  }

  function formatTime(sec){
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ── 8. ODAYI AÇMA / KAPATMA & DOM BAĞLANTILARI ────────────── */
  function openBarlaRoom(){
    if(isRoomOpen) return;
    isRoomOpen = true;

    containerEl = document.getElementById("barlaRoomContainer");
    canvasEl = document.getElementById("barlaRoomCanvas");
    if(!containerEl || !canvasEl) return;

    containerEl.classList.add("active");
    containerEl.classList.add("open");
    document.body.style.overflow = "hidden";

    if(!scene){
      initThreeScene();
    }

    onWindowResize();
    window.addEventListener("resize", onWindowResize);

    setCameraPreset("desk");
    animFrameId = requestAnimationFrame(animateBarlaRoom);

    // Külliyat çekmecesini otomatik hazırla
    openShelfChapterDrawer("Tüm Külliyat", "");

    if(typeof showToast === "function"){
      showToast("❄️ 3D Barla Kış Odası açıldı. 360° fare ile inceleyebilirsiniz.");
    }
  }

  function closeBarlaRoom(){
    if(!isRoomOpen) return;
    isRoomOpen = false;

    if(animFrameId){
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    window.removeEventListener("resize", onWindowResize);

    if(containerEl){
      containerEl.classList.remove("active");
      containerEl.classList.remove("open");
    }
    document.body.style.overflow = "";

    hideShelfBookTooltip();

    var drawer = document.getElementById("barlaShelfDrawer");
    if(drawer) drawer.classList.remove("open");
  }

  function onWindowResize(){
    if(!containerEl || !renderer || !camera) return;
    var w = containerEl.clientWidth;
    var h = containerEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ── 9. KULLANICI ETKİLEŞİMİ (360° Sürükleme & Zoom) ────────── */
  function initDOMBindings(){
    containerEl = document.getElementById("barlaRoomContainer");
    canvasEl = document.getElementById("barlaRoomCanvas");
    if(!canvasEl) return;

    // Fare Etkileşimleri
    canvasEl.addEventListener("mousedown", function(e){
      if(e.button !== 0) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener("mousemove", handlePointerMove);

    window.addEventListener("mouseup", function(){
      isDragging = false;
    });

    canvasEl.addEventListener("click", handlePointerClick);

    // Fare Tekerleği ile 360° Zoom (FOV Kontrolü)
    canvasEl.addEventListener("wheel", function(e){
      e.preventDefault();
      targetFov += e.deltaY * 0.04;
      targetFov = Math.max(36, Math.min(74, targetFov));
    }, { passive: false });

    // Dokunmatik Ekran Etkileşimleri (Mobil/Tablet 360°)
    var touchStartX = 0, touchStartY = 0;
    canvasEl.addEventListener("touchstart", function(e){
      if(e.touches.length === 1){
        isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        prevMouseX = touchStartX;
        prevMouseY = touchStartY;
      }
    }, { passive: true });

    canvasEl.addEventListener("touchmove", function(e){
      if(isDragging && e.touches.length === 1){
        var cx = e.touches[0].clientX;
        var cy = e.touches[0].clientY;
        var dx = cx - prevMouseX;
        var dy = cy - prevMouseY;
        prevMouseX = cx;
        prevMouseY = cy;

        targetLon += dx * 0.25;
        targetLat += dy * 0.20;
      }
    }, { passive: true });

    canvasEl.addEventListener("touchend", function(){
      isDragging = false;
    }, { passive: true });

    // Kamera Preset Butonları
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
