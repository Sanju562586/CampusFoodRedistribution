
---
# COVER PAGE & TITLE PAGE
---

**A Mini Project Report**

# CAMPUS FOOD REDISTRIBUTION NETWORK

**in**

## COMPUTER SCIENCE AND ENGINEERING

**by**

*Sanjay Kumar Dupati (Roll Number: XXXXXXXX)*

Department of Computer Science and Engineering,
Chaitanya Bharathi Institute of Technology (Autonomous),
(Affiliated to Osmania University, Hyderabad)
Hyderabad, TELANGANA (INDIA) – 500 075
[2025-2026]

---

# CERTIFICATE

This is to certify that the mini project titled **"Campus Food Redistribution Network"** is the bonafide work carried out by **Sanjay Kumar Dupati**, a student of B.E. (CSE) of Chaitanya Bharathi Institute of Technology (A), Hyderabad, affiliated to Osmania University, Hyderabad, Telangana (India) during the academic year 2025-2026, submitted in partial fulfillment of the requirements for the VI semester degree in Bachelor of Engineering (Computer Science and Engineering) and that this work has not formed the basis for the award previously of any other degree, diploma, fellowship or any other similar title.

&nbsp;

Mini Project Coordinator
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
\<Name and Designation\>

Head, CSE Dept.
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
\<Name & Designation\>

Place: Hyderabad
Date:

---

# DECLARATION

I hereby declare that the mini project entitled **"Campus Food Redistribution Network"** submitted for the VI Semester B.E (CSE) degree is my original work and the mini project has not formed the basis for the award of any other degree, diploma, fellowship or any other similar titles.

&nbsp;

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
Sanjay Kumar Dupati
(Signature)

Place: Hyderabad
Date:

---

# ACKNOWLEDGEMENT

I would like to express my sincere gratitude to all those who supported me throughout the development and completion of this mini project.

First and foremost, I thank my project guide for the constant guidance, encouragement, and valuable suggestions offered at every stage of the project. The inputs provided helped shape the direction of the work significantly.

I am grateful to the Head of the Department of Computer Science and Engineering and the faculty members for providing the necessary infrastructure and academic support for carrying out the project.

I also thank the Mini Project Coordinator for organizing the mini project process and ensuring a smooth evaluation schedule.

My sincere thanks go to the management of Chaitanya Bharathi Institute of Technology (Autonomous), Hyderabad, for providing a stimulating academic environment that encourages applied and innovation-driven projects.

Lastly, I thank my family and friends for their constant encouragement and moral support throughout the duration of this project.

Sanjay Kumar Dupati
B.E. VI Semester, CSE
CBIT (Autonomous), Hyderabad

---

# ABSTRACT

Campus food waste is a growing concern in educational institutions across India. Dining halls, canteens, and food stalls within college campuses frequently generate surplus food that goes unconsumed and eventually discarded, contributing to both economic loss and environmental degradation. This project presents the **Campus Food Redistribution Network**, a full-stack web application designed to bridge the gap between food donors (canteens, dining halls, and food partners) and food recipients (students) within a campus environment.

The system implements a three-role architecture — Student, Donor, and Admin — each provided with a dedicated, role-specific portal. Donors can list surplus food items along with details such as quantity, expiry time, location, allergen information, and food images. Students can browse available food listings, apply filters, and make reservations in real time. The Admin portal provides complete platform oversight, including user management, food inventory monitoring, and an AI-powered analytics command center.

A key distinguishing feature of the system is its integrated Artificial Intelligence engine, which provides personalized food recommendations to individual students based on their reservation history, dietary preferences, and behavioral patterns learned over time. The AI engine also computes each student's personal environmental impact — including CO₂ emissions saved, water conserved, and equivalent meals rescued. A platform-wide waste prediction module helps administrators take proactive, data-driven decisions to reduce food wastage.

The backend employs an asynchronous message queue for database write operations, a multi-layer caching strategy for high-throughput reads, and a real-time notification engine that delivers targeted alerts to students matching available food items. The application was built and tested in a full-stack environment with deployment-ready configurations.

The results demonstrate that the system is effective in connecting surplus food with students in need, while simultaneously promoting environmental awareness and responsible consumption within a campus setting.

---

# TABLE OF CONTENTS

| Section | Title | Page |
|---------|-------|------|
| | Title Page | i |
| | Certificate of the Guide | ii |
| | Declaration of the Student | iii |
| | Acknowledgement | iv |
| | Abstract | v |
| | Table of Contents | vi |
| | List of Figures | vii |
| | List of Tables | viii |
| **1** | **INTRODUCTION** | **1** |
| 1.1 | Problem Statement | 1 |
| 1.2 | Objectives of the Mini Project | 2 |
| 1.3 | Scope of the Mini Project | 3 |
| 1.4 | Motivation | 4 |
| 1.5 | Organization of the Report | 5 |
| **2** | **LITERATURE SURVEY** | **6** |
| 2.1 | Introduction to the Problem Domain | 6 |
| 2.2 | Existing Solutions | 7 |
| 2.3 | Related Works | 8 |
| 2.4 | Tools and Technologies Used | 9 |
| **3** | **DESIGN OF THE PROPOSED SYSTEM** | **11** |
| 3.1 | System Architecture | 11 |
| 3.2 | System Requirements | 13 |
| 3.3 | Data Flow Diagrams | 14 |
| 3.4 | Use Case Diagrams | 16 |
| 3.5 | Entity-Relationship Diagram | 17 |
| **4** | **IMPLEMENTATION OF THE PROPOSED SYSTEM** | **19** |
| 4.1 | Technologies Used | 19 |
| 4.2 | System Modules and Description | 20 |
| 4.3 | Algorithm / Methodology Used | 25 |
| 4.4 | Implementation Details | 27 |
| **5** | **RESULTS / OUTPUTS AND DISCUSSIONS** | **33** |
| 5.1 | Experimental Setup | 33 |
| 5.2 | Performance Analysis | 34 |
| 5.3 | Observations and Findings | 35 |
| 5.4 | Screenshots / Sample Outputs | 36 |
| **6** | **CONCLUSIONS & FUTURE WORK** | **38** |
| 6.1 | Conclusions | 38 |
| 6.2 | Recommendations / Future Work | 39 |
| | REFERENCES | 40 |
| | APPENDICES | 41 |

---

# LIST OF FIGURES

| Figure No. | Title | Page |
|------------|-------|------|
| Fig 3.1 | System Architecture Diagram | 12 |
| Fig 3.2 | Data Flow Diagram – Level 0 (Context Diagram) | 14 |
| Fig 3.3 | Data Flow Diagram – Level 1 | 15 |
| Fig 3.4 | Use Case Diagram | 16 |
| Fig 3.5 | Entity-Relationship Diagram | 17 |
| Fig 4.1 | AI Recommendation Engine Flowchart | 26 |
| Fig 4.2 | Food Creation Workflow (QStash Queue) | 28 |
| Fig 4.3 | Smart Notification Pipeline | 30 |
| Fig 5.1 | Student Dashboard – Food Listings | 36 |
| Fig 5.2 | Donor Portal – Post Food | 36 |
| Fig 5.3 | Admin Command Center – AI Analytics | 37 |
| Fig 5.4 | My Impact Card – Environmental Stats | 37 |

---

# LIST OF TABLES

| Table No. | Title | Page |
|-----------|-------|------|
| Table 2.1 | Comparison of Existing Food Redistribution Solutions | 8 |
| Table 3.1 | Software Requirements | 13 |
| Table 3.2 | Hardware Requirements | 13 |
| Table 4.1 | Description of System Modules | 21 |
| Table 4.2 | API Endpoints and Their Functions | 29 |
| Table 5.1 | Performance Metrics of the System | 34 |
| Table 5.2 | Environmental Impact Calculations | 35 |

---

# CHAPTER 1 – INTRODUCTION

## 1.1 Problem Statement

Food waste is one of the most pressing sustainability challenges faced by educational institutions today. College campuses, with their large student populations and centralized food service operations, generate a considerable volume of surplus food daily. This surplus, produced by dining halls, canteens, hostel kitchens, and food stalls, is typically discarded at the end of each service period, even when it remains fresh and safe for consumption.

At the same time, many students — particularly those from economically weaker sections — face food insecurity during their academic years. The coexistence of surplus food and unmet food needs within the same campus environment presents a clear and addressable gap.

The core problem can be stated as follows: **there is no structured, real-time digital mechanism within most college campuses that enables efficient redistribution of surplus food from donors to students who need it.** Existing informal efforts are ad-hoc, unscalable, and lack visibility, traceability, and intelligence.

This project addresses this gap by designing and implementing a campus-specific food redistribution network — a web-based platform that connects food donors and recipients in real time, while incorporating artificial intelligence to maximize the efficiency of food matching and minimize wastage.

## 1.2 Objectives of the Mini Project

The following objectives were set for the development of this mini project:

1. **To design and implement a multi-role web application** that supports three distinct user types — Student, Donor, and Admin — each with a tailored interface and specific capabilities.

2. **To enable real-time food listing and reservation**, allowing donors to post surplus food and students to browse and reserve available items with minimal delay.

3. **To develop an AI-powered recommendation engine** that personalizes food suggestions for individual students based on their past reservation history, frequently visited locations, and dietary preferences.

4. **To implement a behavioral learning system** that tracks individual user interactions over time and uses this data to improve recommendation accuracy and notification targeting.

5. **To build a smart notification system** that delivers targeted real-time alerts to students who are most likely to be interested in a newly posted food item, based on their behavioral profile.

6. **To calculate and display individual and platform-wide environmental impact**, including CO₂ emissions prevented, water conserved, and the number of meals rescued, thereby promoting environmental responsibility among students.

7. **To provide administrators with a comprehensive command center**, offering real-time activity logs, food oversight, AI-generated waste predictions, and actionable suggestions to further reduce platform-level food waste.

8. **To ensure the system is performant and scalable**, through the implementation of a multi-layer caching strategy, an asynchronous message queue for database writes, and a multi-process cluster mode for production deployment.

## 1.3 Scope of the Mini Project

The scope of this mini project is defined as follows:

**Included in Scope:**
- User registration with OTP-based email verification for new accounts.
- Role-based authentication using JSON Web Tokens (JWT) for Students, Donors, and Admins.
- Donor functionality to post, manage, and delete food listings with image upload support.
- Student functionality to browse food listings, apply allergen and dietary filters, and make and cancel reservations.
- AI-driven personalized food recommendations based on reservation history and behavioral data.
- Real-time food updates and targeted push notifications using WebSocket technology.
- Environmental impact tracking for individual students and the overall platform.
- Admin dashboard with user management, food oversight, waste analytics, and activity logs.
- Asynchronous food creation via a message queue and multi-layer cache invalidation.

**Excluded from Scope:**
- Physical delivery or logistics management of food items.
- Payment gateway integration for paid food items (price is supported in the schema but the focus is redistribution).
- Mobile application development (the platform is web-based and responsive).
- Integration with third-party campus ERP or biometric systems.
- Nutritional analysis or caloric tracking of food items.

## 1.4 Motivation

Several factors motivated the development of this project:

**Social Relevance:** Food insecurity among college students is a real and under-discussed issue. A platform that makes surplus food accessible can make a meaningful difference in the lives of students who struggle to afford regular meals.

**Environmental Impact:** Globally, approximately one-third of all food produced is wasted. Campuses are microcosms of this problem. Redirecting even a fraction of campus food waste translates to measurable reductions in greenhouse gas emissions and resource consumption.

**Technological Applicability:** The problem of food redistribution is well-suited for intelligent, real-time web solutions. The integration of AI and behavioral analytics to a social good problem presented a compelling learning opportunity and a chance to apply modern software engineering practices in a meaningful context.

**Institutional Need:** Most college campuses, including CBIT, lack a formal digital mechanism for food redistribution. The platform is designed with real-world deployment in mind and could serve as a working prototype for institutional adoption.

## 1.5 Organization of the Report

The remainder of this report is organized as follows:

- **Chapter 2 – Literature Survey:** Reviews existing food redistribution platforms and related academic work. Discusses the problem domain terminology and justifies the need for the proposed system.

- **Chapter 3 – Design of the Proposed System:** Describes the overall system architecture, software and hardware requirements, and presents the Data Flow Diagrams, Use Case Diagram, and Entity-Relationship Diagram.

- **Chapter 4 – Implementation of the Proposed System:** Details the technologies used, individual system modules and their descriptions, the algorithms employed in the AI engine, and key implementation decisions.

- **Chapter 5 – Results / Outputs and Discussions:** Presents the experimental setup, performance analysis, key observations, and annotated screenshots of the working system.

- **Chapter 6 – Conclusions and Future Work:** Summarizes the findings of the project, acknowledges limitations, and outlines potential directions for future development.

---

# CHAPTER 2 – LITERATURE SURVEY

## 2.1 Introduction to the Problem Domain Terminology

Before reviewing existing solutions, it is useful to clarify terminology central to the problem domain.

**Food Redistribution:** The process of collecting surplus food that would otherwise be discarded and channeling it to individuals or groups who can consume it. In the campus context, this involves connecting dining halls and canteens (donors) with students (recipients).

**Food Waste:** Food that is fit for consumption but discarded due to overproduction, aesthetic standards, or expiry. The United Nations Food and Agriculture Organization (FAO) estimates that approximately 1.3 billion tonnes of food are wasted globally each year [1].

**Surplus Food:** Food that has been prepared or purchased in quantities exceeding the demand at a given point in time. Surplus food is not spoiled; it is simply in excess of immediate needs.

**Behavioral Analytics:** The practice of collecting and analyzing data about user actions within a digital system in order to understand patterns, preferences, and tendencies. In this project, behavioral analytics is used to understand which dining halls students prefer and which food types they most commonly reserve.

**Recommendation System:** A software component that uses data about a user's past interactions to suggest items (in this case, food) that the user is likely to find relevant or desirable. Recommendation systems are widely used in e-commerce and streaming platforms.

**Environmental Impact Metrics:** Quantitative measures used to assess the environmental benefit of an action. In the context of food redistribution, relevant metrics include kilograms of CO₂ emissions prevented (since decomposing food generates methane, a potent greenhouse gas), litres of water saved (since food production is water-intensive), and number of meals rescued.

## 2.2 Existing Solutions

Several platforms have been developed in India and globally to address food waste and redistribution. A comparison of these with the proposed system is provided below.

**Table 2.1: Comparison of Existing Food Redistribution Solutions**

| Platform | Target Audience | AI/Personalization | Real-Time | Campus-Specific | Environmental Tracking |
|---|---|---|---|---|---|
| Feeding India (Zomato) | General Public | No | Partial | No | No |
| No Food Waste (NFW) | General Public | No | No | No | No |
| OLIO App | Neighborhood | No | Yes | No | No |
| Too Good To Go | Restaurant-to-Consumer | No | Yes | No | No |
| Proposed System | Campus Community | Yes (AI + Behavioral) | Yes (WebSocket) | Yes | Yes |

**Feeding India (Zomato Feeding India):** A large-scale initiative that focuses on collecting surplus food from events, hotels, and restaurants and distributing it to NGOs and shelters. It operates at a city scale and is managed manually by volunteers. It does not offer a self-service digital platform for campus use [2].

**No Food Waste (NFW):** An Indian NGO-driven platform that collects surplus food and delivers it to those in need. It operates through a mobile application but does not support AI-based recommendations or real-time notification systems [3].

**OLIO:** A community sharing application from the United Kingdom that allows individuals to share surplus food and household items with neighbors. While it supports real-time listings, it is not tailored for institutional or campus settings and lacks AI-driven personalization [4].

**Too Good To Go:** A commercial platform that allows restaurants to sell surplus food at reduced prices. While effective at the consumer level, it is a commercial model and not suitable for free redistribution within a campus [5].

The proposed system differentiates itself from all of the above by being specifically designed for the campus environment, incorporating AI-driven personalization, real-time behavioral notifications, and environmental impact tracking — features absent in all reviewed alternatives.

## 2.3 Related Works

Several academic works inform the design decisions made in this project.

Papargyropoulou et al. [6] proposed a food waste hierarchy model that prioritizes redistribution and sharing over composting and disposal. This model supports the rationale behind building a platform that actively facilitates surplus food redistribution before waste occurs.

Zhang et al. [7] examined collaborative filtering and content-based filtering as recommendation approaches in food-related applications. The findings suggest that hybrid approaches — combining behavioral history with contextual information — produce more relevant recommendations than either approach alone. This informed the decision to combine a score-based ranking fallback with Gemini AI-based contextual recommendations.

Abdellatif et al. [8] explored the use of WebSocket-based real-time communication in campus service applications and demonstrated that push notifications significantly increase user engagement compared to polling-based systems. This supported the adoption of Pusher for real-time food updates and targeted notifications in the proposed system.

Gupta and Agarwal [9] studied gamification in sustainability applications and found that showing users their individual environmental contribution increases engagement and pro-environmental behavior. This finding informed the inclusion of the "My Impact" card in the student dashboard, which tracks CO₂ saved, meals rescued, and daily pickup streaks.

## 2.4 Tools and Technologies Used

### 2.4.1 Frontend Technologies

The frontend of the system was developed using **Next.js 15** with the App Router architecture, which supports both server-side rendering and client-side interactivity. **TypeScript** was used throughout for type safety. **Tailwind CSS** was used for utility-first responsive styling. **Framer Motion** provided micro-animations and page transition effects. **Pusher JS** served as the WebSocket client for real-time updates. **Shadcn UI** was used for accessible, composable UI component primitives.

### 2.4.2 Backend Technologies

The backend was developed using **Node.js** with the **Express.js** framework. **Sequelize ORM** was used to abstract database operations, with **SQLite** used during development and **PostgreSQL** in production. Authentication was implemented using **JSON Web Tokens (JWT)** with role-based access control middleware. **Nodemailer** was used to send OTP verification emails for new user registration. **bcryptjs** was used to hash user passwords securely before storage.

### 2.4.3 Cloud and AI Services

**Google Gemini 1.5 Flash** served as the generative AI model powering personalized food recommendations. **Upstash Redis** provided serverless-compatible caching, session storage, and behavioral data storage. **Upstash QStash** served as a durable, cloud-native message queue to decouple food creation requests from synchronous database writes. **Pusher** provided the real-time event broadcasting infrastructure for food updates and smart notifications. **Cloudinary** was used for cloud-based image storage and CDN delivery of food item photographs.

