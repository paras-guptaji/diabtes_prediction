# Diabetes Type-2 Detection & Prevention System

This project contains a full Login and Signup system with:

- React frontend in `/client`
- Node.js + Express backend in `/server`
- `users.json` local file storage instead of MongoDB
- JWT authentication
- bcrypt password hashing
- Google OAuth button integration

## Project Structure

```text
codex/
  client/
  server/
  README.md
```

## Frontend Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Backend Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The backend runs on `http://localhost:5000`.

## Required Environment Variables

### Client `.env`

```env
VITE_API_URL=http://localhost:5000/api/auth
VITE_GOOGLE_CLIENT_ID=1011861036218-rlmslse55gsvurnlvcvb5jgbm3sfh5r6.apps.googleusercontent.com
```

### Server `.env`

```env
PORT=5000
JWT_SECRET=replace_with_a_strong_secret_key
CLIENT_URL=http://localhost:5173
```

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google-login`
- `GET /api/auth/me`

## Google OAuth Notes

1. Add your OAuth credentials in Google Cloud Console.
2. Configure `Authorized JavaScript origins` for `http://localhost:5173`.
3. Replace the placeholder client id if you want to use your own Google app.
4. The frontend decodes the Google credential and sends name/email/googleId to the backend.
5. For production, the backend should also verify the Google credential directly with Google.
