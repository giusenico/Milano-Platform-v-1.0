# 🚀 Deploy su GitHub + Vercel

Questa guida ti aiuta a pubblicare il progetto Milano Platform online.

## 📋 Prerequisiti

1. **Account GitHub**: [github.com](https://github.com)
2. **Account Vercel**: [vercel.com](https://vercel.com) (puoi loggarti con GitHub)
3. **Token Mapbox**: [mapbox.com/account/access-tokens](https://account.mapbox.com/access-tokens/)

## 🔧 Setup Locale (Prima volta)

### 1. Configura le variabili d'ambiente

```bash
# Crea il file .env nel frontend
cp website/.env.example website/.env
```

Modifica `website/.env` e inserisci il tuo token Mapbox:
```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:3001/api
```

### 2. Installa le dipendenze

```bash
npm run install:all
```

### 3. Testa in locale

```bash
# Avvia frontend e backend insieme
npm run dev
```

## 📤 Deploy su GitHub

### 1. Inizializza Git (se non l'hai già fatto)

```bash
# Inizializza il repository
git init

# Aggiungi tutti i file
git add .

# Fai il primo commit
git commit -m "Initial commit - Milano Platform"
```

### 2. Crea un repository su GitHub

1. Vai su [github.com/new](https://github.com/new)
2. Nome repository: `milano-platform` (o quello che preferisci)
3. Lascia **privato** se non vuoi che sia pubblico
4. **NON** inizializzare con README (hai già i file)
5. Clicca "Create repository"

### 3. Collega e carica il codice

```bash
# Collega il repository remoto (sostituisci USERNAME con il tuo username GitHub)
git remote add origin https://github.com/USERNAME/milano-platform.git

# Carica il codice
git branch -M main
git push -u origin main
```

## 🌐 Deploy su Vercel

### Opzione A: Deploy tramite Dashboard (Più semplice)

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Clicca "Import Git Repository"
3. Seleziona il repository `milano-platform`
4. **Framework Preset**: Vite
5. **Root Directory**: `./` (lascia così)
6. **Build Command**: Usa quello configurato (già in vercel.json)
7. **Output Directory**: `website/dist`

### Configura le variabili d'ambiente:

Nella sezione "Environment Variables" aggiungi:

```
VITE_MAPBOX_TOKEN = your_mapbox_token_here
```

Non impostare `VITE_API_BASE_URL` in produzione: il sito legge i dati statici già generati in `website/public/data-api`.

8. Clicca "Deploy"

### Opzione B: Deploy da CLI

```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Per deploy in produzione
vercel --prod
```

## 🔄 Aggiornamenti Futuri

Dopo il primo deploy, ogni volta che fai push su GitHub:

```bash
git add .
git commit -m "Descrizione delle modifiche"
git push
```

Vercel rileverà automaticamente i cambiamenti e farà il re-deploy!

## ⚠️ Note Importanti

### Database
- Il database SQLite (`db/milano_unified.db`) viene usato in locale per generare i JSON statici del frontend
- Se aggiorni il DB locale, riesegui `npm run export:static-api`
- Dopo l'export, fai commit anche di `website/public/data-api`
- Il deploy Vercel usa solo il frontend statico e non richiede un backend sempre acceso

### API Backend
- Il backend Express (`server/index.js`) resta utile in locale per sviluppo e generazione dati
- In produzione il sito non dipende da Railway o Render
- Vercel serve i file già esportati nel repository

### Deploy Gratis Consigliato
- Deploya solo il frontend su Vercel
- Lascia il backend per uso locale
- Versiona i file applicativi, non serve tenere un servizio backend acceso

## 📊 URL del Progetto

Dopo il deploy, Vercel ti darà:
- **URL Preview**: `https://milano-platform-xxx.vercel.app` (deploy automatici per ogni commit)
- **URL Produzione**: `https://milano-platform.vercel.app` (o dominio custom)

## 🆘 Problemi Comuni

**Build fallisce?**
- Controlla i log su Vercel Dashboard
- Assicurati che le dipendenze siano in `package.json`

**Mappa non si carica?**
- Verifica il token Mapbox nelle variabili d'ambiente di Vercel

**API non funzionano?**
- Verifica di aver eseguito `npm run export:static-api` prima del push
- Controlla che `website/public/data-api` sia stato incluso nel commit

## 📞 Supporto

Per problemi o domande, contatta il team di sviluppo.

---

**Buon deploy! 🎉**
