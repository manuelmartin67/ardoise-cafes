/**
 * L'Ardoise des cafés — serveur Google Apps Script (API JSON)
 *
 * Les données vivent dans une Google Sheet « Ardoise des cafés (données) »
 * créée automatiquement dans le Drive du propriétaire.
 * L'appli (GitHub Pages) appelle l'URL /exec de ce script :
 *   .../exec?action=getState&today=2026-10-29
 *   .../exec?action=addRound&today=2026-10-29&args=["manu",["manu","fanny"]]
 *
 * Déploiement : Application Web, Exécuter en tant que « Moi », Accès « Tout le monde ».
 */

const FIXED = ["Fanny", "Christian", "Julien", "David", "Lionel", "Zineb", "Manu"];

const ACTIONS = {
  getState:        (today)                     => getState(today),
  setPresents:     (today, ids)                => setPresents(today, ids),
  addRound:        (today, payer, presents)    => addRound(today, payer, presents),
  deleteRound:     (today, id)                 => deleteRound(today, id),
  addMember:       (today, name)               => addMember(today, name),
  setMemberActive: (today, id, name, active)   => setMemberActive(today, id, name, active),
};

function doGet(e)  { return handle_(e && e.parameter || {}); }
function doPost(e) {
  let p = (e && e.parameter) || {};
  try { if (e && e.postData && e.postData.contents) p = Object.assign({}, p, JSON.parse(e.postData.contents)); } catch (err) {}
  return handle_(p);
}

function handle_(p) {
  let out;
  try {
    const action = p.action || 'getState';
    const fn = ACTIONS[action];
    if (!fn) throw new Error('Action inconnue : ' + action);
    const today = /^\d{4}-\d{2}-\d{2}$/.test(p.today || '') ? p.today : Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
    let args = p.args || [];
    if (typeof args === 'string') args = args ? JSON.parse(args) : [];
    out = { ok: true, state: fn.apply(null, [today].concat(args)) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Sheet ---------- */
function book_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* recrée si supprimée */ }
  }
  const ss = SpreadsheetApp.create("Ardoise des cafés (données)");
  let first = true;
  const make = (name, headers) => {
    const sh = first ? ss.getSheets()[0].setName(name) : ss.insertSheet(name);
    first = false;
    sh.getRange('A:F').setNumberFormat('@');           // tout en texte (pas de conversion de dates)
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  };
  make('Tournees', ['id', 'date', 'payeur', 'presents', 'horodatage']);
  make('Presents', ['date', 'presents']);
  make('Membres', ['id', 'nom', 'actif']);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function rows_(name) {
  const sh = book_().getSheetByName(name);
  const v = sh.getDataRange().getDisplayValues();
  return { sh, rows: v.slice(1) };
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- Lecture ---------- */
function getState(today) {
  const membres = rows_('Membres').rows.filter(r => r[0])
    .map(r => ({ id: r[0], name: r[1], active: r[2] !== 'non' }));
  const tournees = rows_('Tournees').rows.filter(r => r[0])
    .map(r => ({ id: r[0], date: r[1], payer: r[2], presents: r[3] ? r[3].split(',') : [], at: r[4] }));
  const p = rows_('Presents').rows.find(r => r[0] === today);
  return { fixed: FIXED, membres, tournees, presents: p && p[1] ? p[1].split(',') : [] };
}

/* ---------- Écritures ---------- */
function setPresents(today, ids) {
  return withLock_(() => {
    const { sh, rows } = rows_('Presents');
    const i = rows.findIndex(r => r[0] === today);
    const val = (ids || []).join(',');
    if (i >= 0) sh.getRange(i + 2, 2).setValue(val);
    else sh.appendRow([today, val]);
    return getState(today);
  });
}

function addRound(today, payer, presents) {
  return withLock_(() => {
    if (!payer || !presents || !presents.length) return getState(today);
    const id = Utilities.getUuid().slice(0, 8);
    rows_('Tournees').sh.appendRow([id, today, payer, presents.join(','), new Date().toISOString()]);
    return getState(today);
  });
}

function deleteRound(today, id) {
  return withLock_(() => {
    const { sh, rows } = rows_('Tournees');
    const i = rows.findIndex(r => r[0] === id);
    if (i >= 0) sh.deleteRow(i + 2);
    return getState(today);
  });
}

function addMember(today, name) {
  return withLock_(() => {
    name = String(name || '').trim().slice(0, 30);
    if (!name) return getState(today);
    const id = name.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç-]+/g, '-');
    const { sh, rows } = rows_('Membres');
    const i = rows.findIndex(r => r[0] === id);
    if (i >= 0) sh.getRange(i + 2, 3).setValue('oui');
    else sh.appendRow([id, name, 'oui']);
    return getState(today);
  });
}

function setMemberActive(today, id, name, active) {
  return withLock_(() => {
    const { sh, rows } = rows_('Membres');
    const i = rows.findIndex(r => r[0] === id);
    if (i >= 0) sh.getRange(i + 2, 3).setValue(active ? 'oui' : 'non');
    else sh.appendRow([id, name, active ? 'oui' : 'non']);
    if (!active) {
      const p = rows_('Presents');
      const j = p.rows.findIndex(r => r[0] === today);
      if (j >= 0) {
        const ids = p.rows[j][1].split(',').filter(x => x && x !== id);
        p.sh.getRange(j + 2, 2).setValue(ids.join(','));
      }
    }
    return getState(today);
  });
}

/* À lancer une fois à la main depuis l'éditeur pour créer la Sheet et donner les autorisations. */
function installer() {
  const ss = book_();
  Logger.log('Sheet prête : ' + ss.getUrl());
}
