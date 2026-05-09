
# CHAPTER 3 – DESIGN OF THE PROPOSED SYSTEM

## 3.1 System Architecture

The Campus Food Redistribution Network follows a layered, full-stack architecture that separates concerns across the presentation layer, application layer, and data layer. The overall design is built around three guiding principles: responsiveness (real-time updates), reliability (asynchronous processing to handle spikes), and intelligence (AI-driven personalization).

The architecture is divided into three primary tiers:

**Tier 1 – Presentation Layer (Frontend):**
The frontend is a Next.js 15 application organized around three role-specific portals. The Student Dashboard provides food browsing, reservation management, AI recommendations, and the My Impact environmental card. The Donor Portal allows food listings to be posted with images and expiry information. The Admin Command Center provides full platform oversight including real-time activity logs, user management, and the AI analytics engine.

**Tier 2 – Application Layer (Backend):**
The Express.js backend exposes four primary REST API route groups:
- `/api/auth` — Registration, OTP verification, login, password reset
- `/api/food` — Food CRUD operations, image upload, cache management
- `/api/reservation` — Reserve, pickup confirmation, cancellation, QStash worker endpoint
- `/api/ai` — Recommendations, My Impact analytics, waste prediction, apply AI suggestions

Each route is protected by JWT-based authentication middleware and role-based authorization guards.

**Tier 3 – Data and Services Layer:**
The data layer consists of a relational database accessed via Sequelize ORM (SQLite for development, PostgreSQL for production), a Redis cache layer for high-throughput reads, a Cloudinary CDN for image assets, and Pusher for WebSocket connections. Upstash QStash serves as a durable message queue that decouples food creation and reservation DB writes from the synchronous HTTP request cycle.

**Fig 3.1: System Architecture Diagram**

*(See generated architecture diagram)*

The system uses a multi-layer caching strategy for the most frequently accessed endpoint (`GET /api/food/available`):
- **Layer 1 (L1):** In-process NodeCache — pure RAM, sub-millisecond access, per-worker.
- **Layer 2 (L2):** Upstash Redis — shared across all worker processes, ~1-5ms access.
- **Layer 3 (L3):** PostgreSQL Database — cold path, accessed only on full cache miss.

This design ensures the system can serve high-concurrency read requests without database bottlenecks.

## 3.2 System Requirements

**Table 3.1: Software Requirements**

| Component | Requirement |
|---|---|
| Operating System | Windows 10 / Ubuntu 20.04 or later |
| Runtime Environment | Node.js v18.x or later |
| Package Manager | npm v9.x or later |
| Database (Development) | SQLite 3 |
| Database (Production) | PostgreSQL 14 or later |
| Version Control | Git |
| Browser | Google Chrome / Mozilla Firefox (latest) |
| External Services | Upstash Redis, Upstash QStash, Pusher, Cloudinary, Google AI Studio |

**Table 3.2: Hardware Requirements**

| Component | Minimum Requirement | Recommended |
|---|---|---|
| Processor | Intel Core i3 / AMD equivalent | Intel Core i5 or higher |
| RAM | 4 GB | 8 GB or more |
| Storage | 10 GB free space | 20 GB SSD |
| Network | Stable broadband | 10 Mbps or higher |
| Display | 1280 × 720 resolution | 1920 × 1080 Full HD |

## 3.3 Data Flow Diagrams

### Level 0 – Context Diagram

The Context Diagram (Level 0 DFD) represents the system as a single process and shows the external entities that interact with it. The three external entities are:

- **Student:** Sends login credentials and reservation requests; receives food listings, AI recommendations, and notifications.
- **Donor:** Sends food listing data (name, quantity, expiry, image); receives confirmation and listing status.
- **Admin:** Sends management commands and AI suggestion approvals; receives analytics data, user records, and activity logs.

**Fig 3.2: Data Flow Diagram – Level 0 (Context Diagram)**

```
           +------------+        Food Listing Data         +----------------------------+
           |   DONOR    |--------------------------------->|                            |
           +------------+      Listing Confirmation        |                            |
                               <-------------------------  |   CAMPUS FOOD              |
                                                           |   REDISTRIBUTION           |
           +------------+       Login, Reservation         |   NETWORK SYSTEM           |
           |  STUDENT   |--------------------------------->|                            |
           +------------+  Food List, Recommendations      |                            |
                               Notifications               |                            |
                               <-------------------------  |                            |
                                                           |                            |
           +------------+      Management Commands         |                            |
           |   ADMIN    |--------------------------------->|                            |
           +------------+   Analytics, Logs, Reports       +----------------------------+
                               <-------------------------
```

### Level 1 DFD

The Level 1 DFD decomposes the system into its five major functional processes:

**Process 1.0 – User Authentication:** Handles new user registration with OTP verification, existing user login with JWT issuance, and password reset flows. Interacts with the User Database (D1).

**Process 2.0 – Food Management:** Handles food item creation by donors (with image upload via Cloudinary), retrieval of available food listings, and deletion by admins. Interacts with the Food Database (D2) and Redis Cache (D4). On new food creation, triggers Process 5.0.

**Process 3.0 – Reservation Processing:** Handles student food reservations, pickup confirmation by donors, and reservation cancellation. Interacts with the Reservation Database (D3) and Food Database (D2).

**Process 4.0 – AI Recommendation Engine:** On request from a student, fetches the student's reservation history from D3, behavioral profile from D4 (Redis), and available food from D2. Generates personalized recommendations using Google Gemini AI and returns ranked food items to the student.

**Process 5.0 – Notification System:** Triggered when a new food item is posted. Queries the Redis behavioral preference indexes to identify interested students, then sends targeted Pusher WebSocket events to each matching student's private channel.

**Fig 3.3: Data Flow Diagram – Level 1**

*(See generated DFD diagram)*

## 3.4 Use Case Diagrams

The Use Case Diagram captures the interactions between the three user roles (actors) and the system's functional capabilities.

**Actor: Student**
- UC-S1: Register and verify OTP
- UC-S2: Login to Student Dashboard
- UC-S3: Browse available food listings
- UC-S4: Apply dietary and allergen filters
- UC-S5: Make a food reservation
- UC-S6: Cancel a reservation
- UC-S7: View AI-personalized food recommendations
- UC-S8: View My Environmental Impact (My Impact Card)
- UC-S9: Receive smart food match notifications

**Actor: Donor**
- UC-D1: Register and verify OTP
- UC-D2: Login to Donor Portal
- UC-D3: Post a new food listing with image
- UC-D4: View my active food listings
- UC-D5: View students who reserved food

**Actor: Admin**
- UC-A1: Login to Admin Command Center
- UC-A2: View and manage all users (approve/delete)
- UC-A3: View and delete all food listings
- UC-A4: View real-time platform activity logs
- UC-A5: Access AI waste prediction analytics
- UC-A6: Apply AI-generated suggestions (Flash Sale / Priority Donation)
- UC-A7: View platform-wide environmental impact

**Fig 3.4: Use Case Diagram**

*(See generated use case diagram)*

## 3.5 Entity-Relationship Diagram

The database schema of the system consists of five entities:

**USER:** Stores all user accounts regardless of role. Key attributes include: `id` (Primary Key), `email`, `password` (hashed), `name`, `college`, `roll_number`, `role` (student / donor / admin), `dietary_preferences`, `allergens` (JSON array), `points`, `resetPasswordToken`, `resetPasswordExpires`.

**FOOD:** Stores all food listings posted by donors. Key attributes include: `id` (Primary Key), `name`, `quantity`, `expiry_time`, `dining_hall`, `allergens` (JSON string), `donorId` (Foreign Key → USER), `location`, `landmark`, `image_url`, `price`, `status`.

**RESERVATION:** Records each food reservation made by a student. Key attributes include: `id` (Primary Key), `userId` (Foreign Key → USER), `foodId` (Foreign Key → FOOD), `quantity`, `status` (reserved / picked_up / cancelled).

**REVIEW:** Stores reviews left by one user for another. Key attributes include: `id` (Primary Key), `reviewerId` (Foreign Key → USER), `targetId` (Foreign Key → USER), `rating`, `comment`.

**PENDING_USER:** A temporary holding table for users who have registered but not yet verified their OTP. Records are deleted upon successful verification.

**Relationships:**
- A USER (donor) can have many FOOD listings (one-to-many).
- A USER (student) can have many RESERVATIONS (one-to-many).
- A FOOD item can have many RESERVATIONS (one-to-many).
- A USER can write many REVIEWS and receive many REVIEWS (two one-to-many relationships on the same USER entity).

**Fig 3.5: Entity-Relationship Diagram**

*(See generated ER diagram)*

---

# CHAPTER 4 – IMPLEMENTATION OF THE PROPOSED SYSTEM

## 4.1 Technologies Used

The system was implemented using a modern JavaScript-based full-stack. The choice of technologies was driven by the need for real-time capability, AI integration, scalability, and rapid development.

On the **frontend**, Next.js 15 was chosen for its server-side rendering capability and App Router architecture, which provides a natural separation between server and client components. TypeScript added type safety that significantly reduced runtime errors during development. Framer Motion was used to implement smooth page transitions and card animations that enhance the perceived responsiveness of the application.

On the **backend**, Node.js with Express.js was selected for its non-blocking, event-driven architecture — well-suited for a platform where many concurrent users may be browsing food listings or submitting reservations simultaneously. Sequelize ORM was used to write database-agnostic model definitions, which allowed the system to run on SQLite during development and be deployed against a production PostgreSQL database without modifying application code.

Cloud services were selected for their serverless-friendly REST APIs: Upstash Redis and QStash eliminate the need to manage dedicated server infrastructure for caching and message queuing.

## 4.2 System Modules and Description

The system is organized into seven primary modules, each addressing a distinct functional responsibility.

**Table 4.1: Description of System Modules**

| Module | Location | Description |
|---|---|---|
| Authentication Module | `backend/routes/auth.js` | Handles registration, OTP, login, JWT, password reset |
| Food Management Module | `backend/routes/food.js` | Food CRUD, image upload, cache invalidation |
| Reservation Module | `backend/routes/reservation.js` | Reserve, pickup, cancel, QStash worker |
| AI Engine Module | `backend/routes/ai.js` | Recommendations, My Impact, waste prediction |
| Behavioral Intelligence Module | `backend/lib/userBehavior.js` | Redis-based user behavioral profiles |
| Activity Log Module | `backend/lib/activityLog.js` | In-memory ring-buffer event logger |
| Local Cache Module | `backend/lib/localCache.js` | In-process NodeCache (L1) |

### 4.2.1 Authentication Module

The authentication module manages the complete user lifecycle. When a new user registers, their credentials and profile data are validated and stored in the `PendingUser` table while a 6-digit OTP is generated and sent to their email address via Nodemailer. Upon successful OTP verification, the record is promoted from `PendingUser` to `User`. Login requests are validated against the hashed password using bcryptjs, and upon success, a signed JWT is returned to the client. The JWT payload contains the user's ID and role, which is verified on every subsequent protected API request by the authentication middleware.

Password reset is implemented through a two-step flow: the user requests a reset link (a token is stored in the database with a 1-hour expiry), receives an email with a signed URL, and then submits a new password which is validated against the token's expiry before being saved.

### 4.2.2 Food Management Module

The food management module handles the complete lifecycle of a food listing. When a donor submits a new food item, the system first uploads the accompanying image to Cloudinary and obtains a CDN-backed URL. The food payload is then submitted to Upstash QStash, which queues it for asynchronous processing. QStash calls back the system's internal worker endpoint (`POST /api/food/worker-create`), which persists the record to the database. Upon successful creation, Pusher broadcasts a `food_added` event to the `food-channel`, which all connected student dashboards are subscribed to — ensuring that new food items appear in real time without requiring a page refresh.

The most frequently accessed endpoint, `GET /api/food/available`, is optimized through a three-layer cache. On a cache miss, only one coroutine performs the database query (using in-flight promise coalescing), while all other concurrent requests await the result of that single database call, preventing thundering herd conditions.

### 4.2.3 Reservation Module

The reservation module handles the student-side food reservation flow. When a student reserves a food item, the system decrements the food's available quantity and creates a reservation record. The actual database write is submitted asynchronously via QStash in production deployments, returning a `202 Accepted` response immediately to the student to minimize perceived latency.

Donors can confirm a pickup by updating the reservation status to `picked_up`. Students may also cancel reservations, which restores the food quantity. All state changes trigger targeted cache invalidation for the food listing cache.

### 4.2.4 AI Engine Module

This is the most technically sophisticated module of the system. It is composed of three sub-systems:

**Personalized Recommendations (`GET /api/ai/recommend`):** On request, the system loads the student's dietary profile, fetches their last 20 reservations as behavioral history, retrieves their Redis-stored behavioral profile (top halls, total interactions), and queries all currently available food. Allergen conflicts are first filtered out. The remaining food items are then submitted to Google Gemini 1.5 Flash with a context-rich prompt that includes the student's full profile and history. Gemini returns a ranked list of food IDs with a personalized explanation. If the Gemini API is unavailable, the system falls back to a deterministic score-based ranking.

**My Impact Analytics (`GET /api/ai/my-impact`):** Computes the student's cumulative environmental impact based on their reservation history. The system calculates kilograms of food saved (assuming 0.5 kg per unit), CO₂ emissions prevented (2.5 kg CO₂ per kg food), water conserved (1000 litres per kg food), and equivalent number of meals rescued. A daily streak counter tracks consecutive days with at least one pickup. Results are cached in Redis for 5 minutes.

**Waste Prediction (`GET /api/ai/waste-prediction`):** An admin-only analytics view that aggregates at-risk food items (expiring within 7 days), computes the total platform rescue rate, and generates one of two actionable suggestions: a "Flash Sale" suggestion for items expiring within 24 hours, or a "Priority Donation" suggestion for items in high surplus. Admins can apply these suggestions with a single click, which updates the relevant food item names and prices in the database.

### 4.2.5 Behavioral Intelligence Module

The `userBehavior.js` module implements the Redis-based behavioral brain of the platform. Each time a student picks up a food item, two types of data are recorded in Redis:

1. **Behavioral Profile** (`user:behavior:{userId}`) — A sorted set tracking which dining halls the user has visited and how frequently, used to build the top-halls profile for recommendations.

2. **Preference Indexes** (`pref:location:{hall}`, `pref:diet:{type}`) — Redis sets that record which users have interacted with a given hall or dietary category. These indexes are used by the smart notification engine for O(1) lookups to find interested students when a new food item is posted.

### 4.2.6 Activity Log Module

The `activityLog.js` module implements an in-memory ring-buffer with a capacity of 500 events. Every significant platform event — including authentication events, food creation, reservations, cancellations, and AI engine operations — is pushed to this buffer with a type, level (info / success / warning / error), message, actor, and timestamp. The Admin Dashboard polls this log to display a live feed of platform activity. The ring-buffer design ensures that memory consumption remains constant regardless of platform usage duration.

## 4.3 Algorithm / Methodology Used

### 4.3.1 AI Recommendation Algorithm

The recommendation algorithm follows a pipeline of four stages:

**Stage 1 – Allergen Filtering (Hard Constraint):**
All food items that contain any allergen present in the user's allergen list are removed from consideration. This is a mandatory filter — the AI engine never recommends food that conflicts with the user's declared allergen restrictions.

**Stage 2 – Score-Based Ranking (Mathematical Fallback):**
Each remaining food item is scored using the following function:

```
Score(item) = HallMatch(item) + VarietyBonus(item) + UrgencyBonus(item)

Where:
  HallMatch(item)   = +3 if item's hall ∈ user's top halls (from Redis profile)
                    = +0 otherwise
  VarietyBonus(item)= +2 if item has not been reserved by this user before
                    = +0 otherwise
  UrgencyBonus(item)= +3 if item expires in < 4 hours
                    = +2 if item expires in 4-12 hours
                    = +1 if item expires in 12-24 hours
                    = +0 if item expires in > 24 hours
```

Items are sorted by descending score. The top 5 are selected as the fallback recommendation.

**Stage 3 – Gemini AI Contextual Ranking (Primary):**
A structured prompt containing the user's dietary preferences, allergen restrictions, top halls, full reservation history (last 20 items), and all currently available safe food items is submitted to Google Gemini 1.5 Flash. The model is instructed to return a JSON object containing the IDs of the top 5 recommended food items and a brief personalized explanation. The JSON response is parsed and the matching food records are returned.

**Stage 4 – Fallback Merge:**
If Gemini returns fewer than 5 matches (or fails entirely), the score-based ranking results are used to fill the gap, ensuring that the recommendations endpoint always returns useful results.

**Fig 4.1: AI Recommendation Engine Flowchart**

```
[Student Requests Recommendations]
           |
           v
[Load User Profile: diet, allergens, name]
           |
           v
[Fetch Last 20 Reservations (History)]
           |
           v
[Load Redis Behavioral Profile (Top Halls)]
           |
           v
[Fetch All Currently Available Food]
           |
           v
[Apply Allergen Filter (Hard Constraint)]
           |
      +----+----+
      |         |
    [None]  [Items Remain]
      |         |
[Return Alert] [Score-Based Ranking]
               |
               v
         [Try Gemini AI]
          /         \
      [Success]   [Failure / Timeout]
          |              |
   [Parse IDs]    [Use Score Ranking Top 5]
          |
          v
   [Return Top 5 with Reason]
```

### 4.3.2 Smart Notification Algorithm

When a donor posts a new food item, the notification engine:

1. Infers the dietary category of the food item from its allergen list.
2. Performs two Redis set lookups: `SMEMBERS pref:location:{hall}` and `SMEMBERS pref:diet:{diet}`.
3. Computes the union of the two result sets to identify all interested users.
4. Sends a Pusher private channel event to each user's personal channel (`user-{userId}`), in batches of 10 to respect API rate limits.

This approach ensures notifications are targeted and relevant, rather than broadcasting to all connected users indiscriminately.

### 4.3.3 Environmental Impact Calculation

For each student, the system computes impact metrics using the following constants and formulas:

- Assumed food weight: **0.5 kg per reserved unit**
- CO₂ prevented: **2.5 kg CO₂ per kg food saved**
- Water conserved: **1,000 litres per kg food saved**
- Meals rescued: **3 meals per kg food saved**
- Trees equivalent: **CO₂ saved ÷ 20 kg (CO₂ absorbed per tree per year)**

## 4.4 Implementation Details

### 4.4.1 Backend Server Setup

The backend is implemented as an Express.js application defined in `server.js`. At startup, the application:
1. Loads environment variables from `.env`.
2. Initializes the Sequelize database connection and synchronizes all models.
3. Seeds a default admin user if none exists.
4. Initializes the Pusher server client and attaches it to the Express request object via middleware.
5. Registers the four route groups (`/api/auth`, `/api/food`, `/api/reservation`, `/api/ai`).
6. Starts the HTTP listener on the configured port.

For production deployments, `cluster.js` spawns one worker process per CPU core using Node.js's native `cluster` module, enabling the application to utilize all available CPU resources and handle significantly higher concurrent load.

### 4.4.2 Food Creation Workflow

**Fig 4.2: Food Creation Workflow (QStash Queue)**

```
[Donor submits food form]
           |
           v
[Backend validates fields]
           |
           v
[Upload image to Cloudinary → get URL]
           |
           v
[Check if QStash is configured & URL is not localhost]
      /         \
  [No QStash]   [QStash Available]
      |               |
[Direct DB Write]  [Publish to QStash]
      |               |
[Pusher: food_added]  [Return 202 Accepted]
      |               |
[Cache Invalidation]  [QStash calls /worker-create]
                      |
              [Verify QStash Signature]
                      |
              [Create Food in DB]
                      |
              [Pusher: food_added]
                      |
              [Cache Invalidation]
```

### 4.4.3 API Endpoint Reference

**Table 4.2: API Endpoints and Their Functions**

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user, send OTP |
| POST | /api/auth/verify-otp | Public | Verify OTP, activate account |
| POST | /api/auth/login | Public | Login, receive JWT |
| POST | /api/auth/forgot-password | Public | Request password reset |
| POST | /api/auth/reset-password | Public | Reset password with token |
| GET | /api/food/available | Student, Admin | List all available food |
| POST | /api/food/create | Donor | Post new food listing |
| GET | /api/food/my-listings | Donor | View own listings |
| GET | /api/food/all | Admin | View all food (no cache) |
| DELETE | /api/food/:id | Admin | Delete a food item |
| POST | /api/reservation/reserve | Student | Make a reservation |
| POST | /api/reservation/pickup/:id | Donor | Confirm student pickup |
| POST | /api/reservation/cancel/:id | Student | Cancel reservation |
| GET | /api/ai/recommend | Student | Get AI food recommendations |
| GET | /api/ai/my-impact | Student | Get personal environmental impact |
| GET | /api/ai/waste-prediction | Admin | Get waste analytics |
| POST | /api/ai/apply-suggestion | Admin | Apply AI suggestion |

### 4.4.4 Frontend Architecture

The frontend is organized around Next.js 15's App Router. Each role has a dedicated route group:

- `/login` — Role-aware login page with animated form transitions.
- `/register` — Multi-step registration flow: account details → OTP verification.
- `/dashboard` — Student Dashboard with tabs: Available Food, AI Recommendations, My Reservations, My Impact.
- `/donor` — Donor Portal with tabs: Post Food, My Listings.
- `/admin` — Admin Command Center with tabs: Users, Food, AI Engine, Activity Logs.

All API calls are made through a centralized Axios client that automatically attaches the JWT from local storage to the `Authorization` header of every request. Authentication utilities in `src/lib/auth.ts` provide helper functions for token storage, retrieval, and user role extraction.

The real-time experience on the Student Dashboard is powered by a Pusher JS subscription to the `food-channel`. On receipt of a `food_added` event, the food list is refreshed and a toast notification is displayed. Simultaneously, if the student's private channel (`user-{userId}`) receives a `food_notification` event from the smart notification engine, a dedicated notification alert appears with direct details about the matched food item.

