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
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2l1c2VuaWNvIiwiYSI6ImNta2IxemM1MzEzbjYzZHIzeHRlNmxnOWcifQ.nu3GEBSvffvjLg2hz8wA4g
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
VITE_MAPBOX_TOKEN = pk.eyJ1IjoiZ2l1c2VuaWNvIiwiYSI6ImNta2IxemM1MzEzbjYzZHIzeHRlNmxnOWcifQ.nu3GEBSvffvjLg2hz8wA4g
VITE_API_BASE_URL = /api
```

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
- Il database SQLite (`db/milano_unified.db`) **NON** viene caricato su Git (è nel .gitignore)
- Per una demo, il frontend può mostrare dati mock
- Per produzione, considera:
  - **Supabase** (PostgreSQL gratuito): [supabase.com](https://supabase.com)
  - **Vercel Postgres**: [vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)

### API Backend
- Attualmente il backend Express (`server/index.js`) non è configurato per Vercel
- Per includere il backend, dovresti:
  1. Convertirlo in Vercel Serverless Functions, oppure
  2. Usare un servizio separato come **Railway** o **Render**

### Solo Frontend per Demo Veloce
Per mostrare rapidamente al tuo capo, puoi:
- Deployare solo il frontend su Vercel
- Usare dati statici/mock nel frontend
- Aggiungere il backend in seguito

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
- Per ora il backend locale non è incluso nel deploy
- Considera di aggiungere Vercel Serverless Functions o un servizio esterno

## 📞 Supporto

Per problemi o domande, contatta il team di sviluppo.

---

**Buon deploy! 🎉**
