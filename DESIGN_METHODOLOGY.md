# 🎓 Campus Food Waste Redistribution Network
## Design Methodology Document

> **Version:** 1.0 | **Date:** February 2026  
> *A technical and architectural overview of the platform design, system components, and data flows.*

---

## Table of Contents

1. [Project Philosophy](#1-project-philosophy)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Component Design](#3-component-design)
4. [Authentication Flow](#4-authentication-flow)
5. [Core Use Case Flows](#5-core-use-case-flows)
6. [Database Schema Design](#6-database-schema-design)
7. [Real-Time & AI Layer](#7-real-time--ai-layer)
8. [Security Design](#8-security-design)
9. [Gamification Design](#9-gamification-design)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. Project Philosophy

The design of this system is guided by three core principles:

| Principle | Description |
|---|---|
| **Zero Wastage** | Every piece of surplus food should have a path to a student, not a landfill |
| **Real-Time Transparency** | All stakeholders see live status — no ambiguity about availability |
| **Smart & Scalable** | AI-augmented recommendations and a modular backend that scales to other campuses |

The system follows an **event-driven, role-separated architecture** where each actor (student, donor, admin) interacts with a distinct interface, while the backend serves as the single source of truth.

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[🌐 Admin Web Portal<br/>Next.js]
        B[📱 Student Web App<br/>Next.js]
    end

    subgraph "Backend Layer"
        C[⚙️ Node.js / Express Server<br/>REST API + WebSocket]
        D[🔐 Auth Middleware<br/>JWT + Role Guard]
    end

    subgraph "Data Layer"
        E[(🗄️ PostgreSQL<br/>Neon Serverless)]
    end

    subgraph "AI Layer"
        F[🤖 Google Gemini AI<br/>Recommendations & Chatbot]
    end

    subgraph "External Services"
        G[📧 Nodemailer<br/>Email / OTP]
        H[☁️ Cloudinary<br/>Image Storage]
        I[🔔 Socket.io<br/>Real-Time Events]
    end

    A -->|HTTPS + Bearer Token| C
    B -->|HTTPS + Bearer Token| C
    C --- D
    C <-->|Sequelize ORM| E
    C -->|REST| F
    C --> G
    C --> H
    C <-->|WebSocket| I
    I -->|Push Events| A
    I -->|Push Events| B
```

### 2.2 Deployment Topology

```mermaid
graph LR
    subgraph "User Devices"
        U1[Student Browser]
        U2[Donor/Admin Browser]
    end

    subgraph "Vercel / Hosting"
        FE[Next.js Frontend<br/>Port 3000]
    end

    subgraph "Local / Cloud Server"
        BE[Node.js Backend<br/>Port 5000]
    end

    subgraph "Neon Cloud"
        DB[(PostgreSQL DB)]
    end

    subgraph "Google Cloud"
        AI[Gemini AI API]
    end

    U1 --> FE
    U2 --> FE
    FE --> BE
    BE --> DB
    BE --> AI
```

---

## 3. Component Design

### 3.1 Component Responsibility Map

```mermaid
graph TD
    subgraph "Frontend Components"
        P1[ProtectedRoute<br/>Role Guard]
        P2[Donor Dashboard<br/>Post / History / Pickup]
        P3[Student Dashboard<br/>Browse / Reserve / QR]
        P4[Admin Dashboard<br/>Stats / Users / AI Insights]
        P5[Login / Register<br/>OTP Verification]
    end

    subgraph "Backend Routes"
        R1[/auth<br/>Login, Register, OTP, Reset]
        R2[/food<br/>Create, Available, My-Listings]
        R3[/reservation<br/>Create, Pickup Verify]
        R4[/ai<br/>Recommend, Chatbot, Notify]
    end

    subgraph "Middleware"
        M1[authenticate<br/>JWT Verify]
        M2[authorize<br/>Role Check]
    end

    P2 -->|POST /food/create| R2
    P3 -->|GET /food/available| R2
    P3 -->|POST /reservation| R3
    P4 -->|GET stats, users| R1
    P5 -->|POST /auth/login| R1

    R1 --> M1
    R2 --> M1 --> M2
    R3 --> M1 --> M2
    R4 --> M1
```

### 3.2 Frontend Page Structure

```mermaid
graph TD
    ROOT[/ Root]
    ROOT --> LAND[/landing - Landing Page]
    ROOT --> LOGIN[/login - Login]
    ROOT --> REG[/register - Register]
    ROOT --> OTP[/verify-email - OTP Verify]
    ROOT --> FORGOT[/forgot-password]
    ROOT --> DONOR[/donor - Donor Dashboard]
    ROOT --> STUDENT[/student - Student Dashboard]
    ROOT --> ADMIN[/admin - Admin Dashboard]

    DONOR -->|Protected: donor role| D1[Post Food Tab]
    DONOR -->|Protected: donor role| D2[Pickup Verify Tab]
    DONOR -->|Protected: donor role| D3[Donation History Tab]

    STUDENT -->|Protected: student role| S1[Browse Food Tab]
    STUDENT -->|Protected: student role| S2[My Reservations Tab]
    STUDENT -->|Protected: student role| S3[Leaderboard Tab]
```

---

## 4. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    U->>FE: Enter email + password + role
    FE->>BE: POST /api/auth/login {email, password, role}
    BE->>DB: SELECT * FROM users WHERE email AND role
    DB-->>BE: User record
    BE->>BE: bcrypt.compare(password, hash)
    alt Valid credentials
        BE->>BE: jwt.sign({id, role}, SECRET, {expiresIn: "7d"})
        BE-->>FE: {token, user: {id, role, name, points}}
        FE->>FE: saveAuth() → localStorage / sessionStorage
        FE->>U: Redirect to role-based dashboard
    else Invalid
        BE-->>FE: 401 Unauthorized
        FE->>U: Show error message
    end

    Note over FE,BE: All subsequent requests include<br/>Authorization: Bearer {token}
```

### OTP Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant MAIL as Nodemailer

    U->>FE: Fill registration form
    FE->>BE: POST /api/auth/register
    BE->>DB: Check existing user (email + role)
    BE->>DB: INSERT into pending_users with OTP
    BE->>MAIL: Send OTP email
    MAIL-->>U: OTP via email
    U->>FE: Enter OTP
    FE->>BE: POST /api/auth/verify-email {email, otp}
    BE->>DB: Validate OTP + expiry
    BE->>DB: Move pending_user → users table
    BE->>DB: DELETE pending_user
    BE-->>FE: 200 Success
    FE->>U: Redirect to Login
```

---

## 5. Core Use Case Flows

### 5.1 Donor Posts Food

```mermaid
sequenceDiagram
    participant D as Donor
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant AI as Gemini AI
    participant WS as Socket.io

    D->>FE: Fill food form (name, qty, expiry, location)
    FE->>BE: POST /api/food/create + Bearer Token
    BE->>BE: authenticate() → authorize(['donor'])
    BE->>DB: INSERT INTO food_items
    DB-->>BE: Food record created
    BE->>WS: emit("food_added", foodData)
    BE->>AI: POST /ai/smart-notify (food details)
    AI-->>BE: {users_to_notify: [...]}
    BE->>WS: emit("new_food_alert", targetUsers)
    BE-->>FE: 201 Created
    FE->>D: ✅ Food posted successfully
```

### 5.2 Student Reserves Food

```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant QR as QR Generator

    S->>FE: Click Reserve on food item
    FE->>BE: POST /api/reservation/create + Bearer Token
    BE->>DB: BEGIN TRANSACTION
    BE->>DB: SELECT quantity FROM food_items WHERE id = ? FOR UPDATE
    alt quantity > 0
        BE->>DB: UPDATE food_items SET quantity = quantity - 1
        BE->>QR: Generate QR code with reservation_id
        BE->>DB: INSERT INTO reservations (user_id, food_id, qr_code)
        BE->>DB: COMMIT
        BE-->>FE: {reservation_id, qr_code}
        FE->>S: Display QR Code
    else quantity = 0
        BE->>DB: ROLLBACK
        BE-->>FE: 409 Conflict - Already claimed
        FE->>S: ❌ Food no longer available
    end
```

### 5.3 QR Code Pickup Verification

```mermaid
sequenceDiagram
    participant S as Student
    participant D as Donor/Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    S->>D: Show QR Code at pickup
    D->>FE: Enter / Scan reservation code
    FE->>BE: POST /api/reservation/pickup {reservation_code}
    BE->>DB: SELECT reservation WHERE code = ? AND status = 'pending'
    alt Valid & not expired
        BE->>DB: UPDATE reservations SET status = 'picked_up'
        BE->>DB: UPDATE users SET points = points + 10
        BE->>DB: INSERT INTO pickups (timestamp, location)
        BE-->>FE: ✅ Pickup Confirmed + student info
        FE->>D: Show student name + food details
    else Invalid / Already used
        BE-->>FE: 400 Bad Request
        FE->>D: ❌ Invalid or already used code
    end
```

---

## 6. Database Schema Design

```mermaid
erDiagram
    USERS {
        int id PK
        string email
        string password
        string name
        string role
        string college
        string roll_number
        string location
        int points
        json dietary_preferences
        json allergens
        string resetPasswordToken
        bigint resetPasswordExpires
        timestamp createdAt
    }

    PENDING_USERS {
        int id PK
        string email
        string password
        string name
        string role
        string verification_token
        bigint verification_expires
    }

    FOOD {
        int id PK
        string name
        int quantity
        datetime expiry_time
        string dining_hall
        string location
        string landmark
        json allergens
        string status
        float price
        string image_url
        int donorId FK
        timestamp createdAt
    }

    RESERVATIONS {
        int id PK
        int userId FK
        int foodId FK
        int quantity
        string reservation_code
        string status
        datetime expires_at
        timestamp createdAt
    }

    USERS ||--o{ FOOD : "donates"
    USERS ||--o{ RESERVATIONS : "makes"
    FOOD ||--o{ RESERVATIONS : "has"
```

---

## 7. Real-Time & AI Layer

### 7.1 Real-Time Event Architecture (Socket.io)

```mermaid
graph LR
    subgraph "Backend Events"
        E1["food_added"]
        E2["food_updated"]
        E3["pickup_confirmed"]
        E4["new_food_alert"]
    end

    subgraph "Socket.io Server"
        WS[Socket.io<br/>Attached to HTTP Server]
    end

    subgraph "Connected Clients"
        C1[Donor Browser]
        C2[Student Browser]
        C3[Admin Browser]
    end

    E1 --> WS --> C2
    E2 --> WS --> C2
    E3 --> WS --> C1
    E3 --> WS --> C2
    E4 --> WS --> C2
```

### 7.2 AI Module Interaction Flow

```mermaid
sequenceDiagram
    participant BE as Backend
    participant AI as Gemini AI Service
    participant DB as Database

    Note over BE,AI: Food Recommendation
    BE->>DB: Fetch user preferences + available food
    BE->>AI: POST /ai/recommend {user_profile, food_list}
    AI->>AI: Build prompt with context
    AI-->>BE: {recommendations: [food_ids]}
    BE-->>Client: Filtered personalized list

    Note over BE,AI: Smart Notifications
    BE->>AI: POST /ai/smart-notify {food_details, all_users}
    AI->>AI: Match food to user preferences
    AI-->>BE: {users_to_notify: [user_ids]}
    BE->>Client: WebSocket push to matched users

    Note over BE,AI: Chatbot
    BE->>AI: POST /ai/chat {user_message, context}
    AI-->>BE: {response: "AI reply"}
    BE-->>Client: Chat message
```

---

## 8. Security Design

```mermaid
graph TD
    REQ[Incoming Request] --> A{Has Bearer Token?}
    A -->|No| R1[401 - No token provided]
    A -->|Yes| B[jwt.verify with SECRET_KEY]
    B -->|Invalid / Expired| R2[401 - Invalid token]
    B -->|Valid| C[User exists in DB?]
    C -->|No| R3[401 - Account deleted]
    C -->|Yes| D{Route requires role?}
    D -->|No| PASS[✅ Allow Request]
    D -->|Yes| E{User role matches?}
    E -->|No| R4[403 - Forbidden]
    E -->|Yes| PASS
```

### Security Measures Summary

| Threat | Mitigation |
|---|---|
| Unauthorized access | JWT on every protected route |
| Role escalation | `authorize()` middleware checks role per route |
| Password exposure | `bcrypt` with salt factor 10 |
| SQL Injection | Sequelize ORM with parameterized queries |
| Token theft | Short-lived tokens + server-side user existence check |
| QR misuse | One-time use codes checked server-side with expiry |
| OTP brute force | 10-minute OTP expiry + stored in `pending_users` |

---

## 9. Gamification Design

```mermaid
graph TD
    ACTION[User Action] --> T1{Action Type}

    T1 -->|Successful Pickup| P1[+10 Base Points]
    T1 -->|Early Pickup >30min before expiry| P2[+20 Bonus Points]
    T1 -->|First Pickup of Day| P3[+5 Streak Bonus]
    T1 -->|Food Donation by Donor| P4[+15 Donor Points]

    P1 --> TOTAL[Update users.points]
    P2 --> TOTAL
    P3 --> TOTAL
    P4 --> TOTAL

    TOTAL --> LB[Leaderboard Query<br/>ORDER BY points DESC<br/>LIMIT 10]
    TOTAL --> BADGE{Badge Thresholds}
    BADGE -->|100 pts| B1[🥉 Bronze Saver]
    BADGE -->|500 pts| B2[🥈 Silver Guardian]
    BADGE -->|1000 pts| B3[🥇 Gold Champion]
```

---

## 10. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Student & Admin Web UI |
| **Styling** | Tailwind CSS + shadcn/ui | Component design system |
| **State** | React hooks + Context | Local UI state |
| **HTTP Client** | Axios (with interceptors) | API calls with auto-auth |
| **Animation** | Framer Motion | UI transitions |
| **Backend** | Node.js + Express | API server |
| **Real-Time** | Socket.io | Live food updates & notifications |
| **Database** | PostgreSQL (Neon Serverless) | Relational data storage |
| **ORM** | Sequelize | DB abstraction + migrations |
| **Auth** | JWT + bcryptjs | Stateless auth + password hashing |
| **Email** | Nodemailer + Gmail | OTP & notifications |
| **AI** | Google Gemini API | Recommendations, chatbot |
| **Image Storage** | Base64 / Cloudinary | Food images |
| **QR Codes** | `qrcode` npm package | Reservation verification |

---

## Design Methodology: Summary

This system adopts a **Layered, Event-Driven Architecture** with the following methodology decisions:

1. **Separation of Concerns** — Each role (student, donor, admin) has its own isolated frontend page and backend authorization layer
2. **API-First Design** — All interactions go through REST APIs; the frontend is a pure consumer
3. **Real-Time by Default** — WebSocket events supplement REST for immediate UI updates without polling
4. **AI as a Service** — The AI layer is stateless and separate; it only processes and returns data, never accesses the DB directly
5. **Defense in Depth** — Security is applied at the middleware, route, and DB level
6. **Gamification as a Driver** — Points and badges are a first-class design element to sustain engagement
7. **Transaction Safety** — Critical sections (reservations) use DB transactions to prevent race conditions

> *"This platform treats surplus food as a resource, not waste — and the architecture reflects the same philosophy: every component is purposeful, connected, and accountable."*
