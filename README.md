# MCS LineWalk

A production-ready manufacturing inspection and machine monitoring system built using:

* Frontend: HTML + Tailwind CSS + Vanilla JavaScript
* Backend: Google Apps Script (GAS)
* Database: Google Sheets
* Notifications: Telegram Bot API

This project helps manufacturing plants digitize:

* Machine readiness checklists
* Production line walk inspections
* Breakdown reporting
* Machine monitoring dashboards
* User and plant management

---

# Features

## 1. Secure Login System

* Username/password authentication
* Role-based access control
* Session storage login persistence
* Fast authentication endpoint using Google Apps Script

---

## 2. MCS Line Walk Checklist

Operators can:

* Select plant
* Select department
* Select machine
* Select shift
* Fill inspection checklist
* Add remarks for failed checkpoints
* Submit readiness reports

### Supported Features

* Progress tracking
* English/Hindi language toggle
* Real-time checklist rendering
* Role-based checkpoints
* Production readiness validation

---

## 3. Machine Monitoring Dashboard

Real-time dashboard showing:

* Machine status
* Breakdown count
* Active issues
* Department health
* Plant-wise machine grouping

### Machine States

| Status | Meaning            |
| ------ | ------------------ |
| Green  | Machine OK         |
| Yellow | Issue Detected     |
| Red    | Breakdown          |
| Gray   | Pending Inspection |

### Dashboard Features

* Plant filters
* Department filters
* Date filters
* Grouping system
* Department analytics
* Machine detail popups
* Inspection history tracking

---

## 4. Breakdown Reporting System

Operators can submit machine failure reports including:

* Plant
* Department
* Machine
* Shift
* Operator
* Breakdown reason

### Breakdown Features

* Telegram alert integration
* Recent breakdown history
* Failure tracking
* Maintenance escalation support

---

## 5. CMS Control Panel

Admin users can manage:

* Users
* Plants
* Departments
* Machines
* Roles
* Shifts
* Checklist Items

### CMS Features

* Search and filtering
* Dynamic table rendering
* Add/edit records
* Role-based access
* Plant-level restrictions

---

# Tech Stack

## Frontend

* HTML5
* Tailwind CSS
* Vanilla JavaScript
* Google Fonts
* Material Symbols

## Backend

* Google Apps Script

## Database

* Google Sheets

## Notification System

* Telegram Bot API

---

# Project Structure

```bash
project/
│
├── index.html        # Frontend application UI
├── Code.gs           # Google Apps Script backend
└── README.md
```

---

# Backend Architecture

The backend is developed using Google Apps Script.

Main responsibilities:

* Authentication
* Reading Google Sheets data
* Writing checklist records
* Writing breakdown reports
* Returning JSON payloads
* Telegram notification handling
* CMS CRUD operations

---

# Google Sheets Structure

The project uses multiple sheets inside one spreadsheet.

## Required Sheets

### Users

Stores login credentials and permissions.

| username | password | role | department | plant |
| -------- | -------- | ---- | ---------- | ----- |

---

### Machines

Stores machine master data.

| Machine Name | Plant | Department |
| ------------ | ----- | ---------- |

---

### Checklists

Stores submitted checklist reports.

| Timestamp | Date | Shift | Machine | Operator | Status |
| --------- | ---- | ----- | ------- | -------- | ------ |

---

### Breakdowns

Stores machine breakdown reports.

| Timestamp | Date | Shift | Operator | Machine | Reason |
| --------- | ---- | ----- | -------- | ------- | ------ |

---

### Plants

Stores plant master data.

---

### Departments

Stores department master data.

---

### Roles

Stores user role definitions and access levels.

---

### Shifts

Stores shift information.

---

### ChecklistItems

Stores checklist questions/checkpoints.

---

# Setup Guide

## Step 1 — Create Google Spreadsheet

Create a new Google Spreadsheet.

Add all required sheets:

* Users
* Machines
* Checklists
* Breakdowns
* Plants
* Departments
* Roles
* Shifts
* ChecklistItems

---

## Step 2 — Open Google Apps Script

Inside the spreadsheet:

```text
Extensions → Apps Script
```

Replace the default code with the contents of:

```text
Code.gs
```

---

## Step 3 — Configure Variables

Update these variables inside `Code.gs`:

```javascript
const TELEGRAM_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
const ADMIN_CHAT_ID  = "YOUR_ADMIN_CHAT_ID";
const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
```

---

## Step 4 — Deploy Apps Script

Deploy the Apps Script as a Web App.

### Deployment Settings

| Setting    | Value  |
| ---------- | ------ |
| Execute As | Me     |
| Access     | Anyone |

After deployment copy the Web App URL.

---

## Step 5 — Configure Frontend

Inside `index.html` update:

```javascript
let GAS_URL = 'YOUR_DEPLOYED_WEBAPP_URL';
```

---

# Running the Project

You can run the frontend:

* Directly in browser
* GitHub Pages
* Netlify
* Vercel
* Local server

---

# Telegram Bot Setup

## Create Telegram Bot

Use:

```text
@BotFather
```

Generate a bot token.

---

## Get Chat ID

Send a message to your bot.

Then open:

```text
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Copy the chat ID.

---

# Authentication Flow

1. User enters username/password
2. Frontend calls GAS endpoint
3. Apps Script validates user
4. Session stored in browser
5. User redirected to dashboard

---

# Role Levels

The system supports access-level based permissions.

Example:

| Level | Access           |
| ----- | ---------------- |
| 1     | Operator         |
| 2     | Supervisor       |
| 3     | Department Head  |
| 4     | Plant Management |
| 5     | Admin            |

---

# Key Frontend Modules

## Checklist Module

Handles:

* Inspection flow
* Checklist rendering
* Validation
* Submission

---

## Monitor Module

Handles:

* Machine dashboard
* Status calculations
* Analytics
* Machine grouping

---

## Breakdown Module

Handles:

* Incident reporting
* Telegram alerts
* History table

---

## CMS Module

Handles:

* CRUD operations
* Data management
* Search/filter

---

# UI Highlights

* Responsive design
* Mobile navigation
* Sidebar navigation
* Dashboard analytics
* Animated progress bars
* Toast notifications
* Dark/light capable Tailwind structure

---

# Security Notes

Current authentication uses:

* Google Apps Script
* Plain credential validation
* Session storage

For production-scale deployment consider:

* Password hashing
* JWT authentication
* HTTPS-only deployment
* Restricted API access
* Audit logging

---

# Future Improvements

Potential upgrades:

* QR-based machine scanning
* IoT machine integration
* Real-time sensor monitoring
* AI-powered analytics
* Predictive maintenance
* Voice-based inspections
* Inventory integration
* ERP integration
* Mobile app version
* Offline sync support

---

# Deployment Recommendations

## Recommended Frontend Hosting

* GitHub Pages
* Netlify
* Vercel

## Recommended Backend

* Google Apps Script

## Recommended Database

* Google Sheets (small-medium scale)
* Firebase/Supabase (large scale)

---

# Performance Optimizations Included

* Lightweight auth endpoint
* Dynamic rendering
* Lazy loading style approach
* Cached session handling
* Optimized dashboard filtering

---

# Troubleshooting

## Login Not Working

Check:

* GAS deployment permissions
* Spreadsheet access
* Users sheet data
* GAS_URL configuration

---

## Dashboard Not Loading

Check:

* Browser console
* Apps Script logs
* Network requests
* Sheet headers

---

## Telegram Alerts Not Sending

Check:

* Bot token
* Chat ID
* Internet connectivity
* Telegram API permissions

---

# License

This project is open for educational and internal industrial usage.

---

# Author

Prashant Singh

BCA Graduate 2026

Focused on:

* Industrial digitization
* AI-powered manufacturing tools
* Smart factory systems
* Automation platforms

---

# Uploaded Files

* Frontend UI: `index(5).html`
* Backend Script: `Code.gs`

Project based on uploaded implementation files. fileciteturn0file0
