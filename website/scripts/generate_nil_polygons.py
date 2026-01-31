#!/usr/bin/env python3
"""
Script per generare nilPolygons.js dai confini NIL ufficiali
"""

import json
import re
import os

# Percorsi
NIL_GEOJSON = '/Users/giuseppenicolo/Documents/Lavoro/Api_Milano/dati_nil/nil_confini.geojson'
QUARTIERI_DATA = '/Users/giuseppenicolo/Documents/Lavoro/Milano_Platform/website/src/data/quartieriData.js'
OUTPUT_FILE = '/Users/giuseppenicolo/Documents/Lavoro/Milano_Platform/website/src/data/nilPolygons.js'

def normalize_name(name):
    """Normalizza il nome NIL per matching"""
    return name.lower().strip().replace(' - ', '---').replace(' ', '-').replace("'", "").replace('.', '')

def load_nil_geojson():
    """Carica il file GeoJSON dei NIL"""
    with open(NIL_GEOJSON, 'r') as f:
        return json.load(f)

def load_quartieri_ids():
    """Carica gli ID dei quartieri da quartieriData.js"""
    with open(QUARTIERI_DATA, 'r') as f:
        content = f.read()
    
    # Trova l'inizio dell'array
    start = content.find('export const quartieriData = [')
    if start == -1:
        print("Non trovato inizio array")
        return {}
    
    start = content.find('[', start)
    
    # Trova la fine dell'array cercando la parentesi di chiusura seguita da newline
    bracket_count = 0
    end = start
    for i, c in enumerate(content[start:]):
        if c == '[':
            bracket_count += 1
        elif c == ']':
            bracket_count -= 1
            if bracket_count == 0:
                end = start + i + 1
                break
    
    json_str = content[start:end]
    
    try:
        quartieri = json.loads(json_str)
        print(f"Parsati {len(quartieri)} quartieri")
        return {q['id']: q for q in quartieri}
    except json.JSONDecodeError as e:
        print(f"Errore parsing JSON: {e}")
        return {}

def create_manual_mapping():
    """Mapping manuale per nomi che non matchano automaticamente"""
    return {
        # quartiere_id -> nil_name
        'san-siro': 'SELINUNTE',
        'qre-gallaratese---qre-san-leonardo---lampugnano': 'GALLARATESE',
        'niguarda---ca-granda---prato-centenaro---qre-fulvio-testi': 'NIGUARDA - CA\' GRANDA',
        'gratosoglio---qre-missaglia---qre-terrazze': 'GRATOSOGLIO - TICINELLO',
        'lodi---corvetto': 'LODI - CORVETTO',
        'loreto---casoretto---nolo': 'LORETO',
        'moncucco---san-cristoforo': 'S. CRISTOFORO',
        'stadera---chiesa-rossa---qre-torretta---conca-fallata': 'STADERA',
        'vigentino---qre-fatima': 'RIPAMONTI',
        'baggio---qre-degli-olmi---qre-valsesia': 'BAGGIO',
        'cimiano---rottole---qre-feltre': 'PARCO LAMBRO - CIMIANO',
        'parco-forlanini---cavriano': 'PARCO FORLANINI - ORTICA',
        'taliedo---morsenchio---qre-forlanini': 'MECENATE',
        'greco---segnano': 'GRECO',
        'villapizzone---cagnola---boldinasco': 'VILLAPIZZONE',
        'quarto-oggiaro---vialba---musocco': 'QUARTO OGGIARO',
        'porta-ticinese---conca-del-naviglio': 'TICINESE',
        'porta-ticinese---conchetta': 'NAVIGLI',
        'porta-garibaldi---porta-nuova': 'GARIBALDI REPUBBLICA',
        'stazione-centrale---ponte-seveso': 'CENTRALE',
        'buenos-aires---porta-venezia---porta-monforte': 'BUENOS AIRES - VENEZIA',
        'padova---turro---crescenzago': 'PADOVA',
        'gorla---precotto': 'VIALE MONZA',
        'maciachini---maggiolina': 'MACIACHINI - MAGGIOLINA',
        'maggiore---musocco---certosa': 'MAGGIORE - MUSOCCO',
        'umbria---molise---calvairate': 'UMBRIA - MOLISE',
        'monlue---ponte-lambro': 'PARCO MONLUE\' - PONTE LAMBRO',
        'porta-vigentina---porta-lodovica': 'VIGENTINA',
        'rogoredo---santa-giulia': 'ROGOREDO',
        'de-angeli---monte-rosa': 'DE ANGELI - MONTE ROSA',
        'giardini-pta-venezia': 'GIARDINI PORTA VENEZIA',
        'magenta---s-vittore': 'MAGENTA - S. VITTORE',
        'pta-romana': 'PORTA ROMANA',
        'porta-magenta': 'WASHINGTON',
        'tre-torri': 'TRE TORRI',
        'scalo-romana': 'SCALO ROMANA',
        'parco-dei-navigli': 'PARCO DEI NAVIGLI',
        'stadio---ippodromi': 'S. SIRO',
        'parco-bosco-in-citta': 'PARCO BOSCO IN CITTÀ',
        'assiano': 'PARCO AGRICOLO SUD',
        'morivione': 'EX OM - MORIVIONE',
        'roserio': 'SACCO',
        'porta-genova': 'TORTONA',
        'cascina-merlata': 'CASCINA TRIULZA - EXPO',
        'citta-studi': 'CITTA\' STUDI',
        'lambrate---ortica': 'LAMBRATE',
        'xxii-marzo': 'XXII MARZO',
    }

def main():
    print("Caricamento GeoJSON NIL...")
    geojson = load_nil_geojson()
    
    print("Caricamento quartieri...")
    quartieri = load_quartieri_ids()
    
    print(f"Trovati {len(geojson['features'])} NIL")
    print(f"Trovati {len(quartieri)} quartieri")
    
    # Crea dizionario NIL per nome
    nil_by_name = {}
    nil_by_normalized = {}
    
    for feature in geojson['features']:
        nil_name = feature['properties']['NIL'].strip()
        coords = feature['geometry']['coordinates']
        
        # Se è un MultiPolygon, gestiscilo
        if feature['geometry']['type'] == 'MultiPolygon':
            # Prendi tutti i poligoni
            all_coords = []
            for poly in coords:
                all_coords.extend(poly[0])
            coords = [all_coords]
        
        nil_by_name[nil_name] = coords[0] if coords else []
        nil_by_normalized[normalize_name(nil_name)] = {
            'name': nil_name,
            'coords': coords[0] if coords else []
        }
    
    # Mapping manuale
    manual_mapping = create_manual_mapping()
    
    # Genera i poligoni per ogni quartiere
    nil_polygons = {}
    matched = 0
    unmatched = []
    
    for qid, qdata in quartieri.items():
        polygon = None
        
        # 1. Prova mapping manuale
        if qid in manual_mapping:
            nil_name = manual_mapping[qid]
            if nil_name in nil_by_name:
                polygon = nil_by_name[nil_name]
        
        # 2. Prova match per nome normalizzato
        if polygon is None:
            normalized = normalize_name(qid)
            if normalized in nil_by_normalized:
                polygon = nil_by_normalized[normalized]['coords']
        
        # 3. Prova match parziale
        if polygon is None:
            for nil_norm, nil_data in nil_by_normalized.items():
                if qid.startswith(nil_norm) or nil_norm.startswith(qid.split('---')[0]):
                    polygon = nil_data['coords']
                    break
        
        if polygon:
            nil_polygons[qid] = polygon
            matched += 1
        else:
            unmatched.append(qid)
    
    print(f"\nMatchati: {matched}")
    print(f"Non matchati: {len(unmatched)}")
    
    if unmatched:
        print("\nQuartieri non matchati:")
        for u in unmatched:
            print(f"  - {u}")
    
    # Genera il file JavaScript
    print(f"\nGenerazione {OUTPUT_FILE}...")
    
    js_content = '''/**
 * Poligoni reali dei NIL (Nuclei Identità Locale) di Milano
 * Estratti dal file GeoJSON ufficiale del Comune di Milano
 * 
 * Ogni chiave corrisponde all'ID del quartiere in quartieriData.js
 * I valori sono array di coordinate [lng, lat]
 */

export const nilPolygons = '''
    
    js_content += json.dumps(nil_polygons, indent=2)
    js_content += ';\n'
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write(js_content)
    
    print(f"File generato con {len(nil_polygons)} poligoni")

if __name__ == '__main__':
    main()
