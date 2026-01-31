// Shared mapping between DB quartiere names and frontend IDs.
// DB values include surrounding single quotes (as stored in the SQLite data).
export const quartiereMapping = {
  // Centro Storico
  "'CENTRO STORICO -DUOMO, SANBABILA, MONTENAPOLEONE, MISSORI, CAIROLI'": 'centro-duomo',
  "'CENTRO STORICO - BRERA'": 'centro-brera',
  "'CENTRO STORICO -SANT`AMBROGIO, CADORNA, VIA DANTE'": 'centro-santambrogio',
  "'CENTRO STORICO -UNIVERSITA STATALE, SAN LORENZO'": 'centro-universita',
  // Zone Centrali/Semi-centrali
  "'PORTA NUOVA'": 'porta-nuova',
  "'CITY LIFE'": 'city-life',
  "'TURATI, MOSCOVA, CORSO VENEZIA'": 'turati-moscova',
  "'PARCO SEMPIONE, ARCO DELLA PACE, CORSO MAGENTA'": 'parco-sempione',
  "'SEMPIONE, PAGANO, WASHINGTON'": 'sempione-pagano',
  "'PISANI, BUENOS AIRES, REGINA GIOVANNA'": 'pisani-buenos-aires',
  "'PORTA VIGENTINA, PORTA ROMANA'": 'porta-vigentina',
  "'PORTA TICINESE, PORTA GENOVA, VIA SAN VITTORE'": 'porta-ticinese',
  "'VENEZIA, PORTA VITTORIA, PORTA ROMANA'": 'venezia-porta-vittoria',
  "'LIBIA, ,XXII MARZO, INDIPENDENZA'": 'libia-xxii-marzo',
  // Zone Semi-periferiche
  "'CENISIO, FARINI, SARPI'": 'cenisio-farini',
  "'STAZIONE CENTRALE VIALE STELVIO'": 'stazione-centrale',
  "'SOLARI, P.TA GENOVA, ASCANIO SFORZA'": 'solari-navigli',
  "'TABACCHI, SARFATTI, CREMA'": 'tabacchi-sarfatti',
  "'PIOLA, ARGONNE, CORSICA'": 'piola-argonne',
  // Periferia
  "'IPPODROMO, CAPRILLI, MONTE STELLA'": 'ippodromo-monte-stella',
  "'MAGGIOLINA, PARCO TROTTER, LEONCAVALLO'": 'maggiolina',
  "'SEGESTA, ARETUSA, VESPRI SICILIANI'": 'segesta-aretusa',
  "'ORTLES, SPADOLINI, BAZZI'": 'ortles-spadolini',
  "'BOVISA, BAUSAN, IMBONATI'": 'bovisa-imbonati',
  "'LAMBRATE, RUBATTINO, ROMBON'": 'lambrate-rubattino',
  "'MAROCCHETTI, VIGENTINO, CHIESA ROSSA'": 'marocchetti-vigentino',
  "'BARONA, FAMAGOSTA, FAENZA'": 'barona-famagosta',
  "'TITO LIVIO, TERTULLIANO, LONGANESI'": 'tito-livio',
  "'TITO LIVIO, TERTULLIANO, LONGANESI, ORTOMERCATO'": 'tito-livio',
  "'SANTA GIULIA, ROGOREDO'": 'santa-giulia-rogoredo',
  "'MUSOCCO, CERTOSA'": 'musocco-certosa',
  "'MUSOCCO, CERTOSA, EXPO, C.NA MERLATA'": 'musocco-certosa',
  "'MONZA, CRESCENZAGO, GORLA, QUARTIERE ADRIANO'": 'monza-crescenzago',
  "'PARCO LAMBRO, FELTRE, UDINE'": 'parco-lambro',
  "'SARCA, BICOCCA'": 'sarca-bicocca',
  "'CASCINA MERLATA, EXPO'": 'expo-cascina-merlata',
  "'BOVISASCA, AFFORI, P. ROSSI , COMASINA'": 'bovisasca-affori',
  "'NIGUARDA, BIGNAMI, PARCO NORD'": 'niguarda-bignami',
  "'FORLANINI, MECENATE, PONTE LAMBRO'": 'forlanini-mecenate',
  "'FORLANINI, MECENATE, ORTOMERCATO, SANTA GIULIA'": 'forlanini-mecenate',
  "'LORENTEGGIO, INGANNI, BISCEGLIE, SAN CARLO B.'": 'lorenteggio-inganni',
  // Suburbana
  "'GALLARATESE, LAMPUGNANO, P. TRENNO, BONOLA'": 'gallaratese-lampugnano',
  "'BAGGIO, Q. ROMANO, MUGGIANO'": 'baggio-quarto-romano',
  "'QUARTO OGGIARO, SACCO'": 'quarto-oggiaro',
  "'MISSAGLIA, GRATOSOGLIO'": 'missaglia-gratosoglio'
}

export const normalizeQuartiereName = (name = '') => {
  return String(name)
    .replace(/^'+|'+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const slugifyQuartiereId = (name = '') => {
  return normalizeQuartiereName(name)
    .toLowerCase()
    .replace(/[`']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const quartiereMappingClean = Object.fromEntries(
  Object.entries(quartiereMapping).map(([dbName, id]) => [normalizeQuartiereName(dbName), id])
)

export const reverseMapping = Object.fromEntries(
  Object.entries(quartiereMapping).map(([dbName, id]) => [id, dbName])
)
