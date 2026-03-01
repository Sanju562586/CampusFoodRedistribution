# Campus Food Waste Redistribution Network
## High-Level System Flow Diagram

```mermaid
flowchart TD
    A([🏫 Dining Hall / Donor]) --> B[Post Surplus Food\nname · qty · expiry · location]
    B --> C{Backend Server\nNode.js + Express}

    C --> D[(PostgreSQL\nDatabase\nStore food listing)]
    C --> E[🤖 AI Service\nMatch food to student preferences]
    E --> F[🔔 Notify Matching Students\nvia Socket.io]

    F --> G([📱 Student])
    G --> H[Browse Available Food]
    H --> I[Reserve Food Item]
    I --> C

    C --> J[Generate QR Code\n+ Reservation Record]
    J --> G

    G --> K[Go to Pickup Location\nShow QR Code]
    K --> L([🧑‍🍳 Donor / Admin\nScans QR Code])
    L --> M[Verify Pickup\nvia Admin Portal]
    M --> C

    C --> N[✅ Mark as Picked Up\nAward Points to Student\nUpdate Impact Metrics]

    N --> O([📊 Analytics Dashboard\nAdmin View])

    style A fill:#f0fdf4,stroke:#16a34a,color:#14532d
    style G fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
    style L fill:#fff7ed,stroke:#ea580c,color:#7c2d12
    style O fill:#faf5ff,stroke:#7c3aed,color:#3b0764
    style C fill:#1e293b,stroke:#475569,color:#f1f5f9
    style D fill:#1e293b,stroke:#475569,color:#f1f5f9
    style E fill:#1e293b,stroke:#475569,color:#f1f5f9
```

## Flow Summary

| Step | Actor | Action |
|------|-------|--------|
| 1 | **Donor** | Posts surplus food with details |
| 2 | **Backend** | Saves listing & triggers AI matching |
| 3 | **AI** | Identifies students whose preferences match |
| 4 | **System** | Sends real-time notification to matched students |
| 5 | **Student** | Browses and reserves a food item |
| 6 | **Backend** | Generates a unique QR code for the reservation |
| 7 | **Student** | Arrives at pickup location and shows QR code |
| 8 | **Donor/Admin** | Scans QR to verify and confirm pickup |
| 9 | **System** | Awards points, updates impact metrics |
| 10 | **Admin** | Views analytics on food saved and participation |
