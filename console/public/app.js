{
/* ---------- registre (définitions fixes du dossier, pas des données d'activité) ---------- */
const PEAU=["#4A2E1F","#5A3825","#6B4226","#7A4A2A","#8A5A3B"];
const ZONES=[{id:"prod",nom:"Produit & architecture",x:.4,z:.6,w:6.8,d:6.6,c:"rgba(142,197,214,.13)",tx:.6,tz:7.6},{id:"dir",nom:"Direction",x:8.6,z:.6,w:6,d:5.2,c:"rgba(201,169,110,.12)",tx:8.8,tz:6.3},{id:"inge",nom:"Ingénierie & livraison",x:15.2,z:.6,w:6.4,d:6.6,c:"rgba(142,197,214,.13)",tx:15.4,tz:7.6},{id:"qual",nom:"Qualité, sécurité & documentation",x:.4,z:8.6,w:7.4,d:6.8,c:"rgba(142,197,214,.13)",tx:.6,tz:15.8}];
const LIBRES=[[4.6,10.2,3]];
const EQUIPE=[
 {id:"cto",nom:"Yano",role:"AI CTO · coordination et arbitrages",zone:"dir",d:[13,3.6],o:2,debout:1,col:"#20242A",resp:"Qualifie vos demandes, établit le plan, délègue, contrôle la cohérence, prépare vos décisions et vous rend compte. Unique interlocuteur du propriétaire.",missions:["Fiche et plan de chaque mission","Demandes d'approbation","Compte rendu de fin de mission","Rapport hebdomadaire"],limites:"Ne code pas dans les produits, ne fusionne rien, ne déploie rien, n'approuve jamais à votre place.",look:{peau:1,haut:"#20242A",veste:1,bas:"#151719",ch:"court",lun:1,cravate:"#2563EB"}},
 {id:"pm",nom:"Produit",role:"Product Manager",zone:"prod",d:[1.2,1.6],o:3,col:"#2563EB",resp:"Transforme une demande en besoin précis, priorisé et vérifiable.",missions:["Fiche besoin et critères d'acceptation","Note de priorisation"],limites:"Aucune décision commerciale ou tarifaire.",look:{peau:3,haut:"#F1EFE9",bas:"#151719",ch:"afro"}},
 {id:"ux",nom:"Design",role:"UX/UI Designer",zone:"prod",d:[3.6,1.4],o:1,col:"#0E7490",resp:"Des parcours simples et des écrans fidèles à la charte de chaque marque, d'abord sur téléphone.",missions:["Maquettes et prototypes","Liste des écrans","Notes d'accessibilité"],limites:"Aucune logique métier ; aucune dépendance sans avis de l'Architecte et votre accord écrit.",look:{peau:2,haut:"#0E7490",bas:"#F1EFE9",ch:"chignon"}},
 {id:"archi",nom:"Architecte",role:"Software Architect",zone:"prod",d:[3.2,4.4],o:0,col:"#3A3F47",resp:"Des choix techniques durables et cohérents d'un produit à l'autre.",missions:["Note de conception","Décisions d'architecture","Schéma de données","Avis sur les dépendances"],limites:"Ne réalise pas la fonctionnalité ; aucune dépendance payante sans votre accord.",look:{peau:0,haut:"#3A3F47",veste:1,bas:"#3A3F47",ch:"court",barbe:1}},
 {id:"lead",nom:"Dev",role:"Lead Developer",zone:"inge",d:[16,1.4],o:1,col:"#1D4ED8",resp:"Réalise les changements de code sur une branche agent/, avec leurs tests.",missions:["Branche et lien de comparaison","Tests unitaires","Note de version"],limites:"Ne pousse jamais sur main, ne fusionne pas, ne déploie pas, ne lit aucun secret.",look:{peau:1,haut:"#151719",bas:"#151719",ch:"court",casque:"#2563EB"}},
 {id:"maint",nom:"Maintenance",role:"Maintenance Engineer",zone:"inge",d:[16.6,4.4],o:0,col:"#4D7C0F",resp:"Maintenance, incidents et évolutions : correctifs, mises à jour préparées sur branche, analyse des incidents.",missions:["Demandes de maintenance groupées","Rapport d'incident"],limites:"Aucune nouvelle fonctionnalité ; toute intégration de mise à jour exige votre accord écrit.",look:{peau:4,haut:"#F1EFE9",bas:"#20242A",ch:"court"}},
 {id:"devops",nom:"DevOps",role:"DevOps Engineer",zone:"inge",d:[19.4,2.2],o:2,col:"#5B616B",resp:"Environnements et opérations techniques autorisées : aperçus, sauvegardes, liste de contrôle avant mise en ligne.",missions:["Pipelines","Liste de contrôle de mise en production","Procédure de restauration"],limites:"Aucune action sur la production ; tout fichier de CI est N2.",look:{peau:2,haut:"#20242A",bas:"#5B616B",ch:"court",lun:1}},
 {id:"qa",nom:"QA",role:"QA Engineer",zone:"qual",d:[1.4,9.6],o:3,col:"#7C3AED",resp:"Tests, qualité et anomalies : prouve que le changement fonctionne et que rien n'a cassé.",missions:["Plan de test","Rapport de recette critère par critère"],limites:"Ne modifie jamais le code applicatif pour faire passer un test.",look:{peau:3,haut:"#F1EFE9",veste:1,bas:"#151719",ch:"afro"}},
 {id:"secu",nom:"Sécurité",role:"Security Engineer",zone:"qual",d:[4.2,12.6],o:0,col:"#B91C1C",resp:"Contrôles et risques de sécurité. Droit de blocage sur toute demande de fusion, que seul vous pouvez lever.",missions:["Rapport d'audit","Vulnérabilités classées","Avis de revue"],limites:"Lecture seule ; aucun test d'intrusion sur un système tiers.",look:{peau:1,haut:"#151719",veste:1,bas:"#151719",ch:"chignon",lun:1}},
 {id:"doc",nom:"Documentation",role:"Documentation & Knowledge Manager",zone:"qual",d:[1.4,12.8],o:3,col:"#15803D",resp:"Documentation et mémoire du bureau : fiches produits, journal, tableau de bord.",missions:["Fiches à jour","Journal des changements","Tableau de bord"],limites:"Aucun code ; aucune suppression d'historique.",look:{peau:0,haut:"#15803D",bas:"#151719",ch:"afro"}}
];
const ST_A={disponible:["Disponible","var(--dispo)","#1F8A4C",""],en_mission:["En mission","var(--mission)","#2563EB","▶"],en_attente:["En attente","var(--attente)","#B86E00","…"],bloque:["Bloqué","var(--bloque)","#C62828","!"],indisponible:["Indisponible","var(--indispo)","#8A8F97","–"]};
const ST_M={a_examiner:["À examiner","var(--examen)"],attente_approbation:["En attente d'approbation","var(--attente)"],autorisee:["Autorisée","#0E7490"],en_cours:["En cours","var(--mission)"],terminee:["Terminée","var(--dispo)"],bloquee:["Bloquée","var(--bloque)"],refusee:["Refusée","var(--indispo)"]};
const TYPES={decision:"Décision",autorisation:"Demande d'autorisation",proposition:"Proposition technique",examen:"Mission à examiner"};
const NIV={critique:"var(--bloque)",eleve:"var(--bloque)",moyen:"var(--attente)",info:"var(--gris)"};

/* ---------- utilitaires ---------- */
const $=id=>document.getElementById(id);
function el(t,a,...k){const n=document.createElement(t);for(const[x,v]of Object.entries(a||{})){if(v==null||v===false)continue;if(x==="class")n.className=v;else if(x==="text")n.textContent=v;else if(x==="style")n.style.cssText=v;else n.setAttribute(x,v===true?"":v)}for(const c of k.flat())if(c!=null&&c!==false)n.append(c.nodeType?c:document.createTextNode(String(c)));return n}
const s=v=>typeof v==="string"?v:(typeof v==="number"||typeof v==="boolean")?String(v):"";// texte sûr : objets et valeurs non textuelles ignorés
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
const statutAgent=id=>{const a=Object.hasOwn(ETAT.agents,id)?ETAT.agents[id]:null;return a&&typeof a.statut==="string"&&Object.hasOwn(ST_A,a.statut)?a.statut:null};

/* ---------- moteur isométrique : open space « plateau flottant » (M-007, repris de references/bureau-v4.html) ---------- */
const scene=$("scene"),cv=$("cv"),ctx=cv.getContext("2d"),calque=$("calque");
const LW=1180,LH=800,TX=29,TY=14.5,HZ=46,OX=520,OY=150;
const P=(x,z,y=0)=>[OX+(x-z)*TX,OY+(x+z)*TY-y*HZ];
const C={slabT:"#EEF4FA",slabL:"#C9DCEC",slabR:"#B4CDE3",deskT:"#F7FAFD",deskL:"#DCE8F3",deskR:"#C8DAEA",bezel:"#1E2733",screen:"#CFE4F5",eteint:"#2B3A4B",chair:"#3F4D60",chairD:"#2E3A4A",chairL:"#56657A",metal:"#5B6878",potW:"#F4F7FA",veille:"#1E4B7A",potO:"#E07A4F",leaf:"#4F8A72",leaf2:"#6FA88E",shadow:"rgba(40,70,110,.18)",wall:"#F7FAFD",wallS:"#DCE8F3",polo:"#4F8FCC",trous:"#2B3442",paper:"#FFFFFF",wood:"#E9DCC4"};
function poly(p,f,st){ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();if(f){ctx.fillStyle=f;ctx.fill()}if(st){ctx.strokeStyle=st;ctx.lineWidth=1;ctx.stroke()}}
function box(x,z,y,w,d,h,t,l,r){poly([P(x,z+d,y),P(x+w,z+d,y),P(x+w,z+d,y+h),P(x,z+d,y+h)],l);poly([P(x+w,z,y),P(x+w,z+d,y),P(x+w,z+d,y+h),P(x+w,z,y+h)],r);poly([P(x,z,y+h),P(x+w,z,y+h),P(x+w,z+d,y+h),P(x,z+d,y+h)],t)}
function dalle(x,z,w,d,c,st){poly([P(x,z),P(x+w,z),P(x+w,z+d),P(x,z+d)],c,st)}
function ombre(x,z,rx,ry){const[sx,sy]=P(x,z);ctx.fillStyle=C.shadow;ctx.beginPath();ctx.ellipse(sx,sy,rx,ry,0,0,7);ctx.fill()}
function texteSol(t,x,z){const[sx,sy]=P(x,z);ctx.save();ctx.translate(sx,sy);ctx.transform(1,.5,-1,.5,0,0);ctx.font="700 12px 'Inter Tight', Arial";ctx.fillStyle="#3A5A7A";ctx.globalAlpha=.55;ctx.fillText(t,0,0);ctx.restore()}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
const W=22,D=16,H=2.6;
/* ---------- animation (M-010) : chaque mouvement traduit un statut réel lu dans etat/ ----------
   requestAnimationFrame, 30 images par seconde au plus ; arrêt si l'onglet est caché ou la Vue 1 masquée ;
   image figée (T = 0, aucun décalage) si le visiteur demande moins d'animations (prefers-reduced-motion). */
const RM=matchMedia("(prefers-reduced-motion: reduce)");
let ANIM=false,T=0,animId=0,dernierPas=0;const t0=performance.now();
const PHASE={};EQUIPE.forEach((a,i)=>PHASE[a.id]=i*1.37);// décalage fixe par poste, pour que les agents ne bougent pas en même temps
const osc=(f,ph)=>ANIM?Math.sin(T*f+ph):0;
const doux=u=>u<0?0:u>1?1:u*u*(3-2*u);
// Yano debout : quelques pas de va-et-vient près de son poste, seulement en mission ou en attente, puis retour à sa place
// (vers -x, donc vers le haut à gauche à l'écran : il ne passe ni sous les étiquettes ni devant l'écran des projets)
function marche(a){if(!a.debout||!ANIM)return{dx:0,mv:0};const st=statutAgent(a.id);if(st!=="en_mission"&&st!=="en_attente")return{dx:0,mv:0};
  const c=(T+PHASE[a.id])%14,L=1;
  if(c<5)return{dx:0,mv:0};if(c<7.5)return{dx:-L*doux((c-5)/2.5),mv:1};if(c<9.5)return{dx:-L,mv:0};if(c<12)return{dx:-L*(1-doux((c-9.5)/2.5)),mv:-1};return{dx:0,mv:0}}
function posAgent(a){const[sx,sz]=siege(a);const m=marche(a);return[sx+m.dx,sz,m.mv]}
// écran « PROJETS EN COURS » : missions actives lues dans etat/missions.json, une à la fois, environ 4 s chacune, avec un fondu
const ACTIVES=["en_cours","autorisee","a_examiner","attente_approbation"];
const ST_P={en_cours:"#7DB3FF",autorisee:"#5FD4E8",a_examiner:"#C9B8FF",attente_approbation:"#F5B94A"};
const PJ_W=186,PJ_DUREE=4,PJ_FONDU=.45;
let PROJ=[],projT0=0,heureLecture="";
function ajuster(t,max){if(ctx.measureText(t).width<=max)return t;while(t.length>1&&ctx.measureText(t+"…").width>max)t=t.slice(0,-1);return t+"…"}
const F_PROD="800 12px 'Inter Tight', Arial",F_OBJ="600 9.5px Inter, Arial",F_PETIT="600 8px Inter, Arial",F_NR="italic 500 8px Inter, Arial";
// textes coupés une seule fois, à chaque lecture de la mémoire (pas à chaque image)
function preparerProjets(garder){const out=[];ctx.save();
  for(const m of ETAT.missions){if(!m||!ACTIVES.includes(m.statut))continue;
    const net=v=>s(v).replace(/[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,"").trim();// sans caractères de contrôle ni d'inversion du sens du texte
    const prod=net(m.produit).slice(0,60),num=net(m.numero).slice(0,20),obj=net(m.objet).slice(0,140);
    const av=typeof m.avancement==="number"&&isFinite(m.avancement)?Math.max(0,Math.min(100,Math.round(m.avancement))):null;
    ctx.font=F_PROD;const lp=prod?ajuster(prod.toUpperCase(),PJ_W):"PRODUIT NON RENSEIGNÉ";
    ctx.font=F_OBJ;const lo=ajuster([num,obj].filter(Boolean).join(" · ")||"Mission non renseignée",PJ_W);
    out.push({lp,lo,np:!prod,st:ST_M[m.statut][0],col:ST_P[m.statut],av});if(out.length===20)break}
  ctx.restore();PROJ=out;if(!garder)projT0=T}
if(document.fonts)document.fonts.addEventListener("loadingdone",()=>{preparerProjets(1);dessiner()});
// disposition (repère du mur, largeur PJ_W) : titre ; produit ; numéro · objet ; statut + rang ; « EN DIRECT » + avancement
function ecranProjets(){
  const[tx0,ty0]=P(8.1,.25,2.0);ctx.save();ctx.translate(tx0,ty0);ctx.transform(1,.5,0,1,0,0);
  ctx.fillStyle="#8EC5D6";ctx.font="700 9.5px Inter, Arial";ctx.textAlign="left";ctx.fillText("PROJETS EN COURS",0,-1.5);
  const msg=t=>{ctx.fillStyle="#CFE4F5";ctx.font="600 16px 'Inter Tight', Arial";ctx.fillText(t,0,24)};
  // pastille « EN DIRECT » : seulement si la dernière lecture de la mémoire a réussi ; sinon l'heure de la dernière lecture, sans pulsation
  if(charge&&heureLecture){const vif=!enErreur;const pu=vif?.5+.5*osc(3.2,0):1;
    if(vif){ctx.globalAlpha=.25+.3*pu;ctx.fillStyle="#34D27A";ctx.beginPath();ctx.arc(3,43.5,2.8+1.6*pu,0,7);ctx.fill();ctx.globalAlpha=1}
    ctx.fillStyle=vif?"#34D27A":"#8A8F97";ctx.beginPath();ctx.arc(3,43.5,2.4,0,7);ctx.fill();
    ctx.font="700 8px Inter, Arial";ctx.fillStyle=vif?"#BFF5D3":"#AEB8C4";ctx.fillText((vif?"EN DIRECT · ":"LU À ")+heureLecture,9,46.5)}
  if(!charge)msg(enErreur?"Non connecté":"Lecture de la mémoire…");
  else if(!PROJ.length)msg("Aucun projet actif");
  else{const n=PROJ.length;let i=0,al=1;
    if(ANIM&&n>1){const e=Math.max(0,T-projT0);i=Math.floor(e/PJ_DUREE)%n;const u=e%PJ_DUREE;al=Math.max(0,Math.min(1,u/PJ_FONDU,(PJ_DUREE-u)/PJ_FONDU))}
    const p=PROJ[i];
    ctx.textAlign="right";ctx.font=F_PETIT;ctx.fillStyle="#8EC5D6";ctx.fillText(n>1&&!ANIM?"1 / "+n+" · voir Vue 2":(i+1)+" / "+n,PJ_W,36.5);ctx.textAlign="left";
    ctx.globalAlpha=al;
    ctx.font=p.np?"italic 700 12px 'Inter Tight', Arial":F_PROD;ctx.fillStyle=p.np?"#CFE4F5":"#FFFFFF";ctx.fillText(p.lp,0,13);
    ctx.font=F_OBJ;ctx.fillStyle="#CFE4F5";ctx.fillText(p.lo,0,25);
    ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(3,33.8,2.4,0,7);ctx.fill();ctx.font=F_PETIT;ctx.fillText(p.st,9,36.5);
    if(p.av==null){ctx.font=F_NR;ctx.textAlign="right";ctx.fillStyle="#9FB7CC";ctx.fillText("avancement non renseigné",PJ_W,46.5);ctx.textAlign="left"}
    else{ctx.fillStyle="rgba(207,228,245,.22)";rr(92,41.5,66,4,2);ctx.fill();if(p.av>0){ctx.fillStyle=p.col;rr(92,41.5,Math.max(4,66*p.av/100),4,2);ctx.fill()}ctx.font=F_PETIT;ctx.textAlign="right";ctx.fillStyle="#CFE4F5";ctx.fillText(p.av+" %",PJ_W,46.5);ctx.textAlign="left"}
    ctx.globalAlpha=1}
  ctx.restore();
}
function decor(){
  // ombre portée et dalle flottante
  poly([P(.6,1.2,-.9),P(W+.6,1.2,-.9),P(W+.6,D+1.2,-.9),P(.6,D+1.2,-.9)],"rgba(60,100,150,.08)");
  box(0,0,-.4,W,D,.4,C.slabT,C.slabL,C.slabR);
  ctx.strokeStyle="rgba(120,160,200,.18)";ctx.lineWidth=1;
  for(let i=2;i<W;i+=2){const a=P(i,0),b=P(i,D);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  for(let j=2;j<D;j+=2){const a=P(0,j),b=P(W,j);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  for(const zn of ZONES)dalle(zn.x,zn.z,zn.w,zn.d,zn.c);
  for(const zn of ZONES)if(zn.tx!=null)texteSol(zn.nom.toUpperCase(),zn.tx,zn.tz);
  // cloison du fond avec l'écran des projets
  box(6.5,0,0,9.5,.25,H,C.wall,C.wallS,C.wallS);
  poly([P(7.6,.25,.85),P(14.9,.25,.85),P(14.9,.25,2.35),P(7.6,.25,2.35)],C.bezel);
  poly([P(7.75,.25,.95),P(14.75,.25,.95),P(14.75,.25,2.25),P(7.75,.25,2.25)],"#14324A");
  ecranProjets();
  // plinthe
  poly([P(6.5,.25,0),P(16,.25,0),P(16,.25,.08),P(6.5,.25,.08)],"#C9DCEC");
}
// positions : o = direction du regard (0 vers -z, 1 vers +z, 2 vers -x, 3 vers +x)
const siege=a=>{if(a.debout)return a.d;const[x,z]=a.d;return [[x+.8,z+1.3],[x+.8,z-.5],[x+1.3,z+.8],[x-.5,z+.8]][a.o]};
// couleur d'écran d'un poste, d'après le statut enregistré : bleu (lignes qui défilent) = en mission,
// rouge qui clignote = bloqué, veille (bleu nuit) = disponible, éteint = poste inoccupé, agent indisponible
// ou statut non renseigné ; écran clair = en attente
const clignote=ph=>ANIM&&((T+ph*.1)%1)>.5;// 1 clignotement par seconde
function couleurEcran(st,ph){return st==="en_mission"?"#2563EB":st==="bloque"?(clignote(ph)?"#5E1717":"#C62828"):st==="disponible"?C.veille:(!st||st==="indisponible")?C.eteint:null}
function bureauNu(x,z,o,st,ph=0){
  const wz=o<2,w=wz?1.6:.8,d=wz?.8:1.6;
  dalle(x+.06,z+.1,w,d,"rgba(40,70,110,.10)");
  // panneaux latéraux
  if(wz){box(x,z,0,.06,d,.74,C.deskL,C.deskL,C.deskR);box(x+w-.06,z,0,.06,d,.74,C.deskL,C.deskL,C.deskR)}
  else{box(x,z,0,w,.06,.74,C.deskL,C.deskL,C.deskR);box(x,z+d-.06,0,w,.06,.74,C.deskL,C.deskL,C.deskR)}
  box(x,z,.74,w,d,.05,C.deskT,C.deskL,C.deskR);
  const ec=couleurEcran(st,ph);const defil=st==="en_mission"?(ANIM?T*.22+ph*.03:0):-1;
  // écran sur pied
  if(o===0){box(x+.72,z+.12,.79,.16,.12,.02,C.metal,C.metal,C.metal);box(x+.77,z+.16,.79,.06,.05,.28,C.metal,C.metal,C.metal);box(x+.25,z+.12,1.0,1.1,.05,.6,C.bezel,C.bezel,C.bezel);dalleEcranZ(x+.3,z+.17,1.04,1.0,.52,ec,defil)}
  if(o===1){box(x+.72,z+.56,.79,.16,.12,.02,C.metal,C.metal,C.metal);box(x+.77,z+.6,.79,.06,.05,.28,C.metal,C.metal,C.metal);box(x+.25,z+.62,1.0,1.1,.05,.6,C.bezel,C.bezel,C.bezel);voyant([P(x+.38,z+.67,1.08),P(x+.62,z+.67,1.08)],st,ph)}
  if(o===2){box(x+.12,z+.72,.79,.12,.16,.02,C.metal,C.metal,C.metal);box(x+.16,z+.77,.79,.05,.06,.28,C.metal,C.metal,C.metal);box(x+.12,z+.25,1.0,.05,1.1,.6,C.bezel,C.bezel,C.bezel);dalleEcranX(x+.17,z+.3,1.04,1.0,.52,ec,defil)}
  if(o===3){box(x+.56,z+.72,.79,.12,.16,.02,C.metal,C.metal,C.metal);box(x+.6,z+.77,.79,.05,.06,.28,C.metal,C.metal,C.metal);box(x+.62,z+.25,1.0,.05,1.1,.6,C.bezel,C.bezel,C.bezel);voyant([P(x+.67,z+.38,1.08),P(x+.67,z+.62,1.08)],st,ph)}
  // clavier, souris, tasse
  if(wz){const kz=o===0?z+.45:z+.22;box(x+.45,kz,.79,.7,.18,.02,"#E4ECF4","#C8D6E4","#C8D6E4");box(x+1.25,kz+.02,.79,.08,.12,.02,"#E4ECF4","#C8D6E4","#C8D6E4");box(o===0?x+.1:x+1.4,o===0?z+.5:z+.2,.79,.1,.1,.1,"#FFFFFF","#E6EEF6","#D5E1EC")}
  else{const kx=o===2?x+.45:x+.15;box(kx,z+.45,.79,.18,.7,.02,"#E4ECF4","#C8D6E4","#C8D6E4");box(kx+.02,z+1.25,.79,.12,.08,.02,"#E4ECF4","#C8D6E4","#C8D6E4");box(o===2?x+.5:x+.2,o===2?z+.1:z+1.4,.79,.1,.1,.1,"#FFFFFF","#E6EEF6","#D5E1EC")}
}
function lignesEcran(a,b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
const LIG=[.62,.4,.7,.3,.55,.45];
// écran vu de face ; defil >= 0 : lignes de code qui défilent vers le haut (en mission), découpées au cadre de l'écran
function dalleEcranZ(x,z,y,w,h,ec,defil=-1){const q=[P(x,z,y),P(x+w,z,y),P(x+w,z,y+h),P(x,z,y+h)];poly(q,ec||C.screen);
  if(!ec){ctx.strokeStyle="rgba(30,60,100,.35)";ctx.lineWidth=1.2;for(let i=1;i<5;i++)lignesEcran(P(x+.08,z,y+h-i*.1),P(x+.08+w*(i%2?.7:.45),z,y+h-i*.1))}
  else if(defil>=0){ctx.save();ctx.clip();ctx.strokeStyle="rgba(219,234,254,.7)";ctx.lineWidth=1.2;const n=Math.floor(defil/.1),off=defil-n*.1;for(let i=0;i<7;i++){const yy=y+h-.04-i*.1+off;const k=LIG[(i+n)%6];lignesEcran(P(x+.08,z,yy),P(x+.08+w*k,z,yy))}ctx.restore()}}
function dalleEcranX(x,z,y,d,h,ec,defil=-1){const q=[P(x,z,y),P(x,z+d,y),P(x,z+d,y+h),P(x,z,y+h)];poly(q,ec||C.screen);
  if(!ec){ctx.strokeStyle="rgba(30,60,100,.35)";ctx.lineWidth=1.2;for(let i=1;i<5;i++)lignesEcran(P(x,z+.08,y+h-i*.1),P(x,z+.08+d*(i%2?.7:.45),y+h-i*.1))}
  else if(defil>=0){ctx.save();ctx.clip();ctx.strokeStyle="rgba(219,234,254,.7)";ctx.lineWidth=1.2;const n=Math.floor(defil/.1),off=defil-n*.1;for(let i=0;i<7;i++){const yy=y+h-.04-i*.1+off;const k=LIG[(i+n)%6];lignesEcran(P(x,z+.08,yy),P(x,z+.08+d*k,yy))}ctx.restore()}}
// écran vu de dos : un voyant sur le moniteur, bleu qui pulse (en mission), rouge qui clignote (bloqué), vert fixe (veille, disponible)
function voyant([a,b],st,ph){if(st!=="en_mission"&&st!=="bloque"&&st!=="disponible")return;ctx.save();ctx.lineCap="round";ctx.lineWidth=2.4;
  if(st==="en_mission"){ctx.strokeStyle="#60A5FA";ctx.globalAlpha=.55+.45*osc(4,ph)}else if(st==="disponible"){ctx.strokeStyle="#3FA672";ctx.globalAlpha=.75}else{ctx.strokeStyle=clignote(ph)?"#5E1717":"#EF4444"}
  lignesEcran(a,b);ctx.restore()}
function poste(a){if(!a.debout)bureauNu(a.d[0],a.d[1],a.o,statutAgent(a.id),PHASE[a.id])}
// fauteuil à roulettes : piètement étoile, assise, dossier
const DIRS=[[0,-1],[0,1],[-1,0],[1,0]];
function pietement(sx,sz){const[cx,cy]=P(sx,sz,.05);ctx.strokeStyle=C.chairD;ctx.lineWidth=3;ctx.lineCap="round";for(let i=0;i<5;i++){const ang=i*2*Math.PI/5+.3;const dx=Math.cos(ang)*13,dy=Math.sin(ang)*6.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+dx,cy+dy);ctx.stroke();ctx.fillStyle="#1C232D";ctx.beginPath();ctx.arc(cx+dx,cy+dy+1.5,2.2,0,7);ctx.fill()}box(sx-.03,sz-.03,.05,.06,.06,.36,C.metal,C.metal,C.metal)}
function assise(sx,sz){box(sx-.24,sz-.24,.41,.48,.48,.07,C.chairL,C.chair,C.chairD)}
function dossier(sx,sz,o){const[dx,dz]=DIRS[o];const bx=sx-dx*.26,bz=sz-dz*.26;if(o<2)box(bx-.23,bz-.03,.5,.46,.06,.62,C.chairL,C.chair,C.chairD);else box(bx-.03,bz-.23,.5,.06,.46,.62,C.chairL,C.chair,C.chairD)}
function chaiseVide(sx,sz,o){ombre(sx,sz,12,5);pietement(sx,sz);assise(sx,sz);dossier(sx,sz,o)}
function chaise(a){if(a.debout)return;const[sx,sz]=siege(a);ombre(sx,sz,12,5);pietement(sx,sz);assise(sx,sz)}
// silhouette assise (de face ou de dos) ou debout ; bulle de statut d'après etat/agents.json.
// Mouvements (M-010), seulement si le statut est enregistré : en mission = frappe au clavier ; en attente = balancement,
// tête qui se tourne de temps en temps ; disponible = respiration (buste ±1 px) ; bloqué = bulle qui clignote ; indisponible = rien.
function personne(a){
  const st=statutAgent(a.id);const[sx,sz,mv]=posAgent(a);const ph=PHASE[a.id];
  if(st==="indisponible"){if(!a.debout)dossier(sx,sz,a.o);return}
  const L=a.look,peau=PEAU[L.peau||0];const face=a.o===1||a.o===3;const sens=mv?(mv>0?-1:1):[1,-1,-1,1][a.o];
  const haut=a.id==="cto"?"#2A2F36":C.polo;
  const resp=st==="disponible"?osc(1.3,ph):0;
  const bal=st==="en_attente"?osc(1.5,ph)*.035:0;
  let tete=0;if(st==="en_attente"&&ANIM){const c=(T+ph)%6;if(c>4.4)tete=Math.sin((c-4.4)/1.6*Math.PI)*(Math.floor((T+ph)/6)%2?1:-1)}
  const frappe=st==="en_mission"&&!a.debout?osc(13,ph):0;
  const pas=mv?Math.sin(T*9):0;
  if(!a.debout&&face)dossier(sx,sz,a.o);
  const base=a.debout?0:.48;const[x,y]=P(sx,sz,base);
  ctx.save();ctx.translate(x,y);ctx.scale(sens,1);if(!st)ctx.globalAlpha=.55;if(bal)ctx.rotate(bal);
  ctx.lineCap="round";ctx.lineJoin="round";
  if(a.debout){ctx.fillStyle=C.shadow;ctx.beginPath();ctx.ellipse(0,2,12,5,0,0,7);ctx.fill();
    ctx.strokeStyle=C.trous;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-3,-30);ctx.lineTo(-4+pas*3,0);ctx.moveTo(3,-30);ctx.lineTo(4-pas*3,0);ctx.stroke();
    ctx.fillStyle="#111";ctx.fillRect(-8+pas*3,-1,6,3);ctx.fillRect(2-pas*3,-1,6,3)}
  else if(face){ctx.strokeStyle=C.trous;ctx.lineWidth=6.5;ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(9,2);ctx.lineTo(9,20);ctx.moveTo(3,-4);ctx.lineTo(14,1);ctx.lineTo(15,19);ctx.stroke();ctx.fillStyle="#111";ctx.fillRect(7,19,7,3);ctx.fillRect(13,18,7,3)}
  if(resp)ctx.translate(0,-resp);
  const tY=a.debout?-30:-2;const ty=tY-24;
  ctx.fillStyle=haut;rr(-8.5,ty,17,26,5);ctx.fill();
  if(a.id==="cto"){ctx.fillStyle="#F1EFE9";ctx.beginPath();ctx.moveTo(-3,ty);ctx.lineTo(3,ty);ctx.lineTo(0,ty+10);ctx.closePath();ctx.fill();ctx.fillStyle="#2563EB";ctx.fillRect(-1,ty+3,2,10)}
  else if(face){ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.moveTo(-3,ty);ctx.lineTo(3,ty);ctx.lineTo(0,ty+6);ctx.closePath();ctx.fill()}
  // bras vers le clavier ; en mission, les avant-bras alternent (frappe)
  const bras=(x1,y1,x2,y2,dm=0)=>{ctx.strokeStyle=haut;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle=peau;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2+(face?5:4),y2+(face?4:-3)+dm);ctx.stroke()};
  if(a.debout){const b2=pas*2;bras(-8,ty+4,-10-b2,ty+24);bras(8,ty+4,11+b2,ty+22)}
  else if(face){bras(-8,ty+5,-4,ty+18,frappe*1.8);bras(8,ty+5,12,ty+16,-frappe*1.8)}
  else{bras(-8,ty+5,-2,ty+12,frappe*1.8);bras(8,ty+5,13,ty+8,-frappe*1.8)}
  // tête (en attente : elle se tourne de temps en temps)
  const hx=tete*1.6;const hy=ty-9;ctx.fillStyle=peau;ctx.fillRect(-2.5,ty-4,5,5);ctx.beginPath();ctx.ellipse(hx*.4,hy,7,8,0,0,7);ctx.fill();
  ctx.fillStyle="#141210";
  if(face){ctx.beginPath();ctx.ellipse(hx*.4,hy-3.5,L.ch==="afro"?9:7.4,L.ch==="afro"?7:5,0,Math.PI,0);ctx.fill();if(L.ch==="chignon"){ctx.beginPath();ctx.arc(-1+hx*.4,hy-9,3.5,0,7);ctx.fill()}
    ctx.beginPath();ctx.arc(2.2+hx,hy,.95,0,7);ctx.arc(-2.6+hx,hy,.95,0,7);ctx.fill();
    if(L.lun){ctx.strokeStyle="#141210";ctx.lineWidth=.8;ctx.strokeRect(-4.8+hx,hy-1.4,3.8,2.8);ctx.strokeRect(.4+hx,hy-1.4,3.8,2.8)}
    if(L.barbe){ctx.beginPath();ctx.arc(hx*.7,hy+3.6,4.6,0,Math.PI);ctx.fill()}}
  else{ctx.beginPath();ctx.ellipse(-hx*.5,hy-1,L.ch==="afro"?9:7.4,L.ch==="afro"?9:8,0,0,7);ctx.fill();if(L.ch==="chignon"){ctx.beginPath();ctx.arc(-hx*.5,hy-8,3.5,0,7);ctx.fill()}}
  if(L.casque){ctx.strokeStyle="#2563EB";ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(hx*.4,hy,9,Math.PI,0);ctx.stroke()}
  ctx.restore();
  if(!a.debout&&!face)dossier(sx,sz,a.o);
  // bulle de statut (comme une notification), seulement si le statut est enregistré :
  // en mission = pulse doucement ; en attente = « … » animé ; bloqué = « ! » qui clignote
  const v=ST_A[st];if(v){const[bx,by]=P(sx,sz,a.debout?1.95:1.62);ctx.save();
    if(st==="en_mission"&&ANIM){const k=1+.08*(.5+.5*osc(3,ph)),cx=bx+18,cy=by-4;ctx.translate(cx,cy);ctx.scale(k,k);ctx.translate(-cx,-cy)}
    if(st==="bloque"&&clignote(ph))ctx.globalAlpha=.3;
    ctx.fillStyle=v[2];rr(bx+9,by-14,18,16,4);ctx.fill();ctx.beginPath();ctx.moveTo(bx+12,by+2);ctx.lineTo(bx+16,by+2);ctx.lineTo(bx+11,by+6);ctx.closePath();ctx.fill();ctx.fillStyle="#fff";
    if(st==="en_attente"){for(let i=0;i<3;i++){ctx.globalAlpha=ANIM?.3+.7*Math.max(0,Math.sin(T*4-i*.9+ph)):1;ctx.beginPath();ctx.arc(bx+13+i*5,by-5.5,1.5,0,7);ctx.fill()}}
    else{ctx.font="800 10px Inter, Arial";ctx.textAlign="center";ctx.fillText(v[3]||"✓",bx+18,by-2.5)}
    ctx.restore()}
}
function plante(x,z,k=1,orange){const pot=orange?C.potO:C.potW;ombre(x+.2*k,z+.2*k,10*k,5*k);box(x,z,0,.4*k,.4*k,.42*k,pot,orange?"#C9673F":"#DCE6EE",orange?"#B85C37":"#C9D6E2");const[cx,cy]=P(x+.2*k,z+.2*k,.45*k);ctx.lineWidth=1.4;for(let i=0;i<9;i++){const ang=-Math.PI/2+(i-4)*.28;const L=(22+(i%3)*7)*k;const ex=cx+Math.cos(ang)*L*.75,ey=cy+Math.sin(ang)*L;ctx.fillStyle=i%2?C.leaf:C.leaf2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo((cx+ex)/2+5*k*Math.cos(ang+1.4),(cy+ey)/2,ex,ey);ctx.quadraticCurveTo((cx+ex)/2-5*k*Math.cos(ang+1.4),(cy+ey)/2,cx,cy);ctx.fill()}}
function tableRonde(cx,cz,r){ombre(cx,cz,r*40,r*20);const[x,y]=P(cx,cz,.74);box(cx-.05,cz-.05,0,.1,.1,.74,C.metal,C.metal,C.metal);ctx.fillStyle=C.deskL;ctx.beginPath();ctx.ellipse(x,y+3,r*TX*1.42,r*TY*1.42,0,0,7);ctx.fill();ctx.fillStyle=C.deskT;ctx.beginPath();ctx.ellipse(x,y,r*TX*1.42,r*TY*1.42,0,0,7);ctx.fill()}
function dessinerScene(){
  decor();
  const objs=[];const add=(k,f)=>objs.push({k,f});
  for(const a of EQUIPE){const[sx,sz]=siege(a);if(!a.debout){const[x,z]=a.d;const c=a.o<2?[x+.8,z+.4]:[x+.4,z+.8];add(c[0]+c[1],()=>poste(a));add(sx+sz-.05,()=>chaise(a))}const[px,pz]=posAgent(a);add(px+pz+.05,()=>personne(a))}
  // poste du propriétaire (fauteuil vide, sans étiquette)
  add(10.6+2.4+1.2,()=>bureauNu(10.2,2.4,0,null));add(11+3.7-.05,()=>chaiseVide(11,3.7,0));
  for(const[x,z,o]of LIBRES){const c=o<2?[x+.8,z+.4]:[x+.4,z+.8];add(c[0]+c[1],()=>bureauNu(x,z,o,null));const q=[[x+.8,z+1.3],[x+.8,z-.5],[x+1.3,z+.8],[x-.5,z+.8]][o];add(q[0]+q[1]-.05,()=>chaiseVide(q[0],q[1],o))}
  add(11.5+11,()=>tableRonde(11.5,11,1.15));
  [[10.2,11],[12.8,11],[11.5,9.7],[11.5,12.3]].forEach(([x,z],i)=>add(x+z+(i%2?.3:-.3),()=>chaiseVide(x,z,[3,2,1,0][i])));
  [[.5,.5,1.2,0],[6.6,6.4,1,1],[14.2,.8,1.1,0],[21,.6,1.2,1],[.6,15,1.1,1],[8.6,14.6,1,0],[14.8,7.6,1.3,0],[21,14.8,1.2,1],[17.6,12.2,.9,1]].forEach(([x,z,k,o])=>add(x+z+.4,()=>plante(x,z,k,!!o)));
  objs.sort((p,q)=>p.k-q.k).forEach(o=>o.f());
}
/* vue : zoom et déplacement */
const vue={s:1,tx:0,ty:0,base:1};let CW=0,CH=0,dpr=1;
function cadrer(){const r=scene.getBoundingClientRect();CW=r.width;CH=r.height;dpr=Math.min(2,devicePixelRatio||1);cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);
  const b=Math.min(CW/(LW-120),CH/(LH-150));vue.base=b;}
function recentrer(){vue.s=vue.base;vue.tx=(CW-LW*vue.s)/2+40*vue.s;vue.ty=(CH-LH*vue.s)/2+10*vue.s;dessiner()}
function zoomer(f,cx,cy){const n=Math.max(vue.base*.8,Math.min(vue.base*3.2,vue.s*f));f=n/vue.s;vue.tx=cx-(cx-vue.tx)*f;vue.ty=cy-(cy-vue.ty)*f;vue.s=n;dessiner()}
function peindre(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(dpr*vue.s,0,0,dpr*vue.s,dpr*vue.tx,dpr*vue.ty);dessinerScene()}
// dessin complet + placement des étiquettes HTML (après un zoom, un déplacement, une lecture de la mémoire)
let attente=false;function dessiner(){if(attente)return;attente=true;requestAnimationFrame(()=>{attente=false;peindre();placer()})}
// boucle d'animation : seulement le canevas (les étiquettes HTML ne bougent pas, pas de relecture de la mise en page)
function boucle(now){animId=0;if(!animActive())return;animId=requestAnimationFrame(boucle);
  if(now-dernierPas<1000/30-4)return;dernierPas=now;T=(now-t0)/1000;peindre()}
const animActive=()=>!RM.matches&&!document.hidden&&!$("vue-bureau").hidden;
function relancer(){const on=animActive();if(on===ANIM&&(!on||animId))return;ANIM=on;
  if(on){if(!animId)animId=requestAnimationFrame(boucle)}else{if(animId)cancelAnimationFrame(animId);animId=0;dessiner()}}
document.addEventListener("visibilitychange",relancer);RM.addEventListener("change",relancer);
const versEcran=([x,y])=>[x*vue.s+vue.tx,y*vue.s+vue.ty];
/* étiquettes (HTML) avec anti-chevauchement */
const ETQ={},ZTQ={};
for(const a of EQUIPE){const n=el("div",{class:"etiq",role:"button",tabindex:"0","aria-label":a.nom+", "+a.role},el("span",{class:"pt"}),el("div",{},el("span",{text:a.nom}),el("small",{text:a.role})));
  n.addEventListener("click",()=>ouvrirAgent(a.id));n.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();ouvrirAgent(a.id)}});calque.append(n);ETQ[a.id]=n}
function placer(){
  calque.classList.toggle("compact",vue.s<.62);
  const fixes=[];
  const boxes=[];
  for(const a of EQUIPE){const[sx,sz]=siege(a);const[x,y]=versEcran(P(sx,sz,0));const n=ETQ[a.id];const w=n.offsetWidth,hh=n.offsetHeight;if(!w)continue;
    const yb=versEcran(P(sx,sz,a.debout?1.95:1.62))[1];boxes.push({n,left:Math.max(4,Math.min(CW-w-(CW<600?56:4),x-w/2)),top:yb-16*vue.s-hh,bas:y+8*vue.s,w,h:hh})}
  boxes.sort((p,q)=>q.top-p.top);const places=[];
  const chev=(A,B)=>A.left<B.left+B.w+3&&B.left<A.left+A.w+3&&A.top<B.top+B.h+3&&B.top<A.top+A.h+3;
  // écran mural des projets (bords verticaux, haut et bas en pente 1/2 à l'écran) : les étiquettes l'évitent si possible
  const[e0x,e0h]=versEcran(P(7.6,.25,2.35)),e1x=versEcran(P(14.9,.25,2.35))[0],e0b=versEcran(P(7.6,.25,.85))[1];
  const surEcran=A=>{const l=Math.max(A.left,e0x),r=Math.min(A.left+A.w,e1x);return l<=r&&e0h+.5*(l-e0x)<A.top+A.h+3&&e0b+.5*(r-e0x)>A.top-3};
  // essai : au-dessus de la bulle (en remontant), sinon sous l'agent (en descendant), sinon comme avant (en remontant)
  const essai=(A,t0,sens,ecran)=>{A.top=t0;for(let k=0;k<12;k++){if(ecran&&surEcran(A))return false;const c=fixes.concat(places).find(B=>chev(A,B));if(!c)return sens<0||A.top+A.h<=CH-4;A.top=sens<0?c.top-A.h-3:c.top+c.h+3}return false};
  const evite=vue.s>=.62;// en vue compacte, l'écran est illisible sans zoom : on ne l'évite pas
  for(const A of boxes){const t0=A.top;if(!evite||(!essai(A,t0,-1,1)&&!essai(A,A.bas,1,1)))essai(A,t0,-1,0);places.push(A);A.n.style.transform=`translate(${Math.round(A.left)}px,${Math.round(A.top)}px)`}
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
    for(const a of EQUIPE){const[sxa,sza]=posAgent(a);const[px,py]=P(sxa,sza,.8);const d=Math.hypot(px-wx,py-wy);if(d<bd){bd=d;best=a}}
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
  $("leg-agents").replaceChildren(...Object.values(ST_A).map(v=>el("span",{},el("i",{style:"background:"+v[2]}),v[0])),el("span",{},el("i",{style:"background:#C9CCD1"}),"Non renseigné"),el("span",{text:"· écran bleu qui défile = en mission, rouge qui clignote = bloqué, bleu nuit ou voyant vert = en veille (disponible) · chaque mouvement traduit le statut enregistré · Yano = l'AI CTO"}));
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
  espaces();preparerProjets();
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
  if(p==="bureau"){$("v-bureau").setAttribute("aria-current","page");requestAnimationFrame(()=>{cadrer();recentrer()})}else $("v-pilotage").setAttribute("aria-current","page");relancer()}
addEventListener("hashchange",route);route();
rendre();
{const p=$("cartes-agents").previousElementSibling;const t=p&&p.querySelector("p");if(t)t.textContent="Yano (l'AI CTO) et les 9 sous-agents du registre."}
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
    charge=true;enErreur=false;lecture=new Date();heureLecture=heure(lecture);etatSource="Mémoire du bureau (GitHub) · lue à "+heureLecture;
  }catch(e){enErreur=true;etatSource=(e&&e.message?e.message:"Lecture de la mémoire impossible.")+(lecture?" Dernière lecture réussie à "+heure(lecture)+".":"")}
  finally{bAct.disabled=false;rendre()}
}
bAct.addEventListener("click",charger);
charger();
}
