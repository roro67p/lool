// APP RESERVATION PRO — Version finale stable

var CONFIG = {
  NOM: "Chez Romu",
  ADRESSE: "Route de chez Romu",
  TEL: "04 72 00 00 00",
  EMAIL_PRO: "",
  EMOJI: "💈",
  DUREE: 30,
  HEURE_DEBUT: "09:00",
  HEURE_FIN: "19:00",
  MOT_DE_PASSE: "salon2026",
  SERVICES: [
    { nom: "Coupe homme", duree: 30, prix: 20 },
    { nom: "Coupe femme", duree: 45, prix: 35 },
    { nom: "Barbe", duree: 20, prix: 15 },
    { nom: "Coupe et Barbe", duree: 50, prix: 30 },
    { nom: "Coloration", duree: 90, prix: 65 },
    { nom: "Brushing", duree: 30, prix: 25 }
  ],
  COIFFEUSES: [
    {
      nom: "Biniouf",
      emoji: "💇",
      heure_debut: "09:00",
      heure_fin: "19:00",
      jours_off: [],
      prime: 0,
      actif: true
    },
    {
      nom: "Remilienne",
      emoji: "💅",
      heure_debut: "09:00",
      heure_fin: "19:00",
      jours_off: [],
      prime: 0,
      actif: true
    }
  ]
};

function doGet(e) {
  var page = e.parameter.page || "home";
  if (page === "creneaux") return getCreneaux(e);
  if (page === "confirmer") return confirmerRDV(e);
  if (page === "admin") return showAdmin(e);
  if (page === "annuler") return annulerRDV(e);
  if (page === "saveajout") return saveAjout(e);
  if (page === "editcoiff") return editCoiff(e);
  if (page === "savecoiff") return saveCoiff(e);
  return showHome();
}

function timeToMin(t) {
  var p = t.split(":");
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function minToTime(m) {
  var h = Math.floor(m / 60);
  var mn = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mn < 10 ? "0" : "") + mn;
}

function getTomorrow() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getMaxDate() {
  var d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split("T")[0];
}

function getWS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("RDV");
  if (!ws) {
    ws = ss.insertSheet("RDV");
    ws.getRange(1, 1, 1, 11).setValues([["ID","Date","Heure","Client","Tel","Email","Service","Prix","Duree","Statut","Coiffeuse"]]);
  }
  return ws;
}

function getWSCoiffeuses() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Coiffeuses");
  if (!ws) {
    ws = ss.insertSheet("Coiffeuses");
    ws.getRange(1, 1, 1, 6).setValues([["Nom","Heure debut","Heure fin","Jours off","Prime","Actif"]]);
    ws.appendRow(["Biniouf","09:00","19:00","",0,"Oui"]);
    ws.appendRow(["Remilienne","09:00","19:00","",0,"Oui"]);
  }
  return ws;
}

// Lire tous les RDV et convertir les dates en string YYYY-MM-DD
function getRDVs() {
  var ws = getWS();
  if (ws.getLastRow() < 2) return [];
  var vals = ws.getRange(2, 1, ws.getLastRow() - 1, 10).getValues();
  var result = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    // Convertir date en string
    if (r[1] instanceof Date) {
      r[1] = Utilities.formatDate(r[1], "Europe/Paris", "yyyy-MM-dd");
    } else {
      r[1] = String(r[1]).substring(0, 10);
    }
    result.push(r);
  }
  return result;
}

function getCreneaux(e) {
  var date = e.parameter.date;
  var duree = parseInt(e.parameter.duree) || CONFIG.DUREE;
  var pris = [];
  var rdvs = getRDVs();
  for (var i = 0; i < rdvs.length; i++) {
    var r = rdvs[i];
    if (r[1] === date && r[9] !== "Annule") {
      pris.push({ heure: r[2], duree: parseInt(r[8]) || 30 });
    }
  }
  var creneaux = [];
  var debut = timeToMin(CONFIG.HEURE_DEBUT);
  var fin = timeToMin(CONFIG.HEURE_FIN);
  for (var t = debut; t + duree <= fin; t += CONFIG.DUREE) {
    var h = minToTime(t);
    var ok = true;
    for (var j = 0; j < pris.length; j++) {
      var ps = timeToMin(pris[j].heure);
      var pe = ps + pris[j].duree;
      if (t < pe && t + duree > ps) { ok = false; break; }
    }
    if (ok) creneaux.push(h);
  }
  return ContentService.createTextOutput(JSON.stringify({ creneaux: creneaux }))
    .setMimeType(ContentService.MimeType.JSON);
}

function confirmerRDV(e) {
  var ws = getWS();
  var id = "RDV-" + ws.getLastRow().toString().padStart(4, "0");
  ws.appendRow([id, e.parameter.date, e.parameter.heure, e.parameter.nom,
    e.parameter.tel, e.parameter.email || "", e.parameter.service,
    e.parameter.prix, e.parameter.duree, "Confirme", e.parameter.coiffeuse || "Pas de preference"]);
  if (e.parameter.email && e.parameter.email.indexOf("@") > 0) {
    try {
      MailApp.sendEmail(e.parameter.email, "RDV confirme - " + CONFIG.NOM,
        "Bonjour " + e.parameter.nom + "\n\nRDV confirme\nDate: " + e.parameter.date +
        "\nHeure: " + e.parameter.heure + "\nService: " + e.parameter.service +
        "\nPrix: " + e.parameter.prix + " EU\n\n" + CONFIG.ADRESSE + "\n" + CONFIG.TEL);
    } catch (err) {}
  }
  return HtmlService.createHtmlOutput(getConfirmPage(e.parameter, id))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function annulerRDV(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput("<p>Mot de passe incorrect</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour</a>")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var ws = getWS();
  var vals = ws.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === e.parameter.id) {
      ws.getRange(i + 1, 10).setValue("Annule");
      return HtmlService.createHtmlOutput("<p>RDV annule</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour</a>")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  return HtmlService.createHtmlOutput("<p>RDV introuvable</p>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveAjout(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput("<p>Erreur mot de passe</p>")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var ws = getWS();
  var id = "RDV-" + ws.getLastRow().toString().padStart(4, "0");
  ws.appendRow([id, e.parameter.date, e.parameter.heure, e.parameter.nom,
    e.parameter.tel, "", e.parameter.service, e.parameter.prix || 0, 30, "Confirme"]);
  return HtmlService.createHtmlOutput("<p>RDV " + id + " cree pour " + e.parameter.nom + "</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour admin</a>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function editCoiff(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var nom = e.parameter.nom;
  var ws = getWSCoiffeuses();
  var vals = ws.getLastRow() > 1 ? ws.getRange(2,1,ws.getLastRow()-1,6).getValues() : [];
  var data = {heure_debut:"09:00",heure_fin:"19:00",jours_off:"",prime:0,actif:"Oui"};
  for (var i=0;i<vals.length;i++){if(vals[i][0]===nom){data={heure_debut:vals[i][1],heure_fin:vals[i][2],jours_off:vals[i][3],prime:vals[i][4],actif:vals[i][5]};break;}}
  var html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0A0A0F;color:#fff;padding:20px}.t{font-size:18px;font-weight:800;margin-bottom:20px;color:#6366F1}input,select{width:100%;padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif;margin-bottom:12px}.lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block}.btn{width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}.btn2{width:100%;padding:14px;background:#1a1a2e;color:#888;border:1.5px solid #21213A;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;text-decoration:none;display:block;text-align:center}</style></head><body>'
    + '<div class="t">Modifier ' + nom + '</div>'
    + '<form action="' + url + '" method="get">'
    + '<input type="hidden" name="page" value="savecoiff">'
    + '<input type="hidden" name="pwd" value="' + e.parameter.pwd + '">'
    + '<input type="hidden" name="nom" value="' + nom + '">'
    + '<label class="lbl">Heure debut</label><input type="time" name="heure_debut" value="' + data.heure_debut + '">'
    + '<label class="lbl">Heure fin</label><input type="time" name="heure_fin" value="' + data.heure_fin + '">'
    + '<label class="lbl">Jours de conge (ex: 2026-04-15, 2026-04-16)</label><input type="text" name="jours_off" value="' + data.jours_off + '" placeholder="2026-04-15, 2026-04-16">'
    + '<label class="lbl">Prime EU</label><input type="number" name="prime" value="' + data.prime + '">'
    + '<label class="lbl">Statut</label><select name="actif"><option value="Oui"' + (data.actif==="Oui"?" selected":"") + '>Active</option><option value="Non"' + (data.actif==="Non"?" selected":"") + '>Inactive</option></select>'
    + '<button type="submit" class="btn">Enregistrer</button>'
    + '</form>'
    + '<a href="' + url + '?page=admin&pwd=' + e.parameter.pwd + '" class="btn2">Retour</a>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveCoiff(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var nom = e.parameter.nom;
  var ws = getWSCoiffeuses();
  var vals = ws.getDataRange().getValues();
  for (var i=1;i<vals.length;i++){
    if (vals[i][0]===nom){
      ws.getRange(i+1,2).setValue(e.parameter.heure_debut);
      ws.getRange(i+1,3).setValue(e.parameter.heure_fin);
      ws.getRange(i+1,4).setValue(e.parameter.jours_off||"");
      ws.getRange(i+1,5).setValue(parseFloat(e.parameter.prime)||0);
      ws.getRange(i+1,6).setValue(e.parameter.actif||"Oui");
      break;
    }
  }
  return HtmlService.createHtmlOutput("<p>Sauvegarde OK</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour admin</a>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getConfirmPage(d, id) {
  var url = ScriptApp.getService().getUrl();
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}.icon{font-size:72px;margin-bottom:16px}.t{font-size:22px;font-weight:800;color:#10B981;margin-bottom:6px}.s{font-size:13px;color:#666;margin-bottom:20px}.card{background:#161622;border:1.5px solid rgba(99,102,241,.3);border-radius:14px;padding:16px;width:100%;max-width:340px;text-align:left;margin-bottom:16px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #21213A;font-size:14px}.row:last-child{border-bottom:none;font-weight:700;color:#6366F1;font-size:16px}.lbl{color:#666}.ref{color:#333;font-size:11px;margin-bottom:16px}.btn{display:block;width:100%;max-width:340px;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;margin-bottom:8px}.bp{background:#6366F1;color:#fff}.bs{background:#161622;color:#666;border:1.5px solid #21213A}</style></head><body>'
    + '<div class="icon">✅</div>'
    + '<div class="t">RDV Confirme !</div>'
    + '<div class="s">Votre reservation est enregistree</div>'
    + '<div class="card">'
    + '<div class="row"><span class="lbl">Service</span><span>' + d.service + '</span></div>'
    + '<div class="row"><span class="lbl">Date</span><span>' + d.date + '</span></div>'
    + '<div class="row"><span class="lbl">Heure</span><span>' + d.heure + '</span></div>'
    + '<div class="row"><span class="lbl">Client</span><span>' + d.nom + '</span></div>'
    + '<div class="row"><span class="lbl">Prix</span><span>' + d.prix + ' EU</span></div>'
    + '</div>'
    + '<div class="ref">Ref : ' + id + '</div>'
    + '<a href="' + url + '" class="btn bp">Nouveau RDV</a>'
    + '<a href="tel:' + CONFIG.TEL + '" class="btn bs">Appeler</a>'
    + '</body></html>';
}

// ═══════════════════════
// ESPACE PRO
// ═══════════════════════
function showAdmin(e) {
  var url = ScriptApp.getService().getUrl();
  var pwd = e.parameter.pwd || "";
  if (pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput(getLoginPage(url))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var rdvs = getRDVs();
  var ca = 0, confirmes = 0, annules = 0;
  for (var i = 0; i < rdvs.length; i++) {
    if (rdvs[i][9] === "Confirme") { confirmes++; ca += parseFloat(rdvs[i][7]) || 0; }
    if (rdvs[i][9] === "Annule") annules++;
  }

  var aVenir = rdvs.filter(function(r){ return r[9] === "Confirme"; });
  aVenir.sort(function(a,b){ return a[1]<b[1]?-1:a[1]>b[1]?1:a[2]<b[2]?-1:1; });

  function getSvcColor(svc) {
    var s = String(svc).toLowerCase();
    if (s.indexOf("coupe et barbe") > -1) return "#8B5CF6";
    if (s.indexOf("coupe homme") > -1) return "#3B82F6";
    if (s.indexOf("coupe femme") > -1) return "#EC4899";
    if (s.indexOf("barbe") > -1) return "#F59E0B";
    if (s.indexOf("coloration") > -1) return "#EF4444";
    if (s.indexOf("brushing") > -1) return "#10B981";
    return "#6366F1";
  }

  // Grouper par date
  var byDate = {};
  var dates = [];
  for (var i = 0; i < aVenir.length; i++) {
    var r = aVenir[i];
    var d = String(r[1]);
    if (!byDate[d]) { byDate[d] = []; dates.push(d); }
    byDate[d].push(r);
  }

  // Générer HTML des RDV groupés par date
  var rdvHTML = "";
  if (dates.length === 0) {
    rdvHTML = '<div style="text-align:center;color:#555;padding:40px;font-size:14px">Aucun RDV confirme</div>';
  } else {
    for (var di = 0; di < dates.length; di++) {
      var d = dates[di];
      var rdvsDay = byDate[d];
      // Header date
      rdvHTML += '<div style="background:#6366F1;padding:10px 14px;font-size:13px;font-weight:700;color:#fff;display:flex;justify-content:space-between;align-items:center;margin-top:8px">'
        + '<span>📅 ' + d + '</span>'
        + '<span style="background:rgba(255,255,255,.2);padding:2px 10px;border-radius:20px">' + rdvsDay.length + ' RDV</span>'
        + '</div>';
      // RDV du jour
      for (var j = 0; j < rdvsDay.length; j++) {
        var r = rdvsDay[j];
        var col = getSvcColor(r[6]);
        var heure = r[2] instanceof Date ? Utilities.formatDate(r[2], "Europe/Paris", "HH:mm") : String(r[2]).substring(0,5);
        rdvHTML += '<div style="background:#1a1a2e;padding:12px 14px;border-left:4px solid ' + col + ';margin-bottom:2px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
          + '<span style="font-size:14px;font-weight:700">⏰ ' + heure + ' &nbsp; ' + r[3] + '</span>'
          + '<a href="' + url + '?page=annuler&id=' + r[0] + '&pwd=' + pwd + '" style="font-size:11px;color:#EF4444;text-decoration:none;padding:3px 10px;background:#1a0505;border-radius:6px">Annuler</a>'
          + '</div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center">'
          + '<span style="font-size:12px;padding:3px 10px;background:' + col + '22;color:' + col + ';border-radius:20px;font-weight:600">✂️ ' + r[6] + ' · 💰 ' + r[7] + ' EU</span>'
          + '<a href="tel:' + r[4] + '" style="color:#6366F1;font-size:13px;text-decoration:none;font-weight:600">📞 ' + r[4] + '</a>'
          + '</div>'
          + '</div>';
      }
    }
  }

  // Stats par service
  var svcMap = {};
  for (var i = 0; i < rdvs.length; i++) {
    if (rdvs[i][9] === "Confirme") {
      var k = rdvs[i][6] || "Autre";
      if (!svcMap[k]) svcMap[k] = { nb: 0, ca: 0 };
      svcMap[k].nb++;
      svcMap[k].ca += parseFloat(rdvs[i][7]) || 0;
    }
  }
  var statsHTML = "";
  var svcKeys = Object.keys(svcMap).sort(function(a,b){ return svcMap[b].ca - svcMap[a].ca; });
  for (var i = 0; i < svcKeys.length; i++) {
    var k = svcKeys[i];
    var s = svcMap[k];
    var pct = ca > 0 ? Math.round(s.ca / ca * 100) : 0;
    var col = getSvcColor(k);
    statsHTML += '<div style="background:#1a1a2e;border-radius:12px;padding:14px;margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
      + '<div><div style="font-size:14px;font-weight:700;color:' + col + '">' + k + '</div>'
      + '<div style="font-size:11px;color:#888;margin-top:2px">' + s.nb + ' RDV · ' + pct + '% du CA</div></div>'
      + '<div style="font-size:18px;font-weight:800;color:' + col + '">' + s.ca.toFixed(0) + ' EU</div>'
      + '</div>'
      + '<div style="height:6px;background:#21213A;border-radius:3px">'
      + '<div style="height:6px;background:' + col + ';border-radius:3px;width:' + pct + '%"></div>'
      + '</div></div>';
  }
  if (!statsHTML) statsHTML = '<div style="text-align:center;color:#555;padding:30px">Aucune donnee</div>';

  // Formulaire ajout
  var servOpts = "";
  for (var i = 0; i < CONFIG.SERVICES.length; i++) {
    var s = CONFIG.SERVICES[i];
    servOpts += '<option value="' + s.nom + '">' + s.nom + ' (' + s.prix + ' EU)</option>';
  }
  var ajoutHTML = '<form action="' + url + '" method="get" style="display:flex;flex-direction:column;gap:10px">'
    + '<input type="hidden" name="page" value="saveajout">'
    + '<input type="hidden" name="pwd" value="' + pwd + '">'
    + '<input type="text" name="nom" placeholder="Nom du client" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="tel" name="tel" placeholder="Telephone" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="date" name="date" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="time" name="heure" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<select name="service" style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">' + servOpts + '</select>'
    + '<input type="number" name="prix" placeholder="Prix EU" style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<button type="submit" style="padding:15px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Ajouter le RDV</button>'
    + '</form>';


  // Stats par coiffeuse
  var coiffStats = {};
  for (var i = 0; i < rdvs.length; i++) {
    if (rdvs[i][9] === "Confirme") {
      var k = rdvs[i][10] || "Non renseignee";
      if (!coiffStats[k]) coiffStats[k] = { nb: 0, ca: 0 };
      coiffStats[k].nb++;
      coiffStats[k].ca += parseFloat(rdvs[i][7]) || 0;
    }
  }

  // Lire horaires depuis Sheets
  var wsC = getWSCoiffeuses();
  var coiffData = {};
  if (wsC.getLastRow() > 1) {
    var coiffVals = wsC.getRange(2, 1, wsC.getLastRow()-1, 6).getValues();
    for (var i = 0; i < coiffVals.length; i++) {
      coiffData[coiffVals[i][0]] = {
        heure_debut: coiffVals[i][1],
        heure_fin: coiffVals[i][2],
        jours_off: coiffVals[i][3],
        prime: coiffVals[i][4],
        actif: coiffVals[i][5]
      };
    }
  }

  var coiffHTML = "";
  var coiffNames = ["Biniouf", "Remilienne"];
  var coiffEmojis = ["💇", "💅"];
  for (var ci = 0; ci < coiffNames.length; ci++) {
    var nom = coiffNames[ci];
    var emoji = coiffEmojis[ci];
    var stats = coiffStats[nom] || { nb: 0, ca: 0 };
    var data = coiffData[nom] || { heure_debut: "09:00", heure_fin: "19:00", jours_off: "", prime: 0, actif: "Oui" };
    coiffHTML += '<div style="background:#1a1a2e;border-radius:14px;padding:16px;margin-bottom:14px;border:1.5px solid #21213A">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:48px;height:48px;background:#6366F122;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">' + emoji + '</div>'
      + '<div><div style="font-size:16px;font-weight:800">' + nom + '</div>'
      + '<div style="font-size:11px;color:' + (data.actif === "Oui" ? "#10B981" : "#EF4444") + '">' + (data.actif === "Oui" ? "Active" : "Inactive") + '</div></div>'
      + '</div>'
      + '<div style="text-align:right"><div style="font-size:18px;font-weight:800;color:#F59E0B">' + stats.ca.toFixed(0) + ' EU</div>'
      + '<div style="font-size:11px;color:#888">' + stats.nb + ' RDV</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">HORAIRES</div>'
      + '<div style="font-size:13px;font-weight:700">' + data.heure_debut + ' - ' + data.heure_fin + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">PRIME</div>'
      + '<div style="font-size:13px;font-weight:700;color:#F59E0B">' + data.prime + ' EU</div>'
      + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;margin-bottom:10px">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">JOURS DE CONGE</div>'
      + '<div style="font-size:13px">' + (data.jours_off || "Aucun conge") + '</div>'
      + '</div>'
      + '<a href="' + url + '?page=editcoiff&nom=' + nom + '&pwd=' + pwd + '" style="display:block;text-align:center;padding:10px;background:#6366F1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Modifier</a>'
      + '</div>';
  }

  var html = '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta charset="UTF-8"><title>Admin - ' + CONFIG.NOM + '</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:sans-serif;background:#0A0A0F;color:#fff}'
    + '.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:16px;display:flex;justify-content:space-between;align-items:center}'
    + '.hdr h1{font-size:17px;font-weight:700}'
    + '.hdr a{color:rgba(255,255,255,.85);font-size:12px;text-decoration:none;background:rgba(255,255,255,.2);padding:7px 14px;border-radius:20px}'
    + '.kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}'
    + '.kpi{background:#1a1a2e;border-radius:14px;padding:16px;text-align:center}'
    + '.kv{font-size:22px;font-weight:800;margin-bottom:3px}'
    + '.kl{font-size:11px;color:#888}'
    + '.tabs{display:flex;overflow-x:auto;gap:8px;padding:0 14px 14px;scrollbar-width:none}'
    + '.tab{flex-shrink:0;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:sans-serif}'
    + '.tab.on{background:#6366F1;color:#fff}'
    + '.tab.off{background:#1a1a2e;color:#888;border:1px solid #21213A}'
    + '.pane{display:none}'
    + '.pane.show{display:block}'
    + '.ptitle{font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin:14px 14px 10px}'
    + '.safe{height:40px}'
    + '</style></head><body>'
    + '<div class="hdr"><h1>' + CONFIG.EMOJI + ' ' + CONFIG.NOM + '</h1><a href="' + url + '">Site client</a></div>'
    + '<div class="kpis">'
    + '<div class="kpi"><div class="kv" style="color:#F59E0B">' + ca.toFixed(0) + ' EU</div><div class="kl">CA Total</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#10B981">' + confirmes + '</div><div class="kl">Confirmes</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#6366F1">' + aVenir.length + '</div><div class="kl">RDV actifs</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#EF4444">' + annules + '</div><div class="kl">Annules</div></div>'
    + '</div>'
    + '<div class="tabs">'
    + '<button class="tab on" onclick="sw(0,this)">📅 RDV (' + aVenir.length + ')</button>'
    + '<button class="tab off" onclick="sw(1,this)">💇 Coiffeuses</button>'
    + '<button class="tab off" onclick="sw(2,this)">📊 Stats</button>'
    + '<button class="tab off" onclick="sw(3,this)">➕ Ajouter</button>'
    + '</div>'
    + '<div class="pane show" id="p0">' + rdvHTML + '</div>'
    + '<div class="pane" id="p1"><div class="ptitle">Coiffeuses</div><div style="padding:0 14px">' + coiffHTML + '</div></div>'
    + '<div class="pane" id="p2"><div class="ptitle">Stats par service</div><div style="padding:0 14px">' + statsHTML + '</div></div>'
    + '<div class="pane" id="p3"><div class="ptitle">Ajouter un RDV</div><div style="padding:0 14px">' + ajoutHTML + '</div></div>'
    + '<div class="safe"></div>'
    + '<script>function sw(n,el){for(var i=0;i<4;i++){var p=document.getElementById("p"+i);if(p)p.className="pane"+(i===n?" show":"");}document.querySelectorAll(".tab").forEach(function(t,i){t.className="tab "+(i===n?"on":"off");});}</script>'
    + '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getLoginPage(url) {
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#161622;border:1.5px solid #21213A;border-radius:16px;padding:28px;width:100%;max-width:340px;text-align:center}.logo{font-size:48px;margin-bottom:12px}.t{font-size:20px;font-weight:800;margin-bottom:4px}.s{font-size:13px;color:#666;margin-bottom:24px}input{width:100%;padding:14px;background:#0F0F1A;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:16px;font-family:sans-serif;text-align:center;letter-spacing:4px;margin-bottom:14px}.btn{width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:sans-serif}</style></head><body><div class="card"><div class="logo">🔒</div><div class="t">Acces Pro</div><div class="s">Mot de passe</div><form action="' + url + '" method="get"><input type="hidden" name="page" value="admin"><input type="password" name="pwd" placeholder="••••••••" autofocus><button type="submit" class="btn">Connexion</button></form></div></body></html>';
}

// ═══════════════════════
// PAGE CLIENT
// ═══════════════════════
function showHome() {
  var url = ScriptApp.getService().getUrl();
  var servicesJSON = JSON.stringify(CONFIG.SERVICES);


  // Stats par coiffeuse
  var coiffStats = {};
  for (var i = 0; i < rdvs.length; i++) {
    if (rdvs[i][9] === "Confirme") {
      var k = rdvs[i][10] || "Non renseignee";
      if (!coiffStats[k]) coiffStats[k] = { nb: 0, ca: 0 };
      coiffStats[k].nb++;
      coiffStats[k].ca += parseFloat(rdvs[i][7]) || 0;
    }
  }

  // Lire horaires depuis Sheets
  var wsC = getWSCoiffeuses();
  var coiffData = {};
  if (wsC.getLastRow() > 1) {
    var coiffVals = wsC.getRange(2, 1, wsC.getLastRow()-1, 6).getValues();
    for (var i = 0; i < coiffVals.length; i++) {
      coiffData[coiffVals[i][0]] = {
        heure_debut: coiffVals[i][1],
        heure_fin: coiffVals[i][2],
        jours_off: coiffVals[i][3],
        prime: coiffVals[i][4],
        actif: coiffVals[i][5]
      };
    }
  }

  var coiffHTML = "";
  var coiffNames = ["Biniouf", "Remilienne"];
  var coiffEmojis = ["💇", "💅"];
  for (var ci = 0; ci < coiffNames.length; ci++) {
    var nom = coiffNames[ci];
    var emoji = coiffEmojis[ci];
    var stats = coiffStats[nom] || { nb: 0, ca: 0 };
    var data = coiffData[nom] || { heure_debut: "09:00", heure_fin: "19:00", jours_off: "", prime: 0, actif: "Oui" };
    coiffHTML += '<div style="background:#1a1a2e;border-radius:14px;padding:16px;margin-bottom:14px;border:1.5px solid #21213A">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:48px;height:48px;background:#6366F122;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">' + emoji + '</div>'
      + '<div><div style="font-size:16px;font-weight:800">' + nom + '</div>'
      + '<div style="font-size:11px;color:' + (data.actif === "Oui" ? "#10B981" : "#EF4444") + '">' + (data.actif === "Oui" ? "Active" : "Inactive") + '</div></div>'
      + '</div>'
      + '<div style="text-align:right"><div style="font-size:18px;font-weight:800;color:#F59E0B">' + stats.ca.toFixed(0) + ' EU</div>'
      + '<div style="font-size:11px;color:#888">' + stats.nb + ' RDV</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">HORAIRES</div>'
      + '<div style="font-size:13px;font-weight:700">' + data.heure_debut + ' - ' + data.heure_fin + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">PRIME</div>'
      + '<div style="font-size:13px;font-weight:700;color:#F59E0B">' + data.prime + ' EU</div>'
      + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;margin-bottom:10px">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">JOURS DE CONGE</div>'
      + '<div style="font-size:13px">' + (data.jours_off || "Aucun conge") + '</div>'
      + '</div>'
      + '<a href="' + url + '?page=editcoiff&nom=' + nom + '&pwd=' + pwd + '" style="display:block;text-align:center;padding:10px;background:#6366F1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Modifier</a>'
      + '</div>';
  }

  var html = '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
    + '<meta charset="UTF-8"><title>' + CONFIG.NOM + '</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}'
    + 'body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh}'
    + '.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 20px 20px;text-align:center}'
    + '.logo{font-size:48px;margin-bottom:8px}'
    + '.htitle{font-size:22px;font-weight:800}'
    + '.hsous{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px}'
    + '.hadr{font-size:11px;color:rgba(255,255,255,.4);margin-top:8px}'
    + '.steps{display:flex;justify-content:center;align-items:center;gap:4px;padding:12px 16px;background:#161622}'
    + '.step{font-size:11px;font-weight:600;color:#555;display:flex;align-items:center;gap:4px}'
    + '.step.on{color:#6366F1}.step.ok{color:#10B981}'
    + '.sn{width:20px;height:20px;border-radius:50%;background:#21213A;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}'
    + '.step.on .sn{background:#6366F1;color:#fff}.step.ok .sn{background:#10B981;color:#fff}'
    + '.sep{flex:1;height:1px;background:#21213A;max-width:14px}'
    + '.ct{padding:18px}'
    + '.stl{font-size:10px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}'
    + '.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}'
    + '.scard{background:#161622;border:2px solid #21213A;border-radius:14px;padding:16px 12px;cursor:pointer;display:block;width:100%;text-align:left;color:#fff;font-family:sans-serif}'
    + '.scard.sel{border-color:#6366F1;background:rgba(99,102,241,.15)}'
    + '.sname{font-size:13px;font-weight:600;margin-bottom:10px}'
    + '.sinfo{display:flex;justify-content:space-between;align-items:center}'
    + '.sprix{font-size:16px;font-weight:800;color:#6366F1}'
    + '.sdur{font-size:10px;color:#555;background:#21213A;padding:2px 7px;border-radius:6px}'
    + '.field{margin-bottom:14px}'
    + '.field label{display:block;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}'
    + '.field input{width:100%;padding:14px;background:#161622;border:2px solid #21213A;border-radius:12px;color:#fff;font-size:15px;font-family:sans-serif}'
    + '.field input:focus{outline:none;border-color:#6366F1}'
    + '.iw{position:relative;margin-bottom:14px}'
    + '.iw label{display:block;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}'
    + '.iw input{width:100%;padding:14px 14px 14px 42px;background:#161622;border:2px solid #21213A;border-radius:12px;color:#fff;font-size:15px;font-family:sans-serif}'
    + '.iw input:focus{outline:none;border-color:#6366F1}'
    + '.ii{position:absolute;left:13px;bottom:14px;font-size:16px}'
    + '.clist{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}'
    + '.ci{background:#161622;border:2px solid #21213A;border-radius:10px;padding:10px 4px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;display:block;width:100%;color:#fff;font-family:sans-serif}'
    + '.ci.sel{background:#6366F1;border-color:#6366F1;color:#fff}'
    + '.recap{background:#161622;border:2px solid rgba(99,102,241,.3);border-radius:14px;padding:16px;margin-bottom:16px}'
    + '.rr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21213A;font-size:14px}'
    + '.rr:last-child{border-bottom:none;font-weight:700;color:#6366F1;font-size:16px}'
    + '.rl{color:#666}'
    + '.btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:sans-serif;margin-bottom:10px}'
    + '.bp{background:#6366F1;color:#fff}'
    + '.bs{background:#21213A;color:#666}'
    + '.ninfo{background:#161622;border:1px solid #21213A;border-radius:12px;padding:14px;font-size:12px;color:#666;margin-bottom:16px;line-height:1.9}'
    + '.safe{height:50px}'
    + '.adm{text-align:center;padding:12px;color:#333;font-size:11px}'
    + '.adm a{color:#333;text-decoration:none}'
    + '.et{display:none}.et.show{display:block}'
    + '.nc{text-align:center;color:#555;font-size:13px;padding:20px;background:#161622;border-radius:12px}'
    + '.ld{text-align:center;padding:20px;color:#6366F1;font-size:13px}'
    + '</style></head><body>'

    + '<div class="hdr">'
    + '<div class="logo">' + CONFIG.EMOJI + '</div>'
    + '<div class="htitle">' + CONFIG.NOM + '</div>'
    + '<div class="hsous">Reservez en ligne</div>'
    + '<div class="hadr">📍 ' + CONFIG.ADRESSE + ' · 📞 ' + CONFIG.TEL + '</div>'
    + '</div>'

    + '<div class="steps" id="steps">'
    + '<div class="step on" id="st1"><div class="sn">1</div><span>Service</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st2"><div class="sn">2</div><span>Creneau</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st3"><div class="sn">3</div><span>Infos</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st4"><div class="sn">4</div><span>Confirm.</span></div>'
    + '</div>'

    + '<div class="ct">'
    + '<div class="et show" id="e1">'
    + '<div class="stl">Choisissez votre service</div>'
    + '<div class="sgrid" id="sgrid"></div>'
    + '<div class="ninfo">⏰ ' + CONFIG.HEURE_DEBUT + ' - ' + CONFIG.HEURE_FIN + '<br>📍 ' + CONFIG.ADRESSE + '<br>📞 ' + CONFIG.TEL + '</div>'
    + '<button class="btn bp" id="btn1" onclick="go(2)">Continuer</button>'
    + '</div>'

    + '<div class="et" id="e2">'
    + '<div class="stl">Choisissez une date</div>'
    + '<div class="field"><label>Date</label><input type="date" id="dateIn" min="' + getTomorrow() + '" max="' + getMaxDate() + '" onchange="loadC()"></div>'
    + '<div class="stl" style="margin-top:14px">Creneaux disponibles</div>'
    + '<div id="czone"><div class="nc">Selectionnez une date</div></div>'
    + '<button class="btn bs" onclick="go(1)" style="margin-top:12px">Retour</button>'
    + '</div>'

    + '<div class="et" id="e3">'
    + '<div class="stl">Choisissez votre coiffeuse</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px" id="cgrid">'
    + '<button type="button" class="scard" id="cf0" onclick="pickCf(0,'Biniouf')"><div class="sname">💇</div><div style="font-size:13px;font-weight:700;margin-top:6px">Biniouf</div></button>'
    + '<button type="button" class="scard" id="cf1" onclick="pickCf(1,'Remilienne')"><div class="sname">💅</div><div style="font-size:13px;font-weight:700;margin-top:6px">Remilienne</div></button>'
    + '<button type="button" class="scard" id="cf2" onclick="pickCf(2,'Pas de preference')"><div class="sname">🎲</div><div style="font-size:13px;font-weight:700;margin-top:6px">Au hasard</div></button>'
    + '</div>'
    + '<div class="stl">Vos coordonnees</div>'
    + '<div class="iw"><label>Nom</label><span class="ii">👤</span><input type="text" id="nom" placeholder="Jean Martin"></div>'
    + '<div class="iw"><label>Telephone</label><span class="ii">📞</span><input type="tel" id="tel" placeholder="06 00 00 00 00"></div>'
    + '<div class="iw"><label>Email</label><span class="ii">📧</span><input type="email" id="email" placeholder="jean@email.fr"></div>'
    + '<button class="btn bp" onclick="go(4)">Continuer</button>'
    + '<button class="btn bs" onclick="go(2)">Retour</button>'
    + '</div>'

    + '<div class="et" id="e4">'
    + '<div class="stl">Recapitulatif</div>'
    + '<div class="recap" id="recap"></div>'
    + '<button class="btn bp" id="btnC" onclick="conf()">Confirmer mon RDV</button>'
    + '<button class="btn bs" onclick="go(3)">Modifier</button>'
    + '</div>'

    + '<div class="safe"></div></div>'
    + '<div class="adm"><a href="' + url + '?page=admin">Acces pro</a></div>'

    + '<script>'
    + 'var SVCS=' + servicesJSON + ';'
    + 'var URL="' + url + '";'
    + 'var sel=null,date=null,heure=null,coiffeuse=null;'
    + 'var g=document.getElementById("sgrid");'
    + 'for(var i=0;i<SVCS.length;i++){'
    + '  var b=document.createElement("button");'
    + '  b.type="button";b.className="scard";'
    + '  b.innerHTML="<div class=\'sname\'>"+SVCS[i].nom+"</div><div class=\'sinfo\'><span class=\'sprix\'>"+SVCS[i].prix+" EU</span><span class=\'sdur\'>"+SVCS[i].duree+" min</span></div>";'
    + '  (function(s,el){el.addEventListener("click",function(){sel=s;document.querySelectorAll(".scard").forEach(function(c){c.classList.remove("sel");});el.classList.add("sel");});})(SVCS[i],b);'
    + '  g.appendChild(b);'
    + '}'
    + 'function pickCf(i, nom){'    + '  coiffeuse=nom;'    + '  for(var k=0;k<3;k++){var el=document.getElementById("cf"+k);if(el)el.classList.remove("sel");}'    + '  var c=document.getElementById("cf"+i);if(c)c.classList.add("sel");'    + '}'    + 'function go(n){'
    + '  if(n===2&&!sel){alert("Choisissez un service");return;}'
    + '  if(n===4){'
    + '    var nm=document.getElementById("nom").value.trim();'
    + '    var tl=document.getElementById("tel").value.trim();'
    + '    if(!nm||!tl){alert("Nom et telephone obligatoires");return;}'
    + '    if(!heure){alert("Choisissez un creneau");go(2);return;}'
    + '    showRecap();'
    + '  }'
    + '  for(var i=1;i<=4;i++){'
    + '    document.getElementById("e"+i).className="et"+(i===n?" show":"");'
    + '    document.getElementById("st"+i).className="step"+(i===n?" on":i<n?" ok":"");'
    + '  }'
    + '  window.scrollTo(0,0);'
    + '}'
    + 'function loadC(){'
    + '  date=document.getElementById("dateIn").value;'
    + '  if(!date)return;heure=null;'
    + '  var z=document.getElementById("czone");'
    + '  z.innerHTML="<div class=\'ld\'>Chargement...</div>";'
    + '  fetch(URL+"?page=creneaux&date="+date+"&duree="+(sel?sel.duree:30))'
    + '  .then(function(r){return r.json();})'
    + '  .then(function(d){'
    + '    if(!d.creneaux||!d.creneaux.length){z.innerHTML="<div class=\'nc\'>Aucun creneau disponible</div>";return;}'
    + '    var div=document.createElement("div");div.className="clist";'
    + '    for(var i=0;i<d.creneaux.length;i++){'
    + '      var btn=document.createElement("button");btn.type="button";btn.className="ci";btn.textContent=d.creneaux[i];'
    + '      (function(hh,el){el.addEventListener("click",function(){heure=hh;document.querySelectorAll(".ci").forEach(function(c){c.classList.remove("sel");});el.classList.add("sel");});})(d.creneaux[i],btn);'
    + '      div.appendChild(btn);'
    + '    }'
    + '    z.innerHTML="";z.appendChild(div);'
    + '    var nb=document.createElement("button");nb.type="button";nb.className="btn bp";nb.style.marginTop="12px";nb.textContent="Continuer";'
    + '    nb.addEventListener("click",function(){go(3);});z.appendChild(nb);'
    + '  })'
    + '  .catch(function(){z.innerHTML="<div class=\'nc\'>Erreur</div>";});'
    + '}'
    + 'function showRecap(){'
    + '  var nm=document.getElementById("nom").value.trim();'
    + '  document.getElementById("recap").innerHTML='
    + '    "<div class=\'rr\'><span class=\'rl\'>Service</span><span>"+sel.nom+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Date</span><span>"+date+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Heure</span><span>"+heure+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Client</span><span>"+nm+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Prix</span><span>"+sel.prix+" EU</span></div>";'
    + '}'
    + 'function conf(){'
    + '  var btn=document.getElementById("btnC");btn.disabled=true;btn.textContent="En cours...";'
    + '  var nm=document.getElementById("nom").value.trim();'
    + '  var tl=document.getElementById("tel").value.trim();'
    + '  var em=document.getElementById("email").value.trim();'
    + '  var cf = coiffeuse || "Pas de preference";'
    + '  window.location.href=URL+"?page=confirmer&nom="+encodeURIComponent(nm)+"&tel="+encodeURIComponent(tl)+"&email="+encodeURIComponent(em)+"&date="+date+"&heure="+heure+"&service="+encodeURIComponent(sel.nom)+"&prix="+sel.prix+"&duree="+sel.duree+"&coiffeuse="+encodeURIComponent(cf);'
    + '}'
    + '</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle(CONFIG.NOM)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
