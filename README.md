# 🚀 Multi-Tenant SaaS Platform

A production-ready, highly scalable multi-tenant SaaS architecture backend built with **FastAPI**, paired with a premium, beautifully stylized **React + Vite** frontend.

## 🌟 Overview

This project provides a robust foundation for building B2B SaaS applications. It implements core SaaS requirements right out of the box, including strict tenant isolation, secure authentication, and a scalable architecture designed to seamlessly integrate with advanced caching, realtime communications, and third-party services.

## 🏗️ Architecture & Tech Stack

### Backend (FastAPI)
- **Framework**: FastAPI (Python)
- **Database**: SQLAlchemy ORM (SQLite for dev, easily extensible to PostgreSQL)
- **Authentication**: JWT-based (Access & Refresh tokens)
- **Tenant Isolation**: Middleware-based isolation using `Host` subdomain matching and `X-Tenant-Id` headers.
- **Integrations**: Redis (Caching), Razorpay (Billing), Cloudinary (Media Uploads), WebSockets (Real-time).

### Frontend (React + Vite)
- **Framework**: React 18 with Vite
- **Styling**: Vanilla CSS with a highly custom, dynamic, and premium aesthetic (no basic boilerplate frameworks).
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## ✨ Key Features

1. **Strict Tenant Database Isolation**: Every database operation is securely scoped to the active tenant.
2. **Subdomain-based Tenancy**: Dynamic workspace resolution via subdomains (e.g., `acme.yourdomain.com`).
3. **Advanced Authentication**: JWT access and refresh token flows, with tenant-scoped users.
4. **Role-Based Access Control**: Built-in support for different user roles (e.g., Admin, User).
5. **Premium User Interface**: A beautifully crafted login portal and dashboard scaffolding with a modern, dynamic aesthetic.
6. **Production-Ready Middleware**: Global exception handling, rate limiting, and centralized logging.
7. **Plug-and-Play Services**: Pre-configured service modules for Redis caching, WebSockets, payment processing, and cloud storage.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Unix or MacOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the local development server
uvicorn main:app --reload
```
The backend will be available at `http://localhost:8000`. API documentation is automatically generated at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.
