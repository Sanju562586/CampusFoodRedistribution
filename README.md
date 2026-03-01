# Campus Food Network 🍔

A full-stack web application designed to reduce food waste on university campuses by connecting dining halls and food partners with students.

## 🚀 Features

-   **Role-Based Access**: Specialized dashboards for **Students**, **Donors** (Food Partners), and **Admins**.
-   **Real-Time Food Listings**: Donors can post surplus food with details (quantity, expiry, allergens, photos).
-   **Image Uploads**: Donors can attach images to their listings.
-   **Reservations**: Students can browse available food, view detailed information, and reserve items.
-   **Pickup Verification**: Secure pickup process using unique reservation codes.
-   **Admin Controls**: Manage users, monitor stats, and oversee the platform.
-   **Theming**: Full Dark/Light mode support.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: [Next.js](https://nextjs.org/) (React)
-   **UI Library**: [Shadcn UI](https://ui.shadcn.com/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State/Data**: Axios, SWR (optional), Context API

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: PostgreSQL / SQLite (Sequelize ORM)
-   **Authentication**: JWT (JSON Web Tokens)
-   **Real-time**: Socket.io

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/campus-food-network.git
    cd campus-food-network
    ```

2.  **Install Backend Dependencies**:
    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd ../frontend
    npm install
    ```

## 🏃‍♂️ Running the Project

You need to run both the backend and frontend servers.

1.  **Start Backend**:
    ```bash
    cd backend
    npm run dev
    ```
    *Server runs on port 5000.*

2.  **Start Frontend**:
    ```bash
    cd frontend
    npm run dev
    ```
    *Client runs on port 3000.*

3.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Default Credentials (Development)

-   **Admin**: `admin@campus.edu` / `admin123`
-   **Donor**: `dining@campus.edu` / `donor123`
-   **Student**: `student@campus.edu` / `student123`

## 🤝 Contribution

Feel free to fork this project and submit a PR.

## 📄 License

MIT License.