/**
 * Mapping Zone OMI → NIL per il Server
 * 
 * Le zone OMI (Osservatorio Mercato Immobiliare) dell'Agenzia delle Entrate 
 * aggregano più NIL (Nuclei Identità Locale) del Comune di Milano.
 * 
 * Questo mapping permette di distribuire i prezzi delle zone OMI ai singoli NIL.
 */

// Mapping dalle descrizioni zone OMI nel DB agli ID NIL
export const omiDescriptionToNils = {
  // ===== FASCIA B - Centro Storico =====
  'CENTRO STORICO -DUOMO, SANBABILA, MONTENAPOLEONE, MISSORI, CAIROLI': ['duomo'],
  'CENTRO STORICO -UNIVERSITA STATALE, SAN LORENZO': ['guastalla'],
  'CENTRO STORICO - BRERA': ['brera'],
  'CENTRO STORICO -SANT`AMBROGIO, CADORNA, VIA DANTE': ['magenta---s-vittore'],
  'PARCO SEMPIONE, ARCO DELLA PACE, CORSO MAGENTA': ['parco-sempione', 'porta-magenta'],
  'TURATI, MOSCOVA, CORSO VENEZIA': ['giardini-pta-venezia', 'porta-garibaldi---porta-nuova'],
  'VENEZIA, PORTA VITTORIA, PORTA ROMANA': ['buenos-aires---porta-venezia---porta-monforte'],
  'PORTA VIGENTINA, PORTA ROMANA': ['porta-vigentina---porta-lodovica', 'pta-romana'],
  'PORTA TICINESE, PORTA GENOVA, VIA SAN VITTORE': ['porta-ticinese---conca-del-naviglio', 'porta-genova', 'porta-ticinese---conchetta'],

  // ===== FASCIA C - Semicentro =====
  'PISANI, BUENOS AIRES, REGINA GIOVANNA': ['loreto---casoretto---nolo'],
  'CITY LIFE': ['tre-torri', 'portello'],
  'PORTA NUOVA': ['isola'],
  'STAZIONE CENTRALE VIALE STELVIO': ['stazione-centrale---ponte-seveso'],
  'CENISIO, FARINI, SARPI': ['sarpi', 'farini', 'ghisolfa'],
  'SEMPIONE, PAGANO, WASHINGTON': ['pagano', 'de-angeli---monte-rosa'],
  'SOLARI, P.TA GENOVA, ASCANIO SFORZA': ['moncucco---san-cristoforo'],
  'TABACCHI, SARFATTI, CREMA': ['tibaldi'],
  'LIBIA, ,XXII MARZO, INDIPENDENZA': ['xxii-marzo', 'corsica'],

  // ===== FASCIA D - Periferia =====
  'PARCO LAMBRO, FELTRE, UDINE': ['cimiano---rottole---qre-feltre', 'parco-forlanini---cavriano'],
  'PIOLA, ARGONNE, CORSICA': ['citta-studi'],
  'LAMBRATE, RUBATTINO, ROMBON': ['lambrate---ortica'],
  'FORLANINI, MECENATE, ORTOMERCATO, SANTA GIULIA': ['ortomercato', 'taliedo---morsenchio---qre-forlanini'],
  'FORLANINI, MECENATE, PONTE LAMBRO': ['monlue---ponte-lambro', 'parco-forlanini---cavriano'],
  'TITO LIVIO, TERTULLIANO, LONGANESI': ['umbria---molise---calvairate'],
  'TITO LIVIO, TERTULLIANO, LONGANESI, ORTOMERCATO': ['umbria---molise---calvairate', 'ortomercato', 'taliedo---morsenchio---qre-forlanini'],
  'MAROCCHETTI, VIGENTINO, CHIESA ROSSA': ['vigentino---qre-fatima', 'morivione', 'stadera---chiesa-rossa---qre-torretta---conca-fallata'],
  'ORTLES, SPADOLINI, BAZZI': ['scalo-romana', 'lodi---corvetto'],
  'BARONA, FAMAGOSTA, FAENZA': ['barona', 'cantalupa', 'ronchetto-sul-naviglio---qre-lodovico-il-moro'],
  'SEGESTA, ARETUSA, VESPRI SICILIANI': ['san-siro', 'bande-nere'],
  'LORENTEGGIO, INGANNI, BISCEGLIE, SAN CARLO B.': ['lorenteggio', 'giambellino', 'forze-armate', 'quarto-cagnino'],
  'IPPODROMO, CAPRILLI, MONTE STELLA': ['stadio---ippodromi', 'qt-8'],
  'MUSOCCO, CERTOSA, EXPO, C.NA MERLATA': ['maggiore---musocco---certosa', 'cascina-merlata'],
  'MUSOCCO, CERTOSA': ['villapizzone---cagnola---boldinasco', 'stephenson', 'maggiore---musocco---certosa'],
  'BOVISA, BAUSAN, IMBONATI': ['bovisa', 'dergano'],
  'BOVISASCA, AFFORI, P. ROSSI , COMASINA': ['affori', 'bovisasca', 'comasina', 'bruzzano'],
  'NIGUARDA, BIGNAMI, PARCO NORD': ['niguarda---ca-granda---prato-centenaro---qre-fulvio-testi', 'parco-nord'],
  'SARCA, BICOCCA': ['bicocca', 'greco---segnano'],
  'MONZA, CRESCENZAGO, GORLA, QUARTIERE ADRIANO': ['adriano', 'gorla---precotto', 'padova---turro---crescenzago'],
  'MAGGIOLINA, PARCO TROTTER, LEONCAVALLO': ['maciachini---maggiolina'],
  'SANTA GIULIA, ROGOREDO': ['rogoredo---santa-giulia'],
  'CASCINA MERLATA, EXPO': ['cascina-merlata', 'roserio'],

  // ===== FASCIA E - Suburbana =====
  'BAGGIO, Q. ROMANO, MUGGIANO': ['baggio---qre-degli-olmi---qre-valsesia', 'quinto-romano', 'muggiano'],
  'GALLARATESE, LAMPUGNANO, P. TRENNO, BONOLA': ['qre-gallaratese---qre-san-leonardo---lampugnano', 'trenno', 'figino'],
  'MISSAGLIA, GRATOSOGLIO': ['gratosoglio---qre-missaglia---qre-terrazze', 'ronchetto-delle-rane'],
  'QUARTO OGGIARO, SACCO': ['quarto-oggiaro---vialba---musocco', 'stephenson']
}

// Crea mapping inverso: NIL ID → zone OMI description
export const nilToOmiDescription = {}
for (const [omiDesc, nilIds] of Object.entries(omiDescriptionToNils)) {
  for (const nilId of nilIds) {
    if (!nilToOmiDescription[nilId]) {
      nilToOmiDescription[nilId] = []
    }
    nilToOmiDescription[nilId].push(omiDesc)
  }
}

// NIL senza dati OMI (parchi, zone rurali)
export const nilWithoutOmiData = new Set([
  'triulzo-superiore',
  'chiaravalle',
  'quintosole',
  'parco-delle-abbazie',
  'parco-dei-navigli',
  'assiano',
  'parco-bosco-in-citta'
])

/**
 * Normalizza il nome zona OMI per confronto
 */
export const normalizeOmiName = (name = '') => {
  return String(name)
    .replace(/^'+|'+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trova i NIL IDs associati ad una zona OMI
 * @param {string} omiDescription - Descrizione zona OMI dal database
 * @returns {string[]} Array di NIL IDs
 */
export const getNilsForOmiDescription = (omiDescription) => {
  const normalized = normalizeOmiName(omiDescription)
  return omiDescriptionToNils[normalized] || []
}

/**
 * Verifica se un NIL ha dati OMI
 * @param {string} nilId
 * @returns {boolean}
 */
export const hasOmiData = (nilId) => {
  return !nilWithoutOmiData.has(nilId) && Boolean(nilToOmiDescription[nilId])
}

export default {
  omiDescriptionToNils,
  nilToOmiDescription,
  nilWithoutOmiData,
  normalizeOmiName,
  getNilsForOmiDescription,
  hasOmiData
}
