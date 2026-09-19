/* ============================================================
   NUR KORİDORU - SESLİ RİSALE & CANLI KONUŞAN ÜSTAD PORTRESİ
   2.5D Audio-Reactive Lip-Sync Engine & MP3 Kütüphane Yöneticisi
   ============================================================ */

(function(){
  "use strict";

  // 1. Durum Değişkenleri
  var audioCtx = null;
  var analyser = null;
  var audioSource = null;
  var freqData = null;
  var isAudioSetup = false;
  var currentTrack = null;
  var playlist = (typeof window !== "undefined" && window.DEFAULT_AUDIO_CATALOG && Array.isArray(window.DEFAULT_AUDIO_CATALOG)) ? window.DEFAULT_AUDIO_CATALOG.slice() : [];
  if(typeof window !== "undefined"){
    window.nurPlaylist = playlist;
    window.__AUDIO_CATALOG = playlist;
  }

  // Animasyon Değişkenleri
  var mouthOpen = 0;       // 0 (kapalı) - 1 (tam açık)
  var mouthTarget = 0;
  var mouthWidthMod = 0;   // Dudak genişliği modülasyonu
  var blinkProgress = 0;   // 0 (açık) - 1 (tam kapalı)
  var isBlinking = false;
  var nextBlinkTime = Date.now() + 3000;
  var breathPhase = 0;
  var headNod = 0;
  var animFrameId = null;

  // DOM Öğeleri
  var playerPanel = null;
  var portraitCanvas = null;
  var ctx = null;
  var audioElement = null;
  var playPauseBtn = null;
  var progressBar = null;
  var progressFill = null;
  var timeCurEl = null;
  var timeTotEl = null;
  var titleEl = null;
  var bookTagEl = null;
  var waveCanvas = null;
  var waveCtx = null;

  // Çalma Listesi & Modal Öğeleri
  var playlistView = null;
  var portraitStage = null;
  var tabPortraitBtn = null;
  var tabPlaylistBtn = null;
  var playlistContainer = null;
  var playlistBadge = null;
  var addAudioModal = null;
  var audioBookSelect = null;
  var audioCustomBookWrap = null;
  var audioCustomBookInput = null;
  var audioSubTitleInput = null;
  var audioSingleSubTitleWrap = null;
  var audioQueueContainer = null;
  var audioQueueCount = null;
  var audioQueueTotalSize = null;
  var audioQueueList = null;
  var audioQueueClearBtn = null;
  var audioSaveProgressWrap = null;
  var audioSaveProgressFill = null;
  var audioSaveProgressText = null;
  var audioFileInput = null;
  var audioDropzone = null;
  var audioFileBadge = null;
  var audioBadgeFileName = null;
  var audioBadgeFileSize = null;
  var audioSaveBtn = null;
  var selectedAudioFiles = []; // Dizi: { id, file, subTitle }

  // 3D Mouse Parallax
  var mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;

  // Üstad Çalışma Odası & Portresi Görüntüsü
  var portraitImg = new Image();
  portraitImg.src = "ustad_study_room.jpg";
  var imgLoaded = false;
  portraitImg.onload = function(){
    imgLoaded = true;
    renderFrame();
  };

  // Anatomik Koordinatlar (1376 x 768 ustad_study_room.jpg referansı)
  var COORDS = {
    w: 1376,
    h: 768,
    mouthX: 830,
    mouthY: 317,
    mouthW: 66,
    mouthH: 48,
    lipSeamY: 318,
    chinBottomY: 365,
    leftEye: { x: 828, y: 234, rX: 18, rY: 8 },
    rightEye: { x: 892, y: 233, rX: 18, rY: 8 },
    lampFlame: { x: 204, y: 375, r: 55 },
    bookCenter: { x: 530, y: 675, rx: 270, ry: 95 }
  };

  /* ── 2. INDEXEDDB SES KÜTÜPHANESİ DEPOSU (NurAudioDB) ────── */
  var NurAudioStorage = {
    db: null,
    init: function(){
      return new Promise(function(resolve){
        try{
          var req = indexedDB.open("NurAudioDB", 1);
          req.onupgradeneeded = function(e){
            var db = e.target.result;
            if(!db.objectStoreNames.contains("tracks")){
              db.createObjectStore("tracks", { keyPath: "id" });
            }
          };
          req.onsuccess = function(e){
            NurAudioStorage.db = e.target.result;
            resolve(NurAudioStorage.db);
          };
          req.onerror = function(){ resolve(null); };
        }catch(err){
          console.warn("NurAudioDB init error:", err);
          resolve(null);
        }
      });
    },
    getAll: function(){
      return new Promise(function(resolve){
        if(!NurAudioStorage.db){ resolve([]); return; }
        try{
          var tx = NurAudioStorage.db.transaction("tracks", "readonly");
          var store = tx.objectStore("tracks");
          var req = store.getAll();
          req.onsuccess = function(){ resolve(req.result || []); };
          req.onerror = function(){ resolve([]); };
        }catch(e){ resolve([]); }
      });
    },
    save: function(track){
      return new Promise(function(resolve){
        if(!NurAudioStorage.db){ resolve(false); return; }
        try{
          var tx = NurAudioStorage.db.transaction("tracks", "readwrite");
          var store = tx.objectStore("tracks");
          store.put(track);
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ resolve(false); };
        }catch(e){ resolve(false); }
      });
    },
    remove: function(id){
      return new Promise(function(resolve){
        if(!NurAudioStorage.db){ resolve(false); return; }
        try{
          var tx = NurAudioStorage.db.transaction("tracks", "readwrite");
          var store = tx.objectStore("tracks");
          store.delete(id);
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ resolve(false); };
        }catch(e){ resolve(false); }
      });
    }
  };

  /* ── 3. WEB AUDIO API FREKANS ANALİZ MOTORU ───────────────── */
  function initAudioEngine(){
    if(isAudioSetup) return;
    try{
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if(!AudioContextClass) return;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      freqData = new Uint8Array(analyser.frequencyBinCount);

      if(audioElement){
        audioElement.crossOrigin = "anonymous";
        audioElement.volume = 1.0;
        audioElement.muted = false;
        audioSource = audioCtx.createMediaElementSource(audioElement);
        audioSource.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      isAudioSetup = true;
    }catch(e){
      console.warn("Web Audio API kurulamadı:", e);
    }
  }

  function updateAudioAnalysis(){
    if(!analyser || !audioElement || audioElement.paused){
      mouthTarget = 0;
      mouthWidthMod = 0;
      return;
    }

    analyser.getByteFrequencyData(freqData);

    // İnsan sesinin ana konuşma formantları (200 Hz - 2800 Hz)
    var speechEnergy = 0;
    var speechCount = 0;
    for(var i = 2; i <= 34 && i < freqData.length; i++){
      speechEnergy += freqData[i];
      speechCount++;
    }
    var avgSpeech = speechEnergy / (speechCount || 1);

    var highEnergy = 0;
    for(var j = 35; j <= 60 && j < freqData.length; j++){
      highEnergy += freqData[j];
    }
    var avgHigh = highEnergy / 26;

    var threshold = 18;
    if(avgSpeech > threshold){
      var norm = (avgSpeech - threshold) / (255 - threshold);
      mouthTarget = Math.min(1.0, norm * 1.6);
      mouthWidthMod = (avgHigh / 255) * 0.4;
      headNod = Math.min(1.0, norm * 0.8);
    } else {
      mouthTarget = 0;
      mouthWidthMod = 0;
      headNod = 0;
    }
  }

  /* ── 4. 2.5D CANVAS TALKING PORTRAIT ÇİZİMİ ───────────────── */
  function renderPortrait(){
    if(!portraitCanvas || !ctx || !imgLoaded) return;

    var cw = portraitCanvas.width;
    var ch = portraitCanvas.height;

    // Yumuşak dudak geçişi (Attack / Decay)
    var attackSpeed = 0.50;
    var decaySpeed = 0.28;
    if(mouthTarget > mouthOpen){
      mouthOpen += (mouthTarget - mouthOpen) * attackSpeed;
    } else {
      mouthOpen += (mouthTarget - mouthOpen) * decaySpeed;
    }
    if(mouthOpen < 0.01) mouthOpen = 0;

    // 3D Parallax Yumuşatma
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    var pX = mouseX * 8;
    var pY = mouseY * 5;

    // Göz kırpma
    var now = Date.now();
    if(!isBlinking && now > nextBlinkTime){
      isBlinking = true;
      blinkProgress = 0;
    }
    if(isBlinking){
      blinkProgress += 0.16;
      if(blinkProgress >= 1){
        blinkProgress = 0;
        isBlinking = false;
        nextBlinkTime = now + 2500 + Math.random() * 4000;
      }
    }

    // Nefes ve mikro baş salınımı
    breathPhase += 0.025;
    var breathY = Math.sin(breathPhase) * 1.2;
    var nodY = headNod * 1.8;

    // 3D Barla Odası İçin Canlı Durum Değerlerini Dışarı Aktar
    window.__liveMouthOpen = mouthOpen;
    window.__liveHeadNod = headNod;
    window.__liveIsBlinking = isBlinking;
    window.__liveBlinkProgress = blinkProgress;

    ctx.clearRect(0, 0, cw, ch);

    var scaleX = cw / COORDS.w;
    var scaleY = ch / COORDS.h;

    // 1. Ana Çalışma Odası & Oturan Üstad Portresi (Parallax ile)
    var padX = 14;
    var padY = 8;
    ctx.save();
    ctx.drawImage(portraitImg, -padX + pX, -padY + pY, cw + padX * 2, ch + padY * 2);

    // 2. Masadaki Kandil Alevi Titreşimi (Warm Golden Oil Lamp Flicker)
    var flk = Math.sin(now * 0.007) * 0.09 + Math.sin(now * 0.015) * 0.05 + (Math.random() * 0.025);
    var fx = (COORDS.lampFlame.x * scaleX) - padX + pX * 1.15;
    var fy = (COORDS.lampFlame.y * scaleY) - padY + pY * 1.15;
    var flameR = COORDS.lampFlame.r * scaleX + flk * 22;

    var flameGrad = ctx.createRadialGradient(fx, fy, 3, fx, fy, flameR);
    flameGrad.addColorStop(0, "rgba(255, 250, 210, " + (0.70 + flk * 0.2) + ")");
    flameGrad.addColorStop(0.28, "rgba(255, 180, 50, " + (0.42 + flk * 0.15) + ")");
    flameGrad.addColorStop(0.65, "rgba(212, 115, 20, " + (0.15 + flk * 0.08) + ")");
    flameGrad.addColorStop(1, "rgba(90, 35, 5, 0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, flameR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Masadaki Açık Risale-i Nur Sayfaları Işıltısı (Reading Aura)
    var bx = (COORDS.bookCenter.x * scaleX) - padX + pX * 0.85;
    var by = (COORDS.bookCenter.y * scaleY) - padY + pY * 0.85;
    var brx = COORDS.bookCenter.rx * scaleX;
    var bry = COORDS.bookCenter.ry * scaleY;
    var isPlaying = audioElement && !audioElement.paused;
    var bookAura = (isPlaying ? 0.14 : 0.07) + (mouthOpen * 0.22) + (Math.sin(now * 0.004) * 0.03);

    var bookGrad = ctx.createRadialGradient(bx, by, 15, bx, by, brx);
    bookGrad.addColorStop(0, "rgba(255, 245, 200, " + bookAura + ")");
    bookGrad.addColorStop(0.45, "rgba(225, 180, 75, " + (bookAura * 0.55) + ")");
    bookGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bookGrad;
    ctx.beginPath();
    ctx.ellipse(bx, by, brx, bry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Konuşma ve Dudak Senkronizasyonu (Gerçekçi Lip-Sync)
    if(mouthOpen > 0.015){
      var maxDrop = 11.0;
      var drop = mouthOpen * maxDrop;
      var spread = mouthWidthMod * 4.0;

      var sx = COORDS.mouthX - 4;
      var sy = COORDS.lipSeamY;
      var sw = COORDS.mouthW + 8;
      var sh = COORDS.chinBottomY - COORDS.lipSeamY + 6;

      var dx = (sx - spread * 0.5) * scaleX - padX + pX;
      var dy = (sy + drop) * scaleY - padY + pY + (breathY + nodY) * 0.6;
      var dw = (sw + spread) * scaleX;
      var dh = sh * scaleY;

      // 4.a. Ağız İçi Boşluğu (Derinlik & Koyu Gölge)
      ctx.save();
      ctx.beginPath();
      var cavX = (COORDS.mouthX + 12) * scaleX - padX + pX;
      var cavY = (COORDS.lipSeamY + 1) * scaleY - padY + pY + (breathY + nodY) * 0.6;
      var cavW = (COORDS.mouthW - 24) * scaleX + spread;
      var cavH = Math.max(2, drop * scaleY * 1.15);
      ctx.ellipse(cavX + cavW / 2, cavY + cavH / 2, cavW / 2, Math.max(1, cavH / 2), 0, 0, Math.PI * 2);

      var cavGrad = ctx.createRadialGradient(
        cavX + cavW / 2, cavY + cavH / 2, 1,
        cavX + cavW / 2, cavY + cavH / 2, cavW / 2
      );
      cavGrad.addColorStop(0, "#1f0709");
      cavGrad.addColorStop(0.7, "#140405");
      cavGrad.addColorStop(1, "#070202");
      ctx.fillStyle = cavGrad;
      ctx.fill();

      // İnce diş ışıltısı / aydınlığı
      if(drop > 4.5){
        ctx.fillStyle = "rgba(220, 205, 195, 0.45)";
        ctx.beginPath();
        ctx.ellipse(cavX + cavW / 2, cavY + 2.5, cavW * 0.35, 1.6, 0, 0, Math.PI);
        ctx.fill();
      }
      ctx.restore();

      // 4.b. Alt Dudak ve Çene Hareketi (Doku Kırpma)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.44, dw * 0.52, dh * 0.50, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(portraitImg, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();

      // 4.c. Dudak Birleşim Çizgisi Gölgesi
      ctx.save();
      ctx.strokeStyle = "rgba(35, 15, 12, " + (0.55 * (1 - mouthOpen * 0.35)) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(dx + 3, dy + 0.5);
      ctx.lineTo(dx + dw - 3, dy + 0.5);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Doğal Göz Kırpma (Eyelid Blink)
    if(isBlinking && blinkProgress > 0){
      var blinkY = Math.sin(blinkProgress * Math.PI);
      if(blinkY > 0.08){
        [COORDS.leftEye, COORDS.rightEye].forEach(function(eye){
          var ex = eye.x * scaleX - padX + pX;
          var ey = (eye.y * scaleY - padY + pY) + (breathY + nodY) * 0.4;
          var erx = eye.rX * scaleX;
          var ery = eye.rY * scaleY * blinkY;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#9c7654";
          ctx.fill();

          ctx.strokeStyle = "rgba(42, 26, 16, 0.9)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(ex, ey + ery * 0.15, erx * 0.95, 1.2, 0, 0, Math.PI);
          ctx.stroke();
          ctx.restore();
        });
      }
    }

    ctx.restore();

    // 3D Koridor Tablosunu Canlı Güncelle
    if(window.corridorPosterTexture){
      window.corridorPosterTexture.needsUpdate = true;
    }
  }

  function renderWaveform(){
    if(!waveCanvas || !waveCtx || !analyser) return;
    var ww = waveCanvas.width;
    var wh = waveCanvas.height;

    waveCtx.clearRect(0, 0, ww, wh);

    if(!audioElement || audioElement.paused){
      waveCtx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      waveCtx.lineWidth = 1.5;
      waveCtx.beginPath();
      waveCtx.moveTo(0, wh / 2);
      waveCtx.lineTo(ww, wh / 2);
      waveCtx.stroke();
      return;
    }

    var bufferLength = analyser.frequencyBinCount;
    var barWidth = (ww / 36);
    var x = 0;

    for(var i = 0; i < 36; i++){
      var binIndex = Math.floor(i * (bufferLength / 48));
      var val = freqData ? freqData[binIndex] : 0;
      var percent = val / 255;
      var barHeight = Math.max(3, percent * (wh - 4));
      var y = (wh - barHeight) / 2;

      var barGrad = waveCtx.createLinearGradient(0, y, 0, y + barHeight);
      barGrad.addColorStop(0, "#ffd700");
      barGrad.addColorStop(0.5, "#d4af37");
      barGrad.addColorStop(1, "#8b2029");

      waveCtx.fillStyle = barGrad;
      waveCtx.fillRect(x, y, barWidth - 1.5, barHeight);
      x += barWidth;
    }
  }

  function renderFrame(){
    updateAudioAnalysis();
    renderPortrait();
    renderWaveform();
    animFrameId = requestAnimationFrame(renderFrame);
  }

  /* ── 5. ÇALMA LİSTESİ VE PARÇA YÖNETİMİ ──────────────────── */
  function playTrack(track){
    if(!track) return;
    currentTrack = track;

    var src = "";
    if(track.audioBlob){
      src = URL.createObjectURL(track.audioBlob);
    } else if(track.src){
      src = track.src;
    } else if(track.audioUrl){
      src = track.audioUrl;
    }

    if(!src) return;

    if(audioElement){
      audioElement.crossOrigin = "anonymous";
      audioElement.volume = 1.0;
      audioElement.muted = false;
      if(audioElement.src !== src){
        audioElement.src = src;
      }
    }

    initAudioEngine();
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }

    if(titleEl) titleEl.textContent = track.subTitle || track.title || "Sesli Risale";
    if(bookTagEl) bookTagEl.textContent = "📖 " + (track.bookTitle || "Risale-i Nur");

    var headerBadge = document.getElementById("portraitHeaderBadge");
    if(headerBadge){
      headerBadge.textContent = "📖 " + (track.bookTitle || "Risale-i Nur") + " · " + (track.subTitle || track.title || "Bölüm");
    }

    if(audioElement){
      audioElement.play().then(function(){
        updatePlayBtnIcon(true);
        renderPlaylist();
        if(typeof showToast === "function"){
          showToast("🎙️ " + (track.bookTitle ? (track.bookTitle + " · ") : "") + (track.subTitle || track.title) + " okunuyor...");
        }
      }).catch(function(err){
        console.warn("Playback error:", err);
      });
    }
  }

  function renderPlaylist(searchQuery){
    if(!playlistContainer) return;
    playlistContainer.innerHTML = "";

    if(!playlist.length){
      playlistContainer.innerHTML = "<div class='pl-empty'>Henüz sesli risale bölümü eklenmemiş.<br>Yukarıdaki <b>'+ MP3 Ekle'</b> butonundan ekleyebilirsiniz.</div>";
      return;
    }

    var itemsToRender = playlist;
    if(searchQuery){
      var q = searchQuery.toLowerCase().trim();
      itemsToRender = playlist.filter(function(t){
        return (t.bookTitle && t.bookTitle.toLowerCase().includes(q)) ||
               (t.subTitle && t.subTitle.toLowerCase().includes(q)) ||
               (t.title && t.title.toLowerCase().includes(q));
      });
      if(!itemsToRender.length){
        playlistContainer.innerHTML = "<div class='pl-empty'>\"" + escHTML(searchQuery) + "\" ile eşleşen sesli bölüm bulunamadı.</div>";
        return;
      }
    }

    // Kitap adına göre grupla
    var grouped = {};
    itemsToRender.forEach(function(t){
      var bName = t.bookTitle || "Genel Eserler";
      if(!grouped[bName]) grouped[bName] = [];
      grouped[bName].push(t);
    });

    Object.keys(grouped).forEach(function(bName){
      var groupDiv = document.createElement("div");
      groupDiv.className = "pl-book-group";

      var groupHeader = document.createElement("div");
      groupHeader.className = "pl-book-header";
      groupHeader.innerHTML = "<span class='pl-book-icon'>🏛️</span> <span class='pl-book-title'>" + escHTML(bName) + "</span> <span class='pl-count-badge'>" + grouped[bName].length + " Bölüm</span>";
      groupDiv.appendChild(groupHeader);

      var tracksList = document.createElement("div");
      tracksList.className = "pl-tracks-list";

      grouped[bName].forEach(function(track){
        var isCurrent = currentTrack && currentTrack.id === track.id;
        var item = document.createElement("div");
        item.className = "pl-track-item" + (isCurrent ? " active" : "");

        item.innerHTML =
          "<button type='button' class='pl-play-icon-btn'>" + (isCurrent && audioElement && !audioElement.paused ? "⏸" : "▶") + "</button>" +
          "<div class='pl-track-meta'>" +
            "<div class='pl-track-sub'>" + escHTML(track.subTitle || track.title || "Bölüm") + "</div>" +
            "<div class='pl-track-dur'>" + (track.duration || "Sesli Kayıt") + "</div>" +
          "</div>" +
          "<button type='button' class='pl-delete-btn' title='Bölümü Sil'>🗑️</button>";

        item.querySelector(".pl-play-icon-btn").addEventListener("click", function(e){
          e.stopPropagation();
          if(isCurrent && audioElement){
            togglePlay();
          } else {
            playTrack(track);
          }
        });

        item.addEventListener("click", function(){
          if(isCurrent && audioElement){
            togglePlay();
          } else {
            playTrack(track);
          }
        });

        var delBtn = item.querySelector(".pl-delete-btn");
        if(delBtn){
          delBtn.addEventListener("click", async function(e){
            e.stopPropagation();
            if(confirm("Bu sesli bölümü ('" + (track.subTitle || track.title) + "') kütüphaneden silmek istediğinize emin misiniz?")){
              await NurAudioStorage.remove(track.id);
              playlist = playlist.filter(function(x){ return x.id !== track.id; });
              updatePlaylistBadge();
              renderPlaylist();
              if(typeof showToast === "function") showToast("Sesli bölüm silindi.");
            }
          });
        }

        tracksList.appendChild(item);
      });

      groupDiv.appendChild(tracksList);
      playlistContainer.appendChild(groupDiv);
    });
  }

  function updatePlaylistBadge(){
    var count = playlist.length;
    if(playlistBadge) playlistBadge.textContent = count;
  }

  /* ── 6. OYNATICI KONTROLLERİ ─────────────────────────────── */
  function togglePlay(){
    if(audioElement){
      audioElement.crossOrigin = "anonymous";
      audioElement.volume = 1.0;
      audioElement.muted = false;
    }
    initAudioEngine();
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }
    if(!audioElement) return;

    if(!audioElement.src || audioElement.src === "" || audioElement.src === window.location.href){
      if(currentTrack){
        playTrack(currentTrack);
        return;
      } else if(playlist && playlist.length > 0){
        playTrack(playlist[0]);
        return;
      }
    }

    if(audioElement.paused){
      audioElement.play().then(function(){
        updatePlayBtnIcon(true);
        renderPlaylist();
      }).catch(function(err){
        console.warn("Play blocked:", err);
        updatePlayBtnIcon(false);
        if(typeof showToast === "function"){
          showToast("⚠️ Ses dosyası açılamadı. D: sürücüsündeki ses dosyalarını veya '+ MP3 Ekle' butonunu kontrol ediniz.");
        }
      });
    } else {
      audioElement.pause();
      updatePlayBtnIcon(false);
      renderPlaylist();
    }
  }

  function updatePlayBtnIcon(isPlaying){
    if(!playPauseBtn) return;
    playPauseBtn.innerHTML = isPlaying ? "<span>⏸</span> Duraklat" : "<span>▶</span> Dinle";
    playPauseBtn.classList.toggle("playing", isPlaying);
  }

  function formatTime(sec){
    if(isNaN(sec) || !isFinite(sec)) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }

  function openPlayer(customTitle, audioUrl){
    if(window.BarlaRoom && typeof window.BarlaRoom.open === "function"){
      window.BarlaRoom.open();
      if(playerPanel){
        playerPanel.classList.remove("open");
      }
    } else {
      if(playerPanel){
        playerPanel.classList.add("open");
        playerPanel.classList.remove("minimized");
      }
    }
    initAudioEngine();
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }

    if(audioUrl){
      var found = playlist.find(function(t){ return t.src === audioUrl; });
      if(found){
        playTrack(found);
      } else {
        playTrack({
          id: "temp_" + Date.now(),
          bookTitle: "Risale-i Nur",
          subTitle: customTitle || "Sesli Risale",
          src: audioUrl
        });
      }
    } else if(!currentTrack && playlist.length){
      playTrack(playlist[0]);
    }
  }

  function closePlayer(){
    if(playerPanel){
      playerPanel.classList.remove("open");
    }
    if(audioElement && !audioElement.paused){
      audioElement.pause();
      updatePlayBtnIcon(false);
      renderPlaylist();
    }
  }

  function minimizePlayer(){
    if(playerPanel){
      playerPanel.classList.toggle("minimized");
    }
  }

  function showTab(tabName){
    if(tabName === "portrait"){
      if(portraitStage) portraitStage.style.display = "flex";
      if(playlistView) playlistView.style.display = "none";
      if(tabPortraitBtn) tabPortraitBtn.classList.add("active");
      if(tabPlaylistBtn) tabPlaylistBtn.classList.remove("active");
    } else {
      if(portraitStage) portraitStage.style.display = "none";
      if(playlistView) playlistView.style.display = "block";
      if(tabPortraitBtn) tabPortraitBtn.classList.remove("active");
      if(tabPlaylistBtn) tabPlaylistBtn.classList.add("active");
      renderPlaylist();
    }
  }

  /* ── 7. "SESLİ BÖLÜM EKLE" MODAL YÖNETİMİ ────────────────── */
  function populateBookSelect(){
    if(!audioBookSelect) return;
    audioBookSelect.innerHTML = "";

    var canonBooks = [
      "Sözler", "Mektubat", "Lem'alar", "Şualar", "Asa-yı Musa",
      "Barla Lâhikası", "Kastamonu Lâhikası", "Emirdağ Lâhikası",
      "Tarihçe-i Hayat", "Sikke-i Tasdik", "Mesnevi-i Nuriye",
      "İşaratü'l-İ'caz", "Muhakemat", "İman ve Küfür Muvazeneleri"
    ];

    // Varsa customBooks'tan da kitap isimlerini ekle
    var extra = [];
    if(window.customBooks && window.customBooks.length){
      window.customBooks.forEach(function(b){
        if(b.title && !canonBooks.includes(b.title) && !extra.includes(b.title)){
          extra.push(b.title);
        }
      });
    }

    var grp1 = document.createElement("optgroup");
    grp1.label = "🏛️ Risale-i Nur Ana Külliyatı";
    canonBooks.forEach(function(title){
      var opt = document.createElement("option");
      opt.value = title;
      opt.textContent = title;
      grp1.appendChild(opt);
    });
    audioBookSelect.appendChild(grp1);

    if(extra.length){
      var grp2 = document.createElement("optgroup");
      grp2.label = "📚 Kütüphanedeki Diğer Eserler";
      extra.forEach(function(title){
        var opt = document.createElement("option");
        opt.value = title;
        opt.textContent = title;
        grp2.appendChild(opt);
      });
      audioBookSelect.appendChild(grp2);
    }

    var grpCustom = document.createElement("optgroup");
    grpCustom.label = "✏️ Özel / Yeni Eser";
    var optCustom = document.createElement("option");
    optCustom.value = "__custom__";
    optCustom.textContent = "➕ Yeni Kitap Adı Yaz...";
    grpCustom.appendChild(optCustom);
    audioBookSelect.appendChild(grpCustom);
  }

  function openAddAudioModal(preselectedBook){
    if(addAudioModal){
      populateBookSelect();
      resetAddAudioForm();
      if(preselectedBook && audioBookSelect){
        for(var i = 0; i < audioBookSelect.options.length; i++){
          if(audioBookSelect.options[i].value === preselectedBook || audioBookSelect.options[i].text.includes(preselectedBook)){
            audioBookSelect.selectedIndex = i;
            break;
          }
        }
      }
      addAudioModal.classList.add("open");
      if(audioSubTitleInput) audioSubTitleInput.focus();
    }
  }

  function closeAddAudioModal(){
    if(addAudioModal){
      addAudioModal.classList.remove("open");
      resetAddAudioForm();
    }
  }

  function cleanFileNameToTitle(fileName){
    if(!fileName) return "";
    var title = fileName.replace(/\.[^/.]+$/, ""); // uzantıyı kaldır (.mp3 vb)
    title = title.replace(/[_\-]+/g, " "); // alt çizgi ve tireleri boşluğa çevir
    title = title.replace(/\s+/g, " ").trim();
    return title;
  }

  function resetAddAudioForm(){
    selectedAudioFiles = [];
    if(audioFileInput) audioFileInput.value = "";
    if(audioSubTitleInput) audioSubTitleInput.value = "";
    if(audioCustomBookInput) audioCustomBookInput.value = "";
    if(audioCustomBookWrap) audioCustomBookWrap.style.display = "none";
    if(audioFileBadge) audioFileBadge.style.display = "none";
    if(audioSingleSubTitleWrap) audioSingleSubTitleWrap.style.display = "block";
    if(audioQueueContainer) audioQueueContainer.style.display = "none";
    if(audioQueueList) audioQueueList.innerHTML = "";
    if(audioSaveProgressWrap) audioSaveProgressWrap.style.display = "none";
    if(audioSaveProgressFill) audioSaveProgressFill.style.width = "0%";

    var urlInput = document.getElementById("audioUrlInput");
    if(urlInput) urlInput.value = "";
    var tabFile = document.getElementById("aamTabFile");
    var tabUrl = document.getElementById("aamTabUrl");
    var secFile = document.getElementById("aamFileSection");
    var secUrl = document.getElementById("aamUrlSection");
    if(tabFile) tabFile.classList.add("active");
    if(tabUrl) tabUrl.classList.remove("active");
    if(secFile) secFile.style.display = "block";
    if(secUrl) secUrl.style.display = "none";

    if(audioSaveBtn){
      audioSaveBtn.disabled = false;
      audioSaveBtn.innerHTML = "<span>✦</span> Kaydet &amp; Kütüphaneye Ekle";
    }
    var dropText = document.getElementById("audioDropText");
    if(dropText) dropText.textContent = "MP3 Dosyalarını Buraya Sürükleyin veya Tıklayın";
  }

  function renderQueueList(){
    if(!audioQueueList) return;
    audioQueueList.innerHTML = "";

    if(selectedAudioFiles.length === 0){
      resetAddAudioForm();
      return;
    }

    if(selectedAudioFiles.length === 1){
      if(audioSingleSubTitleWrap) audioSingleSubTitleWrap.style.display = "block";
      if(audioQueueContainer) audioQueueContainer.style.display = "none";
      if(audioFileBadge) audioFileBadge.style.display = "inline-flex";
      if(audioBadgeFileName) audioBadgeFileName.textContent = selectedAudioFiles[0].file.name;
      if(audioBadgeFileSize) audioBadgeFileSize.textContent = (selectedAudioFiles[0].file.size / (1024 * 1024)).toFixed(2) + " MB";
      if(audioSubTitleInput) audioSubTitleInput.value = selectedAudioFiles[0].subTitle;
      var dropText = document.getElementById("audioDropText");
      if(dropText) dropText.textContent = "Seçilen: " + selectedAudioFiles[0].file.name;
      if(audioSaveBtn) audioSaveBtn.innerHTML = "<span>✦</span> Kaydet &amp; Kütüphaneye Ekle";
      return;
    }

    // Çoklu dosya görünümü (> 1)
    if(audioSingleSubTitleWrap) audioSingleSubTitleWrap.style.display = "none";
    if(audioQueueContainer) audioQueueContainer.style.display = "block";
    if(audioFileBadge) audioFileBadge.style.display = "none";

    var totalBytes = 0;
    for(var i = 0; i < selectedAudioFiles.length; i++){
      totalBytes += selectedAudioFiles[i].file.size;
    }

    if(audioQueueCount) audioQueueCount.textContent = selectedAudioFiles.length;
    if(audioQueueTotalSize) audioQueueTotalSize.textContent = (totalBytes / (1024 * 1024)).toFixed(1) + " MB";

    var dropTextMulti = document.getElementById("audioDropText");
    if(dropTextMulti) dropTextMulti.textContent = selectedAudioFiles.length + " adet MP3 seçildi (Daha fazla ekleyebilirsiniz)";

    if(audioSaveBtn){
      audioSaveBtn.innerHTML = "<span>✦</span> Hepsini Kaydet (" + selectedAudioFiles.length + " MP3)";
    }

    selectedAudioFiles.forEach(function(item, idx){
      var row = document.createElement("div");
      row.className = "aam-queue-item";

      var icon = document.createElement("span");
      icon.className = "aam-queue-item-icon";
      icon.textContent = "🎵";

      var main = document.createElement("div");
      main.className = "aam-queue-item-main";

      var topRow = document.createElement("div");
      topRow.className = "aam-queue-item-top";

      var fileNameSpan = document.createElement("span");
      fileNameSpan.className = "aam-queue-item-file";
      fileNameSpan.title = item.file.name;
      fileNameSpan.textContent = (idx + 1) + ". " + item.file.name;

      var sizeSpan = document.createElement("span");
      sizeSpan.className = "aam-queue-item-size";
      sizeSpan.textContent = (item.file.size / (1024 * 1024)).toFixed(1) + " MB";

      topRow.appendChild(fileNameSpan);
      topRow.appendChild(sizeSpan);

      var input = document.createElement("input");
      input.type = "text";
      input.className = "aam-queue-item-input";
      input.placeholder = "Alt Başlık / Bahis Adı";
      input.value = item.subTitle;
      input.addEventListener("input", function(){
        item.subTitle = input.value;
      });

      main.appendChild(topRow);
      main.appendChild(input);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "aam-queue-item-del";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Listeden Çıkar";
      delBtn.addEventListener("click", function(){
        selectedAudioFiles.splice(idx, 1);
        renderQueueList();
      });

      row.appendChild(icon);
      row.appendChild(main);
      row.appendChild(delBtn);

      audioQueueList.appendChild(row);
    });
  }

  async function extractFilesFromDataTransfer(dataTransfer){
    var results = [];
    var items = dataTransfer.items;
    if(items && items.length && items[0].webkitGetAsEntry){
      var queue = [];
      for(var i = 0; i < items.length; i++){
        var entry = items[i].webkitGetAsEntry();
        if(entry) queue.push(entry);
      }
      while(queue.length > 0){
        var currentEntry = queue.shift();
        if(currentEntry.isFile){
          await new Promise(function(resolve){
            currentEntry.file(function(file){
              var bookGuess = "";
              if(currentEntry.fullPath){
                var parts = currentEntry.fullPath.split("/").filter(Boolean);
                if(parts.length > 1){
                  bookGuess = parts[parts.length - 2];
                }
              }
              results.push({ file: file, path: currentEntry.fullPath || file.name, bookGuess: bookGuess });
              resolve();
            }, function(){ resolve(); });
          });
        } else if(currentEntry.isDirectory){
          await new Promise(function(resolve){
            var dirReader = currentEntry.createReader();
            function readAll(){
              dirReader.readEntries(function(entries){
                if(!entries || entries.length === 0){
                  resolve();
                } else {
                  for(var k = 0; k < entries.length; k++){
                    queue.push(entries[k]);
                  }
                  readAll();
                }
              }, function(){ resolve(); });
            }
            readAll();
          });
        }
      }
    } else if(dataTransfer.files && dataTransfer.files.length){
      for(var j = 0; j < dataTransfer.files.length; j++){
        var fileObj = dataTransfer.files[j];
        results.push({ file: fileObj, path: fileObj.name, bookGuess: "" });
      }
    }
    return results;
  }

  function handleAudioFilesPicked(rawItems){
    if(!rawItems || !rawItems.length) return;

    var validEntries = [];
    for(var i = 0; i < rawItems.length; i++){
      var item = rawItems[i];
      var f = item.file ? item.file : item;
      var name = f.name.toLowerCase();
      if(name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".ogg") || name.endsWith(".m4a") || name.endsWith(".aac") || f.type.includes("audio")){
        validEntries.push({
          file: f,
          path: item.path || f.name,
          bookGuess: item.bookGuess || ""
        });
      }
    }

    if(validEntries.length === 0){
      if(typeof showToast === "function") showToast("Lütfen geçerli MP3 ses dosyaları seçin.");
      return;
    }

    var canonBooks = [
      "Sözler", "Mektubat", "Lem'alar", "Şualar", "Asa-yı Musa",
      "Barla Lâhikası", "Kastamonu Lâhikası", "Emirdağ Lâhikası",
      "Tarihçe-i Hayat", "Sikke-i Tasdik", "Mesnevi-i Nuriye",
      "İşaratü'l-İ'caz", "Muhakemat", "İman ve Küfür Muvazeneleri"
    ];

    validEntries.forEach(function(entry){
      var f = entry.file;
      var already = selectedAudioFiles.some(function(it){
        return it.file.name === f.name && it.file.size === f.size;
      });
      if(!already){
        var matchedBook = "";
        if(entry.bookGuess){
          var gLow = entry.bookGuess.toLowerCase();
          var found = canonBooks.find(function(b){ return b.toLowerCase().includes(gLow) || gLow.includes(b.toLowerCase()); });
          if(found) matchedBook = found;
          else matchedBook = entry.bookGuess;
        }

        selectedAudioFiles.push({
          id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
          file: f,
          subTitle: cleanFileNameToTitle(f.name),
          bookTitle: matchedBook
        });
      }
    });

    renderQueueList();
  }

  async function saveNewAudioTrack(){
    var isUrlMode = document.getElementById("aamTabUrl") && document.getElementById("aamTabUrl").classList.contains("active");
    var urlInput = document.getElementById("audioUrlInput");
    var mp3Url = urlInput ? urlInput.value.trim() : "";

    // 1. İNTERNET MP3 BAĞLANTISI (URL) İLE EKLEME
    if(isUrlMode || (selectedAudioFiles.length === 0 && mp3Url)){
      if(!mp3Url){
        if(typeof showToast === "function") showToast("Lütfen geçerli bir MP3 internet bağlantısı (URL) girin.");
        return;
      }
      var chosenBook = audioBookSelect ? audioBookSelect.value : "Sözler";
      if(chosenBook === "__custom__"){
        chosenBook = audioCustomBookInput ? audioCustomBookInput.value.trim() : "";
        if(!chosenBook) chosenBook = "Hususî Eser";
      }
      var subTitle = audioSubTitleInput && audioSubTitleInput.value.trim() ? audioSubTitleInput.value.trim() : "Özel MP3 Kaydı";
      var newTrack = {
        id: "custom_url_" + Date.now(),
        bookTitle: chosenBook,
        subTitle: subTitle,
        src: mp3Url,
        audioUrl: mp3Url,
        duration: "Online MP3",
        isCustom: true,
        createdAt: Date.now()
      };

      if(audioSaveBtn) audioSaveBtn.disabled = true;
      try {
        await NurAudioStorage.save(newTrack);
        playlist.unshift(newTrack);
        updatePlaylistBadge();
        renderPlaylist();
        closeAddAudioModal();
        if(typeof showToast === "function") showToast("🎙️ '" + chosenBook + " · " + subTitle + "' başarıyla eklendi!");
        if(window.BarlaRoom && window.BarlaRoom.refreshTracks){
          window.BarlaRoom.refreshTracks();
        }
        if(window.BarlaRoom && window.BarlaRoom.isOpen && window.BarlaRoom.isOpen()){
          window.BarlaRoom.playTrack(newTrack);
        } else {
          playTrack(newTrack);
        }
      } catch(err){
        console.error("URL audio save error:", err);
        if(typeof showToast === "function") showToast("Ses eklenirken bir hata oluştu.");
      } finally {
        if(audioSaveBtn) audioSaveBtn.disabled = false;
      }
      return;
    }

    // 2. BİLGİSAYARDAN DOSYA / KLASÖR İLE EKLEME
    if(selectedAudioFiles.length === 0){
      if(typeof showToast === "function") showToast("Lütfen en az bir MP3 ses dosyası seçin veya bir link girin.");
      return;
    }

    var chosenBook = audioBookSelect ? audioBookSelect.value : "Sözler";
    if(chosenBook === "__custom__"){
      chosenBook = audioCustomBookInput ? audioCustomBookInput.value.trim() : "";
      if(!chosenBook) chosenBook = "Hususî Eser";
    }

    // Tek dosya ise ve tekli input doldurulduysa başlığı güncelle
    if(selectedAudioFiles.length === 1 && audioSubTitleInput && audioSubTitleInput.value.trim()){
      selectedAudioFiles[0].subTitle = audioSubTitleInput.value.trim();
    }

    if(audioSaveBtn) audioSaveBtn.disabled = true;
    if(audioSaveProgressWrap) audioSaveProgressWrap.style.display = "block";

    var total = selectedAudioFiles.length;
    var firstNewTrack = null;
    var savedCount = 0;

    try{
      for(var i = 0; i < total; i++){
        var item = selectedAudioFiles[i];
        var pct = Math.round(((i + 1) / total) * 100);
        if(audioSaveProgressFill) audioSaveProgressFill.style.width = pct + "%";
        if(audioSaveProgressText){
          audioSaveProgressText.textContent = (i + 1) + " / " + total + " kaydediliyor: " + item.subTitle;
        }

        var trackId = "audio_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 1000);
        var subTitle = item.subTitle.trim() || item.file.name.replace(/\.[^/.]+$/, "");
        var bookForThisTrack = item.bookTitle || chosenBook;

        var newTrack = {
          id: trackId,
          bookTitle: bookForThisTrack,
          subTitle: subTitle,
          fileName: item.file.name,
          audioBlob: item.file,
          duration: (item.file.size / (1024 * 1024)).toFixed(1) + " MB",
          isCustom: true,
          createdAt: Date.now() + i
        };

        var saved = await NurAudioStorage.save(newTrack);
        if(saved !== false){
          playlist.unshift(newTrack);
          if(!firstNewTrack) firstNewTrack = newTrack;
          savedCount++;
        }
      }

      if(audioSaveProgressFill) audioSaveProgressFill.style.width = "100%";
      if(audioSaveProgressText) audioSaveProgressText.textContent = "Tamamlandı!";

      updatePlaylistBadge();
      renderPlaylist();
      closeAddAudioModal();

      if(typeof showToast === "function"){
        if(total === 1){
          showToast("🎙️ '" + (firstNewTrack ? firstNewTrack.bookTitle : chosenBook) + " · " + selectedAudioFiles[0].subTitle + "' eklendi!");
        } else {
          showToast("🎉 " + savedCount + " adet MP3 kaydı kütüphaneye başarıyla eklendi!");
        }
      }

      if(window.BarlaRoom && window.BarlaRoom.refreshTracks){
        window.BarlaRoom.refreshTracks();
      }

      if(firstNewTrack){
        if(window.BarlaRoom && window.BarlaRoom.isOpen && window.BarlaRoom.isOpen()){
          window.BarlaRoom.playTrack(firstNewTrack);
        } else {
          playTrack(firstNewTrack);
        }
      }
    }catch(err){
      console.error("Audio batch save error:", err);
      if(err && (err.name === "QuotaExceededError" || (err.message && err.message.includes("quota")))){
        if(typeof showToast === "function") showToast("⚠️ Tarayıcı hafıza kotası doldu! (" + savedCount + " parça kaydedilebildi).");
      } else {
        if(typeof showToast === "function") showToast("Sesler kaydedilirken bir hata oluştu.");
      }
    }finally{
      if(audioSaveBtn){
        audioSaveBtn.disabled = false;
        audioSaveBtn.innerHTML = "<span>✦</span> Kaydet &amp; Kütüphaneye Ekle";
      }
      if(audioSaveProgressWrap) audioSaveProgressWrap.style.display = "none";
    }
  }

  /* ── 8. DOM BAŞLATMA VE OLAY BAĞLAMA ─────────────────────── */
  async function initDOM(){
    playerPanel = document.getElementById("talkingPortraitPlayer");
    portraitCanvas = document.getElementById("talkingPortraitCanvas");
    if(portraitCanvas){
      ctx = portraitCanvas.getContext("2d");
      portraitCanvas.width = 1376;
      portraitCanvas.height = 768;
    }

    waveCanvas = document.getElementById("portraitWaveCanvas");
    if(waveCanvas){
      waveCtx = waveCanvas.getContext("2d");
      waveCanvas.width = 160;
      waveCanvas.height = 18;
    }

    audioElement = document.getElementById("risaleAudioSource");
    if(audioElement){
      audioElement.crossOrigin = "anonymous";
      audioElement.volume = 1.0;
      audioElement.muted = false;
    }
    playPauseBtn = document.getElementById("portraitPlayPause");
    progressBar = document.getElementById("portraitProgressWrap");
    progressFill = document.getElementById("portraitProgressFill");
    timeCurEl = document.getElementById("portraitTimeCur");
    timeTotEl = document.getElementById("portraitTimeTot");
    titleEl = document.getElementById("portraitTrackTitle");
    bookTagEl = document.getElementById("portraitBookTag");

    // Sekmeler ve Çalma Listesi
    portraitStage = document.getElementById("portraitStageWrap");
    playlistView = document.getElementById("portraitPlaylistView");
    tabPortraitBtn = document.getElementById("tabPortraitBtn");
    tabPlaylistBtn = document.getElementById("tabPlaylistBtn");
    playlistContainer = document.getElementById("playlistContainer");
    playlistBadge = document.getElementById("playlistBadge");

    // 3D Mouse Parallax Olayı
    if(portraitStage){
      portraitStage.addEventListener("mousemove", function(e){
        var r = portraitStage.getBoundingClientRect();
        targetMouseX = ((e.clientX - r.left) / r.width - 0.5) * 2;
        targetMouseY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      portraitStage.addEventListener("mouseleave", function(){
        targetMouseX = 0;
        targetMouseY = 0;
      });
    }

    if(tabPortraitBtn) tabPortraitBtn.addEventListener("click", function(){ showTab("portrait"); });
    if(tabPlaylistBtn) tabPlaylistBtn.addEventListener("click", function(){ showTab("playlist"); });

    var openAddModalBtn = document.getElementById("openAddAudioModalBtn");
    if(openAddModalBtn) openAddModalBtn.addEventListener("click", openAddAudioModal);

    // Modal Öğeleri
    addAudioModal = document.getElementById("addAudioModal");
    audioBookSelect = document.getElementById("audioBookSelect");
    audioCustomBookWrap = document.getElementById("audioCustomBookWrap");
    audioCustomBookInput = document.getElementById("audioCustomBookInput");
    audioSubTitleInput = document.getElementById("audioSubTitleInput");
    audioSingleSubTitleWrap = document.getElementById("audioSingleSubTitleWrap");
    audioQueueContainer = document.getElementById("audioQueueContainer");
    audioQueueCount = document.getElementById("audioQueueCount");
    audioQueueTotalSize = document.getElementById("audioQueueTotalSize");
    audioQueueList = document.getElementById("audioQueueList");
    audioQueueClearBtn = document.getElementById("audioQueueClearBtn");
    audioSaveProgressWrap = document.getElementById("audioSaveProgressWrap");
    audioSaveProgressFill = document.getElementById("audioSaveProgressFill");
    audioSaveProgressText = document.getElementById("audioSaveProgressText");
    audioFileInput = document.getElementById("audioFileInput");
    audioDropzone = document.getElementById("audioDropzone");
    audioFileBadge = document.getElementById("audioFileBadge");
    audioBadgeFileName = document.getElementById("audioBadgeFileName");
    audioBadgeFileSize = document.getElementById("audioBadgeFileSize");
    audioSaveBtn = document.getElementById("audioSaveBtn");

    if(audioQueueClearBtn){
      audioQueueClearBtn.addEventListener("click", resetAddAudioForm);
    }

    if(audioBookSelect){
      audioBookSelect.addEventListener("change", function(){
        if(audioCustomBookWrap){
          audioCustomBookWrap.style.display = audioBookSelect.value === "__custom__" ? "block" : "none";
        }
      });
    }

    var audioFolderInput = document.getElementById("audioFolderInput");
    var audioFolderPickBtn = document.getElementById("audioFolderPickBtn");
    if(audioFolderPickBtn && audioFolderInput){
      audioFolderPickBtn.addEventListener("click", function(e){
        e.stopPropagation();
        audioFolderInput.click();
      });
      audioFolderInput.addEventListener("change", function(){
        if(audioFolderInput.files && audioFolderInput.files.length){
          var list = [];
          for(var i = 0; i < audioFolderInput.files.length; i++){
            var f = audioFolderInput.files[i];
            var rel = f.webkitRelativePath || f.name;
            var parts = rel.split("/").filter(Boolean);
            var bookGuess = parts.length > 1 ? parts[parts.length - 2] : "";
            list.push({ file: f, path: rel, bookGuess: bookGuess });
          }
          handleAudioFilesPicked(list);
        }
      });
    }

    if(audioDropzone){
      audioDropzone.addEventListener("click", function(e){
        if(e.target === audioFolderPickBtn || (e.target && e.target.closest("#audioFolderPickBtn"))) return;
        if(audioFileInput) audioFileInput.click();
      });
      audioDropzone.addEventListener("dragover", function(e){ e.preventDefault(); audioDropzone.classList.add("dragover"); });
      audioDropzone.addEventListener("dragleave", function(){ audioDropzone.classList.remove("dragover"); });
      audioDropzone.addEventListener("drop", async function(e){
        e.preventDefault();
        audioDropzone.classList.remove("dragover");
        if(e.dataTransfer){
          var extracted = await extractFilesFromDataTransfer(e.dataTransfer);
          if(extracted && extracted.length){
            handleAudioFilesPicked(extracted);
          }
        }
      });
    }

    if(audioFileInput){
      audioFileInput.addEventListener("change", function(){
        if(audioFileInput.files && audioFileInput.files.length){
          handleAudioFilesPicked(audioFileInput.files);
        }
      });
    }

    // Çalma listesi alanına dosya veya klasör sürüklendiğinde de modalı aç ve yükle
    if(playlistView){
      playlistView.addEventListener("dragover", function(e){ e.preventDefault(); });
      playlistView.addEventListener("drop", async function(e){
        e.preventDefault();
        if(e.dataTransfer){
          openAddAudioModal();
          var extracted = await extractFilesFromDataTransfer(e.dataTransfer);
          if(extracted && extracted.length){
            handleAudioFilesPicked(extracted);
          }
        }
      });
    }

    // Sekme Değiştirici (Dosya vs Link)
    var tabFile = document.getElementById("aamTabFile");
    var tabUrl = document.getElementById("aamTabUrl");
    var secFile = document.getElementById("aamFileSection");
    var secUrl = document.getElementById("aamUrlSection");
    if(tabFile && tabUrl){
      tabFile.addEventListener("click", function(){
        tabFile.classList.add("active");
        tabUrl.classList.remove("active");
        if(secFile) secFile.style.display = "block";
        if(secUrl) secUrl.style.display = "none";
        if(audioSingleSubTitleWrap && selectedAudioFiles.length <= 1) audioSingleSubTitleWrap.style.display = "block";
      });
      tabUrl.addEventListener("click", function(){
        tabUrl.classList.add("active");
        tabFile.classList.remove("active");
        if(secFile) secFile.style.display = "none";
        if(secUrl) secUrl.style.display = "block";
        if(audioSingleSubTitleWrap) audioSingleSubTitleWrap.style.display = "block";
        var urlInp = document.getElementById("audioUrlInput");
        if(urlInp) urlInp.focus();
      });
    }

    if(audioSaveBtn) audioSaveBtn.addEventListener("click", saveNewAudioTrack);

    var addAudioClose = document.getElementById("addAudioModalClose");
    if(addAudioClose) addAudioClose.addEventListener("click", closeAddAudioModal);
    var addAudioCancel = document.getElementById("addAudioModalCancel");
    if(addAudioCancel) addAudioCancel.addEventListener("click", closeAddAudioModal);

    if(playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);

    if(audioElement){
      audioElement.addEventListener("timeupdate", function(){
        if(audioElement.duration){
          var pct = (audioElement.currentTime / audioElement.duration) * 100;
          if(progressFill) progressFill.style.width = pct + "%";
          if(timeCurEl) timeCurEl.textContent = formatTime(audioElement.currentTime);
          if(timeTotEl) timeTotEl.textContent = formatTime(audioElement.duration);
        }
      });
      audioElement.addEventListener("ended", function(){
        updatePlayBtnIcon(false);
        renderPlaylist();
        if(progressFill) progressFill.style.width = "0%";
      });
      audioElement.addEventListener("error", function(){
        updatePlayBtnIcon(false);
        renderPlaylist();
        console.warn("Audio element error: dosya bulunamadı veya açılamadı.");
      });
    }

    if(progressBar){
      progressBar.addEventListener("click", function(e){
        if(!audioElement || !audioElement.duration) return;
        var rect = progressBar.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var fraction = clickX / rect.width;
        audioElement.currentTime = fraction * audioElement.duration;
      });
    }

    var minBtn = document.getElementById("portraitMinBtn");
    if(minBtn) minBtn.addEventListener("click", minimizePlayer);

    var closeBtn = document.getElementById("portraitCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closePlayer);

    var plToggleBtn = document.getElementById("portraitPlaylistToggleBtn");
    if(plToggleBtn){
      plToggleBtn.addEventListener("click", function(){
        if(playlistView){
          playlistView.classList.toggle("open");
          if(playerPanel) playerPanel.classList.toggle("drawer-open", playlistView.classList.contains("open"));
          renderPlaylist();
        }
      });
    }

    var drawerCloseBtn = document.getElementById("portraitPlaylistDrawerCloseBtn");
    if(drawerCloseBtn){
      drawerCloseBtn.addEventListener("click", function(){
        if(playlistView){
          playlistView.classList.remove("open");
          if(playerPanel) playerPanel.classList.remove("drawer-open");
        }
      });
    }

    var fsBtn = document.getElementById("portraitFullscreenBtn");
    if(fsBtn){
      fsBtn.addEventListener("click", function(){
        if(playerPanel) playerPanel.classList.toggle("fullscreen");
      });
    }

    var prevBtn = document.getElementById("portraitPrevTrack");
    if(prevBtn){
      prevBtn.addEventListener("click", function(){
        if(!playlist || !playlist.length) return;
        var idx = playlist.indexOf(currentTrack);
        if(idx > 0) playTrack(playlist[idx - 1]);
        else playTrack(playlist[playlist.length - 1]);
      });
    }

    var nextBtn = document.getElementById("portraitNextTrack");
    if(nextBtn){
      nextBtn.addEventListener("click", function(){
        if(!playlist || !playlist.length) return;
        var idx = playlist.indexOf(currentTrack);
        if(idx !== -1 && idx < playlist.length - 1) playTrack(playlist[idx + 1]);
        else playTrack(playlist[0]);
      });
    }

    var volSlider = document.getElementById("portraitVolumeSlider");
    var muteBtn = document.getElementById("portraitMuteBtn");
    if(volSlider){
      volSlider.addEventListener("input", function(){
        var val = parseFloat(volSlider.value) / 100;
        if(audioElement){
          audioElement.volume = val;
          audioElement.muted = (val === 0);
        }
        if(muteBtn) muteBtn.textContent = val === 0 ? "🔇" : (val < 0.5 ? "🔉" : "🔊");
      });
    }
    if(muteBtn){
      muteBtn.addEventListener("click", function(){
        if(!audioElement) return;
        audioElement.muted = !audioElement.muted;
        if(audioElement.muted){
          muteBtn.textContent = "🔇";
        } else {
          var v = audioElement.volume;
          muteBtn.textContent = v < 0.5 ? "🔉" : "🔊";
        }
      });
    }

    var searchInput = document.getElementById("audioTrackSearchInput");
    if(searchInput){
      searchInput.addEventListener("input", function(){
        var q = searchInput.value.trim();
        renderPlaylist(q);
      });
    }

    var openBtnHeader = document.getElementById("headerAudioPortraitBtn");
    if(openBtnHeader) openBtnHeader.addEventListener("click", function(){
      openPlayer();
    });

    // Sesli okuma butonunu (#modalListen) bağla
    var modalListenBtn = document.getElementById("modalListen");
    if(modalListenBtn){
      modalListenBtn.addEventListener("click", function(){
        var bookModal = document.getElementById("book-modal");
        if(bookModal) bookModal.classList.remove("open");
        var modalTitle = document.getElementById("modalTitle");
        var t = modalTitle ? modalTitle.textContent : "Risale-i Nur";

        // Bu kitaba ait parça var mı?
        var found = playlist.find(function(x){
          return (x.bookTitle && x.bookTitle.toLowerCase().includes(t.toLowerCase())) ||
                 (t && t.toLowerCase().includes((x.bookTitle||"").toLowerCase()));
        });

        if(found){
          openPlayer();
          playTrack(found);
        } else {
          openPlayer();
          if(playlist.length > 0){
            playTrack(playlist[0]);
          }
        }
      });
    }

    // 3D Koridor Tablosu için Canvas Doku Köprüsü
    if(typeof THREE !== "undefined" && portraitCanvas){
      try{
        var dynTex = new THREE.CanvasTexture(portraitCanvas);
        dynTex.anisotropy = 4;
        window.corridorPosterTexture = dynTex;
      }catch(err){
        console.warn("3D poster canvas texture init:", err);
      }
    }

    // İlk Yükleme: NurAudioStorage'dan parça listesini çek
    await NurAudioStorage.init();
    var loadedTracks = await NurAudioStorage.getAll();

    // Yerel veya online sunucu kataloğunu (audio_catalog.json) yükle
    var serverTracks = [];
    try{
      var catRes = await fetch("audio_catalog.json?v=" + Date.now());
      if(catRes.ok){
        var rawCatalog = await catRes.json();
        if(Array.isArray(rawCatalog) && rawCatalog.length > 0){
          var firstTrack = rawCatalog[0];
          var testUrl = firstTrack.audioUrl || firstTrack.src || "";
          
          // Eğer online bir URL (CDN) ise doğrudan geçerli kabul et (CORS HEAD hatasına takılmamak için)
          if(testUrl && (testUrl.startsWith("http://") || testUrl.startsWith("https://"))){
            serverTracks = rawCatalog;
            console.log("Online ses kataloğu yüklendi:", rawCatalog.length, "parça");
          } else if(testUrl){
            // Yerel dosya ise erişilebilirlik kontrolü yap
            var accessible = false;
            try{
              var testRes = await fetch(testUrl, { method: "HEAD" });
              accessible = testRes.ok;
            }catch(e){ accessible = false; }

            if(accessible){
              serverTracks = rawCatalog;
            } else {
              console.warn("audio_catalog.json yerel dosyaları erişilemiyor.");
            }
          } else {
            serverTracks = rawCatalog;
          }
        }
      }
    }catch(err){
      console.warn("audio_catalog fetch:", err);
    }

    var allTracks = [];

    // Önce IndexedDB blob parçaları (bunlar her zaman çalışır)
    if(loadedTracks && loadedTracks.length){
      loadedTracks.forEach(function(lt){
        if(lt.id === "sample_birinci_soz" || (lt.src && lt.src.indexOf("risale_audio_sample") !== -1)){
          NurAudioStorage.remove(lt.id);
          return;
        }
        allTracks.push(lt);
      });
    }

    // Sonra sunucu parçaları (sadece erişilebilirlerse)
    if(serverTracks && serverTracks.length){
      serverTracks.forEach(function(st){
        if(!allTracks.some(function(t){ return t.id === st.id; })){
          allTracks.push(st);
        }
      });
    }

    if(window.DEFAULT_AUDIO_CATALOG && window.DEFAULT_AUDIO_CATALOG.length){
      window.DEFAULT_AUDIO_CATALOG.forEach(function(dt){
        if(!allTracks.some(function(t){ return t.id === dt.id; })){
          allTracks.push(dt);
        }
      });
    }

    playlist = allTracks;
    if(typeof window !== "undefined"){
      window.nurPlaylist = playlist;
      window.__AUDIO_CATALOG = playlist;
    }

    if(playlist.length > 0){
      currentTrack = playlist[0];
      if(titleEl) titleEl.textContent = currentTrack.subTitle || currentTrack.title || "Sesli Risale";
      if(bookTagEl) bookTagEl.textContent = "📖 " + (currentTrack.bookTitle || "Risale-i Nur");
      var initSrc = "";
      if(currentTrack.audioBlob){
        initSrc = URL.createObjectURL(currentTrack.audioBlob);
      } else {
        initSrc = currentTrack.audioUrl || currentTrack.src || "";
      }
      if(initSrc && audioElement){
        audioElement.crossOrigin = "anonymous";
        audioElement.volume = 1.0;
        audioElement.muted = false;
        audioElement.src = initSrc;
      }
    } else {
      currentTrack = null;
      if(titleEl) titleEl.textContent = "Parça Seçiniz";
      if(bookTagEl) bookTagEl.textContent = "📖 Risale-i Nur";
    }

    updatePlaylistBadge();
    renderPlaylist();
    renderFrame();
  }

  function escHTML(str){
    if(!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Dışa Açılan API
  window.TalkingPortrait = {
    open: openPlayer,
    close: closePlayer,
    togglePlay: togglePlay,
    playTrack: playTrack,
    openAddModal: openAddAudioModal,
    init: initDOM,
    getPlaylist: function(){ return playlist; },
    getCurrentTrack: function(){ return currentTrack; },
    getAudioElement: function(){ return audioElement; }
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initDOM);
  } else {
    initDOM();
  }
})();
