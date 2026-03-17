# FieldOX — Setup Guide

## Project Structure
```
farmer-app/
├── backend/        ← Node.js + Express API
├── src/                ← React Native (Expo) app source
├── App.js
├── app.json
├── package.json
```

---

## Step 1: Get a Free Weather API Key

1. Go to https://openweathermap.org/api
2. Create a free account
3. Go to "API Keys" in your dashboard
4. Copy your API key

---

## Step 2: Configure the Backend

```bash
cd backend

# Copy the example env file
cp .env.example .env

# Open .env and paste your API key:
# OPENWEATHER_API_KEY=your_key_here
```

---

## Step 3: Start the Backend Server

```bash
cd backend
npm run dev
```

The API will run at: http://localhost:3001

Test it's working:
- http://localhost:3001/api/health
- http://localhost:3001/api/crops

---

## Step 4: Configure Frontend API URL

Open `src/services/api.js`

If running on a **physical phone**, change:
```js
const BASE_URL = "http://localhost:3001";
```
To your computer's local IP (find it with `ipconfig`):
```js
const BASE_URL = "http://192.168.1.XXX:3001";
```

If using the **Expo emulator**, keep `localhost`.

---

## Step 5: Start the Frontend App

```bash

npx expo start
```

Then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (Mac only)
- Scan the QR code with the **Expo Go** app on your phone

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather?lat=XX&lon=XX` | Current weather + 5-day forecast |
| `GET /api/zone?lat=XX&lon=XX` | USDA hardiness zone detection |
| `GET /api/crops` | All crops list |
| `GET /api/crops/:id?zone=6` | Crop details + planting status |

---

## App Features

| Screen | What it does |
|--------|-------------|
| **Dashboard** | GPS location, current weather, 5-day forecast, your USDA zone |
| **Crops** | Browse/search all crops, filter by category |
| **Crop Detail** | Zone-specific planting window, harvest window, growing tips |
| **Calendar** | Full year planting & harvest calendar sorted by month |

---

---

## Subscription Setup (RevenueCat)

In-app purchases require a real device + custom Expo build. Expo Go cannot process payments.

### Step 1 — RevenueCat account
1. Create a free account at **rev.cat**
2. Create a new Project → add your iOS and/or Android app

### Step 2 — App Store Connect (iOS)
1. In App Store Connect → Your App → Subscriptions → create a Subscription Group called **"FieldOX"**
2. Add two products:
   - `fieldox_monthly` — Auto-Renewable Subscription, $9.99/month with a $1.00 introductory offer (1 month)
   - `fieldox_annual`  — Auto-Renewable Subscription, $79.00/year
3. In RevenueCat dashboard → connect your App Store Connect API key

### Step 3 — Google Play Console (Android)
1. In Google Play Console → Your App → Monetize → Subscriptions
2. Create subscription `fieldox_monthly` with base plan `monthly-plan` ($9.99) + $1.00 intro offer
3. Create subscription `fieldox_annual` with base plan `annual-plan` ($79.00)
4. In RevenueCat dashboard → connect your Google Play service account

### Step 4 — RevenueCat Entitlement
1. RevenueCat Dashboard → Entitlements → Create entitlement named exactly `pro_access`
2. Attach both products to `pro_access`
3. Create an Offering named `default` with packages for each product

### Step 5 — Add API Keys to app
Edit `src/context/SubscriptionContext.js`:
```js
const RC_API_KEYS = {
  ios:     "appl_YOUR_KEY_HERE",    // RevenueCat → App → iOS → API Key
  android: "goog_YOUR_KEY_HERE",    // RevenueCat → App → Android → API Key
};
```

### Step 6 — Add webhook secret (optional but recommended)
Edit `backend/.env`:
```
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```
Then in RevenueCat Dashboard → Integrations → Webhooks, point to:
`https://your-backend.com/api/subscription/webhook`

### Step 7 — Build with EAS
```bash
# Install EAS CLI
npm install -g eas-cli
eas login


eas build --platform ios    # or android
```

> **In development (Expo Go):** The app automatically grants Pro access when `__DEV__` is true, so you can test all screens without a real purchase.

---

## Adding More Crops

Edit `backend/data/crops.json` — follow the existing format.
Each crop needs zone-specific schedules for zones 3–10.

---

## Zone Detection

The zone is determined using:
1. **Primary**: Open-Meteo historical climate API (free, no key) — calculates actual annual min temp
2. **Fallback**: OpenWeatherMap reverse geocoding to get state name
3. **Last resort**: Defaults to Zone 6
