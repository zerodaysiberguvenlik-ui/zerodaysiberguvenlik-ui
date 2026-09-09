/* ============================================================
   NUR KORİDORU - SESLİ RİSALE & CANLI KONUŞAN ÜSTAD PORTRESİ
   2.5D Audio-Reactive Lip-Sync & Talking Portrait Engine
   Web Audio API (AudioContext + AnalyserNode) + Canvas 2D Deform
   ============================================================ */

(function(){
  "use strict";

  // 1. Durum Değişkenleri
  var audioCtx = null;
  var analyser = null;
  var audioSource = null;
  var freqData = null;
  var isAudioSetup = false;
  var currentAudioFile = "risale_audio_sample.mp3";
  var currentAudioTitle = "Birinci Söz · Bismillah Her Hayrın Başıdır (Sesli Risale)";

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
  var uploadInput = null;
  var uploadBtn = null;
  var waveCanvas = null;
  var waveCtx = null;

  // Üstad Portresi Görüntüsü
  var portraitImg = new Image();
  portraitImg.src = "bediuzzaman_poster.png";
  var imgLoaded = false;
  portraitImg.onload = function(){
    imgLoaded = true;
    renderFrame();
  };

  // Anatomik Koordinatlar (252 x 297 bediuzzaman_poster.png referansı)
  var COORDS = {
    w: 252,
    h: 297,
    // Ağız / Bıyık / Çene Bölgesi
    mouthX: 134,
    mouthY: 153,
    mouthW: 36,
    mouthH: 26,
    lipSeamY: 154,
    chinBottomY: 180,
    // Gözler
    leftEye: { x: 132, y: 122, rX: 9, rY: 5 },
    rightEye: { x: 168, y: 122, rX: 9, rY: 5 }
  };

  // 2. Web Audio API Kurulumu
  function initAudioEngine(){
    if(isAudioSetup) return;
    try{
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      freqData = new Uint8Array(analyser.frequencyBinCount);

      if(audioElement){
        audioSource = audioCtx.createMediaElementSource(audioElement);
        audioSource.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      isAudioSetup = true;
    }catch(e){
      console.warn("Web Audio API kurulamadı:", e);
    }
  }

  // 3. Ses Frekans Analizi & Lip-Sync Ölçümü
  function updateAudioAnalysis(){
    if(!analyser || !audioElement || audioElement.paused){
      mouthTarget = 0;
      mouthWidthMod = 0;
      return;
    }

    analyser.getByteFrequencyData(freqData);

    // İnsan sesinin ana konuşma formantları (yaklaşık 200 Hz - 2800 Hz)
    // 512 fftSize için her bin ~86 Hz (44.1kHz / 512)
    // Bin 2 - 32 konuşma bandıdır
    var speechEnergy = 0;
    var speechCount = 0;
    for(var i = 2; i <= 34 && i < freqData.length; i++){
      speechEnergy += freqData[i];
      speechCount++;
    }
    var avgSpeech = speechEnergy / (speechCount || 1); // 0 - 255

    // Tiz sesler (s, ş, e sesleri - dudak yayılması)
    var highEnergy = 0;
    for(var j = 35; j <= 60 && j < freqData.length; j++){
      highEnergy += freqData[j];
    }
    var avgHigh = highEnergy / 26;

    // Eşik değeri (gürültü filtreleme)
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

  // 4. Portre Çizimi ve Lip-Sync Deformasyonu (Canvas 2D)
  function renderPortrait(){
    if(!portraitCanvas || !ctx || !imgLoaded) return;

    var cw = portraitCanvas.width;
    var ch = portraitCanvas.height;

    // Yumuşak geçiş (Attack / Decay)
    var attackSpeed = 0.45; // Hızlı açılma
    var decaySpeed = 0.25;  // Doğal kapanma
    if(mouthTarget > mouthOpen){
      mouthOpen += (mouthTarget - mouthOpen) * attackSpeed;
    } else {
      mouthOpen += (mouthTarget - mouthOpen) * decaySpeed;
    }
    if(mouthOpen < 0.01) mouthOpen = 0;

    // Göz kırpma döngüsü
    var now = Date.now();
    if(!isBlinking && now > nextBlinkTime){
      isBlinking = true;
      blinkProgress = 0;
    }
    if(isBlinking){
      blinkProgress += 0.16; // Yaklaşık 120ms kırpma
      if(blinkProgress >= 1){
        blinkProgress = 0;
        isBlinking = false;
        nextBlinkTime = now + 2500 + Math.random() * 4000; // 2.5 - 6.5 sn arası
      }
    }

    // Nefes ve mikro salınım
    breathPhase += 0.03;
    var breathY = Math.sin(breathPhase) * 1.2;
    var nodY = headNod * 1.5;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Arka Plan Nur Işıltısı (Ses şiddetine göre hafif canlanan amber hale)
    var glowRadius = cw * 0.6 + (mouthOpen * 25);
    var glowGrad = ctx.createRadialGradient(cw * 0.55, ch * 0.45, 10, cw * 0.55, ch * 0.45, glowRadius);
    glowGrad.addColorStop(0, "rgba(212, 175, 55, " + (0.12 + mouthOpen * 0.15) + ")");
    glowGrad.addColorStop(0.6, "rgba(200, 140, 40, " + (0.04 + mouthOpen * 0.08) + ")");
    glowGrad.addColorStop(1, "rgba(10, 8, 6, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Ana Portre Katmanı (Üst yüz, sarık, omuzlar)
    ctx.save();
    // Hafif kafa salınımı
    ctx.translate(0, breathY + nodY);

    // Tüm resmi temel olarak çiz
    ctx.drawImage(portraitImg, 0, 0, cw, ch);

    // 3. Konuşma ve Dudak Deformasyonu (Ağız açıklığı > 0 ise)
    if(mouthOpen > 0.02){
      var maxDrop = 9.0; // Maksimum alt dudak / çene inme pikseli
      var drop = mouthOpen * maxDrop;
      var spread = mouthWidthMod * 4.0;

      // Kaynak koordinatları
      var sx = COORDS.mouthX;
      var sy = COORDS.lipSeamY;
      var sw = COORDS.mouthW;
      var sh = COORDS.chinBottomY - COORDS.lipSeamY; // Alt dudak ve çene yüksekliği

      // Hedef koordinatlar
      var scaleX = cw / COORDS.w;
      var scaleY = ch / COORDS.h;

      var dx = (sx - spread * 0.5) * scaleX;
      var dy = (sy + drop) * scaleY;
      var dw = (sw + spread) * scaleX;
      var dh = sh * scaleY;

      // 3.a. İç Ağız Boşluğu & Gölgesi (Dudaklar açılınca arkadan görünen derinlik)
      ctx.save();
      ctx.beginPath();
      var cavityX = (COORDS.mouthX + 4) * scaleX;
      var cavityY = (COORDS.lipSeamY - 1) * scaleY;
      var cavityW = (COORDS.mouthW - 8) * scaleX;
      var cavityH = drop * scaleY * 1.1;
      ctx.ellipse(cavityX + cavityW / 2, cavityY + cavityH / 2, cavityW / 2, Math.max(1, cavityH / 2), 0, 0, Math.PI * 2);
      
      // Doğal iç ağız ve dudak gölgesi rengi
      var cavGrad = ctx.createRadialGradient(
        cavityX + cavityW / 2, cavityY + cavityH / 2, 1,
        cavityX + cavityW / 2, cavityY + cavityH / 2, cavityW / 2
      );
      cavGrad.addColorStop(0, "#280b0e"); // Koyu vişne/gölge
      cavGrad.addColorStop(0.7, "#1a0809");
      cavGrad.addColorStop(1, "#0c0405");
      ctx.fillStyle = cavGrad;
      ctx.fill();
      ctx.restore();

      // 3.b. Alt Dudak ve Sakal/Çene Katmanını Aşağı Kaydırarak Çiz
      ctx.save();
      // Çenenin kenarlarını yumuşatmak için klip ve hafif gölge
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.45, dw * 0.58, dh * 0.55, 0, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        portraitImg,
        sx, sy, sw, sh,
        dx, dy, dw, dh
      );
      ctx.restore();

      // Dudak birleşim yerine hafif yumuşatıcı gölge çizgisi
      ctx.save();
      ctx.strokeStyle = "rgba(40, 15, 15, " + (0.5 * (1 - mouthOpen * 0.4)) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dx + 2, dy);
      ctx.lineTo(dx + dw - 2, dy);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Doğal Göz Kırpma Katmanı
    if(isBlinking && blinkProgress > 0){
      var blinkY = Math.sin(blinkProgress * Math.PI); // 0 -> 1 -> 0 eğrisi
      if(blinkY > 0.1){
        var scaleX = cw / COORDS.w;
        var scaleY = ch / COORDS.h;

        // Sol ve sağ göz kapağı çizimi
        [COORDS.leftEye, COORDS.rightEye].forEach(function(eye){
          var ex = eye.x * scaleX;
          var ey = eye.y * scaleY;
          var erx = eye.rX * scaleX;
          var ery = eye.rY * scaleY * blinkY;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
          // Ten rengi kapak gölgesi
          ctx.fillStyle = "#b48c66";
          ctx.fill();

          // Kirpik çizgisi
          ctx.strokeStyle = "rgba(50, 32, 20, 0.85)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(ex, ey + ery * 0.2, erx * 0.95, 1, 0, 0, Math.PI);
          ctx.stroke();
          ctx.restore();
        });
      }
    }

    ctx.restore();

    // 5. Üç Boyutlu Koridordaki Büyük Tablo Dokusunu Canlı Güncelle (Varsa)
    if(window.corridorPosterTexture){
      window.corridorPosterTexture.needsUpdate = true;
    }
  }

  // 5. Ses Dalgası / Visualizer Çizimi
  function renderWaveform(){
    if(!waveCanvas || !waveCtx || !analyser) return;
    var ww = waveCanvas.width;
    var wh = waveCanvas.height;

    waveCtx.clearRect(0, 0, ww, wh);

    if(!audioElement || audioElement.paused){
      // Duraklatıldığında sakin altın çizgi
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

  // 6. Ana Render Döngüsü (60 FPS)
  function renderFrame(){
    updateAudioAnalysis();
    renderPortrait();
    renderWaveform();
    animFrameId = requestAnimationFrame(renderFrame);
  }

  // 7. Oynatıcı Kontrolleri ve Olayları
  function togglePlay(){
    initAudioEngine();
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }
    if(!audioElement) return;

    if(audioElement.paused){
      audioElement.play().then(function(){
        updatePlayBtnIcon(true);
      }).catch(function(err){
        console.warn("Otomatik oynatma kısıtlandı:", err);
      });
    } else {
      audioElement.pause();
      updatePlayBtnIcon(false);
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

  function playCustomFile(file){
    if(!file) return;
    initAudioEngine();
    var objUrl = URL.createObjectURL(file);
    audioElement.src = objUrl;
    var name = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ");
    currentAudioTitle = name;
    if(titleEl) titleEl.textContent = name;
    audioElement.play().then(function(){
      updatePlayBtnIcon(true);
      if(typeof showToast === "function"){
        showToast("🎙️ '" + name + "' oynatılıyor...");
      }
    });
  }

  function openPlayer(customTitle, audioUrl){
    if(playerPanel){
      playerPanel.classList.add("open");
      playerPanel.classList.remove("minimized");
    }
    initAudioEngine();
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }

    if(customTitle && titleEl){
      currentAudioTitle = customTitle;
      titleEl.textContent = customTitle;
    }
    if(audioUrl && audioElement){
      audioElement.src = audioUrl;
      audioElement.play().then(function(){
        updatePlayBtnIcon(true);
      });
    }
  }

  function closePlayer(){
    if(playerPanel){
      playerPanel.classList.remove("open");
    }
    if(audioElement && !audioElement.paused){
      audioElement.pause();
      updatePlayBtnIcon(false);
    }
  }

  function minimizePlayer(){
    if(playerPanel){
      playerPanel.classList.toggle("minimized");
    }
  }

  // 8. DOM Başlatma & Olay Bağlama
  function initDOM(){
    playerPanel = document.getElementById("talkingPortraitPlayer");
    portraitCanvas = document.getElementById("talkingPortraitCanvas");
    if(portraitCanvas){
      ctx = portraitCanvas.getContext("2d");
      portraitCanvas.width = 252;
      portraitCanvas.height = 297;
    }

    waveCanvas = document.getElementById("portraitWaveCanvas");
    if(waveCanvas){
      waveCtx = waveCanvas.getContext("2d");
      waveCanvas.width = 240;
      waveCanvas.height = 26;
    }

    audioElement = document.getElementById("risaleAudioSource");
    playPauseBtn = document.getElementById("portraitPlayPause");
    progressBar = document.getElementById("portraitProgressWrap");
    progressFill = document.getElementById("portraitProgressFill");
    timeCurEl = document.getElementById("portraitTimeCur");
    timeTotEl = document.getElementById("portraitTimeTot");
    titleEl = document.getElementById("portraitTrackTitle");
    uploadInput = document.getElementById("portraitAudioUpload");
    uploadBtn = document.getElementById("portraitUploadBtn");

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
        if(progressFill) progressFill.style.width = "0%";
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

    if(uploadBtn && uploadInput){
      uploadBtn.addEventListener("click", function(){
        uploadInput.click();
      });
      uploadInput.addEventListener("change", function(){
        if(uploadInput.files && uploadInput.files.length){
          playCustomFile(uploadInput.files[0]);
        }
      });
    }

    var minBtn = document.getElementById("portraitMinBtn");
    if(minBtn) minBtn.addEventListener("click", minimizePlayer);

    var closeBtn = document.getElementById("portraitCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closePlayer);

    var openBtnHeader = document.getElementById("headerAudioPortraitBtn");
    if(openBtnHeader) openBtnHeader.addEventListener("click", function(){
      openPlayer();
    });

    var fabAudio = document.getElementById("fabAudioPortrait");
    if(fabAudio) fabAudio.addEventListener("click", function(){
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
        openPlayer(t + " (Sesli Risale)", "risale_audio_sample.mp3");
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

    // Animasyon döngüsünü başlat
    renderFrame();
  }

  // Dışa Açılan API
  window.TalkingPortrait = {
    open: openPlayer,
    close: closePlayer,
    togglePlay: togglePlay,
    playCustomFile: playCustomFile,
    init: initDOM
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initDOM);
  } else {
    initDOM();
  }
})();
