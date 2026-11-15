{
/* ---------- registre (définitions fixes du dossier, pas des données d'activité) ---------- */
const PEAU=["#4A2E1F","#5A3825","#6B4226","#7A4A2A","#8A5A3B"];
const ZONES=[{id:"prod",nom:"Produit & architecture",x:0,z:0,w:8.4,d:7.4,c:"#E9EEF8",lx:6.6,lz:0.5,tx:.5,tz:7.1},{id:"dir",nom:"Direction",x:9,z:0,w:6,d:6,c:"#E8D9BD",lx:12,lz:6.3},{id:"inge",nom:"Ingénierie & livraison",x:16,z:0,w:8,d:9,c:"#E7F1EA",lx:20,lz:8.8,tx:16.4,tz:8.7},{id:"qual",nom:"Qualité, sécurité & documentation",x:0,z:9.6,w:8.4,d:6.4,c:"#F4ECDF",lx:5.2,lz:15.9,tx:.5,tz:15.7}];
const EQUIPE=[
 {id:"cto",nom:"AI CTO",role:"Coordination et arbitrages",zone:"dir",d:[9.6,4.1],col:"#20242A",resp:"Qualifie vos demandes, établit le plan, délègue, contrôle la cohérence, prépare vos décisions et vous rend compte. Unique interlocuteur du propriétaire.",missions:["Fiche et plan de chaque mission","Demandes d'approbation","Compte rendu de fin de mission","Rapport hebdomadaire"],limites:"Ne code pas dans les produits, ne fusionne rien, ne déploie rien, n'approuve jamais à votre place.",look:{peau:1,haut:"#20242A",veste:1,bas:"#151719",ch:"court",lun:1,cravate:"#2563EB"}},
 {id:"pm",nom:"Produit",role:"Product Manager",zone:"prod",d:[0.8,1.2],col:"#2563EB",resp:"Transforme une demande en besoin précis, priorisé et vérifiable.",missions:["Fiche besoin et critères d'acceptation","Note de priorisation"],limites:"Aucune décision commerciale ou tarifaire.",look:{peau:3,haut:"#F1EFE9",bas:"#151719",ch:"afro"}},
 {id:"ux",nom:"Design",role:"UX/UI Designer",zone:"prod",d:[4.9,1.2],col:"#0E7490",resp:"Des parcours simples et des écrans fidèles à la charte de chaque marque, d'abord sur téléphone.",missions:["Maquettes et prototypes","Liste des écrans","Notes d'accessibilité"],limites:"Aucune logique métier ; aucune dépendance sans avis de l'Architecte et votre accord écrit.",look:{peau:2,haut:"#0E7490",bas:"#F1EFE9",ch:"chignon"}},
 {id:"archi",nom:"Architecte",role:"Software Architect",zone:"prod",d:[2.8,4.3],col:"#3A3F47",resp:"Des choix techniques durables et cohérents d'un produit à l'autre.",missions:["Note de conception","Décisions d'architecture","Schéma de données","Avis sur les dépendances"],limites:"Ne réalise pas la fonctionnalité ; aucune dépendance payante sans votre accord.",look:{peau:0,haut:"#3A3F47",veste:1,bas:"#3A3F47",ch:"court",barbe:1}},
 {id:"lead",nom:"Dev",role:"Lead Developer",zone:"inge",d:[16.8,1.2],col:"#1D4ED8",resp:"Réalise les changements de code sur une branche agent/, avec leurs tests.",missions:["Branche et lien de comparaison","Tests unitaires","Note de version"],limites:"Ne pousse jamais sur main, ne fusionne pas, ne déploie pas, ne lit aucun secret.",look:{peau:1,haut:"#151719",bas:"#151719",ch:"court",casque:"#2563EB"}},
 {id:"maint",nom:"Maintenance",role:"Maintenance Engineer",zone:"inge",d:[20.9,1.2],col:"#4D7C0F",resp:"Maintenance, incidents et évolutions : correctifs, mises à jour préparées sur branche, analyse des incidents.",missions:["Demandes de maintenance groupées","Rapport d'incident"],limites:"Aucune nouvelle fonctionnalité ; toute intégration de mise à jour exige votre accord écrit.",look:{peau:4,haut:"#F1EFE9",bas:"#20242A",ch:"court"}},
 {id:"devops",nom:"DevOps",role:"DevOps Engineer",zone:"inge",d:[16.8,5.3],col:"#5B616B",resp:"Environnements et opérations techniques autorisées : aperçus, sauvegardes, liste de contrôle avant mise en ligne.",missions:["Pipelines","Liste de contrôle de mise en production","Procédure de restauration"],limites:"Aucune action sur la production ; tout fichier de CI est N2.",look:{peau:2,haut:"#20242A",bas:"#5B616B",ch:"court",lun:1}},
 {id:"qa",nom:"QA",role:"QA Engineer",zone:"qual",d:[0.8,10.3],col:"#7C3AED",resp:"Tests, qualité et anomalies : prouve que le changement fonctionne et que rien n'a cassé.",missions:["Plan de test","Rapport de recette critère par critère"],limites:"Ne modifie jamais le code applicatif pour faire passer un test.",look:{peau:3,haut:"#F1EFE9",veste:1,bas:"#151719",ch:"afro"}},
 {id:"secu",nom:"Sécurité",role:"Security Engineer",zone:"qual",d:[4.9,10.3],col:"#B91C1C",resp:"Contrôles et risques de sécurité. Droit de blocage sur toute demande de fusion, que seul vous pouvez lever.",missions:["Rapport d'audit","Vulnérabilités classées","Avis de revue"],limites:"Lecture seule ; aucun test d'intrusion sur un système tiers.",look:{peau:1,haut:"#151719",veste:1,bas:"#151719",ch:"chignon",lun:1}},
 {id:"doc",nom:"Documentation",role:"Documentation & Knowledge Manager",zone:"qual",d:[0.8,13.5],col:"#15803D",resp:"Documentation et mémoire du bureau : fiches produits, journal, tableau de bord.",missions:["Fiches à jour","Journal des changements","Tableau de bord"],limites:"Aucun code ; aucune suppression d'historique.",look:{peau:0,haut:"#15803D",bas:"#151719",ch:"afro"}}
];
const ST_A={disponible:["Disponible","var(--dispo)","#1F8A4C",""],en_mission:["En mission","var(--mission)","#2563EB","▶"],en_attente:["En attente","var(--attente)","#B86E00","…"],bloque:["Bloqué","var(--bloque)","#C62828","!"],indisponible:["Indisponible","var(--indispo)","#8A8F97","–"]};
const ST_M={a_examiner:["À examiner","var(--examen)"],attente_approbation:["En attente d'approbation","var(--attente)"],autorisee:["Autorisée","#0E7490"],en_cours:["En cours","var(--mission)"],terminee:["Terminée","var(--dispo)"],bloquee:["Bloquée","var(--bloque)"],refusee:["Refusée","var(--indispo)"]};
const TYPES={decision:"Décision",autorisation:"Demande d'autorisation",proposition:"Proposition technique",examen:"Mission à examiner"};
const NIV={critique:"var(--bloque)",eleve:"var(--bloque)",moyen:"var(--attente)",info:"var(--gris)"};

/* ---------- utilitaires ---------- */
const $=id=>document.getElementById(id);
function el(t,a,...k){const n=document.createElement(t);for(const[x,v]of Object.entries(a||{})){if(v==null||v===false)continue;if(x==="class")n.className=v;else if(x==="text")n.textContent=v;else if(x==="style")n.style.cssText=v;else n.setAttribute(x,v===true?"":v)}for(const c of k.flat())if(c!=null&&c!==false)n.append(c.nodeType?c:document.createTextNode(String(c)));return n}
const s=v=>v==null?"":String(v);
function dateFr(i){if(!i)return"";if(/^\d{4}-\d{2}-\d{2}$/.test(s(i))){const j=new Date(i+"T12:00:00Z");return isNaN(j)?s(i):j.toLocaleDateString("fr-FR",{day:"numeric",month:"short",timeZone:"UTC"})}const d=new Date(i);return isNaN(d)?s(i):d.toLocaleString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Douala"})}
const heure=d=>d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Douala"});
const NR=t=>el("span",{class:"nr",text:t||"Non renseigné"});
function pastille(map,k){const v=map[k];if(!v)return NR();return el("span",{class:"statut",style:"color:"+v[1]},el("i"),v[0])}
function lienExt(u,t){return/^https:\/\//.test(s(u))?el("a",{class:"lien",href:s(u),target:"_blank",rel:"noopener",text:t||"Ouvrir"}):null}
function remplir(n,list,vide){n.replaceChildren(...(list.length?list:[el("div",{class:"vide",text:vide})]))}
let toastT=0;function toast(t){const n=$("toast");n.textContent=t;n.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>n.classList.remove("on"),3200)}
const agentDef=id=>EQUIPE.find(a=>a.id===id);
const nomAgent=id=>{const a=agentDef(id);return a?a.nom:s(id)};

/* ---------- état (lu dans la mémoire du bureau par /api/etat) ---------- */
let charge=false,lecture=null,etatSource="Lecture de la mémoire…",enErreur=false,ETAT={agents:{},missions:[],demandes:[],alertes:[],journal:[],decisions:[],meta:null};
const VERIF={valide:["Signée","var(--dispo)"],historique:["Historique, non signée","var(--gris)"],invalide:["Signature invalide : ne compte pas","var(--bloque)"]};
const enAttente=d=>d.statut==="en_attente"||d.statut==="historique";
const statutAgent=id=>{const a=ETAT.agents[id];return a&&ST_A[a.statut]?a.statut:null};

/* ---------- moteur isométrique ---------- */
const scene=$("scene"),cv=$("cv"),ctx=cv.getContext("2d"),calque=$("calque");
const LW=1220,LH=760,TX=29,TY=14.5,HZ=46,OX=500,OY=150;
const P=(x,z,y=0)=>[OX+(x-z)*TX,OY+(x+z)*TY-y*HZ];
const C={floor:"#ECEAE4",metal:"#1E2126",screen:"#20242A",paper:"#FFFFFF",oakT:"#DCC6A1",oakS:"#C9AF86",oakS2:"#B99C72",chairT:"#3A3F47",chairS:"#2B3036",wallL:"#F6F5F1",wallR:"#EDEBE5",win:"#DFE8F1",glass:"rgba(200,218,236,.28)",glassLine:"rgba(21,23,25,.45)",plantA:"#6E8F73",plantB:"#7FA286",pot:"#151719",line:"rgba(21,23,25,.06)",shadow:"rgba(21,23,25,.16)"};
function poly(p,f,st){ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();if(f){ctx.fillStyle=f;ctx.fill()}if(st){ctx.strokeStyle=st;ctx.lineWidth=1;ctx.stroke()}}
function box(x,z,y,w,d,h,t,l,r){poly([P(x,z+d,y),P(x+w,z+d,y),P(x+w,z+d,y+h),P(x,z+d,y+h)],l);poly([P(x+w,z,y),P(x+w,z+d,y),P(x+w,z+d,y+h),P(x+w,z,y+h)],r);poly([P(x,z,y+h),P(x+w,z,y+h),P(x+w,z+d,y+h),P(x,z+d,y+h)],t)}
function dalle(x,z,w,d,c){poly([P(x,z),P(x+w,z),P(x+w,z+d),P(x,z+d)],c)}
const W=24,D=16,H=3;
function decor(){
  dalle(0,0,W,D,C.floor);for(const zn of ZONES)dalle(zn.x,zn.z,zn.w,zn.d,zn.c);
  ctx.strokeStyle=C.line;ctx.lineWidth=1;
  for(let i=2;i<W;i+=2){const a=P(i,0),b=P(i,D);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  for(let j=2;j<D;j+=2){const a=P(0,j),b=P(W,j);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  for(const zn of ZONES){if(zn.id==="dir")continue;const[sx,sy]=P(zn.tx,zn.tz);ctx.save();ctx.translate(sx,sy);ctx.transform(1,.5,-1,.5,0,0);ctx.font="700 13px 'Inter Tight', Arial";ctx.fillStyle="#20242A";ctx.globalAlpha=.6;ctx.fillText(zn.nom.toUpperCase(),0,0);ctx.restore()}
  poly([P(0,0,0),P(W,0,0),P(W,0,H),P(0,0,H)],C.wallL);poly([P(0,0,0),P(0,D,0),P(0,D,H),P(0,0,H)],C.wallR);
  poly([P(0,0,H),P(W,0,H),P(W,-.25,H),P(-.25,-.25,H),P(-.25,D,H),P(0,D,H)],"#151719");
  for(const[a,b]of[[1,8],[16.5,23.5]])for(let x=a;x<b;x+=1.5){const e=Math.min(x+1.35,b);poly([P(x,0,.9),P(e,0,.9),P(e,0,2.7),P(x,0,2.7)],C.win,"#151719")}
  for(const[a,b]of[[1,6.6],[10,15]])for(let x=a;x<b;x+=1.5){const e=Math.min(x+1.35,b);poly([P(0,x,.9),P(0,e,.9),P(0,e,2.7),P(0,x,2.7)],C.win,"#151719")}
}
const siege=a=>[a.d[0]+1,a.d[1]+1.45];
function plante(x,z,k=1){box(x,z,0,.42*k,.42*k,.45*k,C.pot,"#20242A","#20242A");const[cx,cy]=P(x+.21*k,z+.21*k,.8*k);ctx.fillStyle=C.plantA;ctx.beginPath();ctx.arc(cx,cy,15*k,0,7);ctx.fill();ctx.fillStyle=C.plantB;ctx.beginPath();ctx.arc(cx-5*k,cy-6*k,9*k,0,7);ctx.fill()}
function vitre(x1,z1,x2,z2){poly([P(x1,z1,0),P(x2,z2,0),P(x2,z2,2.4),P(x1,z1,2.4)],C.glass,C.glassLine)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function poste(a){
  const[x,z]=a.d;const st=statutAgent(a.id);
  box(x+.08,z+.1,0,.06,.8,.72,C.metal,C.metal,C.metal);box(x+1.86,z+.1,0,.06,.8,.72,C.metal,C.metal,C.metal);
  box(x,z,.72,2,1,.07,C.oakT,C.oakS,C.oakS2);
  box(x+.55,z+.18,.79,.9,.06,.55,C.screen,st==="en_mission"?"#2563EB":st==="bloque"?"#C62828":C.screen,C.screen);
  box(x+1.3,z+.55,.79,.32,.22,.02,C.paper,C.paper,C.paper);
}
function chaise(a){const[sx,sz]=siege(a);box(sx-.25,sz-.2,.42,.5,.45,.08,C.chairT,C.chairS,C.chairS);box(sx-.03,sz-.02,0,.06,.06,.42,C.metal,C.metal,C.metal)}
function personne(a){
  const st=statutAgent(a.id);if(st==="indisponible")return;
  const L=a.look,peau=PEAU[L.peau||0];const[sx0,sz0]=siege(a);const[x,y0]=P(sx0,sz0,0);const y=y0-14;
  ctx.save();ctx.translate(x,y);if(!st)ctx.globalAlpha=.55;
  ctx.fillStyle=C.shadow;ctx.beginPath();ctx.ellipse(0,14,11,4.5,0,0,7);ctx.fill();
  const ty=-40,vest=L.haut;ctx.fillStyle=vest;rr(-8,ty,16,21,4);ctx.fill();
  if(L.veste){ctx.fillStyle="#F1EFE9";ctx.beginPath();ctx.moveTo(-2.5,ty);ctx.lineTo(2.5,ty);ctx.lineTo(0,ty+9);ctx.closePath();ctx.fill()}
  if(L.cravate){ctx.fillStyle=L.cravate;ctx.fillRect(-1,ty+2,2,9)}
  if(L.casque){ctx.strokeStyle=L.casque;ctx.lineWidth=2.4;ctx.beginPath();ctx.ellipse(0,ty+1,6.5,2.8,0,0,7);ctx.stroke()}
  ctx.lineCap="round";const bras=(x1,y1,x2,y2)=>{ctx.strokeStyle=vest;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.fillStyle=peau;ctx.beginPath();ctx.arc(x2,y2,2.4,0,7);ctx.fill()};
  bras(-7,ty+4,-6,ty+16);bras(7,ty+4,6,ty+16);
  const hy=ty-9;ctx.fillStyle=peau;ctx.fillRect(-2,ty-3,4,4);ctx.beginPath();ctx.arc(0,hy,7.5,0,7);ctx.fill();
  ctx.fillStyle="#141210";ctx.beginPath();ctx.arc(0,hy,L.ch==="afro"?9.5:7.6,0,7);ctx.fill();if(L.ch==="chignon"){ctx.beginPath();ctx.arc(0,hy-8,3.6,0,7);ctx.fill()}
  ctx.restore();
}
function dessinerScene(){
  decor();
  // direction : bureau du propriétaire et vitres
  box(10.85,2.2,0,.08,1.1,.72,C.metal,C.metal,C.metal);box(13.97,2.2,0,.08,1.1,.72,C.metal,C.metal,C.metal);box(10.8,2.1,.72,3.3,1.3,.08,"#2B3036","#20242A","#151719");box(11.9,2.25,.8,1.1,.06,.6,C.screen,C.screen,C.screen);
  box(12.15,3.85,.45,.6,.55,.1,"#151719","#151719","#151719");box(12.15,4.3,.55,.6,.1,.8,"#151719","#151719","#151719");
  vitre(9,.2,9,6);vitre(15,.2,15,6);vitre(9,6,11.6,6);vitre(12.8,6,15,6);
  // salle de réunion et bibliothèque (décor fixe)
  box(10,11.3,.72,3,1.6,.08,C.oakT,C.oakS,C.oakS2);box(10.2,11.4,0,.08,1.4,.72,C.metal,C.metal,C.metal);box(12.72,11.4,0,.08,1.4,.72,C.metal,C.metal,C.metal);
  box(.05,8.0,0,.45,1.4,1.9,C.oakT,C.oakS,C.oakS2);
  [[8.2,.4,1.2],[15.4,.45,1],[23.4,.45,1.2],[8.3,6.4,.9],[23.4,15.4,1.3],[15.8,10.3,.9],[8.6,15.3,1],[20.5,12.5,1.1]].forEach(([x,z,k])=>plante(x,z,k));
  const objs=[];for(const a of EQUIPE){objs.push({k:a.d[0]+a.d[1]+1.5,f:()=>poste(a)},{k:siege(a)[0]+siege(a)[1]-.4,f:()=>chaise(a)},{k:siege(a)[0]+siege(a)[1]+.1,f:()=>personne(a)})}
  objs.sort((p,q)=>p.k-q.k).forEach(o=>o.f());
}
/* vue : zoom et déplacement */
const vue={s:1,tx:0,ty:0,base:1};let CW=0,CH=0,dpr=1;
function cadrer(){const r=scene.getBoundingClientRect();CW=r.width;CH=r.height;dpr=Math.min(2,devicePixelRatio||1);cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);
  const b=Math.min(CW/(LW-120),CH/(LH-150));vue.base=b;}
function recentrer(){vue.s=vue.base;vue.tx=(CW-LW*vue.s)/2+40*vue.s;vue.ty=(CH-LH*vue.s)/2+10*vue.s;dessiner()}
function zoomer(f,cx,cy){const n=Math.max(vue.base*.8,Math.min(vue.base*3.2,vue.s*f));f=n/vue.s;vue.tx=cx-(cx-vue.tx)*f;vue.ty=cy-(cy-vue.ty)*f;vue.s=n;dessiner()}
let attente=false;function dessiner(){if(attente)return;attente=true;requestAnimationFrame(()=>{attente=false;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(dpr*vue.s,0,0,dpr*vue.s,dpr*vue.tx,dpr*vue.ty);dessinerScene();placer()})}
const versEcran=([x,y])=>[x*vue.s+vue.tx,y*vue.s+vue.ty];
/* étiquettes (HTML) avec anti-chevauchement */
const ETQ={},ZTQ={};
for(const a of EQUIPE){const n=el("div",{class:"etiq",role:"button",tabindex:"0","aria-label":a.nom+", "+a.role},el("span",{class:"pt"}),el("div",{},el("span",{text:a.nom}),el("small",{text:a.role})));
  n.addEventListener("click",()=>ouvrirAgent(a.id));n.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();ouvrirAgent(a.id)}});calque.append(n);ETQ[a.id]=n}
const YAN=el("button",{type:"button",class:"zone",style:"background:#151719;color:#fff;border-color:#151719",text:"Propriétaire · Yan"});YAN.addEventListener("click",()=>ouvrirDirection());calque.append(YAN);
function placer(){
  calque.classList.toggle("compact",vue.s<.62);
  const fixes=[];const pose=(n,x,y,centre)=>{const w=n.offsetWidth,hh=n.offsetHeight;if(!w)return;let l=centre?x-w/2:x,t=y;l=Math.max(4,Math.min(CW-w-(CW<600?56:4),l));n.style.transform=`translate(${Math.round(l)}px,${Math.round(t)}px)`;fixes.push({left:l,top:t,w,h:hh})};
  {const[x,y]=versEcran(P(13.6,4.6,0));pose(YAN,x,y,true)}
  const boxes=[];
  for(const a of EQUIPE){const[sx,sz]=siege(a);const[x,y]=versEcran(P(sx,sz,0));const n=ETQ[a.id];const w=n.offsetWidth,hh=n.offsetHeight;if(!w)continue;
    boxes.push({n,left:Math.max(4,Math.min(CW-w-(CW<600?56:4),x-w/2)),top:y-62*vue.s-hh,w,h:hh})}
  boxes.sort((p,q)=>q.top-p.top);const places=[];
  const chev=(A,B)=>A.left<B.left+B.w+3&&B.left<A.left+A.w+3&&A.top<B.top+B.h+3&&B.top<A.top+A.h+3;
  for(const A of boxes){for(let k=0;k<12;k++){const c=fixes.concat(places).find(B=>chev(A,B));if(!c)break;A.top=c.top-A.h-3}places.push(A);A.n.style.transform=`translate(${Math.round(A.left)}px,${Math.round(A.top)}px)`}
}
/* interactions pointeur */
const pts=new Map();let glisse=false,depart=null,pinch=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.offsetX,e.offsetY]);glisse=false;depart=[e.offsetX,e.offsetY,vue.tx,vue.ty];
  if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s:vue.s}}});
cv.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.offsetX,e.offsetY]);
  if(pts.size===2&&pinch){const[a,b]=[...pts.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);zoomer((pinch.s*d/pinch.d)/vue.s,(a[0]+b[0])/2,(a[1]+b[1])/2);glisse=true;return}
  if(depart&&pts.size===1){const dx=e.offsetX-depart[0],dy=e.offsetY-depart[1];if(Math.hypot(dx,dy)>5){glisse=true;cv.classList.add("drag")}if(glisse){vue.tx=depart[2]+dx;vue.ty=depart[3]+dy;dessiner()}}});
function fin(e){if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);cv.classList.remove("drag");if(pts.size<2)pinch=null;
  if(!glisse&&e.type==="pointerup"){const wx=(e.offsetX-vue.tx)/vue.s,wy=(e.offsetY-vue.ty)/vue.s;let best=null,bd=60;
    for(const a of EQUIPE){const[px,py]=P(a.d[0]+1,a.d[1]+1,.5);const d=Math.hypot(px-wx,py-wy);if(d<bd){bd=d;best=a}}
    if(best){ouvrirAgent(best.id)}else{const a=(wx-OX)/TX,b=(wy-OY)/TY,fx=(a+b)/2,fz=(b-a)/2;const zn=ZONES.find(q=>fx>=q.x&&fx<=q.x+q.w&&fz>=q.z&&fz<=q.z+q.d);if(zn){zn.id==="dir"?ouvrirDirection():ouvrirZone(zn.id)}}}
  if(!pts.size)depart=null}
cv.addEventListener("pointerup",fin);cv.addEventListener("pointercancel",fin);
cv.addEventListener("wheel",e=>{e.preventDefault();zoomer(e.deltaY<0?1.12:1/1.12,e.offsetX,e.offsetY)},{passive:false});
$("z-plus").addEventListener("click",()=>zoomer(1.25,CW/2,CH/2));$("z-moins").addEventListener("click",()=>zoomer(1/1.25,CW/2,CH/2));$("z-reset").addEventListener("click",recentrer);
$("b-dir").addEventListener("click",ouvrirDirection);
new ResizeObserver(()=>{const old=vue.base;cadrer();if(!old||Math.abs(old-vue.base)>1e-6)recentrer();else dessiner()}).observe(scene);
cadrer();recentrer();

/* ---------- rendu des données ---------- */
function majEtiquettes(){for(const a of EQUIPE){const st=statutAgent(a.id);const n=ETQ[a.id];const v=ST_A[st];n.className="etiq st-"+(st||"nr");const pt=n.querySelector(".pt");pt.style.background=v?v[2]:"#C9CCD1";pt.textContent=v?v[3]:"?";n.title=a.role+" — "+(v?v[0]:"Statut non renseigné")}}
function legendes(){
  $("leg-agents").replaceChildren(...Object.values(ST_A).map(v=>el("span",{},el("i",{style:"background:"+v[2]}),v[0])),el("span",{},el("i",{style:"background:#C9CCD1"}),"Non renseigné"),el("span",{text:"· écran bleu = en mission, rouge = bloqué"}));
  $("leg-missions").replaceChildren(...Object.values(ST_M).map(v=>el("span",{},el("i",{style:"background:"+v[1]}),v[0])));
}
function carteAgent(a){const st=statutAgent(a.id);const d=ETAT.agents[a.id]||{};const b=el("button",{type:"button",class:"carte agent-c"},el("div",{class:"av",style:"background:"+a.col},a.nom.charAt(0)),el("div",{},el("h3",{text:a.nom}),el("div",{class:"meta",text:a.role}),el("div",{style:"margin-top:4px"},st?pastille(ST_A,st):NR()),d.mission_en_cours?el("div",{class:"meta",text:"Mission : "+s(d.mission_en_cours)}):null));b.addEventListener("click",()=>ouvrirAgent(a.id));return b}
function compte(arr,f){return arr.filter(f).length}
function kpi(){
  const k=[];const m=ETAT.missions,dm=ETAT.demandes;const aOk=Object.keys(ETAT.agents).length>0;
  const val=(n,ok)=>ok?el("b",{text:String(n)}):el("b",{class:"nr",text:"Non renseigné"});
  const L=[["Décisions à prendre",compte(dm,d=>d.statut==="en_attente"),charge],["Missions en attente d'approbation",compte(m,x=>x.statut==="attente_approbation"),charge],["Missions autorisées",compte(m,x=>x.statut==="autorisee"),charge],["Missions en cours",compte(m,x=>x.statut==="en_cours"),charge],["Missions terminées",compte(m,x=>x.statut==="terminee"),charge],["Missions bloquées",compte(m,x=>x.statut==="bloquee"),charge],["Agents disponibles",EQUIPE.filter(a=>statutAgent(a.id)==="disponible").length,aOk],["Agents en mission",EQUIPE.filter(a=>statutAgent(a.id)==="en_mission").length,aOk],["Agents en attente",EQUIPE.filter(a=>statutAgent(a.id)==="en_attente").length,aOk]];
  $("kpi").replaceChildren(...L.map(([t,n,ok])=>el("div",{},val(n,ok),t)));
  const nd=compte(dm,d=>d.statut==="en_attente");const b=$("nb-dec");b.hidden=!nd;b.textContent=nd;
}
function carteDemande(d){
  const c=el("article",{class:"carte"},el("div",{style:"display:flex;gap:6px;flex-wrap:wrap"},el("span",{class:"statut",style:"color:var(--examen)",text:TYPES[d.type]||s(d.type)}),d.niveau?el("span",{class:"statut",style:"color:var(--attente)",text:s(d.niveau)}):null,d.mission?el("span",{class:"statut",style:"color:var(--gris)",text:s(d.mission)}):null),
    el("h3",{text:s(d.titre)}),el("div",{class:"meta",text:[d.agent?"Proposé par "+nomAgent(d.agent):"",d.cree_le?dateFr(d.cree_le):""].filter(Boolean).join(" · ")}),d.detail?el("div",{class:"texte",text:s(d.detail)}):null);
  const lk=lienExt(d.lien,"Ouvrir la page utile");
  if(enAttente(d)){const ta=el("textarea",{placeholder:"Commentaire (facultatif)","aria-label":"Commentaire",maxlength:"1000"});const msg=el("span",{class:"meta","aria-live":"polite"});
    if(d.statut==="historique")c.append(el("div",{class:"avert",text:"Une décision historique, non signée, existe pour cette demande. Elle ne vaut pas approbation : confirmez-la ici pour l'enregistrer avec votre signature."}));
    const ok=el("button",{type:"button",class:"go",text:"Approuver"}),non=el("button",{type:"button",class:"non",text:"Refuser"});
    const agir=async v=>{if(!confirm((v==="approuvee"?"Approuver":"Refuser")+" : « "+s(d.titre)+" » ?\nVotre décision sera signée et enregistrée dans la mémoire du bureau."))return;
      ok.disabled=non.disabled=true;msg.textContent="Enregistrement…";
      try{const r=await fetch("/api/decision",{method:"POST",credentials:"same-origin",redirect:"manual",cache:"no-store",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({demande_id:d.id,choix:v,commentaire:ta.value.trim()||null})});
        if(r.type==="opaqueredirect"||r.status===403)throw new Error("Connexion expirée : rechargez la page pour vous reconnecter.");
        let j={};try{j=await r.json()}catch(e){}
        if(!r.ok)throw new Error(j.erreur||"Échec de l'enregistrement. Réessayez.");
        toast(v==="approuvee"?"Décision signée et enregistrée : approuvée.":"Décision signée et enregistrée : refusée.");await charger()}
      catch(e){msg.textContent=e&&e.message?e.message:"Échec de l'enregistrement. Réessayez.";ok.disabled=non.disabled=false}};
    ok.addEventListener("click",()=>agir("approuvee"));non.addEventListener("click",()=>agir("refusee"));
    c.append(ta,el("div",{class:"actions"},ok,non,lk,msg),el("div",{class:"avert",text:"Votre décision est signée et enregistrée dans la mémoire du bureau (etat/decisions.json). Aucun agent n'agit avant que la mission soit lancée avec votre accord écrit."}))}
  else{const x=d.decision||{};c.append(el("div",{class:"meta",text:(d.statut==="approuvee"?"Approuvée":"Refusée")+(x.decide_le?" le "+dateFr(x.decide_le):"")+" · décision signée"+(x.commentaire?" — « "+s(x.commentaire)+" »":"")}));if(lk)c.append(el("div",{class:"actions"},lk))}
  return c}
function blocDirection(cible){
  const att=ETAT.demandes.filter(enAttente);const hist=ETAT.decisions.slice().sort((a,b)=>s(b.decide_le).localeCompare(s(a.decide_le)));
  const grp=t=>att.filter(d=>d.type===t);const exam=ETAT.missions.filter(m=>m.statut==="a_examiner"||m.statut==="attente_approbation");
  const sec=(t,list,vide)=>[el("h4",{text:t+" ("+list.length+")"}),list.length?el("div",{class:"grille"},list):el("div",{class:"vide",text:vide})];
  const al=alertesOuvertes();
  cible.replaceChildren(
    el("div",{class:"cols"},
      el("div",{},el("h3",{text:"Propositions des agents (non validées)"}),el("div",{class:"meta",text:"Elles n'ont aucun effet tant que vous ne les avez pas approuvées."})),
      el("div",{},el("h3",{text:"Décisions validées ou refusées"}),el("div",{class:"meta",text:hist.length+" décision(s) dans l'historique ci-dessous."}))),
    ...sec("Décisions en attente",grp("decision").map(carteDemande),"Aucune décision en attente."),
    ...sec("Demandes d'autorisation",grp("autorisation").map(carteDemande),"Aucune demande d'autorisation."),
    ...sec("Propositions techniques",grp("proposition").map(carteDemande),"Aucune proposition en attente."),
    ...sec("Missions à examiner",exam.map(m=>el("article",{class:"carte"},pastille(ST_M,m.statut),el("h3",{text:s(m.numero)+" · "+s(m.objet)}),m.resume?el("div",{class:"texte",text:s(m.resume)}):null,lienExt(m.lien,"Voir sur GitHub"))),"Aucune mission à examiner."),
    ...sec("Risques et alertes",al.map(carteAlerte),"Aucune alerte ouverte."),
    el("h4",{text:"Historique des décisions ("+hist.length+")"}),el("div",{class:"meta",text:"Seule une décision signée vaut approbation. Les décisions historiques ont été recopiées par Claude et ne sont pas signées."}),hist.length?el("div",{class:"carte liste"},hist.map(ligneDecision)):el("div",{class:"vide",text:"Aucune décision enregistrée."}));
}
function ligneDecision(d){const v=VERIF[d.verification]||VERIF.invalide;const faux=d.verification==="invalide";
  return el("div",{class:"l"},el("div",{class:"badges"},el("span",{class:"statut",style:"color:"+(faux?"var(--gris)":d.choix==="approuvee"?"var(--dispo)":"var(--bloque)"),text:d.choix==="approuvee"?"Approuvée":d.choix==="refusee"?"Refusée":"Choix inconnu"}),el("span",{class:"statut"+(faux?" faux":""),style:"color:"+v[1],text:v[0]})),
    el("div",{text:s(d.titre)}),el("small",{text:[d.decide_le?dateFr(d.decide_le):"",d.verification==="valide"&&d.par?"par "+s(d.par):"",d.commentaire?"« "+s(d.commentaire)+" »":""].filter(Boolean).join(" · ")}))}
function alertesOuvertes(){const faux=ETAT.decisions.filter(d=>d.verification==="invalide").map(d=>({titre:"Décision à la signature invalide : "+s(d.titre||d.id),detail:"Cette décision a été modifiée ou n'a pas été enregistrée par la console. Elle ne compte pas. Vérifiez l'historique du fichier etat/decisions.json.",niveau:"critique",date:d.decide_le}));
  return faux.concat(ETAT.alertes.filter(a=>a.statut!=="close"))}
function carteAlerte(a){return el("article",{class:"carte"},el("span",{class:"statut",style:"color:"+(NIV[a.niveau]||"var(--gris)"),text:({critique:"Critique",eleve:"Élevé",moyen:"Moyen",info:"Information"}[a.niveau]||s(a.niveau))}),el("h3",{text:s(a.titre)}),a.detail?el("div",{class:"texte",text:s(a.detail)}):null,el("div",{class:"meta",text:dateFr(a.date)}),lienExt(a.lien,"Ouvrir"))}
let fM="toutes",fJ="tous";
function filtres(){
  const fm=[["toutes","Toutes"],...Object.entries(ST_M).map(([k,v])=>[k,v[0]])];
  $("f-missions").replaceChildren(...fm.map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String(k===fM),text:t});b.addEventListener("click",()=>{fM=k;rendre()});return b}));
  const fj=[["tous","Tous"],...EQUIPE.map(a=>[a.id,a.nom])];
  $("f-journal").replaceChildren(...fj.map(([k,t])=>{const b=el("button",{type:"button","aria-pressed":String(k===fJ),text:t});b.addEventListener("click",()=>{fJ=k;rendre()});return b}));
}
function espaces(){$("espaces").replaceChildren(el("span",{class:"meta",style:"align-self:center",text:"Espaces :"}),...ZONES.map(z=>{const b=el("button",{type:"button",text:z.id==="dir"?"Direction":z.nom});b.addEventListener("click",()=>z.id==="dir"?ouvrirDirection():ouvrirZone(z.id));return b}))}
function rendre(){
  espaces();
  majEtiquettes();dessiner();legendes();filtres();kpi();
  remplir($("cartes-agents"),EQUIPE.map(carteAgent),"");
  const src=$("source");src.classList.toggle("on",charge&&!enErreur);src.classList.toggle("erreur",enErreur);
  src.lastChild.textContent=etatSource;
  $("meta-maj").textContent=ETAT.meta&&ETAT.meta.maj?"Dernière mise à jour par le bureau : "+dateFr(ETAT.meta.maj)+(ETAT.meta.par?" ("+s(ETAT.meta.par)+")":"")+".":"";
  $("src-kpi").textContent=src.lastChild.textContent;
  blocDirection($("direction"));
  const ms=ETAT.missions.filter(m=>fM==="toutes"||m.statut===fM);
  remplir($("t-missions"),ms.map(m=>el("tr",{},el("td",{"data-l":"Mission"},el("b",{text:s(m.numero)})," ",s(m.objet)),el("td",{"data-l":"Produit",text:s(m.produit)}),el("td",{"data-l":"Statut"},pastille(ST_M,m.statut)),
    el("td",{"data-l":"Avancement"},typeof m.avancement==="number"?el("div",{style:"display:flex;gap:8px;align-items:center"},el("div",{class:"barre"},el("i",{style:"width:"+Math.max(0,Math.min(100,m.avancement))+"%"})),el("span",{class:"meta",text:m.avancement+" %"})):NR()),
    el("td",{"data-l":"Agents",text:Array.isArray(m.agents)&&m.agents.length?m.agents.map(nomAgent).join(", "):"—"}),el("td",{"data-l":"Lien"},lienExt(m.lien,"GitHub")||"—"))),"");
  if(!ms.length)$("t-missions").replaceChildren(el("tr",{},el("td",{colspan:"6",class:"meta",text:charge?"Aucune mission pour ce filtre.":"Données non connectées."})));
  $("t-agents").replaceChildren(...EQUIPE.map(a=>{const d=ETAT.agents[a.id]||{};const st=statutAgent(a.id);return el("tr",{},el("td",{"data-l":"Agent"},el("b",{text:a.nom}),el("div",{class:"meta",text:a.role})),el("td",{"data-l":"Statut"},st?pastille(ST_A,st):NR()),el("td",{"data-l":"Mission en cours",text:s(d.mission_en_cours)||"—"}),el("td",{"data-l":"Blocage"},d.blocage?el("span",{style:"color:var(--bloque)",text:s(d.blocage)}):"—"),el("td",{"data-l":"Mis à jour",text:d.maj?dateFr(d.maj):"—"}))}));
  remplir($("alertes"),alertesOuvertes().map(carteAlerte),charge?"Aucune alerte ouverte.":"Données non connectées.");
  const j=ETAT.journal;
  remplir($("recents"),j.slice(0,6).map(x=>el("div",{class:"l"},s(x.texte),el("small",{text:[dateFr(x.date),x.agent?nomAgent(x.agent):"",x.mission||""].filter(Boolean).join(" · ")}))),charge?"Aucun événement.":"Données non connectées.");
  const jf=j.filter(x=>fJ==="tous"||x.agent===fJ);
  remplir($("journal"),jf.slice(0,60).map(x=>el("div",{class:"l"},s(x.texte),el("small",{text:[dateFr(x.date),x.agent?nomAgent(x.agent):"",x.mission||""].filter(Boolean).join(" · ")}))),charge?"Rien pour ce filtre.":"Données non connectées.");
  if(ouvert==="direction")ouvrirDirection();else if(ouvert&&ouvert.startsWith("zone:"))ouvrirZone(ouvert.slice(5));else if(ouvert)ouvrirAgent(ouvert);
}
/* ---------- tiroir ---------- */
const tiroir=$("tiroir"),voile=$("voile");let ouvert=null,retour=null;
function fermer(){tiroir.classList.remove("on");voile.classList.remove("on");tiroir.setAttribute("aria-hidden","true");ouvert=null;if(retour&&retour.focus)retour.focus()}
voile.addEventListener("click",fermer);addEventListener("keydown",e=>{if(e.key==="Escape"&&ouvert)fermer()});
function ouvrir(haut,corps,cle){if(!ouvert)retour=document.activeElement;const f=el("button",{type:"button",class:"fermer",text:"Fermer"});f.addEventListener("click",fermer);
  tiroir.replaceChildren(el("div",{class:"haut"},...haut,f),el("div",{class:"corps"},...corps));tiroir.classList.add("on");voile.classList.add("on");tiroir.setAttribute("aria-hidden","false");if(ouvert!==cle){ouvert=cle;f.focus()}}
function ouvrirAgent(id){const a=agentDef(id);const d=ETAT.agents[id]||{};const st=statutAgent(id);
  const hist=ETAT.missions.filter(m=>Array.isArray(m.agents)&&m.agents.includes(id));const act=ETAT.journal.filter(j=>j.agent===id).slice(0,10);
  const dem=ETAT.demandes.filter(x=>x.agent===id&&x.statut==="en_attente");
  ouvrir([el("div",{class:"av",style:"background:"+a.col},a.nom.charAt(0)),el("div",{},el("div",{class:"meta",text:(ZONES.find(z=>z.id===a.zone)||{}).nom}),el("h3",{id:"t-titre",text:a.nom}),el("div",{class:"meta",text:a.role}))],
    [el("div",{},st?pastille(ST_A,st):NR("Statut non renseigné")),d.maj?el("div",{class:"meta",style:"margin-top:4px",text:"Statut enregistré le "+dateFr(d.maj)}):null,
     el("h4",{text:"Responsabilité dans AI TECH OFFICE"}),el("div",{class:"texte",text:a.resp}),
     el("h4",{text:"Missions principales"}),el("div",{class:"liste"},a.missions.map(t=>el("div",{class:"l",text:t}))),
     el("h4",{text:"Limites"}),el("div",{class:"texte",text:a.limites}),
     el("h4",{text:"Mission en cours"}),d.mission_en_cours?el("div",{class:"texte",text:s(d.mission_en_cours)}):el("div",{class:"meta",text:"Aucune"}),
     el("h4",{text:"Dernière activité enregistrée"}),d.resume?el("div",{class:"texte",text:s(d.resume)}):NR(),
     el("h4",{text:"Blocages et demandes d'intervention"}),(d.blocage||dem.length)?el("div",{},d.blocage?el("div",{class:"texte",style:"color:var(--bloque)",text:s(d.blocage)}):null,dem.map(x=>el("div",{class:"texte",text:"Demande : "+s(x.titre)}))):el("div",{class:"meta",text:"Aucun"}),
     el("h4",{text:"Activités récentes ("+act.length+")"}),act.length?el("div",{class:"liste"},act.map(j=>el("div",{class:"l"},s(j.texte),el("small",{text:dateFr(j.date)})))):el("div",{class:"meta",text:"Rien d'enregistré."}),
     el("h4",{text:"Historique des missions ("+hist.length+")"}),hist.length?el("div",{class:"liste"},hist.map(m=>el("div",{class:"l"},s(m.numero)+" · "+s(m.objet),el("small",{text:(ST_M[m.statut]||["Non renseigné"])[0]})))):el("div",{class:"meta",text:"Aucune mission."})],id)}
function ouvrirZone(zid){const z=ZONES.find(x=>x.id===zid);const ag=EQUIPE.filter(a=>a.zone===zid);
  ouvrir([el("div",{},el("div",{class:"meta",text:"Espace"}),el("h3",{id:"t-titre",text:z.nom}))],[el("div",{class:"grille"},ag.map(carteAgent))],"zone:"+zid)}
function ouvrirDirection(){const c=el("div");blocDirection(c);ouvrir([el("div",{},el("div",{class:"meta",text:"Supervision humaine"}),el("h3",{id:"t-titre",text:"Bureau de la direction"}))],[c],"direction")}
/* ---------- vues ---------- */
function route(){const p=location.hash==="#pilotage"?"pilotage":"bureau";$("vue-bureau").hidden=p!=="bureau";$("vue-pilotage").hidden=p!=="pilotage";
  $("v-bureau").toggleAttribute("aria-current",p==="bureau");$("v-pilotage").toggleAttribute("aria-current",p==="pilotage");
  if(p==="bureau"){$("v-bureau").setAttribute("aria-current","page");requestAnimationFrame(()=>{cadrer();recentrer()})}else $("v-pilotage").setAttribute("aria-current","page")}
addEventListener("hashchange",route);route();
rendre();
/* ---------- lecture de la mémoire du bureau ---------- */
const bAct=$("b-actualiser");
async function charger(){
  bAct.disabled=true;etatSource="Lecture de la mémoire…";$("source").lastChild.textContent=etatSource;
  try{
    const r=await fetch("/api/etat",{credentials:"same-origin",redirect:"manual",cache:"no-store",headers:{Accept:"application/json"}});
    if(r.type==="opaqueredirect"||r.status===403)throw new Error("Connexion expirée ou refusée : rechargez la page pour vous reconnecter.");
    if(!r.ok){let j={};try{j=await r.json()}catch(e){}throw new Error(j.erreur||"Lecture de la mémoire impossible.")}
    const j=await r.json();const t=v=>Array.isArray(v)?v:[];
    const agents={};for(const a of t(j.agents))if(a&&a.id)agents[a.id]=a;
    ETAT={agents,missions:t(j.missions).slice().sort((a,b)=>(b.tri||0)-(a.tri||0)),demandes:t(j.demandes).slice().sort((a,b)=>(a.ordre||99)-(b.ordre||99)),alertes:t(j.alertes),journal:t(j.journal),decisions:t(j.decisions),meta:j.meta||null};
    charge=true;enErreur=false;lecture=new Date();etatSource="Mémoire du bureau (GitHub) · lue à "+heure(lecture);
  }catch(e){enErreur=true;etatSource=(e&&e.message?e.message:"Lecture de la mémoire impossible.")+(lecture?" Dernière lecture réussie à "+heure(lecture)+".":"")}
  finally{bAct.disabled=false;rendre()}
}
bAct.addEventListener("click",charger);
charger();
}
