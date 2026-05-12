<div align="center">

<br/>

```
██████╗ ███████╗██████╗ ██╗███████╗████████╗██████╗ ██╗██████╗ ██╗   ██╗████████╗███████╗
██╔══██╗██╔════╝██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║██╔══██╗██║   ██║╚══██╔══╝██╔════╝
██████╔╝█████╗  ██║  ██║██║███████╗   ██║   ██████╔╝██║██████╔╝██║   ██║   ██║   █████╗
██╔══██╗██╔══╝  ██║  ██║██║╚════██║   ██║   ██╔══██╗██║██╔══██╗██║   ██║   ██║   ██╔══╝
██║  ██║███████╗██████╔╝██║███████║   ██║   ██║  ██║██║██████╔╝╚██████╔╝   ██║   ███████╗
╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝
```

**Campus Food Redistribution Platform**

*Connecting surplus food with students who need it — powered by AI-driven analytics, real-time notifications, and environmental impact tracking.*

<br/>

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/Upstash_Redis-Behavioral_Brain-FF4438?style=flat-square&logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI_Engine-4285F4?style=flat-square&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)

</div>

---

## Overview

**REDISTRIBUTE** is a full-stack campus food redistribution platform that tackles one of the most significant sources of institutional waste — surplus dining hall and kitchen food. The platform connects food donors (dining halls, canteens, food partners) with students in real time, with a complete AI-driven engine that learns individual user behavior to maximize rescue rates and drive engagement through measurable environmental impact.

The platform is built for scale and operational reliability, leveraging serverless-friendly infrastructure, message queue-based write protection, and a Redis-powered behavioral intelligence layer.

---

## Key Features

### 🎭 Role-Based Access Control
Three distinct portals — each tailored to a specific actor in the redistribution lifecycle.

| Role | Portal | Capabilities |
|------|--------|--------------|
| **Student** | `/dashboard` | Browse available food, reserve items, view AI recommendations, track personal green impact |
| **Donor** | `/donor` | Post surplus food with images, manage inventory, view verification & analytics |
| **Admin** | `/admin` | Full platform oversight — user management, food oversight, AI command center, real-time activity logs |

### 🤖 AI Analytics Engine
A multi-layered intelligence system integrated into the core platform:

- **Behavioral Learning**: A Redis-powered brain records every reservation and pickup per user, building individual behavioral profiles without database overhead.
- **Personalized Recommendations**: Google Gemini 1.5 Flash receives a context-rich prompt including a user's last 20 reservations, frequently visited halls, and dietary restrictions — then ranks available food accordingly.
- **Score-Based Fallback**: A purely mathematical ranking (hall match + variety bonus + urgency score) ensures recommendations are always served, even if the AI is unavailable.
- **Environmental Impact Analytics**: Calculates per-student CO₂ saved, water conservation, meals rescued, and trees equivalent. Platform-wide lifecycle metrics and rescue rates are available to admins.
- **Waste Risk Prediction**: Forecasts food expiry risk windows and auto-generates actionable suggestions (e.g., triggering priority donation or flash discounts).

### 🔔 Smart Targeted Notifications
Moved from broadcast to precision targeting:
- Preference indexes (`pref:location:{hall}`, `pref:diet:{type}`) are maintained in Redis as new interactions are recorded.
- When a donor posts food, the engine performs O(1) set lookups to identify matching students.
- Matching students receive targeted, real-time Pusher notifications on their private channel — not a generic broadcast.

### ⚡ Real-Time Infrastructure
- **Pusher**: Used for live food inventory updates and per-user smart notifications.
- **Upstash QStash**: Message queue protecting the database from write spikes — food creation and reservations are queued and processed asynchronously.
- **Upstash Redis**: Serves as session store, behavioral data layer, API response cache, and notification preference index.

### 🪵 Full-Stack Activity Logging
Every significant platform event is captured in an in-memory ring-buffer (500-event capacity) and surfaced in the Admin Dashboard's real-time Activity Logs tab. Logged events include:

- Auth: login, registration, OTP verification, password reset
- Food: image upload, creation (QStash queue + direct), expiry
- Reservations: queuing, creation, pickup confirmation, cancellation
- AI: recommendations served, impact analytics fetched, suggestions applied, smart notifications dispatched

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** (App Router) | React framework with server/client component model |
| **TypeScript** | Full type safety across all components |
| **Tailwind CSS** | Utility-first styling with dark/light mode support |
| **Framer Motion** | Micro-animations, page transitions, gesture support |
| **Pusher JS** | Real-time WebSocket client for food updates and notifications |
| **Lucide React** | Icon library |
| **Shadcn UI** | Accessible component primitives |
| **Axios** | HTTP client for API communication |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server |
| **Sequelize ORM** | Database abstraction with SQLite (dev) / PostgreSQL (prod) |
| **JWT** | Stateless authentication with role-based authorization |
| **Upstash Redis** | Caching, session management, behavioral data, rate limiting |
| **Upstash QStash** | Durable message queue for async DB writes |
| **Pusher** | Server-side real-time event broadcasting |
| **Cloudinary** | Image storage and CDN for food listings |
| **Google Gemini AI** | Generative AI for food recommendations and analytics |
| **Nodemailer** | OTP verification emails for new user registration |
| **bcryptjs** | Password hashing |

---

## Architecture


<img width="653" height="639" alt="SystemArchitectureFinal drawio" src="https://github.com/user-attachments/assets/b6e16b9e-48b8-4477-b17e-93a8c5a66915" />



---

## Getting Started

### Prerequisites
- Node.js v18 or later
- npm v9 or later
- Accounts for: Upstash (Redis + QStash), Pusher, Cloudinary, Google AI Studio (Gemini API Key)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/CampusFoodRedistribution.git
cd CampusFoodRedistribution
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your_strong_random_jwt_secret_here

# Database (SQLite for dev, PostgreSQL for prod)
DATABASE_URL=./database.sqlite

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Upstash QStash
QSTASH_TOKEN=your_qstash_token
APP_URL=http://localhost:5000

# Pusher
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=ap2

# Cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email (for OTP verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

Start the backend server:

```bash
npm run dev
```

*Server runs at `http://localhost:5000`*

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

Start the frontend:

```bash
npm run dev
```

*Application runs at `http://localhost:3000`*

---

## Running the AI Engine Test Suite

A purpose-built verification suite validates the complete AI pipeline end-to-end across 7 test categories.

```bash
# From the project root
$env:TEST_ADMIN_EMAIL="admin@example.com"
$env:TEST_ADMIN_PASS="your_admin_password"
$env:TEST_DONOR_EMAIL="donor@example.com"
$env:TEST_DONOR_PASS="your_donor_password"
$env:TEST_STUDENT_EMAIL="student@example.com"
$env:TEST_STUDENT_PASS="your_student_password"
node test-ai-engine.js
```

The suite tests: Connectivity → Authentication → AI Recommendations → My Impact Analytics → Waste Prediction → Behavior Learning & Smart Notifications → Activity Log Capture.

---

## Project Structure

```
CampusFoodRedistribution/
├── backend/
│   ├── config/           # Cloudinary + DB configuration
│   ├── lib/
│   │   ├── activityLog.js    # In-memory ring-buffer event logger
│   │   ├── localCache.js     # In-process LRU food cache
│   │   └── userBehavior.js   # Redis behavioral intelligence module
│   ├── middleware/       # JWT authentication + role authorization
│   ├── migrations/       # Sequelize schema migration history
│   ├── models/           # User, Food, Reservation, Review, PendingUser
│   ├── routes/
│   │   ├── ai.js             # AI recommendations, My Impact, waste analytics
│   │   ├── auth.js           # Login, register, OTP, password reset, admin logs
│   │   ├── food.js           # Food CRUD, image upload, smart notification trigger
│   │   └── reservation.js    # Reserve, pickup verification, QStash worker
│   ├── seeders/          # Sample data for development
│   ├── cluster.js        # Multi-process cluster mode for production
│   └── server.js         # Express app entrypoint
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── admin/        # Admin Command Center dashboard
│       │   ├── dashboard/    # Student dashboard with AI Impact card
│       │   ├── donor/        # Donor portal
│       │   ├── login/        # Role-aware login page
│       │   └── register/     # Multi-step registration with OTP
│       ├── components/       # Reusable UI components
│       └── lib/              # Axios client, auth utilities
│
└── test-ai-engine.js     # Automated AI engine verification suite
```

---

## License

```
MIT License

Copyright (c) 2026 Sanjay Kumar Dupati

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

Built with purpose — to reduce campus food waste, one meal at a time.

</div>
