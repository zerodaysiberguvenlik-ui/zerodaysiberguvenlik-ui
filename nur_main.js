/*  Nur Koridoru — nur_main.js
    Three.js corridor + reader + library logic
    (split from index.html to avoid PowerShell length limits)
*/
(function(){
"use strict";
var reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ── 1. THREE.JS CORRIDOR ─────────────────────────────────── */
try{
var canvas=document.getElementById("scene-canvas");
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
var scene=new THREE.Scene();
var fogColor=0x14110D;
scene.background=new THREE.Color(fogColor);
scene.fog=new THREE.FogExp2(fogColor,0.028);
var camera=new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,0.1,200);
camera.position.set(0,1.6,8);
scene.add(new THREE.AmbientLight(0x2a2118,1.1));
scene.add(new THREE.HemisphereLight(0x3a2f1c,0x08070a,0.5));
var floorMat=new THREE.MeshStandardMaterial({color:0x1a1510,roughness:0.9,metalness:0.05});
var ceilMat=new THREE.MeshStandardMaterial({color:0x100d0a,roughness:1});
var woodMat=new THREE.MeshStandardMaterial({color:0x2a1f14,roughness:0.75,metalness:0.08});
var brassMat=new THREE.MeshStandardMaterial({color:0xC9A227,roughness:0.35,metalness:0.75});
var CORRIDOR_LEN=130,SEG=6,HALF_W=3.4,SEGMENTS=Math.floor(CORRIDOR_LEN/SEG);
var floor=new THREE.Mesh(new THREE.PlaneGeometry(HALF_W*2+2,CORRIDOR_LEN+20),floorMat);
floor.rotation.x=-Math.PI/2;floor.position.set(0,0,-CORRIDOR_LEN/2+8);scene.add(floor);
var ceil=floor.clone();ceil.material=ceilMat;ceil.position.y=4.6;ceil.rotation.x=Math.PI/2;scene.add(ceil);
var bookColors=[0x7A1620,0xD4AF37,0x8a1420,0xC98A3C,0x5c0f16,0xb8952f,0x6b1018,0x9c7a2e];
var TITLES=["Sozler","Mektubat","Lemlalar","Sualar","Tarihce-i Hayat","Barla Lahikasi","Kastamonu Lahikasi","Emirdag Lahikasi","Asa-yi Musa","Sikke-i Tasdik","Mesnevi-i Nuriye","Isarat-ul Icaz","Muhakemat"];
var texCache={},tCtr=0;
function getSpineTex(title){
  if(texCache[title])return texCache[title];
  var c=document.createElement("canvas");c.width=96;c.height=512;
  var ctx=c.getContext("2d");
  var g=ctx.createLinearGradient(0,0,0,512);g.addColorStop(0,"#8a1c28");g.addColorStop(1,"#3c0a10");
  ctx.fillStyle=g;ctx.fillRect(0,0,96,512);
  ctx.strokeStyle="#D4AF37";ctx.lineWidth=5;ctx.strokeRect(8,8,80,496);
  ctx.fillStyle="#e9cb75";ctx.font="italic 36px Georgia,serif";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.save();ctx.translate(48,256);ctx.rotate(Math.PI/2);ctx.fillText(title,0,0);ctx.restore();
  var t=new THREE.CanvasTexture(c);t.anisotropy=4;t.needsUpdate=true;
  texCache[title]=t;return t;
}
function buildWall(x,dir){
  var group=new THREE.Group();
  var frame=new THREE.Mesh(new THREE.BoxGeometry(0.5,4.2,SEG*0.94),woodMat);
  frame.position.set(x,2.1,0);group.add(frame);
  for(var s=0;s<3;s++){
    var sb=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.06,SEG*0.9),brassMat);
    sb.position.set(x+dir*0.06,0.9+s*1.15,0);group.add(sb);
    for(var i=0;i<9;i++){
      var bw=0.09+Math.random()*0.05,bh=0.55+Math.random()*0.35;
      var title=TITLES[tCtr%TITLES.length];tCtr++;
      var sm=new THREE.MeshStandardMaterial({map:getSpineTex(title),roughness:0.55,metalness:0.05});
      var pm=new THREE.MeshStandardMaterial({color:bookColors[Math.floor(Math.random()*bookColors.length)],roughness:0.6,metalness:0.05});
      var mats=[pm,pm,pm,pm,pm,pm];mats[dir>0?0:1]=sm;
      var bk=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,0.32),mats);
      bk.position.set(x+dir*0.28,0.9+s*1.15+bh/2+0.03,-SEG*0.42+i*(SEG*0.84/9)+(Math.random()-0.5)*0.03);
      bk.rotation.y=(Math.random()-0.5)*0.05;group.add(bk);
    }
  }
  return group;
}
var lamps=[];
for(var i=0;i<SEGMENTS;i++){
  var z=-i*SEG-3;
  var L=buildWall(-HALF_W,1);L.position.z=z;scene.add(L);
  var R=buildWall(HALF_W,-1);R.position.z=z;scene.add(R);
  if(i%2===0){
    var bulb=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,12),new THREE.MeshBasicMaterial({color:0xffdca0}));
    bulb.position.set(0,3.9,z);scene.add(bulb);
    var pl=new THREE.PointLight(0xffb060,1.4,9,2);pl.position.set(0,3.85,z);scene.add(pl);
    lamps.push({light:pl,base:1.4,phase:Math.random()*10});
  }
}

/* ── KORİDORUN SONU: BEDİÜZZAMAN SAİD NURSÎ POSTERİ & ÇERÇEVE ── */
var endWallZ = -CORRIDOR_LEN + 3.0; // yaklaşık -127.0
var endGroup = new THREE.Group();

// Arka kapatma duvarı (End Wall)
var endWallMat = new THREE.MeshStandardMaterial({ color: 0x16120d, roughness: 0.9, metalness: 0.05 });
var endWall = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 1.2, 5.0), endWallMat);
endWall.position.set(0, 2.3, endWallZ);
endGroup.add(endWall);

// Yan ahşap sütunlar ve mimari pervazlar
var colL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 0.25), woodMat);
colL.position.set(-HALF_W + 0.15, 2.3, endWallZ + 0.12);
var colR = colL.clone();
colR.position.x = HALF_W - 0.15;
endGroup.add(colL); endGroup.add(colR);

// Tavan silmesi ve taban kaidesi
var cornice = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 1.2, 0.2, 0.25), brassMat);
cornice.position.set(0, 4.5, endWallZ + 0.12);
var baseboard = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 1.2, 0.25, 0.2), woodMat);
baseboard.position.set(0, 0.12, endWallZ + 0.1);
endGroup.add(cornice); endGroup.add(baseboard);

// Altın Varaklı Çerçeve ve Poster
var posterW = 2.7, posterH = 3.18; // 252/297 en boy oranına sadık
var frameDepth = 0.1, frameBorder = 0.18;

// Poster Dokusu (Bediüzzaman Said Nursî)
var posterTex = new THREE.TextureLoader().load('bediuzzaman_poster.png');
posterTex.anisotropy = 4;
var posterMat = new THREE.MeshStandardMaterial({
  map: posterTex,
  roughness: 0.38,
  metalness: 0.04
});
var posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(posterW, posterH), posterMat);
posterMesh.position.set(0, 2.32, endWallZ + 0.08);
endGroup.add(posterMesh);

// Çerçeve Kenarları (Klasik Altın Varak Görünümü)
var frameGoldMat = new THREE.MeshStandardMaterial({
  color: 0xD4AF37,
  roughness: 0.3,
  metalness: 0.8
});
var topFrame = new THREE.Mesh(new THREE.BoxGeometry(posterW + frameBorder * 2, frameBorder, frameDepth), frameGoldMat);
topFrame.position.set(0, 2.32 + posterH / 2 + frameBorder / 2, endWallZ + 0.08);
var botFrame = topFrame.clone();
botFrame.position.y = 2.32 - posterH / 2 - frameBorder / 2;
var leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, posterH, frameDepth), frameGoldMat);
leftFrame.position.set(-posterW / 2 - frameBorder / 2, 2.32, endWallZ + 0.08);
var rightFrame = leftFrame.clone();
rightFrame.position.x = posterW / 2 + frameBorder / 2;
endGroup.add(topFrame); endGroup.add(botFrame); endGroup.add(leftFrame); endGroup.add(rightFrame);

// Çerçeve Köşe Rozetleri
var cornerMat = new THREE.MeshStandardMaterial({ color: 0xE6C86E, roughness: 0.22, metalness: 0.88 });
[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function(s){
  var crn = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, frameDepth * 1.35), cornerMat);
  crn.position.set(s[0] * (posterW / 2 + frameBorder / 2), 2.32 + s[1] * (posterH / 2 + frameBorder / 2), endWallZ + 0.09);
  endGroup.add(crn);
});

// Pirinç İsim Levhası
var plaqueCanvas = document.createElement("canvas");
plaqueCanvas.width = 512; plaqueCanvas.height = 128;
var pCtx = plaqueCanvas.getContext("2d");
var pGrad = pCtx.createLinearGradient(0, 0, 512, 128);
pGrad.addColorStop(0, "#9c7820"); pGrad.addColorStop(0.5, "#f7dc88"); pGrad.addColorStop(1, "#9c7820");
pCtx.fillStyle = pGrad; pCtx.fillRect(0, 0, 512, 128);
pCtx.strokeStyle = "#503908"; pCtx.lineWidth = 6; pCtx.strokeRect(6, 6, 500, 116);
pCtx.fillStyle = "#1e1405"; pCtx.font = "bold 32px Georgia, serif";
pCtx.textAlign = "center"; pCtx.textBaseline = "middle";
pCtx.fillText("BEDİÜZZAMAN SAİD NURSÎ", 256, 46);
pCtx.font = "italic 24px Georgia, serif";
pCtx.fillText("1878 — 1960", 256, 88);
var plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
var plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.3, metalness: 0.6 });
var plaqueMesh = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.38, 0.04), plaqueMat);
plaqueMesh.position.set(0, 2.32 - posterH / 2 - frameBorder - 0.24, endWallZ + 0.07);
endGroup.add(plaqueMesh);

// Tablo Üstü Galeri Aydınlatma Armatürü
var arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8), brassMat);
arm1.rotation.x = Math.PI / 3.2; arm1.position.set(-0.4, 2.32 + posterH / 2 + 0.36, endWallZ + 0.22);
var arm2 = arm1.clone(); arm2.position.x = 0.4;
var lampBar = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.4, 16), brassMat);
lampBar.rotation.z = Math.PI / 2;
lampBar.position.set(0, 2.32 + posterH / 2 + 0.48, endWallZ + 0.38);
endGroup.add(arm1); endGroup.add(arm2); endGroup.add(lampBar);

// Tablo Spot Işığı
var posterSpot = new THREE.SpotLight(0xffe2a4, 4.2, 12, Math.PI / 3.4, 0.35, 1.4);
posterSpot.position.set(0, 2.32 + posterH / 2 + 0.48, endWallZ + 0.4);
posterSpot.target = posterMesh;
endGroup.add(posterSpot);
endGroup.add(posterSpot.target);

// Tablonun Çevresindeki İlahi Nur / Altın Işık Haresi
var posterHalo = new THREE.PointLight(0xD4AF37, 2.2, 7, 1.8);
posterHalo.position.set(0, 2.32, endWallZ + 0.25);
endGroup.add(posterHalo);

scene.add(endGroup);

/* ── KORİDORDA YÜRÜYEN BEDİÜZZAMAN SAİD NURSÎ ─────────────── */
var walkerGroup = new THREE.Group();

var walkerTex = new THREE.TextureLoader().load('bediuzzaman_walking_clean.png');
walkerTex.anisotropy = 4;

var walkerMat = new THREE.MeshStandardMaterial({
  map: walkerTex,
  transparent: true,
  alphaTest: 0.05,
  roughness: 0.62,
  metalness: 0.04,
  side: THREE.DoubleSide
});

// Yükseklik 2.05 birim, En 0.65 birim (oran: 0.314)
var walkerGeo = new THREE.PlaneGeometry(0.65, 2.05);
walkerGeo.translate(0, 1.025, 0); // Pivot tam ayak hizasında (y=0)

var walkerMesh = new THREE.Mesh(walkerGeo, walkerMat);
walkerGroup.add(walkerMesh);

// Yumuşak Temas Zemin Gölgesi (Contact Shadow)
var shCanvas = document.createElement("canvas");
shCanvas.width = 128; shCanvas.height = 128;
var shCtx = shCanvas.getContext("2d");
var shG = shCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
shG.addColorStop(0, "rgba(0,0,0,0.72)");
shG.addColorStop(0.5, "rgba(0,0,0,0.25)");
shG.addColorStop(1, "rgba(0,0,0,0)");
shCtx.fillStyle = shG; shCtx.fillRect(0, 0, 128, 128);
var shTex = new THREE.CanvasTexture(shCanvas);
var shadowMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.85, 0.52),
  new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.75, depthWrite: false })
);
shadowMesh.rotation.x = -Math.PI / 2;
shadowMesh.position.y = 0.02;
walkerGroup.add(shadowMesh);

// Şahsın Etrafındaki Manevi Fener Işığı (Koridordaki rafları ve yolu aydınlatır)
var walkerLight = new THREE.PointLight(0xffe09e, 2.6, 6.5, 1.8);
walkerLight.position.set(0, 1.25, 0.25);
walkerGroup.add(walkerLight);

var walkerBackGlow = new THREE.PointLight(0xD4AF37, 1.4, 4.0, 2);
walkerBackGlow.position.set(0, 1.35, -0.2);
walkerGroup.add(walkerBackGlow);

// Başlangıç pozisyonu
walkerGroup.position.set(0, 0, 1.5);
scene.add(walkerGroup);

var DUST_N=260,dustPos=new Float32Array(DUST_N*3);
for(var d=0;d<DUST_N;d++){dustPos[d*3]=(Math.random()-0.5)*HALF_W*1.8;dustPos[d*3+1]=Math.random()*4.2;dustPos[d*3+2]=-Math.random()*CORRIDOR_LEN;}
var dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));
var dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xE0C263,size:0.02,transparent:true,opacity:0.55}));
scene.add(dust);

/* ── FAREYE BAĞLI DİNAMİK GAZ LAMBASI / KANDİL IŞIĞI ────────── */
var mouseLantern = new THREE.PointLight(0xffbe68, 2.6, 12, 1.8);
mouseLantern.position.set(0, 1.6, 5);
scene.add(mouseLantern);

var flameGeo = new THREE.SphereGeometry(0.04, 12, 12);
var flameMat = new THREE.MeshBasicMaterial({ color: 0xfff2ba });
var flameMesh = new THREE.Mesh(flameGeo, flameMat);
mouseLantern.add(flameMesh);

var targetLanternX = 0, targetLanternY = 1.6, targetLanternZ = 5;
var curMouseX = window.innerWidth / 2, curMouseY = window.innerHeight / 2;
var targetMouseX = curMouseX, targetMouseY = curMouseY;

/* ── 3D KORİDOR HİKMET MÜHRÜ (FLOATING SEAL MEDALLION) ──────── */
var sealGroup = new THREE.Group();
sealGroup.position.set(0, 1.85, -14.0);

// Mühür Dokusu (Altın Varak ve Hat İşlemesi)
var sealCanvas = document.createElement("canvas");
sealCanvas.width = 512; sealCanvas.height = 512;
var sCtx = sealCanvas.getContext("2d");
var sGrad = sCtx.createRadialGradient(256, 256, 30, 256, 256, 256);
sGrad.addColorStop(0, "#fff0be"); sGrad.addColorStop(0.55, "#d4af37"); sGrad.addColorStop(1, "#734e0a");
sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 512);
sCtx.strokeStyle = "#382003"; sCtx.lineWidth = 14; sCtx.strokeRect(14, 14, 484, 484);
sCtx.beginPath(); sCtx.arc(256, 256, 226, 0, Math.PI * 2);
sCtx.lineWidth = 8; sCtx.strokeStyle = "#fff3c4"; sCtx.stroke();
sCtx.beginPath(); sCtx.arc(256, 256, 204, 0, Math.PI * 2);
sCtx.lineWidth = 4; sCtx.strokeStyle = "#4d2e05"; sCtx.stroke();
sCtx.fillStyle = "#221303"; sCtx.font = "bold 64px Georgia, serif";
sCtx.textAlign = "center"; sCtx.textBaseline = "middle";
sCtx.fillText("✦", 256, 172);
sCtx.font = "bold 38px Georgia, serif";
sCtx.fillText("HİKMET MÜHRÜ", 256, 256);
sCtx.font = "italic 25px Georgia, serif";
sCtx.fillText("Risale-i Nur", 256, 320);
sCtx.font = "32px serif";
sCtx.fillText("۞", 256, 376);

var sealTex = new THREE.CanvasTexture(sealCanvas);
sealTex.anisotropy = 4;
var sealDiscMat = new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.32, metalness: 0.82 });
var sealRimMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.25, metalness: 0.9 });
var sealMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 36), [sealRimMat, sealDiscMat, sealDiscMat]);
sealMesh.rotation.x = Math.PI / 2;
sealGroup.add(sealMesh);

var sealHaloMesh = new THREE.Mesh(
  new THREE.RingGeometry(0.59, 0.78, 36),
  new THREE.MeshBasicMaterial({ color: 0xffd978, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
);
sealGroup.add(sealHaloMesh);

var sealLight = new THREE.PointLight(0xD4AF37, 2.2, 6.0, 2.0);
sealGroup.add(sealLight);
scene.add(sealGroup);

window.addEventListener("resize",function(){camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
var scrollFrac=0,targetZ=8,curZ=8,lastCurZ=8;
function updateSF(){
  var max=document.documentElement.scrollHeight-window.innerHeight;
  scrollFrac=max>0?window.scrollY/max:0;
  document.getElementById("progFill").style.width=(scrollFrac*100).toFixed(1)+"%";
  targetZ=8-scrollFrac*(CORRIDOR_LEN-4);
}
window.addEventListener("scroll",updateSF,{passive:true});updateSF();

var clock=new THREE.Clock();
var walkerZ = 1.5, walkerX = 0, walkPhase = 0;

function animate(){
  requestAnimationFrame(animate);
  var t=clock.getElapsedTime();
  var prevZ = curZ;
  curZ+=(targetZ-curZ)*0.07;
  camera.position.z=curZ;
  
  // Koridorun sonuna yaklaşıldığında kamera portreye merkezlenir
  var endBlend=Math.max(0,Math.min(1,(-curZ-70)/45));
  camera.position.y=1.6+(endBlend*0.35)+Math.sin(t*0.5)*0.03*(1-endBlend*0.75);
  camera.position.x=Math.sin(t*0.35)*0.12*(1-endBlend*0.85);
  
  var lookY=1.55+endBlend*0.65; // Portre merkezine bakar
  camera.lookAt(Math.sin(t*0.2)*0.3*(1-endBlend),lookY,curZ-8);

  // ── YÜRÜYEN ŞAHIS ANİMASYONU VE KORİDORDA İLERLEME ──
  var distAhead = 6.2;
  var targetWalkerZ = curZ - distAhead;
  
  var finalApproach = Math.max(0, Math.min(1, (-curZ - 88) / 26));
  var targetWalkerX = finalApproach * 1.15;
  var maxZ = endWallZ + 1.8;
  if (targetWalkerZ < maxZ) targetWalkerZ = maxZ;

  walkerZ += (targetWalkerZ - walkerZ) * 0.07;
  walkerX += (targetWalkerX - walkerX) * 0.055;

  var scrollDelta = Math.abs(curZ - prevZ);
  var speed = scrollDelta * 36 + (reduceMotion ? 0 : 0.028);
  walkPhase += speed;

  var stepBob = (finalApproach < 0.96 ? Math.abs(Math.sin(walkPhase * 2)) * 0.045 : 0);
  var stepSway = (finalApproach < 0.96 ? Math.sin(walkPhase) * 0.032 : 0);

  walkerGroup.position.set(walkerX + stepSway, stepBob, walkerZ);

  walkerMesh.rotation.z = (finalApproach < 0.96 ? Math.sin(walkPhase) * 0.018 : 0);
  walkerMesh.rotation.x = (finalApproach < 0.96 ? Math.sin(walkPhase * 2) * 0.012 : 0);

  shadowMesh.scale.set(
    1.0 + Math.sin(walkPhase * 2) * 0.08,
    1.0 - Math.sin(walkPhase * 2) * 0.06,
    1.0
  );

  walkerLight.intensity = 2.4 + Math.sin(t * 3.5) * 0.25;

  // ── FAREYE BAĞLI GAZ LAMBASI IŞIĞI GÜNCELLEMESİ ──
  mouseLantern.position.x += (targetLanternX - mouseLantern.position.x) * 0.08;
  mouseLantern.position.y += (targetLanternY - mouseLantern.position.y) * 0.08;
  mouseLantern.position.z += (targetLanternZ - mouseLantern.position.z) * 0.1;

  var flameFlicker = Math.sin(t * 12.3) * 0.22 + Math.sin(t * 26.7) * 0.12 + (Math.random() - 0.5) * 0.08;
  mouseLantern.intensity = Math.max(1.6, 2.5 + flameFlicker);
  flameMesh.scale.setScalar(1 + flameFlicker * 0.35);

  // 2D Kandil öğesini ekranda yumuşakça süzdür
  curMouseX += (targetMouseX - curMouseX) * 0.16;
  curMouseY += (targetMouseY - curMouseY) * 0.16;
  if(candleEl){
    candleEl.style.transform = "translate(" + curMouseX + "px, " + curMouseY + "px) translate(-50%, -50%)";
  }

  // ── 3D HİKMET MÜHRÜ SALINIMI VE DÖNÜŞÜ ──
  sealGroup.rotation.y += (reduceMotion ? 0.003 : 0.015);
  sealGroup.position.y = 1.85 + Math.sin(t * 1.8) * 0.08;
  sealHaloMesh.rotation.z -= 0.01;
  sealLight.intensity = 2.0 + Math.sin(t * 3.2) * 0.45;
  
  for(var k=0;k<lamps.length;k++){var lp=lamps[k];lp.light.intensity=lp.base+Math.sin(t*3+lp.phase)*0.18+(reduceMotion?0:(Math.random()-0.5)*0.05);}
  var pos=dust.geometry.attributes.position;
  for(var j=0;j<DUST_N;j++){pos.array[j*3+1]+=0.0025;if(pos.array[j*3+1]>4.3)pos.array[j*3+1]=0;}
  pos.needsUpdate=true;renderer.render(scene,camera);
}
animate();

var corridorRaycaster = new THREE.Raycaster();
window.addEventListener("pointermove", function(e){
  targetMouseX = e.clientX;
  targetMouseY = e.clientY;
  if(candleEl) candleEl.classList.add("active");
  
  var nx = (e.clientX / window.innerWidth) * 2 - 1;
  var ny = -(e.clientY / window.innerHeight) * 2 + 1;
  targetLanternX = nx * 2.8;
  targetLanternY = 1.6 + ny * 1.2;
  targetLanternZ = curZ - 3.2;

  if(window.scrollY < window.innerHeight * 1.4){
    corridorRaycaster.setFromCamera({ x: nx, y: ny }, camera);
    var hits = corridorRaycaster.intersectObject(sealMesh);
    if(hits.length > 0){
      canvas.style.cursor = "pointer";
    } else if(canvas.style.cursor === "pointer"){
      canvas.style.cursor = "default";
    }
  }
});

canvas.addEventListener("click", function(e){
  if(window.scrollY > window.innerHeight * 1.4) return;
  var nx = (e.clientX / window.innerWidth) * 2 - 1;
  var ny = -(e.clientY / window.innerHeight) * 2 + 1;
  corridorRaycaster.setFromCamera({ x: nx, y: ny }, camera);
  var hits = corridorRaycaster.intersectObject(sealMesh);
  if(hits.length > 0){
    if(typeof window.openHikmetModal === "function") window.openHikmetModal();
  }
});
}catch(err){console.error("3D hata:",err);}

/* ── 2. PER-CHAPTER CANVAS BACKGROUNDS ───────────────────── */
var THEME_COLORS={kulliyat:{a:"#3a2f14",b:"#0f0c08",glow:"#D4AF37"},hayat:{a:"#3a2413",b:"#120c08",glow:"#C98A3C"},risaleler:{a:"#331611",b:"#0f0806",glow:"#C97A37"}};
function initCanvas(el,theme){
  var ctx=el.getContext("2d"),w,h,dpr=Math.min(window.devicePixelRatio,2),particles=[],colors=THEME_COLORS[theme]||THEME_COLORS.kulliyat;
  function sz(){var r=el.getBoundingClientRect();w=el.width=Math.max(1,r.width*dpr);h=el.height=Math.max(1,r.height*dpr);}
  sz();window.addEventListener("resize",sz);
  if(!reduceMotion)for(var i=0;i<46;i++)particles.push({x:Math.random(),y:Math.random(),r:0.6+Math.random()*1.8,sp:0.02+Math.random()*0.05,drift:(Math.random()-0.5)*0.15,phase:Math.random()*Math.PI*2});
  var t0=performance.now();
  function draw(now){
    var t=(now-t0)/1000;ctx.clearRect(0,0,w,h);
    var gr=ctx.createLinearGradient(0,0,w*0.3+Math.sin(t*0.15)*w*0.15,h);gr.addColorStop(0,colors.a);gr.addColorStop(1,colors.b);ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
    var rg=ctx.createRadialGradient(w*0.5+Math.sin(t*0.1)*w*0.08,h*0.35,0,w*0.5,h*0.4,w*0.65);rg.addColorStop(0,colors.glow+"33");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,w,h);
    for(var i=0;i<particles.length;i++){var p=particles[i];var px=((p.x+Math.sin(t*p.sp+p.phase)*0.04+p.drift*t*0.02)%1+1)%1;var py=((p.y-t*p.sp*0.4)%1+1)%1;ctx.beginPath();ctx.arc(px*w,py*h,p.r*dpr,0,Math.PI*2);ctx.fillStyle=colors.glow+"55";ctx.fill();}
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
document.querySelectorAll(".chapter").forEach(function(sec){var cv=sec.querySelector(".bg-canvas");if(cv)initCanvas(cv,sec.getAttribute("data-theme"));});

/* ── 3. IN-VIEW ──────────────────────────────────────────── */
var sceneVeil=document.getElementById("scene-veil");
function observeChapter(sec){
  new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){if(!e.target.classList.contains("in-view")){sceneVeil.classList.remove("flash");void sceneVeil.offsetWidth;sceneVeil.classList.add("flash");}e.target.classList.add("in-view");}});},{threshold:0.32}).observe(sec);
}
document.querySelectorAll(".chapter").forEach(observeChapter);

/* ── 4. BOOK MODAL ───────────────────────────────────────── */
var modal=document.getElementById("book-modal");
var modalTitle=document.getElementById("modalTitle");
var modalDesc=document.getElementById("modalDesc");
function openModal(t,d){modalTitle.textContent=t;modalDesc.textContent=d;modal.classList.add("open");}
function closeModal(){modal.classList.remove("open");}
document.getElementById("modalClose").addEventListener("click",closeModal);
document.getElementById("modalClose2").addEventListener("click",closeModal);
modal.addEventListener("click",function(e){if(e.target===modal)closeModal();});

/* ── 5. INTERACTIVE 3D HOLOGRAPHIC BOOK CAROUSEL ─────────── */
var stageManagers=new Map();
var texBookCache={};

function getBookTextures(title,theme,customColor){
  var isCustom = false;
  if(window.customBooks && window.customBooks.length){
    var cb = window.customBooks.find(function(b){ return b.title === title; });
    if(cb){
      isCustom = true;
      if(!customColor && cb.color) customColor = cb.color;
    }
  }
  var key=title+"_"+theme+"_"+(customColor||"");
  if(texBookCache[key])return texBookCache[key];

  // 1. Kapak Dokusu (512 x 768)
  var cCov=document.createElement("canvas");cCov.width=512;cCov.height=768;
  var ctx=cCov.getContext("2d");
  var g=ctx.createLinearGradient(0,0,512,768);
  if(customColor==="emerald"||theme==="hayat"){
    g.addColorStop(0,"#1a4229");g.addColorStop(0.5,"#0e2a18");g.addColorStop(1,"#06170d");
  }else if(customColor==="sapphire"||theme==="risaleler"){
    g.addColorStop(0,"#182a44");g.addColorStop(0.5,"#0e1929");g.addColorStop(1,"#060c14");
  }else if(customColor==="leather"){
    g.addColorStop(0,"#4a2c16");g.addColorStop(0.5,"#2b190c");g.addColorStop(1,"#150b05");
  }else if(customColor==="royal"){
    g.addColorStop(0,"#431d4a");g.addColorStop(0.5,"#260f2a");g.addColorStop(1,"#130615");
  }else{
    g.addColorStop(0,"#7a1620");g.addColorStop(0.5,"#480b12");g.addColorStop(1,"#240508");
  }
  ctx.fillStyle=g;ctx.fillRect(0,0,512,768);

  // Deri Doku İnce Gren
  ctx.fillStyle="rgba(0,0,0,0.06)";
  for(var i=0;i<400;i++){ctx.fillRect(Math.random()*512,Math.random()*768,2,2);}

  // Altın Varaklı Çift Bordür
  ctx.strokeStyle="#D4AF37";ctx.lineWidth=7;ctx.strokeRect(26,26,460,716);
  ctx.strokeStyle="#F7DF88";ctx.lineWidth=2;ctx.strokeRect(36,36,440,696);

  // Köşe Motifleri
  function drawCorner(x,y,sx,sy){
    ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);
    ctx.strokeStyle="#F7DF88";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,32,0,Math.PI/2);ctx.stroke();
    ctx.fillStyle="#D4AF37";ctx.beginPath();ctx.arc(16,16,4,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  drawCorner(36,36,1,1);drawCorner(476,36,-1,1);drawCorner(36,732,1,-1);drawCorner(476,732,-1,-1);

  // Üst Kitabe
  ctx.fillStyle="#F7DF88";ctx.font="bold 15px 'Instrument Sans',sans-serif";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(isCustom ? "H A Z İ N E - İ   E V R A K" : "R İ S A L E - İ   N U R",256,110);

  // Merkezi Altın Güneş Madalyonu (Şemse)
  ctx.save();ctx.translate(256,340);
  ctx.strokeStyle="#D4AF37";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,115,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#F7DF88";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,105,0,Math.PI*2);ctx.stroke();
  for(var r=0;r<24;r++){
    var a=(r/24)*Math.PI*2,r1=r%2===0?80:92;
    ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*105,Math.sin(a)*105);ctx.stroke();
  }
  ctx.fillStyle="#FFF4C2";ctx.shadowColor="rgba(0,0,0,0.75)";ctx.shadowBlur=6;
  ctx.font="italic bold 36px 'Fraunces',Georgia,serif";
  var lines=title.length>13?[title.substring(0,11),title.substring(11)]:([title]);
  if(lines.length===1){ctx.fillText(lines[0],0,0);}else{ctx.fillText(lines[0],0,-18);ctx.fillText(lines[1],0,24);}
  ctx.restore();

  // Alt Yazar İmzası
  ctx.fillStyle="#E4BE52";ctx.font="italic 16px 'Fraunces',Georgia,serif";
  ctx.fillText(isCustom ? "Özel Kütüphane · PDF Eseri" : "Bediüzzaman Said Nursî",256,640);

  // 2. Sırt Dokusu (128 x 768)
  var cSpn=document.createElement("canvas");cSpn.width=128;cSpn.height=768;
  var sCtx=cSpn.getContext("2d");
  sCtx.fillStyle=g;sCtx.fillRect(0,0,128,768);
  [120,240,520,640].forEach(function(ry){
    sCtx.fillStyle="#1a0c04";sCtx.fillRect(0,ry-6,128,12);
    sCtx.fillStyle="#D4AF37";sCtx.fillRect(0,ry-3,128,6);
    sCtx.fillStyle="#FFF4C2";sCtx.fillRect(0,ry-1,128,2);
  });
  sCtx.save();sCtx.translate(64,380);sCtx.rotate(Math.PI/2);
  sCtx.fillStyle="#FFF4C2";sCtx.shadowColor="rgba(0,0,0,0.6)";sCtx.shadowBlur=5;
  sCtx.font="italic bold 28px 'Fraunces',Georgia,serif";
  sCtx.textAlign="center";sCtx.textBaseline="middle";
  sCtx.fillText(title,0,0);
  sCtx.restore();

  // 3. Varaklı Sayfa Bloğu Dokusu (128 x 128)
  var cPag=document.createElement("canvas");cPag.width=128;cPag.height=128;
  var pCtx=cPag.getContext("2d");
  var pG=pCtx.createLinearGradient(0,0,128,0);
  pG.addColorStop(0,"#D4AF37");pG.addColorStop(0.5,"#FFF0B8");pG.addColorStop(1,"#A27B1A");
  pCtx.fillStyle=pG;pCtx.fillRect(0,0,128,128);
  pCtx.fillStyle="rgba(0,0,0,0.12)";
  for(var py=0;py<128;py+=4){pCtx.fillRect(0,py,128,1.5);}

  var texCover=new THREE.CanvasTexture(cCov);texCover.anisotropy=4;
  var texSpine=new THREE.CanvasTexture(cSpn);texSpine.anisotropy=4;
  var texPages=new THREE.CanvasTexture(cPag);
  var res={cover:texCover,spine:texSpine,pages:texPages};
  texBookCache[key]=res;
  return res;
}

var parchmentCache={};
function getParchmentTexture(title){
  if(parchmentCache[title])return parchmentCache[title];
  var c=document.createElement("canvas");c.width=512;c.height=768;
  var ctx=c.getContext("2d");
  var g=ctx.createRadialGradient(256,384,60,256,384,420);
  g.addColorStop(0,"#FDF8EC");g.addColorStop(0.7,"#F3E8CE");g.addColorStop(1,"#E2D0A6");
  ctx.fillStyle=g;ctx.fillRect(0,0,512,768);

  ctx.strokeStyle="#D4AF37";ctx.lineWidth=4;ctx.strokeRect(32,32,448,704);
  ctx.strokeStyle="#C99A27";ctx.lineWidth=1.5;ctx.strokeRect(38,38,436,692);

  ctx.fillStyle="rgba(212,175,55,0.16)";ctx.fillRect(60,60,392,105);
  ctx.strokeStyle="#D4AF37";ctx.lineWidth=2;ctx.strokeRect(60,60,392,105);

  ctx.fillStyle="#841720";ctx.font="italic bold 28px 'Fraunces',Georgia,serif";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText("بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ",256,112);

  ctx.fillStyle="#2a1e12";ctx.font="bold 38px 'Fraunces',Georgia,serif";
  ctx.fillText(title,256,230);
  ctx.fillStyle="#A88325";ctx.font="italic 17px 'Fraunces',Georgia,serif";
  ctx.fillText("Risale-i Nur Külliyatı — Bediüzzaman",256,275);

  ctx.strokeStyle="#D4AF37";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(130,310);ctx.lineTo(382,310);ctx.stroke();

  ctx.fillStyle="rgba(42,30,18,0.76)";ctx.font="14.5px 'Fraunces',Georgia,serif";
  ctx.textAlign="left";
  var sampleLines=[
    "Bismillâh her hayrın başıdır. Biz dahi başta ona başlarız.",
    "Bilesin ey nefsim! Şu mübarek kelime İslâm nişanı olduğu gibi,",
    "bütün mevcudatın lisan-ı haliyle vird-i zebânıdır.",
    "Bismillah ne büyük, tükenmez bir kuvvet; ne çok, bitmez bir",
    "bereket olduğunu anlamak istersen, şu temsilî hikâyeciğe bak...",
    "Her bir ağaç \"Bismillah\" der; rahmet hazinesinin meyvelerini",
    "ellerimize verir. Her bir bostan \"Bismillah\" der, bir kazan olur."
  ];
  sampleLines.forEach(function(l,li){ctx.fillText(l,62,360+li*36);});

  var tex=new THREE.CanvasTexture(c);tex.anisotropy=4;
  parchmentCache[title]=tex;
  return tex;
}

var flyPageCache={};
function getFlyPageTexture(title){
  if(flyPageCache[title])return flyPageCache[title];
  var c=document.createElement("canvas");c.width=512;c.height=768;
  var ctx=c.getContext("2d");
  ctx.fillStyle="#F5EDD8";ctx.fillRect(0,0,512,768);
  ctx.strokeStyle="rgba(212,175,55,0.45)";ctx.lineWidth=3;ctx.strokeRect(28,28,456,712);
  ctx.fillStyle="rgba(42,30,18,0.28)";
  for(var i=0;i<18;i++){ctx.fillRect(52,90+i*32,408,2.5);}
  var tex=new THREE.CanvasTexture(c);
  flyPageCache[title]=tex;
  return tex;
}

function playBookOpenSound(){
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var ctx=audioCtx;if(ctx.state==="suspended")ctx.resume();
    var dur=0.45,bSz=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,bSz,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<bSz;i++){var env=Math.sin((i/bSz)*Math.PI)*Math.pow(1-i/bSz,0.65);d[i]=(Math.random()*2-1)*env*0.35;}
    var src=ctx.createBufferSource();src.buffer=buf;
    var bp=ctx.createBiquadFilter();bp.type="lowpass";bp.frequency.value=1100;
    var g=ctx.createGain();g.gain.value=0.55;
    src.connect(bp).connect(g).connect(ctx.destination);src.start(0);

    var pDur=0.35,pSz=Math.floor(ctx.sampleRate*pDur),pBuf=ctx.createBuffer(1,pSz,ctx.sampleRate),pd=pBuf.getChannelData(0);
    for(var j=0;j<pSz;j++){var pEnv=Math.sin((j/pSz)*Math.PI)*0.25;pd[j]=(Math.random()*2-1)*pEnv;}
    var pSrc=ctx.createBufferSource();pSrc.buffer=pBuf;
    var pFilt=ctx.createBiquadFilter();pFilt.type="bandpass";pFilt.frequency.value=3200;
    var pGain=ctx.createGain();pGain.value=0.45;
    pSrc.connect(pFilt).connect(pGain).connect(ctx.destination);pSrc.start(ctx.currentTime+0.25);

    [440,554.37,659.25,880].forEach(function(f,idx){
      var osc=ctx.createOscillator();osc.type="sine";osc.frequency.value=f;
      var og=ctx.createGain(),st=ctx.currentTime+0.32+idx*0.07;
      og.gain.setValueAtTime(0,st);og.gain.linearRampToValueAtTime(0.045,st+0.04);og.gain.exponentialRampToValueAtTime(0.0001,st+1.1);
      osc.connect(og).connect(ctx.destination);osc.start(st);osc.stop(st+1.2);
    });
  }catch(e){}
}

function render3DEmptyLecternStage(stageEl, chapterEl){
  var prevWrap=stageEl.querySelector(".stage-3d-wrap");
  if(prevWrap)prevWrap.remove();

  var wrap=document.createElement("div");wrap.className="stage-3d-wrap";
  var canvas=document.createElement("canvas");canvas.className="stage-3d-canvas";
  wrap.appendChild(canvas);

  var hud=document.createElement("div");hud.className="stage-hud active";
  hud.innerHTML="<span class='hud-icon'>📜</span><span class='hud-title'>Özel Kitaplık &bull; Hazine-i Evrak</span><span class='hud-badge' style='cursor:pointer;'>+ PDF Eser Yükle</span>";
  wrap.appendChild(hud);

  var hint=document.createElement("div");hint.className="stage-hint";
  hint.innerHTML="<span>✦</span> İlk PDF risalenizi yüklemek için kürsüye tıklayın";
  wrap.appendChild(hint);

  stageEl.appendChild(wrap);

  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(stageEl.clientWidth,stageEl.clientHeight);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(40,stageEl.clientWidth/stageEl.clientHeight,0.1,50);
  camera.position.set(0,1.3,4.8);camera.lookAt(0,0.1,0);

  var ambient=new THREE.AmbientLight(0x403422,2.0);scene.add(ambient);
  var dirLight=new THREE.DirectionalLight(0xffeed4,1.4);dirLight.position.set(2,5,4);scene.add(dirLight);
  var glowLight=new THREE.PointLight(0xD4AF37,2.8,8,2);glowLight.position.set(0,0.4,0);scene.add(glowLight);

  var ringMat=new THREE.MeshStandardMaterial({color:0xD4AF37,roughness:0.25,metalness:0.85});
  var ring1=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.016,12,64),ringMat);ring1.rotation.x=Math.PI/2;ring1.position.y=-0.85;scene.add(ring1);
  var ring2=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.012,12,48),ringMat);ring2.rotation.x=Math.PI/2;ring2.position.y=-0.85;scene.add(ring2);

  var discCanvas=document.createElement("canvas");discCanvas.width=256;discCanvas.height=256;
  var dCtx=discCanvas.getContext("2d");
  var dG=dCtx.createRadialGradient(128,128,0,128,128,128);
  dG.addColorStop(0,"rgba(212,175,55,0.4)");dG.addColorStop(0.5,"rgba(212,175,55,0.12)");dG.addColorStop(1,"rgba(212,175,55,0)");
  dCtx.fillStyle=dG;dCtx.fillRect(0,0,256,256);
  var discMesh=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(discCanvas),transparent:true,opacity:0.8,blending:THREE.AdditiveBlending}));
  discMesh.rotation.x=-Math.PI/2;discMesh.position.y=-0.85;scene.add(discMesh);

  var STARDUST_COUNT=45,sPos=new Float32Array(STARDUST_COUNT*3);
  for(var sp=0;sp<STARDUST_COUNT;sp++){
    var ang=Math.random()*Math.PI*2,rad=Math.random()*1.5;
    sPos[sp*3]=Math.cos(ang)*rad;sPos[sp*3+1]=Math.random()*2.4-0.8;sPos[sp*3+2]=Math.sin(ang)*rad;
  }
  var sGeo=new THREE.BufferGeometry();sGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
  var stardust=new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xF5DC7E,size:0.04,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending}));
  scene.add(stardust);

  var lecternGroup=new THREE.Group();
  lecternGroup.position.y=-0.85;
  var woodMat=new THREE.MeshStandardMaterial({color:0x362112,roughness:0.65,metalness:0.1});
  var goldTrimMat=new THREE.MeshStandardMaterial({color:0xD4AF37,roughness:0.3,metalness:0.8});

  var pBase=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.65,0.12,24),goldTrimMat);lecternGroup.add(pBase);
  var pCol=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,0.9,16),woodMat);pCol.position.y=0.5;lecternGroup.add(pCol);
  var pTop=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.3,0.08,24),goldTrimMat);pTop.position.y=0.98;lecternGroup.add(pTop);

  var restMesh=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.85,0.06),woodMat);
  restMesh.position.set(0,1.15,0.06);restMesh.rotation.x=-0.5;
  lecternGroup.add(restMesh);
  var restTrim=new THREE.Mesh(new THREE.BoxGeometry(1.24,0.05,0.1),goldTrimMat);
  restTrim.position.set(0,0.98,0.22);restTrim.rotation.x=-0.5;
  lecternGroup.add(restTrim);
  scene.add(lecternGroup);

  var floatBookGroup=new THREE.Group();
  floatBookGroup.position.set(0,0.55,0.05);
  var bCovMat=new THREE.MeshStandardMaterial({color:0x7A1620,roughness:0.35,metalness:0.1});
  var bPagMat=new THREE.MeshStandardMaterial({color:0xFFF2C8,roughness:0.4,metalness:0.2});
  var bGoldMat=new THREE.MeshStandardMaterial({color:0xD4AF37,roughness:0.2,metalness:0.85});
  var fBook=new THREE.Mesh(new THREE.BoxGeometry(0.85,1.2,0.14),[bPagMat,bGoldMat,bPagMat,bPagMat,bCovMat,bCovMat]);
  floatBookGroup.add(fBook);
  scene.add(floatBookGroup);

  wrap.style.cursor="pointer";
  wrap.addEventListener("click",function(){
    if(window.openPdfModal) window.openPdfModal();
  });

  var t=0;
  function animateLectern(){
    if(!document.body.contains(canvas))return;
    requestAnimationFrame(animateLectern);
    t+=0.016;
    floatBookGroup.position.y=0.52+Math.sin(t*2)*0.06;
    floatBookGroup.rotation.y=Math.sin(t*1.2)*0.25;
    floatBookGroup.rotation.x=0.2+Math.sin(t*1.5)*0.05;
    glowLight.intensity=2.4+Math.sin(t*3)*0.4;
    ring1.rotation.z=t*0.2;
    ring2.rotation.z=-t*0.25;

    var posArr=stardust.geometry.attributes.position.array;
    for(var p=0;p<STARDUST_COUNT;p++){
      posArr[p*3+1]+=0.005;
      if(posArr[p*3+1]>1.6)posArr[p*3+1]=-0.8;
    }
    stardust.geometry.attributes.position.needsUpdate=true;
    renderer.render(scene,camera);
  }
  animateLectern();
}

function init3DStage(stageEl,chapterEl){
  var theme=chapterEl.getAttribute("data-theme")||"kulliyat";
  var isChapter4=(chapterEl.id==="ch4"||stageEl.id==="stage4");
  var oldShelf=stageEl.querySelector(".shelf");

  var booksData=[];
  if(isChapter4 && window.customBooks && window.customBooks.length > 0){
    booksData = window.customBooks.map(function(b){
      return {title:b.title, desc:b.desc||"", color:b.color||"ruby"};
    });
  } else if(oldShelf){
    var bookElements=Array.prototype.slice.call(oldShelf.querySelectorAll(".book"));
    booksData=bookElements.map(function(b){
      return {title:b.getAttribute("data-title")||"",desc:b.getAttribute("data-desc")||""};
    });
  }

  var prevWrap=stageEl.querySelector(".stage-3d-wrap");
  if(prevWrap)prevWrap.remove();

  if(!booksData.length){
    if(isChapter4){
      render3DEmptyLecternStage(stageEl, chapterEl);
      return;
    }
    var emptyMsg=document.createElement("div");emptyMsg.className="added-empty";
    emptyMsg.textContent="Henüz eklenmiş eser yok.";
    stageEl.appendChild(emptyMsg);
    return;
  }

  var wrap=document.createElement("div");wrap.className="stage-3d-wrap";
  var canvas=document.createElement("canvas");canvas.className="stage-3d-canvas";
  wrap.appendChild(canvas);

  var prevBtn=document.createElement("button");prevBtn.className="stage-arrow prev";prevBtn.innerHTML="&#8249;";prevBtn.title="Önceki Eser";
  wrap.appendChild(prevBtn);
  var nextBtn=document.createElement("button");nextBtn.className="stage-arrow next";nextBtn.innerHTML="&#8250;";nextBtn.title="Sonraki Eser";
  wrap.appendChild(nextBtn);

  var hud=document.createElement("div");hud.className="stage-hud";
  hud.innerHTML="<span class='hud-icon'>&#10022;</span><span class='hud-title'></span><span class='hud-badge'>Kitabı Aç & Dinle</span>";
  wrap.appendChild(hud);

  var hint=document.createElement("div");hint.className="stage-hint";
  hint.innerHTML="<span>&#8644;</span> 3D Çarkı sürükleyerek çevirin &bull; <span>&#9758;</span> Açmak için tıklayın";
  wrap.appendChild(hint);

  stageEl.appendChild(wrap);

  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(stageEl.clientWidth,stageEl.clientHeight);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(42,stageEl.clientWidth/stageEl.clientHeight,0.1,50);
  camera.position.set(0,1.2,5.6);camera.lookAt(0,0,0);

  var ambient=new THREE.AmbientLight(0x403422,1.8);scene.add(ambient);
  var dirLight=new THREE.DirectionalLight(0xffeed4,1.3);dirLight.position.set(2,5,4);scene.add(dirLight);

  var themeHex=theme==="hayat"?0xC98A3C:(theme==="risaleler"?0x4aa3df:0xD4AF37);
  var glowLight=new THREE.PointLight(themeHex,2.4,7,2);glowLight.position.set(0,0.2,0);scene.add(glowLight);

  var spotLight=new THREE.SpotLight(0xfff2ce,4.2,12,Math.PI/4,0.35,1.4);spotLight.position.set(0,4.2,3.2);scene.add(spotLight);

  // Semavi Halka Kaideleri
  var n=booksData.length;
  var R=Math.max(2.1,Math.min(2.9,1.35+n*0.28));
  var baseGroup=new THREE.Group();baseGroup.position.y=-1.15;

  var ringMat=new THREE.MeshStandardMaterial({color:0xD4AF37,roughness:0.25,metalness:0.85});
  var ring1=new THREE.Mesh(new THREE.TorusGeometry(R+0.32,0.016,12,64),ringMat);ring1.rotation.x=Math.PI/2;baseGroup.add(ring1);
  var ring2=new THREE.Mesh(new THREE.TorusGeometry(R*0.68,0.013,12,48),ringMat);ring2.rotation.x=Math.PI/2;baseGroup.add(ring2);
  var ring3=new THREE.Mesh(new THREE.TorusGeometry(R*0.35,0.01,12,36),ringMat);ring3.rotation.x=Math.PI/2;baseGroup.add(ring3);

  // Işıldayan Zemin Portalı
  var discCanvas=document.createElement("canvas");discCanvas.width=256;discCanvas.height=256;
  var dCtx=discCanvas.getContext("2d");
  var dG=dCtx.createRadialGradient(128,128,0,128,128,128);
  dG.addColorStop(0,"rgba(212,175,55,0.45)");dG.addColorStop(0.5,"rgba(212,175,55,0.12)");dG.addColorStop(1,"rgba(212,175,55,0)");
  dCtx.fillStyle=dG;dCtx.fillRect(0,0,256,256);
  var discTex=new THREE.CanvasTexture(discCanvas);
  var discMesh=new THREE.Mesh(new THREE.PlaneGeometry(R*2.4,R*2.4),new THREE.MeshBasicMaterial({map:discTex,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending}));
  discMesh.rotation.x=-Math.PI/2;baseGroup.add(discMesh);
  scene.add(baseGroup);

  // Yükselen Yıldız Tozu Parçacıkları
  var STARDUST_COUNT=55,sPos=new Float32Array(STARDUST_COUNT*3);
  for(var sp=0;sp<STARDUST_COUNT;sp++){
    var ang=Math.random()*Math.PI*2,rad=Math.random()*R;
    sPos[sp*3]=Math.cos(ang)*rad;sPos[sp*3+1]=Math.random()*2.8-1.0;sPos[sp*3+2]=Math.sin(ang)*rad*0.8;
  }
  var sGeo=new THREE.BufferGeometry();sGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
  var sMat=new THREE.PointsMaterial({color:0xF5DC7E,size:0.035,transparent:true,opacity:0.75,blending:THREE.AdditiveBlending});
  var stardust=new THREE.Points(sGeo,sMat);scene.add(stardust);

  // 3D Kitap Nesneleri (Menteşeli Kapak & Havalanan Sayfalar)
  var bookMeshes=[];
  var bookRigs=[];
  var bookGroup=new THREE.Group();scene.add(bookGroup);

  booksData.forEach(function(item,idx){
    var tex=getBookTextures(item.title,theme);
    var coverMat=new THREE.MeshStandardMaterial({map:tex.cover,roughness:0.42,metalness:0.06});
    var spineMat=new THREE.MeshStandardMaterial({map:tex.spine,roughness:0.42,metalness:0.06});
    var pagesMat=new THREE.MeshStandardMaterial({map:tex.pages,roughness:0.35,metalness:0.35});
    var innerParchmentMat=new THREE.MeshStandardMaterial({map:getParchmentTexture(item.title),roughness:0.55,metalness:0.04});
    var flyPageMat=new THREE.MeshStandardMaterial({map:getFlyPageTexture(item.title),roughness:0.55,metalness:0.04,side:THREE.DoubleSide,transparent:true,opacity:0.96});

    var rig=new THREE.Group();

    // 1. Ana Gövde (Arka kapak, sağ/üst/alt sayfalar, sol sırt ve iç sağ sayfa)
    var bGeo=new THREE.BoxGeometry(1.08,1.60,0.20);
    var bMats=[pagesMat,spineMat,pagesMat,pagesMat,innerParchmentMat,coverMat];
    var bodyMesh=new THREE.Mesh(bGeo,bMats);
    bodyMesh.position.set(0,0,-0.02);
    rig.add(bodyMesh);

    // 2. Menteşeli Ön Kapak (Sol omurgadan menteşeli açılan 3D kapak)
    var coverPivot=new THREE.Group();
    coverPivot.position.set(-0.54,0,0.08); // Sol sırt menteşesi
    var frontCoverGeo=new THREE.BoxGeometry(1.08,1.62,0.035);
    var liningMat=new THREE.MeshStandardMaterial({color:0x221810,roughness:0.75,metalness:0.05});
    var frontCoverMats=[coverMat,spineMat,coverMat,coverMat,coverMat,liningMat];
    var frontCoverMesh=new THREE.Mesh(frontCoverGeo,frontCoverMats);
    frontCoverMesh.position.set(0.54,0,0);
    coverPivot.add(frontCoverMesh);
    rig.add(coverPivot);

    // 3. Havalanan / Kanatlanan 3D Sayfalar (Fluttering Pages)
    var flyPivots=[];
    for(var p=0;p<3;p++){
      var pPivot=new THREE.Group();
      pPivot.position.set(-0.53,0,0.075-p*0.02);
      var pMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.04,1.56),flyPageMat);
      pMesh.position.set(0.52,0,0);
      pPivot.add(pMesh);
      rig.add(pPivot);
      flyPivots.push(pPivot);
    }

    rig.userData={
      index:idx,
      title:item.title,
      desc:item.desc,
      hoverVal:0,
      scaleVal:1.0,
      coverPivot:coverPivot,
      flyPivots:flyPivots,
      bodyMesh:bodyMesh,
      frontCoverMesh:frontCoverMesh,
      openProgress:0,
      flyProgress:0
    };

    bookGroup.add(rig);
    bookRigs.push(rig);
    frontCoverMesh.userData.parentRig=rig;
    bodyMesh.userData.parentRig=rig;
    bookMeshes.push(frontCoverMesh);
    bookMeshes.push(bodyMesh);
  });

  var curAngle=0,targetAngle=0,isDragging=false,dragStartX=0,dragVel=0,hoveredRig=null,isChapterVisible=true;
  var activeOpeningRig=null,isAnimatingOpen=false,openStartTime=0;

  function triggerOpenBook3D(rig){
    if(activeOpeningRig||isAnimatingOpen)return;
    activeOpeningRig=rig;
    isAnimatingOpen=true;
    openStartTime=performance.now();
    window.activeOpeningStage={
      closeBook3D:function(){
        if(!activeOpeningRig)return;
        isAnimatingOpen=false;
        var closeStart=performance.now();
        var closeRig=activeOpeningRig;
        function closeStep(now){
          var t=(now-closeStart)/650;
          if(t>1)t=1;
          var ease=1-Math.pow(1-t,3);
          closeRig.userData.openProgress=1-ease;
          closeRig.userData.flyProgress=1-ease;
          if(t<1){
            requestAnimationFrame(closeStep);
          }else{
            activeOpeningRig=null;
            window.activeOpeningStage=null;
          }
        }
        requestAnimationFrame(closeStep);
      }
    };
    playBookOpenSound();
  }

  wrap.addEventListener("pointerdown",function(e){
    if(activeOpeningRig)return;
    isDragging=true;dragStartX=e.clientX;dragVel=0;wrap.setPointerCapture(e.pointerId);
  });
  window.addEventListener("pointermove",function(e){
    if(!isDragging||activeOpeningRig)return;
    var dx=e.clientX-dragStartX;dragStartX=e.clientX;
    targetAngle+=dx*0.008;dragVel=dx*0.004;
  });
  wrap.addEventListener("pointerup",function(e){
    if(isDragging){isDragging=false;try{wrap.releasePointerCapture(e.pointerId);}catch(err){}}
  });

  var raycaster=new THREE.Raycaster(),mouseVec=new THREE.Vector2(-999,-999);
  wrap.addEventListener("mousemove",function(e){
    var rect=canvas.getBoundingClientRect();
    mouseVec.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouseVec.y=-((e.clientY-rect.top)/rect.height)*2+1;
  });
  wrap.addEventListener("mouseleave",function(){
    mouseVec.set(-999,-999);hoveredRig=null;hud.classList.remove("active");
  });

  wrap.addEventListener("click",function(){
    if(Math.abs(dragVel)>0.015||activeOpeningRig)return;
    raycaster.setFromCamera(mouseVec,camera);
    var hits=raycaster.intersectObjects(bookMeshes,true);
    if(hits.length>0){
      var hitMesh=hits[0].object;
      var rig=hitMesh.userData.parentRig;
      if(rig){
        triggerOpenBook3D(rig);
      }
    }
  });

  hud.addEventListener("click",function(e){
    e.stopPropagation();
    if(hoveredRig&&!activeOpeningRig){
      triggerOpenBook3D(hoveredRig);
    }
  });

  var stepAngle=(Math.PI*2)/n;
  prevBtn.addEventListener("click",function(e){if(activeOpeningRig)return;e.stopPropagation();targetAngle+=stepAngle;dragVel=0;});
  nextBtn.addEventListener("click",function(e){if(activeOpeningRig)return;e.stopPropagation();targetAngle-=stepAngle;dragVel=0;});

  function handleResize(){
    if(!stageEl.clientWidth||!stageEl.clientHeight)return;
    camera.aspect=stageEl.clientWidth/stageEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stageEl.clientWidth,stageEl.clientHeight);
  }
  window.addEventListener("resize",handleResize);

  new IntersectionObserver(function(entries){
    entries.forEach(function(entry){isChapterVisible=entry.isIntersecting;});
  },{threshold:0.12}).observe(stageEl);

  var clock=new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    if(!isChapterVisible)return;
    var t=clock.getElapsedTime();

    if(activeOpeningRig&&isAnimatingOpen){
      var elapsed=(performance.now()-openStartTime)/1000;
      var p1=Math.min(1,elapsed/0.52);
      activeOpeningRig.userData.flyProgress=1-Math.pow(1-p1,3);

      var p2=Math.max(0,Math.min(1,(elapsed-0.40)/0.65));
      activeOpeningRig.userData.openProgress=1-Math.pow(1-p2,3);

      if(elapsed>=1.05&&!readerEl.classList.contains("open")){
        openReader(activeOpeningRig.userData.title,true);
      }
    }

    if(!isDragging&&!activeOpeningRig){
      dragVel*=0.92;targetAngle+=dragVel;
      if(Math.abs(dragVel)<0.0005&&!hoveredRig){targetAngle+=0.0022;}
    }
    curAngle+=(targetAngle-curAngle)*0.085;

    ring1.rotation.z=t*0.25;ring2.rotation.z=-t*0.4;ring3.rotation.z=t*0.6;

    var posArr=stardust.geometry.attributes.position.array;
    for(var p=0;p<STARDUST_COUNT;p++){
      posArr[p*3+1]+=0.006;
      if(posArr[p*3+1]>2.2)posArr[p*3+1]=-1.1;
    }
    stardust.geometry.attributes.position.needsUpdate=true;

    if(!activeOpeningRig){
      raycaster.setFromCamera(mouseVec,camera);
      var intersects=raycaster.intersectObjects(bookMeshes,true);
      if(intersects.length>0){
        var hitMesh=intersects[0].object;
        hoveredRig=hitMesh.userData.parentRig||null;
        if(hoveredRig){
          wrap.style.cursor="pointer";
          hud.querySelector(".hud-title").textContent=hoveredRig.userData.title;
          hud.classList.add("active");
        }
      }else{
        hoveredRig=null;wrap.style.cursor=isDragging?"grabbing":"grab";
        hud.classList.remove("active");
      }
    }else{
      hud.classList.remove("active");
    }

    bookRigs.forEach(function(rig,i){
      var isOpenTarget=(rig===activeOpeningRig);
      var flyP=rig.userData.flyProgress||0;
      var openP=rig.userData.openProgress||0;

      var theta=curAngle+(i/n)*Math.PI*2;
      var isHover=(hoveredRig===rig)&&!activeOpeningRig;
      rig.userData.hoverVal+=((isHover?1:0)-rig.userData.hoverVal)*0.14;
      rig.userData.scaleVal+=((isHover?1.2:1.0)-rig.userData.scaleVal)*0.12;

      var hVal=rig.userData.hoverVal,sVal=rig.userData.scaleVal;
      var radX=R+hVal*0.35,radZ=(R*0.72)+hVal*0.45;
      var orbitX=Math.sin(theta)*radX,orbitZ=Math.cos(theta)*radZ;
      var orbitY=Math.sin(t*1.6+i*1.2)*0.09+hVal*0.25;

      var posX=orbitX*(1-flyP)+0*flyP;
      var posY=orbitY*(1-flyP)+0.05*flyP;
      var posZ=orbitZ*(1-flyP)+3.35*flyP;

      var baseRotY=theta;
      var rotY=baseRotY*(1-flyP)+0*flyP;
      var rotX=(-hVal*0.14)*(1-flyP);
      var rotZ=Math.sin(t*1.2+i)*0.03*(1-flyP);

      var scale=sVal*(1-flyP)+1.48*flyP;

      rig.position.set(posX,posY,posZ);
      rig.rotation.set(rotX,rotY,rotZ);
      rig.scale.set(scale,scale,scale);

      // Kapağın ve Sayfaların 3D Açılma Hareketi
      rig.userData.coverPivot.rotation.y=-openP*2.75;
      var pFlap=Math.sin(t*6)*0.04*openP;
      rig.userData.flyPivots[0].rotation.y=-openP*2.45+pFlap;
      rig.userData.flyPivots[1].rotation.y=-openP*1.45+pFlap*1.5;
      rig.userData.flyPivots[2].rotation.y=-openP*0.55+pFlap*0.8;

      if(isHover||isOpenTarget){spotLight.target=rig;}
    });

    renderer.render(scene,camera);
  }
  animate();

  stageManagers.set(stageEl,{
    destroy:function(){renderer.dispose();wrap.remove();}
  });
}

function initAll3DStages(){
  document.querySelectorAll(".chapter").forEach(function(chap){
    var stage=chap.querySelector(".chapter-stage");
    if(stage)init3DStage(stage,chap);
  });
}
initAll3DStages();

function layoutShelf(shelf){
  var chap=shelf.closest(".chapter");
  if(chap){
    var stage=chap.querySelector(".chapter-stage");
    if(stage)init3DStage(stage,chap);
  }
}

/* ── 6. INTRO + AUDIO ───────────────────────────────────── */
var introEl=document.getElementById("intro"),candleEl=document.getElementById("candle"),ambientBtn=document.getElementById("ambient-toggle");
var audioCtx,ambientOn=false,ambientStarted=false;
function startAmbient(){
  if(ambientStarted)return;ambientStarted=true;
  try{
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var bufSize=2*audioCtx.sampleRate,buf=audioCtx.createBuffer(1,bufSize,audioCtx.sampleRate),data=buf.getChannelData(0),last=0;
    for(var i=0;i<bufSize;i++){var w=Math.random()*2-1;last=(last+0.02*w)/1.02;data[i]=last*4.2;}
    var ns=audioCtx.createBufferSource();ns.buffer=buf;ns.loop=true;
    var nf=audioCtx.createBiquadFilter();nf.type="lowpass";nf.frequency.value=420;
    var ng=audioCtx.createGain();ng.gain.value=0.05;
    ns.connect(nf).connect(ng).connect(audioCtx.destination);ns.start(0);
    var pad=audioCtx.createOscillator();pad.type="sine";pad.frequency.value=82;
    var pad2=audioCtx.createOscillator();pad2.type="sine";pad2.frequency.value=123.5;
    var pg=audioCtx.createGain();pg.gain.value=0.02;
    pad.connect(pg);pad2.connect(pg);pg.connect(audioCtx.destination);
    pad.start(0);pad2.start(0);
    ambientOn=true;ambientBtn.innerHTML="&#128266;";
  }catch(e){}
}
function playChime(){
  if(!ambientStarted) startAmbient();
  if(!audioCtx)return;
  try{
    if(audioCtx.state==="suspended") audioCtx.resume();
    var osc=audioCtx.createOscillator();
    var osc2=audioCtx.createOscillator();
    var g=audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.14);
    osc2.type="triangle"; osc2.frequency.setValueAtTime(1320, audioCtx.currentTime);
    g.gain.setValueAtTime(0.09, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.1);
    osc.connect(g); osc2.connect(g);
    g.connect(audioCtx.destination);
    osc.start(); osc2.start();
    osc.stop(audioCtx.currentTime + 1.15); osc2.stop(audioCtx.currentTime + 1.15);
  }catch(e){}
}
function toggleAmbient(){if(!ambientStarted){startAmbient();return;}ambientOn=!ambientOn;if(audioCtx)audioCtx[ambientOn?"resume":"suspend"]();ambientBtn.innerHTML=ambientOn?"&#128266;":"&#128264;";}
ambientBtn.addEventListener("click",toggleAmbient);
document.getElementById("enterBtn").addEventListener("click",function(){introEl.classList.add("hidden");startAmbient();});

/* ── 7. NAV DOTS ────────────────────────────────────────── */
var navSections=Array.prototype.slice.call(document.querySelectorAll("#hero,.chapter,#finale"));
var navDotsEl=document.getElementById("nav-dots");
navSections.forEach(function(sec,idx){
  var b=document.createElement("button");b.setAttribute("aria-label","Bolum "+(idx+1));
  b.addEventListener("click",function(){sec.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});});
  navDotsEl.appendChild(b);
});
new IntersectionObserver(function(entries){entries.forEach(function(e){var idx=navSections.indexOf(e.target);if(idx>-1)navDotsEl.children[idx].classList.toggle("active",e.isIntersecting);});},{threshold:0.5}).observe&&
navSections.forEach(function(sec){new IntersectionObserver(function(entries){entries.forEach(function(e){var idx=navSections.indexOf(e.target);if(idx>-1)navDotsEl.children[idx].classList.toggle("active",e.isIntersecting);});},{threshold:0.5}).observe(sec);});

/* ── 8. KEYBOARD NAV ────────────────────────────────────── */
window.addEventListener("keydown",function(e){
  if(modal.classList.contains("open")){if(e.key==="Escape")closeModal();return;}
  if(readerEl&&readerEl.classList.contains("open"))return;
  if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;
  var mid=window.scrollY+window.innerHeight/2,idx=0;
  for(var i=0;i<navSections.length;i++){var r=navSections[i].getBoundingClientRect();if(r.top+window.scrollY<=mid)idx=i;}
  var next=Math.max(0,Math.min(navSections.length-1,idx+(e.key==="ArrowDown"?1:-1)));
  navSections[next].scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});e.preventDefault();
});

/* ── 9. FINALE ──────────────────────────────────────────── */
var refs=["Isik, sabir ile beklenince daha cok aydinlatir.","Her cilt, sessizce okunmayi bekleyen bir sohbettir.","Bir raf bitince, yeni bir soru baslar.","Dinlemek de bir tur yolculuktur.","Koridor uzundur ama her adim bir varis noktasidir.","Bilgi uzerinde dusunuldukce hafifler."];
document.getElementById("reflectionLine").textContent=refs[Math.floor(Math.random()*refs.length)];

/* ── 10. BOOK READER ────────────────────────────────────── */
var readerEl=document.getElementById("book-reader"),pageBack=document.getElementById("pageBack"),pageFront=document.getElementById("pageFront"),pageBackContent=document.getElementById("pageBackContent"),pageFrontContent=document.getElementById("pageFrontContent"),readerTitle=document.getElementById("readerTitle"),readerPrev=document.getElementById("readerPrev"),readerNext=document.getElementById("readerNext"),readerProgressFill=document.getElementById("readerProgressFill"),readerPageLabel=document.getElementById("readerPageLabel"),bookmarkBtn=document.getElementById("bookmarkToggle"),toneBtn=document.getElementById("toneToggle");
var currentPages=[],pageIdx=0,readerFontSize=1,bookmarks={},currentBookTitle="",isFlipping=false,customBooks=[];

function escHTML(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}

function playTurn(){
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var ctx=audioCtx,dur=0.22,bSz=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,bSz,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<bSz;i++){var env=Math.pow(1-i/bSz,2.2)*(i<bSz*0.08?(i/(bSz*0.08)):1);d[i]=(Math.random()*2-1)*env*0.5;}
    var src=ctx.createBufferSource();src.buffer=buf;
    var bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=2600+Math.random()*1400;bp.Q.value=0.7;
    var g=ctx.createGain();g.gain.value=0.7;
    src.connect(bp).connect(g).connect(ctx.destination);src.start(0);
  }catch(e){}
}

// Modern PDF.js worker setup
if(window.pdfjsLib){
  try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; }catch(e){}
}

var RISALE_TEXTS = {
  "Şualar": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Şualar",
      chapter: "Yedinci Şua · Âyetü'l-Kübrâ",
      title: "Kâinat Seyyahının Müşahedatı",
      pageType: "mukaddime",
      text: "Kâinattan Hâlıkını soran bir seyyahın müşahedatıdır.\n\nBu risale, imanın mertebelerini ve kâinat kitabının âyetlerini tefsir eder. Her bir mevcud, birer lisan-ı hal ile Cenâb-ı Hakk'ın vahdaniyetine ve sıfât-ı celâliyesine şehadet etmektedir.\n\nO mütefekkir seyyah, aklına der: 'Gel, bu muazzam saray-ı kâinatı temaşa edelim. Bakalım sakinleri ne diyorlar ve ustaları hakkında ne gibi şehadette bulunuyorlar?' Evvela semavat âlemine bakar."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Şualar",
      chapter: "Yedinci Şua · Birinci Mertebe",
      title: "Semavat Âlemi ve Yıldızlar Ordusu",
      pageType: "metin",
      text: "Seyyah der: 'Gözümüzü açtıkça görüyoruz ki; bu semâ âlemi hadsiz yıldızlarıyla bir meşher-i azamet ve bir ordugâh-ı sübhaniyedir.'\n\nO hadsiz ecram-ı semaviye, direksiz durdurulmuş, birbirine çarpmadan intizam-ı kâmil ile hareket ettiriliyor. Güneş bir lamba, ay bir kandil, yıldızlar birer ziynet ve tezyinat olarak zemin yüzündeki misafirlere hizmetkâr kılınmış.\n\nHer bir yıldız lisan-ı haliyle der: 'Bizi böyle nizam içinde gezdiren ve sönmeyen kandiller yapan Zât, Kadîr-i Zülcelâl'dir.'"
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Şualar",
      chapter: "Dördüncü Şua",
      title: "Âyet-i Hasbiye Mertebesi",
      pageType: "metin",
      text: "Bana 'Hasbünallahu ve ni'mel vekîl' âyetinin sırrı inkişaf etti.\n\nGurbette, kimsesizlik ve tecrit içinde bulunduğum bir zamanda, kalbime geldi ki: 'Bu fani dünyada her şey zevale mahkûmdur. İnsan kimden medet ummalı?' Birden bu âyet-i kerime bir nur gibi parladı.\n\nAnladım ki: Her şeyin dizgini O'nun elindedir. O dilerse ateş gül bahçesi olur, zindan medreseye inkılap eder. O varsa, her şey vardır; O yoksa, hiçbir şey yoktur."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Şualar",
      chapter: "On Üçüncü Şua",
      title: "Medrese-i Yusufiye Mektupları",
      pageType: "metin",
      text: "Aziz, sıddık kardeşlerim!\n\nZindanları birer Medrese-i Yusufiye haline getirmek ve en karanlık musibetleri imanın nuruyla aydınlatmak, Risale-i Nur'un en birinci vazifesidir.\n\nBizler kader-i İlâhînin sevkiyle buradayız. İhlasımızı muhafaza ettikçe, zahiren aleyhimizde görünen her hadise, hakikatte lehimize neticeler verecektir. Ye'se düşmeyiniz, uhuvveti muhafaza ediniz."
    }
  ],
  "Sözler": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Sözler",
      chapter: "Birinci Söz",
      title: "Bismillah Her Hayrın Başıdır",
      pageType: "mukaddime",
      text: "Bismillah her hayrın başıdır. Biz dahi başta ona başlarız.\n\nBil ey nefsim! Şu mübarek kelime İslâm nişanı olduğu gibi, bütün mevcudatın lisan-ı haliyle vird-i zebânıdır. Bismillah ne büyük tükenmez bir kuvvet, ne çok bitmez bir bereket olduğunu anlamak istersen, şu temsilî hikâyeciğe bak, dinle:\n\nEski zaman sahrâ-yı Arabında seyahat eden adama gerektir ki, bir kabile reisinin ismini alsın ve himayesine girsin; tâ şakîlerin şerrinden kurtulsun."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Sözler",
      chapter: "Birinci Söz",
      title: "Dünya Sahrasında İnsan",
      pageType: "metin",
      text: "İşte ey mağrur nefsim! Sen o seyyahsın. Şu dünya ise bir sahradır.\n\nAczin ve fakrın hadsizdir; düşmanın, hacatın nihayetsizdir. Madem öyledir; şu sahranın Mâlik-i Ebedîsi ve Hâkim-i Ezelîsinin ismini al. Bütün kâinatın dilenciliğinden ve her hadisenin karşısında titremekten kurtul.\n\nEvet, bu kelime öyle mübarek bir definedir ki; senin nihayetsiz aczini ve fakrını, nihayetsiz bir kudret ve rahmete rapteder."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Sözler",
      chapter: "Yirmi Üçüncü Söz",
      title: "İmanın İnsana Kazandırdığı Nur",
      pageType: "metin",
      text: "İman hem nurdur, hem kuvvettir.\n\nEvet, hakikî imanı elde eden adam, kâinata meydan okuyabilir ve imanın kuvvetine göre hadisatın tazyikatından kurtulabilir. 'Tevekkeltü alâllah' der, sefine-i hayatta kemâl-i emniyetle hâdisatın dağlarvâri dalgaları içinde seyrân eder.\n\nİman insanı insan eder, belki insanı sultan eder. Öyle ise, insanın vazife-i asliyesi imandır ve duadır."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Sözler",
      chapter: "On Birinci Söz",
      title: "Kâinat Sarayı ve İnsan Aynası",
      pageType: "metin",
      text: "Şu kâinatın Hâlıkı, nihayetsiz cemâl ve kemâlini göstermek için şu âlemi bir saray suretinde inşa etmiştir.\n\nHer bir taifeye bir sofra sermiş, her bir varlığı birer antika sanat eseri suretinde tezyin etmiştir. İnsanı ise, o esmâ-i hüsnânın tamamına ayna olabilecek en câmi bir fıtratta yaratmıştır.\n\nİnsanın vazifesi; tefekkür ile bakmak, şükür ile mukabele etmek ve ubudiyet ile secdeye kapanmaktır."
    }
  ],
  "Mektubat": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Mektubat",
      chapter: "Yirminci Mektup",
      title: "Tevhid Kelâmının Hakikati",
      pageType: "mukaddime",
      text: "Lâ ilâhe illallah, vahdehû lâ şerîke leh, lehü'l-mülkü ve lehü'l-hamdü ve hüve alâ külli şey'in kadîr.\n\nİşte bu mübarek kelâm-ı tevhîdin her bir cümlesinde birer müjde ve her müjdede birer şifa ve birer mânevî lezzet vardır.\n\nBirinci Müjde: 'Lâ ilâhe illallah' der. Kalb ve ruh hadsiz hacat içinde kıvranırken, nihayetsiz bir kudret ve rahmet sahibine istinad eder; dünyadan ebediyete kadar bütün korkulardan emin olur."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Mektubat",
      chapter: "Yirminci Mektup",
      title: "Lehü'l-Mülk Müjdesi",
      pageType: "metin",
      text: "'Lehü'l-mülk' yani: Mülk umumiyetle O'nundur.\n\nSen hem O'nun mülküsün, hem mülkünde çalışıyorsun. Mülk sahibi olan Zât-ı Zülcelâl'e istinad et. O'nun tasarrufatına rıza göster.\n\nBu kelime sana der: 'Mülk sahibi başkasıdır. Sen kendi nefsini başıboş ve sahipsiz zannetme. Mülk O'nun elinde iken, hiçbir şey zayi olmaz; her musibet bir vazifedardır.'"
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Mektubat",
      chapter: "Hakikat Çekirdekleri",
      title: "Hikmetler ve Düsturlar",
      pageType: "metin",
      text: "1. Güzel gören güzel düşünür. Güzel düşünen, hayatından lezzet alır.\n2. Zaman gösterdi ki: Cennet ucuz değil, Cehennem dahi lüzumsuz değil.\n3. Her söylediğin hak olsun; fakat her hakkı söylemek hak değildir.\n4. İman insanı insan eder, belki sultan eder; fısk ve sefahat ise insanı gayet âciz bir canavar yapar."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Mektubat",
      chapter: "Yirmi İkinci Mektup",
      title: "Uhuvvet ve Muhabbet Risalesi",
      pageType: "metin",
      text: "Mü'minlerde nifak ve şikak, kin ve adavete sebebiyet veren tarafgirlik ve inat; hem hakikatçe, hem hikmetçe, hem insaniyetçe, hem İslâmiyetçe merduttur ve muzırdır.\n\nEy insafsız adam! Bir mü'minde bulunan imân, İslâmiyet ve ibadet gibi yüzlerce mânevî bağlar varken, bazı kusurları yüzünden ona adavet etmek; Kâbe hürmetinde olan imanı unutup cam parçasını tercih etmek gibidir."
    }
  ],
  "Lem'alar": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Lem'alar",
      chapter: "Yirmi Beşinci Lem'a · Hastalar Risalesi",
      title: "Birinci ve İkinci Deva",
      pageType: "mukaddime",
      text: "Ey bîçare hasta! Merak etme, sabret. Senin hastalığın sana dert değil, belki bir nevi dermandır.\n\nÇünkü ömür bir sermayedir, gidiyor. Meyvesiz gitse zayi olur. Hastalık ise, o ömür dakikalarını ibadet hükmüne getirir; gaflet perdesini yırtar, âhiret yolculuğunu hatırlatır.\n\nİkinci Deva: Sabret, belki şükret. Hastalık ömrün günah kirlerini yıkar, sabun gibi temizler."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Lem'alar",
      chapter: "Yirmi Beşinci Lem'a · Hastalar Risalesi",
      title: "Menfî İbadet Hakikati",
      pageType: "metin",
      text: "İbadet iki kısımdır: Biri müsbet ibadettir ki namaz, niyaz gibi malûm ibadetlerdir.\n\nDiğeri menfî ibadettir ki; hastalık ve musibetlerle musibetzede zaafını, aczini hisseder; Hâlık-ı Rahîm'ine iltica eder, hâlisane bir teveccühle dergâh-ı İlâhîye yalvarır.\n\nBu nevi ibadete riya girmez, gayet hâlistir. Sabırla karşılandığı takdirde, bir dakikalık hastalık bir saat nafile ibadet yerine geçebilir."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Lem'alar",
      chapter: "Yirmi Birinci Lem'a · İhlas Risalesi",
      title: "Hizmet-i Kur'âniyede Dört Düstur",
      pageType: "metin",
      text: "Ey ahiret kardeşlerim ve ey hizmet-i Kur'âniyede arkadaşlarım!\n\nBu dünyada, hususan uhrevî hizmetlerde en mühim bir esas, en büyük bir kuvvet, en makbul bir şefaatçi: İhlas'tır.\n\nBirinci Düsturunuz: Amelinizde rıza-yı İlâhî olmalı. Eğer O razı olsa, bütün dünya küsse ehemmiyeti yok. Eğer O kabul etse, bütün halk reddetse tesiri yoktur."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Lem'alar",
      chapter: "On Dokuzuncu Lem'a · İktisat Risalesi",
      title: "İktisat ve Kanaatin Bereketi",
      pageType: "metin",
      text: "Hâlık-ı Rahîm, nev-i beşere verdiği nimetlerin mukabilinde şükür istiyor.\n\nİsraf ise şükre zıttır, nimete karşı hürmetsizliktir. İktisat ise hem şükr-ü mânevîdir, hem bereket vesilesidir, hem izzet-i nefsin muhafazasıdır.\n\nİktisat eden, maişetçe aile zahmetini çekmez. Kanaat eden, minnet altında ezilmez; izzetle ve hürriyetle yaşar."
    }
  ],
  "Tarihçe-i Hayat": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Tarihçe-i Hayat",
      chapter: "İlk Hayatı",
      title: "Bediüzzaman Said Nursî'nin Zuhuru",
      pageType: "mukaddime",
      text: "Bediüzzaman Said Nursî, 1878 senesinde Bitlis vilâyetine bağlı Hizan kazasının Nurs köyünde dünyaya gelmiştir.\n\nÇocukluğundan itibaren fevkalâde bir zekâ ve hârika bir hafıza göstermiş, medrese tahsilini birkaç ay gibi kısa bir zamanda tamamlayarak devrin uleması tarafından 'Bediüzzaman' unvanına lâyık görülmüştür.\n\nBütün gayesi; asrın fen ve ilimleriyle Kur'ân hakikatlerini meczederek insanlığın imanını kurtarmaktır."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Tarihçe-i Hayat",
      chapter: "Barla Devresi",
      title: "Risale-i Nur'un Telifi",
      pageType: "metin",
      text: "1926 senesinde Isparta'nın ıssız bir nahiyesi olan Barla'ya nefyedilen Bediüzzaman, burada en zor şartlar altında Risale-i Nur'u telif etmeye başladı.\n\nMatbaa yoktu, kâğıt kıttı. Sadık talebeleri geceleri el yazısıyla risaleleri çoğaltıyor, köyden köye, şehirden şehire taşıyorlardı.\n\nBediüzzaman derdi: 'Benim bir tek gayem vardır: O da mezara yaklaştığım bu zamanda, İslâm memleketinde parlayan imân nurlarını söndürmemektir.'"
    }
  ],
  "Barla Lahikası": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Barla Lahikası",
      chapter: "Mektuplar",
      title: "Talebelerle İlk Hasbihal",
      pageType: "mukaddime",
      text: "Aziz, sıddık, vefadar kardeşlerim!\n\nSizlerin bu ıssız dağ başında bana refik olmanız ve Kur'ân nurlarının neşrinde fedakârane çalışmanız, inayet-i İlâhiyenin en açık bir delilidir.\n\nBizler bir fabrika çarkının dişlileri gibiyiz; birbirimize rekabet değil, tesanüd ile kuvvet vermeliyiz. Birbirimizin kusurunu örtmek ve sevabına iştirak etmek en birinci düsturumuzdur."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Barla Lahikası",
      chapter: "Hulusi Bey'in Mektubu",
      title: "Nurlara Muhatap Olmanın Sevinci",
      pageType: "metin",
      text: "Muhterem Üstadım!\n\nSözler mecmuasını okudukça, ruhumda açılan nur menfezlerini tarif edemem. Kalbimin en derin yaralarına tiryak olan bu hakikatler, bu asrın manevi hastalıklarına tam bir şifadır.\n\nCenâb-ı Hak sizden ebediyen razı olsun; bizleri bu kutsi hizmette dâim ve sabitkadem eylesin."
    }
  ],
  "Asa-yı Musa": [
    {
      kulliyat: "Risale-i Nur Külliyatı · Asa-yı Musa",
      chapter: "Meyve Risalesi · Altıncı Mesele",
      title: "Mekteplilerin Suâli ve Fenlerin Dili",
      pageType: "mukaddime",
      text: "Kastamonu'da lise talebelerinden bir kısmı yanıma geldiler: 'Bize Hâlıkımızı tanıttır; muallimlerimiz Allah'tan bahsetmiyorlar' dediler.\n\nBen de onlara dedim: Sizin okuduğunuz fenlerden her fen, kendi lisan-ı mahsusuyla mütemadiyen Allah'tan bahsedip Hâlıkı tanıttırıyor. Muallimleri değil, onları dinleyiniz.\n\nMeselâ nasıl ki mükemmel bir eczahane, her ilacın kavanozundaki intizam ve ölçüyle bir mahir eczacıyı gösterir; öyle de zemin eczahanesi intizamıyla Hakîm-i Zülcelâl'i tanıtır."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · Asa-yı Musa",
      chapter: "Meyve Risalesi · Yedinci Mesele",
      title: "Âhiret İnancının Hayattaki Yeri",
      pageType: "metin",
      text: "İnsanın en birinci tesellisi ve ihtiyarlık, hastalık, ölüm karşısındaki en muhkem kalesi: Âhiret inancıdır.\n\nEğer âhiret olmasa; sevdiğimiz bütün dostlar yokluğa gidecek, bütün emekler hiçlikle neticelenecektir. Fakat âhiret nuruyla ölüm, bir terhis tezkeresidir; ebedî bir vuslatın ve saadet sarayının başlangıcıdır."
    }
  ]
};

function generateRisaleChapters(title){
  return [
    {
      kulliyat: "Risale-i Nur Külliyatı · " + title,
      chapter: "Mukaddime",
      title: title + " Eserinin Esasları",
      pageType: "mukaddime",
      text: title + " eseri, Risale-i Nur Külliyatı'nın en mühim rükünlerinden biridir. Kur'ân-ı Hakîm'in feyzinden tereşşuh eden bu nuranî dersler; akıl, kalb ve vicdanı tenvir ederek hakikate ulaştırır.\n\nBu eserde işlenen hakikatler, şüpheleri zail eden bürhanlar ve sarsılmaz deliller ile teyit edilmiştir. Okuyucu, her bir satırda marifetullahın derinliklerine ve tefekkürün feyizli iklimine davet edilir."
    },
    {
      kulliyat: "Risale-i Nur Külliyatı · " + title,
      chapter: "Birinci Fasıl",
      title: "İman ve Hikmet Pencereleri",
      pageType: "metin",
      text: "Bediüzzaman Said Nursî der: 'Kur'ân'ın bu asırdaki manevî bir mu'cizesi olan Risale-i Nur, yalnız aklı ikna etmekle kalmaz; kalbi tatmin, nefsi teslim, ruhu inkişaf ettirir.'\n\nBu mübarek sayfalar, kâinat meşherinde parlayan cemâl-i İlâhîyi temaşa ettirir. Tefekkür ile okuyan bir mü'min, dünyanın fani endişelerinden sıyrılarak ebedî saadet müjdesine nail olur."
    }
  ];
}

function getBookPages(title){
  for(var i=0;i<customBooks.length;i++){
    if(customBooks[i].title===title&&customBooks[i].pages&&customBooks[i].pages.length){
      var cDesc = customBooks[i].desc || "PDF Eseri";
      return customBooks[i].pages.map(function(p,idx){
        if(typeof p === "object" && p !== null){
          return {
            kulliyat: "Hazine-i Evrak · " + cDesc,
            chapter: title,
            title: p.title || (title + " · Sayfa " + (idx+1)),
            pageType: idx===0 ? "mukaddime" : "metin",
            text: p.text || "",
            imageData: p.imageData || null
          };
        }
        return {
          kulliyat: "Hazine-i Evrak · " + cDesc,
          chapter: title,
          title: title + " · Sayfa " + (idx+1),
          pageType: idx===0 ? "mukaddime" : "metin",
          text: p
        };
      });
    }
  }
  if(RISALE_TEXTS[title]&&RISALE_TEXTS[title].length){
    return RISALE_TEXTS[title];
  }
  return generateRisaleChapters(title);
}

function formatTomeHTML(page){
  if(!page)return "";
  var html="";
  if(page.imageData){
    html += "<div class='pdf-canvas-wrap' style='margin-bottom:14px;text-align:center;'><img src='" + page.imageData + "' class='pdf-page-render' style='max-width:100%;max-height:480px;height:auto;border-radius:3px;border:1px solid rgba(212,175,55,0.3);box-shadow:0 4px 15px rgba(0,0,0,0.35);' alt='PDF Sayfası'></div>";
  }
  if(page.title){
    html+="<h4>"+escHTML(page.title)+"</h4>";
  }
  if(page.pageType==="mukaddime"){
    html+="<div class='bismillah-art'>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ</div>";
  }
  if(page.text){
    html+=page.text.split(/\n{2,}/).map(function(p){
      return "<p>"+escHTML(p.trim()).replace(/\n/g,"<br>")+"</p>";
    }).join("");
  }
  return html;
}

function renderSpread(){
  if(!currentPages||!currentPages.length)return;
  var leftIdx=pageIdx;
  var rightIdx=pageIdx+1;
  var leftPage=currentPages[leftIdx];
  var rightPage=currentPages[rightIdx];

  var leftKulliyatEl=document.getElementById("leftKulliyat");
  var leftRunningHeadEl=document.getElementById("leftRunningHead");
  var leftPageBodyEl=document.getElementById("leftPageBody");
  var leftPageNumEl=document.getElementById("leftPageNum");

  var rightChapterTagEl=document.getElementById("rightChapterTag");
  var rightPageBodyEl=document.getElementById("rightPageBody");
  var rightPageNumEl=document.getElementById("rightPageNum");

  if(leftPage){
    if(leftKulliyatEl)leftKulliyatEl.textContent=leftPage.kulliyat||("Risale-i Nur · "+currentBookTitle);
    if(leftRunningHeadEl)leftRunningHeadEl.textContent=leftPage.chapter||currentBookTitle;
    if(leftPageBodyEl)leftPageBodyEl.innerHTML=formatTomeHTML(leftPage);
    if(leftPageNumEl)leftPageNumEl.textContent=leftIdx+1;
  }else{
    if(leftPageBodyEl)leftPageBodyEl.innerHTML="";
    if(leftPageNumEl)leftPageNumEl.textContent="";
  }

  if(rightPage){
    if(rightChapterTagEl)rightChapterTagEl.textContent=rightPage.chapter||currentBookTitle;
    if(rightPageBodyEl)rightPageBodyEl.innerHTML=formatTomeHTML(rightPage);
    if(rightPageNumEl)rightPageNumEl.textContent=rightIdx+1;
  }else{
    if(rightChapterTagEl)rightChapterTagEl.textContent="";
    if(rightPageBodyEl)rightPageBodyEl.innerHTML="<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#a08246;font-style:italic;padding:40px;text-align:center;'>Faslın Sonu · Külliyat'ın bir sonraki risalesine geçebilirsiniz.</div>";
    if(rightPageNumEl)rightPageNumEl.textContent="";
  }

  updateChrome();
}

function updateChrome(){
  var total=currentPages.length;
  var rightNum=Math.min(pageIdx+2,total);
  var leftNum=pageIdx+1;
  var progress=Math.min(100,(rightNum/total)*100);

  readerProgressFill.style.width=progress.toFixed(1)+"%";
  readerPageLabel.textContent="Sayfa "+leftNum+(rightNum>leftNum?(" - "+rightNum):"")+" / "+total;
  readerPrev.disabled=pageIdx<=0;
  readerNext.disabled=pageIdx+2>=total;

  var key=currentBookTitle+":"+pageIdx;
  bookmarkBtn.innerHTML=bookmarks[key]?"★":"☆";
  bookmarkBtn.classList.toggle("active",!!bookmarks[key]);
}

function openReader(title,isDirect3D){
  currentBookTitle=title;
  currentPages=getBookPages(title);
  pageIdx=0;
  readerTitle.textContent=title;
  renderSpread();
  closeModal();
  readerEl.classList.add("open");
  if(isDirect3D){
    readerStage.classList.remove("reveal-pending");
    dnaTransition.classList.remove("active");
    return;
  }
  if(reduceMotion){
    readerStage.classList.remove("reveal-pending");
    return;
  }
  dnaRig.classList.remove("collapse");
  readerStage.classList.add("reveal-pending");
  dnaTransition.classList.add("active");
  setTimeout(function(){
    dnaRig.classList.add("collapse");
    readerStage.classList.remove("reveal-pending");
    playChime();
  },1250);
  setTimeout(function(){
    dnaTransition.classList.remove("active");
  },2050);
}

function closeReader(){
  readerEl.classList.remove("open");
  if(window.activeOpeningStage&&window.activeOpeningStage.closeBook3D){
    window.activeOpeningStage.closeBook3D();
  }
}

function turnSpread(dir){
  if(isFlipping)return;
  var newIdx=pageIdx+dir*2;
  if(newIdx<0||newIdx>=currentPages.length)return;
  isFlipping=true;
  playTurn();

  var tomeBook=document.getElementById("tomeBook");
  if(tomeBook){
    tomeBook.style.transition="opacity 0.22s ease, transform 0.22s ease";
    tomeBook.style.opacity="0.45";
    tomeBook.style.transform=dir>0?"scale(0.985) translateX(-6px)":"scale(0.985) translateX(6px)";
  }

  setTimeout(function(){
    pageIdx=newIdx;
    renderSpread();
    if(tomeBook){
      tomeBook.style.opacity="1";
      tomeBook.style.transform="none";
    }
    isFlipping=false;
  },220);
}

document.getElementById("modalOpenReader").addEventListener("click",function(){openReader(modalTitle.textContent);});
document.getElementById("readerClose").addEventListener("click",closeReader);
readerPrev.addEventListener("click",function(){turnSpread(-1);});
readerNext.addEventListener("click",function(){turnSpread(1);});

var tomePageLeft=document.getElementById("tomePageLeft");
var tomePageRight=document.getElementById("tomePageRight");
if(tomePageLeft)tomePageLeft.addEventListener("click",function(){turnSpread(-1);});
if(tomePageRight)tomePageRight.addEventListener("click",function(){turnSpread(1);});

document.getElementById("fontDec").addEventListener("click",function(){readerFontSize=Math.max(0.75,readerFontSize-0.08);readerEl.style.setProperty("--reader-font",readerFontSize+"rem");});
document.getElementById("fontInc").addEventListener("click",function(){readerFontSize=Math.min(1.35,readerFontSize+0.08);readerEl.style.setProperty("--reader-font",readerFontSize+"rem");});
toneBtn.addEventListener("click",function(){readerEl.classList.toggle("tone-gece");toneBtn.classList.toggle("active");});
bookmarkBtn.addEventListener("click",function(){var key=currentBookTitle+":"+pageIdx;bookmarks[key]=!bookmarks[key];updateChrome();});
window.addEventListener("keydown",function(e){if(!readerEl.classList.contains("open"))return;if(e.key==="ArrowRight")turnSpread(1);else if(e.key==="ArrowLeft")turnSpread(-1);else if(e.key==="Escape")closeReader();});

/* ── TOAST NOTIFICATION HELPER ───────────────────────────── */
var libToast=document.getElementById("lib-toast"),toastTimer;
function showToast(msg){
  if(!libToast)return;
  libToast.textContent=msg;
  libToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){libToast.classList.remove("show");},2800);
}

/* ── 10.5. HİKMET MÜHRÜ / GÜNÜN VECİZESİ ────────────────── */
var HIKMETLER = [
  { quote: "Bismillah her hayrın başıdır. Biz dahi başta ona başlarız.", book: "Sözler", source: "Sözler · Birinci Söz" },
  { quote: "Güzel gören güzel düşünür. Güzel düşünen, hayatından lezzet alır.", book: "Mektubat", source: "Mektubat · Hakikat Çekirdekleri" },
  { quote: "İman hem nurdur, hem kuvvettir. Evet, hakikî imanı elde eden adam, kâinata meydan okuyabilir.", book: "Sözler", source: "Sözler · Yirmi Üçüncü Söz" },
  { quote: "Kâinatta en yüksek hakikat imandır, imandan sonra namazdır.", book: "Sözler", source: "Sözler · Yirmi Birinci Söz" },
  { quote: "Hastalık bir sabun gibi, günahların kirlerini yıkar, temizler.", book: "Lem'alar", source: "Lem'alar · Yirmi Beşinci Lem'a (Hastalar Risalesi)" },
  { quote: "Zaman gösterdi ki: Cennet ucuz değil, Cehennem dahi lüzumsuz değil.", book: "Mektubat", source: "Mektubat · Yirmi İkinci Mektup" },
  { quote: "Acaba sırf dünya için mi yaratılmışsın ki, bütün vaktini ona sarf ediyorsun?", book: "Sözler", source: "Sözler · Yirmi Üçüncü Söz" },
  { quote: "Her söylediğin hak olsun; fakat her hakkı söylemek hak değildir.", book: "Mektubat", source: "Mektubat · Yirmi İkinci Mektup" },
  { quote: "Göz bir hassedir ki, ruh bu âlemi o pencere ile seyreder.", book: "Sözler", source: "Sözler · Altıncı Söz" },
  { quote: "İlim üç kısımdır: Biri, cehli izale eder; biri, marifetullahtır; biri de ibadettir.", book: "Mesnevi-i Nuriye", source: "Mesnevi-i Nuriye" },
  { quote: "Madem ölüm öldürülmüyor ve kabir kapısı kapanmıyor; elbette bu ecel celladının elinden kurtulmak çaresi aranmalıdır.", book: "Asa-yı Musa", source: "Asa-yı Musa" },
  { quote: "Sinek kanadı kadar bir amel-i hâlis, batmanlarla hâlis olmayana müreccahtır.", book: "Lem'alar", source: "Lem'alar · İhlas Risalesi" },
  { quote: "Dünya bir misafirhanedir. İnsan ise onda az duran bir misafirdir.", book: "Sözler", source: "Sözler · On Birinci Söz" },
  { quote: "Haksızlığı hak zanneden adamlara karşı hak davası edilmez.", book: "Şualar", source: "Şualar · On Dördüncü Şua" }
];

var curHikmetIdx = 0;
var hikmetModal = document.getElementById("hikmet-modal");
var hikmetQuoteEl = document.getElementById("hikmetQuote");
var hikmetSourceEl = document.getElementById("hikmetSource");
var hikmetBtn = document.getElementById("hikmetBtn");
var hikmetCloseBtn = document.getElementById("hikmetClose");
var hikmetNextBtn = document.getElementById("hikmetNextBtn");
var hikmetCopyBtn = document.getElementById("hikmetCopyBtn");
var hikmetOpenBookBtn = document.getElementById("hikmetOpenBookBtn");

function renderHikmet(idx, animate){
  curHikmetIdx = (idx + HIKMETLER.length) % HIKMETLER.length;
  var h = HIKMETLER[curHikmetIdx];
  if(animate && hikmetQuoteEl){
    hikmetQuoteEl.classList.add("fading");
    setTimeout(function(){
      hikmetQuoteEl.textContent = h.quote;
      hikmetSourceEl.textContent = h.source;
      hikmetQuoteEl.classList.remove("fading");
    }, 220);
  } else if(hikmetQuoteEl) {
    hikmetQuoteEl.textContent = h.quote;
    hikmetSourceEl.textContent = h.source;
  }
}

function openHikmetModal(optIdx){
  if(typeof optIdx === "number") curHikmetIdx = optIdx;
  renderHikmet(curHikmetIdx, false);
  if(hikmetModal) hikmetModal.classList.add("open");
  playChime();
}
window.openHikmetModal = openHikmetModal;

function closeHikmetModal(){
  if(hikmetModal) hikmetModal.classList.remove("open");
}

function nextHikmet(){
  var nextIdx = (curHikmetIdx + 1 + Math.floor(Math.random() * (HIKMETLER.length - 1))) % HIKMETLER.length;
  renderHikmet(nextIdx, true);
  playChime();
}

function copyHikmet(){
  var h = HIKMETLER[curHikmetIdx];
  var text = "“" + h.quote + "”\n— " + h.source + " (Risale-i Nur Külliyatı)";
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      showToast("✦ Vecize ve kaynağı panoya kopyalandı!");
    }).catch(function(){
      showToast("✦ Vecize kopyalandı.");
    });
  } else {
    showToast("✦ Vecize kopyalandı.");
  }
}

function openHikmetBook(){
  var h = HIKMETLER[curHikmetIdx];
  closeHikmetModal();
  openReader(h.book, true);
}

if(hikmetBtn) hikmetBtn.addEventListener("click", function(){ openHikmetModal(); });
if(hikmetCloseBtn) hikmetCloseBtn.addEventListener("click", closeHikmetModal);
if(hikmetNextBtn) hikmetNextBtn.addEventListener("click", nextHikmet);
if(hikmetCopyBtn) hikmetCopyBtn.addEventListener("click", copyHikmet);
if(hikmetOpenBookBtn) hikmetOpenBookBtn.addEventListener("click", openHikmetBook);

if(hikmetModal){
  hikmetModal.addEventListener("click", function(e){
    if(e.target === hikmetModal) closeHikmetModal();
  });
}
window.addEventListener("keydown", function(e){
  if(e.key === "Escape" && hikmetModal && hikmetModal.classList.contains("open")){
    closeHikmetModal();
  }
});

/* ── 11. HAZİNE-İ EVRAK: GELİŞMİŞ PDF KİTAP VE KÜTÜPHANE YÖNETİMİ ─── */
var customBooks = [];
window.customBooks = customBooks;

// 11.1. IndexedDB + LocalStorage Güçlü Kalıcı Depolama Motoru
var NurStorage = {
  db: null,
  init: function(){
    return new Promise(function(resolve){
      try{
        var req = indexedDB.open("NurKoridoruDB", 1);
        req.onupgradeneeded = function(e){
          var db = e.target.result;
          if(!db.objectStoreNames.contains("books")){
            db.createObjectStore("books", { keyPath: "id" });
          }
        };
        req.onsuccess = function(e){
          NurStorage.db = e.target.result;
          resolve(NurStorage.db);
        };
        req.onerror = function(){ resolve(null); };
      }catch(e){ resolve(null); }
    });
  },
  getAll: function(){
    return new Promise(function(resolve){
      if(NurStorage.db){
        try{
          var tx = NurStorage.db.transaction("books", "readonly");
          var store = tx.objectStore("books");
          var req = store.getAll();
          req.onsuccess = function(){ resolve(req.result || []); };
          req.onerror = function(){ fallback(); };
        }catch(e){ fallback(); }
      }else{ fallback(); }
      function fallback(){
        try{
          var raw = localStorage.getItem("nur-koridoru-books");
          resolve(raw ? JSON.parse(raw) : []);
        }catch(e){ resolve([]); }
      }
    });
  },
  save: function(book){
    return new Promise(function(resolve){
      if(NurStorage.db){
        try{
          var tx = NurStorage.db.transaction("books", "readwrite");
          var store = tx.objectStore("books");
          store.put(book);
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ fallback(); };
        }catch(e){ fallback(); }
      }else{ fallback(); }
      function fallback(){
        try{
          NurStorage.getAll().then(function(all){
            var idx = all.findIndex(function(b){ return b.id === book.id; });
            if(idx >= 0) all[idx] = book; else all.push(book);
            localStorage.setItem("nur-koridoru-books", JSON.stringify(all));
            resolve(true);
          });
        }catch(e){ resolve(false); }
      }
    });
  },
  remove: function(id){
    return new Promise(function(resolve){
      if(NurStorage.db){
        try{
          var tx = NurStorage.db.transaction("books", "readwrite");
          var store = tx.objectStore("books");
          store.delete(id);
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ fallback(); };
        }catch(e){ fallback(); }
      }else{ fallback(); }
      function fallback(){
        try{
          var raw = localStorage.getItem("nur-koridoru-books");
          var all = raw ? JSON.parse(raw) : [];
          all = all.filter(function(b){ return b.id !== id; });
          localStorage.setItem("nur-koridoru-books", JSON.stringify(all));
          resolve(true);
        }catch(e){ resolve(false); }
      }
    });
  }
};

// 11.2. DOM Öğeleri
var pdfModal = document.getElementById("pdf-modal"),
    pdfModalClose = document.getElementById("pdfModalClose"),
    pdfCancelBtn = document.getElementById("pdfCancelBtn"),
    pdfSubmitBtn = document.getElementById("pdfSubmitBtn"),
    pdfDropzone = document.getElementById("pdfDropzone"),
    pdfFileInput = document.getElementById("pdfFileInput"),
    dropzoneText = document.getElementById("dropzoneText"),
    pdfFileBadge = document.getElementById("pdfFileBadge"),
    badgeFileName = document.getElementById("badgeFileName"),
    badgeFileSize = document.getElementById("badgeFileSize"),
    pdfQuickDemoBtn = document.getElementById("pdfQuickDemoBtn"),
    pdfBookTitleInput = document.getElementById("pdfBookTitleInput"),
    pdfBookDescInput = document.getElementById("pdfBookDescInput"),
    pdfColorPicker = document.getElementById("pdfColorPicker"),
    liveSpineTitle = document.getElementById("liveSpineTitle"),
    liveCoverTitle = document.getElementById("liveCoverTitle"),
    liveSpinePreview = document.getElementById("liveSpinePreview"),
    liveCoverPreview = document.getElementById("liveCoverPreview"),
    pdfProgressWrap = document.getElementById("pdfProgressWrap"),
    pdfProgressText = document.getElementById("pdfProgressText"),
    pdfProgressPercent = document.getElementById("pdfProgressPercent"),
    pdfProgressBarFill = document.getElementById("pdfProgressBarFill"),
    pdfCustomGrid = document.getElementById("pdfCustomGrid"),
    pdfNoBooks = document.getElementById("pdfNoBooks"),
    customBooksCount = document.getElementById("customBooksCount"),
    fabBadge = document.getElementById("fabBadge"),
    headerPdfBadge = document.getElementById("headerPdfBadge"),
    libraryFab = document.getElementById("libraryFab"),
    headerPdfBtn = document.getElementById("headerPdfBtn"),
    shelfAddPdfBtn = document.getElementById("shelfAddPdfBtn");

var selectedFile = null,
    selectedColor = "ruby";

var COLOR_PALETTES = {
  ruby: { start: "#7a1620", end: "#400a11" },
  emerald: { start: "#1a4d2e", end: "#0c2817" },
  sapphire: { start: "#162c4a", end: "#0b1728" },
  leather: { start: "#4a2c16", end: "#27160a" },
  royal: { start: "#431d4a", end: "#230d27" }
};

// 11.3. Modal Aç / Kapa
function openPdfModal(){
  if(pdfModal) {
    pdfModal.classList.add("open");
    renderPdfCustomGrid();
  }
}
window.openPdfModal = openPdfModal;

function closePdfModal(){
  if(pdfModal) {
    pdfModal.classList.remove("open");
    resetPdfForm();
  }
}

function resetPdfForm(){
  selectedFile = null;
  if(pdfFileInput) pdfFileInput.value = "";
  if(pdfBookTitleInput) pdfBookTitleInput.value = "";
  if(pdfBookDescInput) pdfBookDescInput.value = "";
  if(pdfFileBadge) pdfFileBadge.style.display = "none";
  if(dropzoneText) dropzoneText.textContent = "PDF Dosyasını Buraya Sürükleyin";
  if(pdfProgressWrap) pdfProgressWrap.style.display = "none";
  if(pdfProgressBarFill) pdfProgressBarFill.style.width = "0%";
  updateLivePreview("Yeni Risale", selectedColor);
}

function updateLivePreview(title, colorKey){
  var safeTitle = title.trim() || "Yeni Risale";
  if(liveSpineTitle) liveSpineTitle.textContent = safeTitle;
  if(liveCoverTitle) liveCoverTitle.textContent = safeTitle;
  var pal = COLOR_PALETTES[colorKey] || COLOR_PALETTES.ruby;
  if(liveSpinePreview) liveSpinePreview.style.background = "linear-gradient(180deg, " + pal.start + " 0%, " + pal.end + " 100%)";
  if(liveCoverPreview) liveCoverPreview.style.background = "linear-gradient(135deg, " + pal.start + " 0%, " + pal.end + " 100%)";
}

// 11.4. Renk Seçimi
if(pdfColorPicker){
  pdfColorPicker.addEventListener("click", function(e){
    var dot = e.target.closest(".color-dot");
    if(!dot) return;
    pdfColorPicker.querySelectorAll(".color-dot").forEach(function(d){ d.classList.remove("active"); });
    dot.classList.add("active");
    selectedColor = dot.getAttribute("data-color") || "ruby";
    updateLivePreview(pdfBookTitleInput.value, selectedColor);
  });
}

// 11.5. Başlık Canlı Girişi
if(pdfBookTitleInput){
  pdfBookTitleInput.addEventListener("input", function(){
    updateLivePreview(pdfBookTitleInput.value, selectedColor);
  });
}

// 11.6. Drag and Drop & Dosya Seçimi
function handleFileSelected(file){
  if(!file) return;
  if(!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf"){
    showToast("Lütfen geçerli bir PDF dosyası seçin.");
    return;
  }
  selectedFile = file;
  if(pdfFileBadge) {
    pdfFileBadge.style.display = "inline-flex";
    if(badgeFileName) badgeFileName.textContent = file.name;
    if(badgeFileSize) badgeFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
  }
  if(dropzoneText) dropzoneText.textContent = "Seçilen: " + file.name;

  // Akıllı Başlık Çıkarma (Örn: 10._Soz_Hasir_Risalesi.pdf -> 10. Söz Haşir Risalesi)
  var rawName = file.name.replace(/\.[^/.]+$/, "");
  rawName = rawName.replace(/[_\-]+/g, " ").trim();
  if(!pdfBookTitleInput.value.trim()){
    pdfBookTitleInput.value = rawName;
    updateLivePreview(rawName, selectedColor);
  }
}

if(pdfDropzone){
  pdfDropzone.addEventListener("click", function(){ if(pdfFileInput) pdfFileInput.click(); });
  pdfDropzone.addEventListener("dragover", function(e){ e.preventDefault(); pdfDropzone.classList.add("dragover"); });
  pdfDropzone.addEventListener("dragleave", function(){ pdfDropzone.classList.remove("dragover"); });
  pdfDropzone.addEventListener("drop", function(e){
    e.preventDefault();
    pdfDropzone.classList.remove("dragover");
    if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });
}

if(pdfFileInput){
  pdfFileInput.addEventListener("change", function(){
    if(pdfFileInput.files && pdfFileInput.files.length){
      handleFileSelected(pdfFileInput.files[0]);
    }
  });
}

// 11.7. Örnek Risale: Haşir Risalesi (Onuncu Söz)
function getSampleHasirRisalesi(){
  return [
    {
      title: "Mukaddime · Haşir ve Âhiret Hakikati",
      text: "Bismillâhirrahmânirrahîm.\n'Fenzur ilâ âsâri rahmetillâhi keyfe yuhyi'l-arda ba'de mevtihâ, inne zâlike le-muhyi'l-mevtâ ve hüve alâ külli şey'in kadîr.'\n\nEy kardeşim! Eğer haşir ve kıyametin hakikatini bir parça anlamak istersen, şu temsilî hikâyeciğe bak, dinle:\n\nBir zaman iki adam bir padişahın muhteşem memleketine seyahat için giderler. Biri mütefekkir ve insaflı, diğeri ise gafil ve sersemdir. O memlekette hadsiz harikaları ve saltanat nizamını görürler. İnsaflı olan der: 'Bu nizam ve saltanat gösteriyor ki; bu muazzam mülkün gayet âdil, celâlli ve merhametli bir hâkimi vardır.' Gafil olan ise inkâr eder.",
      pageNumber: 1
    },
    {
      title: "Birinci Hakikat · Bâb-ı Rubûbiyet ve Saltanat",
      text: "Hangi bir akıl ve vicdan kabul eder ki: Böyle haşmetli bir saltanatın sahibi, nihayetsiz sehavet ve keremiyle zemin yüzünü nimetlerle tezyin etsin, fakat o misafirleri zeval ve ebedî yokluk ile perişan etsin?\n\nHaşa ve kellâ! Saltanat-ı sermediyye, teb'asının devamını iktiza eder. Şu fani dünyadaki kısa ömür, o ebedî saltanatın yalnız bir talimgâhı ve misafirhanesidir. Arkasında ebedî bir dâr-ı saadet açılacaktır.",
      pageNumber: 2
    },
    {
      title: "İkinci Hakikat · Bâb-ı Kerem ve Rahmet",
      text: "Hiç mümkün müdür ki; şu kâinatın Hâlık-ı Rahîmi, bir sineğin gözünü ve kanadını bile intizamla halketsin, onu rahmetiyle rızıklandırsın da, kâinatın en nazenin ve şerefli meyvesi olan insanı dirilmemek üzere kabirde çürütsün?\n\nBahar mevsiminde hadsiz ölmüş ağaçları, kemikleri andıran kuru dalları bir anda diriltip çiçeklerle donatan Zât-ı Zülcelâl; insanları da bir tek nefes gibi kolayca diriltecektir.",
      pageNumber: 3
    },
    {
      title: "Üçüncü Hakikat · Bâb-ı Hikmet ve Adalet",
      text: "Görüyoruz ki; bu dünyada zâlim izzetinde, mazlum zilletinde kalıp gidiyorlar. Demek bir mahkeme-i kübrâya bırakılıyor, tehir ediliyor; yoksa ihmal edilmiyor.\n\nZerrece zulüm ve israf yapmayan nihayetsiz bir adalet ve hikmet, elbette büyük bir ceza ve mükâfat meydanı olan haşri açacaktır. Âhiret olmasa, adalet zulme inkılap eder.",
      pageNumber: 4
    },
    {
      title: "Dördüncü Hakikat · Bâb-ı Cûd ve Cemâl",
      text: "Cenâb-ı Hak sonsuz cemâl ve kemâlini göstermek ve temaşa ettirmek istiyor. Bu fani dünya ise o cemâlin yalnız gölgelerini ve fani aynalarını taşır.\n\nFani gölgeleri gösterip sonra ebediyen yok etmek, hakikî cemâle yakışmaz. Demek ebedî bir vuslat diyarı, solmayan nurlu çiçeklerin bahçesi olan Cennet vardır.",
      pageNumber: 5
    },
    {
      title: "Hâtime · İman ve Saadet Müjdesi",
      text: "İşte ey nefsim ve ey dinleyen kardeşim!\nRisale-i Nur'un Onuncu Söz'ü kat'î bürhanlarla gösterir ki: Haşrin gelmesi, baharın gelmesi kadar muhakkak ve kat'îdir.\n\nİman eden bir mü'min için ölüm, ebedî saadete ve Habib-i Zülcelâl'e kavuşma tezkiresidir. 'Hasbünallâhu ve ni'mel vekîl.'",
      pageNumber: 6
    }
  ];
}

// 11.8. Hızlı Demo Butonu
if(pdfQuickDemoBtn){
  pdfQuickDemoBtn.addEventListener("click", function(){
    pdfBookTitleInput.value = "Haşir Risalesi (Onuncu Söz)";
    pdfBookDescInput.value = "Haşir ve âhiret inancını aklen ve naklen ispat eden Risale-i Nur şaheseri.";
    selectedColor = "ruby";
    if(pdfColorPicker){
      pdfColorPicker.querySelectorAll(".color-dot").forEach(function(d){
        d.classList.toggle("active", d.getAttribute("data-color") === "ruby");
      });
    }
    updateLivePreview(pdfBookTitleInput.value, selectedColor);
    showToast("Örnek Haşir Risalesi yüklendi. 'Kütüphaneye Ekle' butonuna basabilirsiniz.");
  });
}

// 11.9. PDF.js ile Yüksek Performanslı Ayrıştırma
async function extractPdfDocument(file, onProgress){
  if(!window.pdfjsLib){
    throw new Error("pdfjs-missing");
  }
  var buf = await file.arrayBuffer();
  var doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
  var pages = [];
  var total = Math.min(doc.numPages, 100);

  for(var i=1; i<=total; i++){
    if(onProgress) onProgress(i, total);
    try{
      var page = await doc.getPage(i);
      var textContent = await page.getTextContent();
      var rawLines = textContent.items.map(function(it){ return it.str; }).join(" ").replace(/\s+/g, " ").trim();

      var pageObj = {
        pageNumber: i,
        title: "Sayfa " + i,
        text: rawLines || "",
        imageData: null
      };

      if(!rawLines || rawLines.length < 50 || i === 1){
        try{
          var viewport = page.getViewport({ scale: 1.0 });
          var offCanvas = document.createElement("canvas");
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          var offCtx = offCanvas.getContext("2d");
          await page.render({ canvasContext: offCtx, viewport: viewport }).promise;
          pageObj.imageData = offCanvas.toDataURL("image/jpeg", 0.75);
        }catch(renderErr){}
      }

      pages.push(pageObj);
    }catch(pageErr){
      pages.push({ pageNumber: i, title: "Sayfa " + i, text: "Sayfa içeriği okunamadı." });
    }
  }
  return pages;
}

// 11.10. Form Gönderimi (Kitap Ekleme)
if(pdfSubmitBtn){
  pdfSubmitBtn.addEventListener("click", async function(e){
    e.preventDefault();
    var title = pdfBookTitleInput.value.trim();
    if(!title){
      showToast("Lütfen eser için bir başlık giriniz.");
      if(pdfBookTitleInput) pdfBookTitleInput.focus();
      return;
    }
    var desc = pdfBookDescInput.value.trim();

    pdfSubmitBtn.disabled = true;
    if(pdfProgressWrap) pdfProgressWrap.style.display = "block";
    if(pdfProgressText) pdfProgressText.textContent = "Eser hazırlanıyor...";
    if(pdfProgressBarFill) pdfProgressBarFill.style.width = "10%";

    try{
      var pages = [];
      if(selectedFile){
        if(pdfProgressText) pdfProgressText.textContent = "PDF varakları taranıyor...";
        pages = await extractPdfDocument(selectedFile, function(curr, tot){
          var pct = Math.round((curr / tot) * 90);
          if(pdfProgressBarFill) pdfProgressBarFill.style.width = pct + "%";
          if(pdfProgressPercent) pdfProgressPercent.textContent = pct + "%";
          if(pdfProgressText) pdfProgressText.textContent = "Varak " + curr + " / " + tot + " taranıyor...";
        });
      } else if(title.indexOf("Haşir") >= 0 || title.indexOf("Onuncu Söz") >= 0){
        pages = getSampleHasirRisalesi();
      } else {
        pages = [
          { title: title + " · Giriş", text: "Bu eser Hazine-i Evrak kütüphanesine ilave edilmiştir.\n\n" + (desc || "Eser detayları ve tefekkür bahsi."), pageNumber: 1 },
          { title: title + " · İkinci Fasıl", text: "Risale-i Nur nurlarıyla parlayan hakikatler, okuyanın aklını tenvir, kalbini tatmin eder.", pageNumber: 2 }
        ];
      }

      if(pdfProgressBarFill) pdfProgressBarFill.style.width = "100%";
      if(pdfProgressPercent) pdfProgressPercent.textContent = "100%";
      if(pdfProgressText) pdfProgressText.textContent = "Kitap kaydediliyor...";

      var newBook = {
        id: "b_" + Date.now() + "_" + Math.floor(Math.random()*1000),
        title: title,
        desc: desc || "Hazine-i Evrak · Özel PDF Eseri",
        color: selectedColor || "ruby",
        pages: pages,
        pageCount: pages.length,
        createdAt: Date.now()
      };

      await NurStorage.save(newBook);
      customBooks.push(newBook);
      window.customBooks = customBooks;

      updatePdfBadges();
      renderPdfCustomGrid();
      renderAddedShelf();

      playChime();
      showToast('"' + title + '" kütüphanenize eklendi (' + pages.length + ' sayfa)!');

      setTimeout(function(){
        closePdfModal();
        var ch4 = document.getElementById("ch4");
        if(ch4) ch4.scrollIntoView({ behavior: "smooth" });
      }, 550);

    }catch(err){
      console.error(err);
      showToast("PDF ayrıştırma sırasında bir hata oluştu: " + (err.message || "Bilinmeyen hata"));
    }finally{
      pdfSubmitBtn.disabled = false;
    }
  });
}

// 11.11. Özel Kitaplar Listesi & Rozetler
function updatePdfBadges(){
  var count = customBooks.length;
  if(customBooksCount) customBooksCount.textContent = count;
  if(fabBadge){
    fabBadge.textContent = count;
    fabBadge.classList.toggle("show", count > 0);
  }
  if(headerPdfBadge){
    headerPdfBadge.textContent = count;
    headerPdfBadge.style.display = count > 0 ? "inline-block" : "none";
  }
  var addedCount = document.getElementById("addedCount");
  if(addedCount) addedCount.textContent = count + " eser";
}

function renderPdfCustomGrid(){
  if(!pdfCustomGrid) return;
  pdfCustomGrid.querySelectorAll(".pdf-item-card").forEach(function(el){ el.remove(); });
  if(pdfNoBooks) pdfNoBooks.style.display = customBooks.length ? "none" : "block";

  customBooks.forEach(function(book){
    var card = document.createElement("div");
    card.className = "pdf-item-card";

    var pal = COLOR_PALETTES[book.color] || COLOR_PALETTES.ruby;
    card.innerHTML = "<div class='pdf-item-cover' style='background:linear-gradient(135deg," + pal.start + " 0%," + pal.end + " 100%);'></div>" +
                     "<div class='pdf-item-info'>" +
                       "<div class='item-t'>" + escHTML(book.title) + "</div>" +
                       "<div class='item-m'>" + (book.pageCount || (book.pages ? book.pages.length : 1)) + " Sayfa &bull; " + escHTML(book.desc || "Özel Risale") + "</div>" +
                     "</div>" +
                     "<div class='pdf-item-actions'>" +
                       "<button class='pdf-item-btn read' title='İki Sayfalı Ciltte Oku'>📖</button>" +
                       "<button class='pdf-item-btn delete' title='Kitabı Kaldır'>🗑️</button>" +
                     "</div>";

    card.querySelector(".read").addEventListener("click", function(){
      closePdfModal();
      openReader(book.title);
    });

    card.querySelector(".delete").addEventListener("click", async function(e){
      e.stopPropagation();
      if(confirm('"' + book.title + '" eserini silmek istediğinize emin misiniz?')){
        await NurStorage.remove(book.id);
        customBooks = customBooks.filter(function(b){ return b.id !== book.id; });
        window.customBooks = customBooks;
        updatePdfBadges();
        renderPdfCustomGrid();
        renderAddedShelf();
        showToast('"' + book.title + '" kütüphaneden kaldırıldı.');
      }
    });

    pdfCustomGrid.appendChild(card);
  });
}

function renderAddedShelf(){
  var stage4 = document.getElementById("stage4") || (document.getElementById("ch4") ? document.getElementById("ch4").querySelector(".chapter-stage") : null);
  var ch4 = document.getElementById("ch4");
  if(stage4 && ch4){
    init3DStage(stage4, ch4);
  }
}

// 11.12. Buton Olay Dinleyicileri
if(headerPdfBtn) headerPdfBtn.addEventListener("click", openPdfModal);
if(shelfAddPdfBtn) shelfAddPdfBtn.addEventListener("click", openPdfModal);
if(libraryFab) libraryFab.addEventListener("click", openPdfModal);
if(pdfModalClose) pdfModalClose.addEventListener("click", closePdfModal);
if(pdfCancelBtn) pdfCancelBtn.addEventListener("click", closePdfModal);

if(pdfModal){
  pdfModal.addEventListener("click", function(e){
    if(e.target === pdfModal) closePdfModal();
  });
}

window.addEventListener("keydown", function(e){
  if(e.key === "Escape" && pdfModal && pdfModal.classList.contains("open")){
    closePdfModal();
  }
});

// 11.13. İlk Yükleme: Kalıcı Depolamadan Çekme
(async function initLibraryEngine(){
  try{
    await NurStorage.init();
    var loaded = await NurStorage.getAll();
    if(loaded && loaded.length){
      customBooks = loaded;
      window.customBooks = customBooks;
    }
  }catch(e){
    console.error("Library init error:", e);
  }
  updatePdfBadges();
  renderPdfCustomGrid();
  renderAddedShelf();
})();

})();
