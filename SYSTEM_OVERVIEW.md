# 🌌 Multi-Tenant B2B SaaS Platform: System Architecture & Architecture Overview

This project implements a highly scalable, secure, and modern **Multi-Tenant B2B SaaS Platform** designed to isolate tenant data logically and resolve individual workspaces seamlessly.

---

## 🌟 Key Technical Accomplishments

### 1. Multi-Tenant Isolation & Workspace Resolution
* **Dynamic Resolution**: Supports dynamic workspace subdomains (e.g. `gemini.lvh.me`) and fallback headers (`X-Tenant-Id`) to route traffic appropriately.
* **Database Scoping Middleware**: A global HTTP middleware intercepts all API calls, parses the active workspace identity, and injects the corresponding tenant scope into the request object.
* **Strict SQL Scoping**: The database architecture isolates operations per tenant. Every query fetches records where `tenant_id` matches the current active workspace, ensuring zero leakage of business data between organizations.

### 2. JWT Authentication & Role-Based Access Control (RBAC)
* **JWT Access Flow**: Secure login issues custom-signed JWT access tokens encoding user identities, email addresses, roles, and tenant associations.
* **Hierarchical RBAC**:
  * **System Admin (SaaS Head)**: Grants access to metrics widgets (project count, user status summaries), organizational parameter settings, and member controls (enabling/deactivating member accounts).
  * **Regular Team Member**: Scopes navigation strictly to active workspace task boards and personal profile fields.
* **Cryptographic Security**: Leverages `bcrypt` for secure hashing of passwords and JWT signature verification.

### 3. Modular Integration Layers (Fully Implemented)
* **Redis Caching Service (`src/services/cache.py`)**: Implements key-value caching (such as organization analytics payloads) using the `redis` client. Features a thread-safe local in-memory fallback dict if no local Redis server is active, preventing crash loops.
* **Tenant-Isolated WebSockets (`src/services/websocket.py`)**: Active connection pooling manager. Distributes notifications and task-state adjustments (e.g. project created/updated) in real-time strictly to socket peers belonging to the same `tenant_id`.
* **Razorpay Subscription Checkout (`src/services/payment.py`)**: Creates transaction orders and verifies cryptographically signed payload headers using HMAC hash verification inside FastAPI webhook handlers.
* **Supabase Multi-Tenant Storage (`src/services/storage.py`)**: Uploads attachments, user profiles, and files to Supabase bucket structures, scoping folder paths strictly under `{tenant_id}/{filename}` to enforce strict resource boundaries.

### 4. Interactive Glassmorphism Frontend
* **Visuals**: Fully responsive frontend built in **React 18** and **Vite** using premium custom Vanilla CSS.
* **Theme**: Glassmorphic panels, glowing neon accents, clean typography, smooth button scaling, and responsive grids.
* **Interceptors**: Dynamically manages workspace settings using `window.location.hostname` or stored parameters, passing parameters automatically.

---

## 🏗️ Inside the Codebase: What is Where?

### Backend Directory (`backend/src/`)
* **`main.py`**: Boots the FastAPI application, mounts CORS configurations to allow local client access, and registers the global tenant middleware.
* **`middleware/tenant.py`**: Intercepts requests, validates tenant availability, and bypasses checks for public pathways (such as landing pages or health hooks).
* **`core/security.py`**: Hashes passwords using direct `bcrypt` calls and encodes/decodes JWT bearer tokens.
* **`models/`**:
  * [tenant.py](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/backend/src/models/tenant.py): Defines the table representing organizations.
  * [user.py](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/backend/src/models/user.py): Structures team member user schemas and unique constraints.
  * [project.py](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/backend/src/models/project.py): Outlines isolated workspaces project boards.
* **`api/routes.py`**: Implements routing logic for public onboarding (registering organizations), authentication (signup/login), and scoped CRUD controllers.

### Frontend Directory (`frontend/src/`)
* **`api.js`**: An Axios client wrapper which appends authorization details to headers dynamically.
* **`App.jsx`**: Coordinates global states, parses hostname subdomains, and redirects traffic to corresponding user roles.
* **`index.css`**: Configures custom variables for the dark neon aesthetic and dashboard layouts.
* **`components/`**:
  * [Onboarding.jsx](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/frontend/src/components/Onboarding.jsx): Core portal allowing new organizations to onboard.
  * [Auth.jsx](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/frontend/src/components/Auth.jsx): Glassmorphism form interface for credential verification.
  * [AdminDashboard.jsx](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/frontend/src/components/AdminDashboard.jsx): Rich controls interface for administrators.
  * [UserDashboard.jsx](file:///Users/as-mac-1229/Desktop/Multi-Tenant-System/frontend/src/components/UserDashboard.jsx): Isolated project tracking board for members.
