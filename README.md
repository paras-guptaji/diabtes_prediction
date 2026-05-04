# Diabetes Type-2 Detection & Prevention System

This project contains:

- React frontend in `/client`
- Node.js + Express auth backend in `/server`
- Flask + TensorFlow ML API in `/ml_api`
- Local JSON user storage for demo auth
- Diabetes prediction with prevention guidance

## Project Structure

```text
codex/
  client/
  ml_api/
  server/
  README.md
  render.yaml
```

## Local Setup

### 1. Frontend

```bash
cd client
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 2. Auth Server

```bash
cd server
npm install
npm start
```

Auth server URL:

```text
http://127.0.0.1:5000
```

### 3. ML API

```bash
cd ml_api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

ML API URL:

```text
http://127.0.0.1:5001
```

## Required Environment Variables

### Client `.env`

```env
VITE_API_URL=http://127.0.0.1:5000/api/auth
VITE_ML_API_URL=http://127.0.0.1:5001
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Server `.env`

```env
PORT=5000
JWT_SECRET=replace_with_a_strong_secret_key
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
```

## Prediction Input

Main user-facing inputs:

- `HbA1c`
- `HDL`
- `LDL`
- `BMI`
- `Blood Pressure`
- `Physical Activity`
- `Smoking`

If optional fields are left blank, the ML API estimates safe fallback values before prediction.

## Free Hosting Setup

Recommended setup:

- Frontend on Vercel
- Auth server on Render
- ML API on Render

### Deploy Frontend to Vercel

Import the repo in Vercel and set:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Vercel environment variables:

```env
VITE_API_URL=https://your-auth-service.onrender.com/api/auth
VITE_ML_API_URL=https://your-ml-service.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Deploy Backends to Render

This repo includes [render.yaml](C:/Users/admin/OneDrive/Desktop/clg/codex/render.yaml) for both backend services.

Render environment variables:

Auth service:

```env
PORT=5000
JWT_SECRET=your_secret_key
CLIENT_URL=https://your-frontend.vercel.app
CLIENT_URLS=https://your-frontend.vercel.app
```

ML service:

```env
PYTHON_VERSION=3.11.9
```

## Important Note About User Storage

The auth server currently stores users in:

- [users.json](C:/Users/admin/OneDrive/Desktop/clg/codex/server/src/data/users.json)

This is okay for demos and college project hosting, but Render free instances do not guarantee permanent file persistence for app data. For a more reliable public deployment, move auth users to a real database.
