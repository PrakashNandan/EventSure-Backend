# 🎟️ EventSure Backend

This is the backend service for **EventSure**, a MERN stack-based platform that enables event organization and ticket booking. It provides secure user authentication, role-based access control (RBAC), event and ticket management, and admin-level moderation.

---

## 📌 Key Features

- 🔐 JWT-based authentication and Bcrypt password hashing
- 👥 Role-Based Access Control (Admin, Organizer, User)
- 🎫 Event creation, editing, and ticket booking
- 📂 Cloudinary integration for image uploads
- 📊 Admin controls for user and event moderation
- 🧩 Modular architecture with MVC pattern
- 🌐 RESTful API for frontend consumption

---

## 🧱 Tech Stack

- **Node.js** & **Express.js** – Server-side runtime and web framework  
- **MongoDB** & **Mongoose** – NoSQL database and ODM  
- **JWT** – JSON Web Token for secure auth sessions  
- **Bcrypt** – For password encryption  
- **Cloudinary** – Cloud image storage  
- **Multer** – File handling middleware  
- **dotenv** – Environment variable management

---

## 📁 Folder Structure

EventSure-Backend/
├── config/ # Database & Cloudinary configs
├── controllers/ # Route logic for users, events, tickets
├── middleware/ # Authentication & RBAC middleware
├── models/ # Mongoose models: User, Event, Ticket
├── routes/ # Route definitions
├── utils/ # Helper utilities (e.g., mailer)
├── uploads/ # Temp image uploads (if any)
├── .env.example # Sample environment config
└── server.js # Entry point


🔐 Role-Based Access Control (RBAC)
Admin: Manage users and moderate events

Organizer: Create and manage their own events

User: Browse and book event tickets

Custom middleware ensures proper access based on user roles.
