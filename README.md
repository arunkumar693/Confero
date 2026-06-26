# Confero 🎥

> **Premium real-time video collaboration platform** built with React, Node.js, WebRTC, and Socket.io.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)](https://socket.io)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register/login with bcrypt password hashing
- 📹 **HD Video Calls** — Peer-to-peer via WebRTC (no server video relay)
- 🔊 **Audio Controls** — Mute/unmute with one click
- 🖥️ **Screen Sharing** — Share your screen instantly
- 🏠 **Rooms** — Create or join rooms with unique IDs
- 🔒 **Rate Limiting** — Brute-force protection on auth endpoints
- 🛡️ **Security** — Helmet, CORS, NoSQL injection prevention, HPP
- ⚡ **Real-time** — Socket.io for room signaling and WebRTC offer/answer exchange

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TailwindCSS, Lucide Icons |
| Backend | Node.js, Express.js |
| Real-time | Socket.io, WebRTC |
| Auth | JWT (jsonwebtoken), bcrypt |
| Database | MongoDB (falls back to in-memory for dev) |
| Security | Helmet, express-rate-limit, hpp, express-mongo-sanitize |

---

## 📁 Project Structure

```
confero/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── context/      # AuthContext, SocketContext
│   │   ├── hooks/        # useWebRTC
│   │   ├── pages/        # AuthPage, DashboardPage, RoomPage
│   │   └── main.jsx
│   └── package.json
│
└── server/               # Express backend
    ├── config/           # DB connection
    ├── controllers/      # authController
    ├── middleware/        # JWT auth guard
    ├── models/           # User model
    ├── routes/           # authRoutes
    ├── socket/           # socketHandler
    └── server.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (optional — falls back to in-memory store for dev)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/confero.git
cd confero
```

### 2. Set up the backend
```bash
cd server
cp .env.example .env    # Fill in your JWT_SECRET
npm install
node server.js
```

### 3. Set up the frontend
```bash
cd client
npm install
npm run dev
```

### 4. Open the app
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## 🔑 Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | Falls back to in-memory |
| `JWT_SECRET` | Secret key for signing JWTs | **Required** |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` |

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | — | Server health check |
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login & get JWT |
| `GET` | `/api/auth/me` | ✅ JWT | Get current user |

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (10 rounds)
- JWTs signed with `HS256`, expire in 7 days
- Rate limiting: **20 req/15min** on login & register; **100 req/15min** globally
- `GET /me` is exempt from strict auth rate limiting to prevent dev HMR lockout
- HTTP headers hardened by **Helmet**
- NoSQL injection prevention via **express-mongo-sanitize**

---

## 📄 License

MIT © 2024 Confero
