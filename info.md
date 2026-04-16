# Project Description: Masivos OWO 📨

## Overview
Masivos OWO is a mass messaging system designed to send large volumes of messages via WhatsApp, Email, and SMS. It features a modern web interface built with Next.js and a robust backend powered by FastAPI.

## System Architecture

### 🟢 Backend (FastAPI)
The backend serves as the core engine, managing the business logic, database interactions, and external API integrations.
- **Core Framework**: FastAPI with Python.
- **Database**: SQLite (via SQLAlchemy and aiosqlite) for storing contacts, templates, and message history.
- **Key Modules**:
    - `routers/`: Defines API endpoints for contacts, templates, messages, history, WhatsApp, SMS, AI assistants, and groups.
    - `services/`: Contains the implementation of messaging logic (WhatsApp, SMS, Webhooks).
    - `models/`: Database schema definitions.
    - `schemas/`: Pydantic models for data validation and serialization.
- **Integrations**:
    - **WhatsApp Business API**: Direct integration for sending messages and managing templates.
    - **n8n**: Uses webhooks for advanced automation workflows (Email and WhatsApp).
    - **OWO API**: Integration for fetching and managing contact lists.
    - **LabsMobile**: Integration for sending SMS.

### 🔵 Frontend (Next.js)
A responsive user interface that allows administrators to manage the entire messaging lifecycle.
- **Framework**: Next.js 15 with TypeScript.
- **Styling**: Tailwind CSS and Lucide React for iconography.
- **Key Features**:
    - Contact and Group management.
    - Message template editor.
    - Bulk sending interface with target selection.
    - Real-time history and delivery status tracking.

## Project Structure (Sessions/Modules)

### 1. Contact & Group Management
- **Purpose**: Handle the audience for mass campaigns.
- **Functionality**: Importing contacts from external APIs (OWO), manual entry, and organizing contacts into groups for targeted messaging.

### 2. Template Management
- **Purpose**: Define reusable message structures.
- **Functionality**: Creating templates with placeholders that can be dynamically populated with contact data.

### 3. Messaging & Delivery
- **Purpose**: The actual transmission of messages.
- **Channels**: 
    - **WhatsApp**: Direct API and via n8n webhooks.
    - **Email**: Routed through n8n automation.
    - **SMS**: Integrated via LabsMobile.
- **Attachments**: Support for uploading and sending files (PDFs, images, videos).

### 4. Monitoring & History
- **Purpose**: Audit and verify delivery.
- **Functionality**: Tracking sent messages, delivery timestamps, and status updates.

### 5. AI Assistant
- **Purpose**: Enhance messaging with artificial intelligence.
- **Functionality**: Integration of an AI assistant (via webhooks) to help with message generation or automated responses.

## Deployment & Infrastructure
- **Environment**: Configured for deployment on CentOS servers.
- **Web Server**: Apache as a reverse proxy.
- **Process Management**: Systemd services for ensuring backend persistence.
- **Automation**: Includes deployment scripts (`deploy.sh`, `quick-update.sh`) for streamlined updates.
