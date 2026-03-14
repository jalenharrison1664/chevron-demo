Technology Stack Breakdown
1. Frontend Stack

HTML5 + Tailwind CSS + Vanilla JavaScript

HTML5 — Structure Layer

Purpose:
Defines the page structure and content.

Role in this project:

Creates the dashboard layout

Defines panels, forms, and UI elements

Simplified:
The skeleton or blueprint of the interface.

Tailwind CSS — Styling Layer

Purpose:
Provides utility classes for styling without writing custom CSS.

Role in this project:

Creates the professional dashboard appearance

Controls colors, spacing, and layout

Enables responsive design

Simplified:
The visual design system that makes the dashboard look polished.

Vanilla JavaScript — Logic Layer

Purpose:
Handles all interactivity and application logic.

Role in this project:

Temperature simulation

Alert system

Maintenance workflow

Communications hub logic

Simplified:
The brain of the system that processes data and controls behavior.

2. Data Visualization Stack

Chart.js + Canvas API

Chart.js — Charting Library

Purpose:
Creates interactive charts and graphs.

Role in this project:

Displays the temperature history chart

Draws threshold warning lines

Simplified:
The tool that generates the temperature graph.

Canvas API — Rendering Engine

Purpose:
Provides low-level graphics rendering in the browser.

Role in this project:

Renders the Chart.js visualizations

Simplified:
The drawing surface used for charts.

3. Communication Stack

EmailJS + REST API

EmailJS — Email Service

Purpose:
Sends emails without needing a backend server.

Role in this project:

Sends email alerts when temperature remains critical for extended periods

Simplified:
The service responsible for sending alert emails.

REST API — Data Layer

Purpose:
Handles communication between systems.

Role in this project:

Simulates API behavior using a mock API

Supports data export features

Simplified:
The data messenger between system components.

4. Architecture Pattern
Single Page Application (SPA)
SPA Architecture

Purpose:
Runs the entire application within one HTML page.

Role in this project:

Allows the dashboard to update dynamically

Eliminates page reloads

Simplified:
A single-page application that updates in real time.

5. State Management

JavaScript Variables + Local Storage

JavaScript Variables — Runtime State

Purpose:
Stores the current state of the application in memory.

Role in this project:

Temperature readings

Maintenance tickets

Workflow states

Simplified:
Temporary memory used during the current session.

Local Storage — Persistent State

Purpose:
Stores data that remains after the browser closes.

Role in this project:

EmailJS configuration

User preferences

Simplified:
Long-term memory stored in the browser.

6. Component Architecture

Monolithic Dashboard + Modular Functions

Dashboard Components

Temperature Monitor

Simulates real-time sensor readings.

Risk Prediction

Performs AI-style analysis and predicts potential failures.

Maintenance System

Handles ticket creation and workflow management.

Communications Hub

Logs system events and cross-system interactions.

Export System

Enables exporting monitoring data.

7. Design System

Figma Design Tokens + CSS Variables

Figma Design Tokens

Purpose:
Standardized design values defined in Figma.

Role in this project:

Colors

Spacing

Typography

Simplified:
The design rulebook ensuring consistent UI appearance.

CSS Variables

Purpose:
Dynamic CSS values that can be reused and updated.

Role in this project:

Theme colors

Responsive values

Simplified:
Adjustable design settings used throughout the interface.

8. Stack Summary by Function
Monitoring Stack

Sensors: JavaScript simulation
Display: HTML + Tailwind CSS
Charts: Chart.js
Alerts: JavaScript + EmailJS

Maintenance Stack

Tickets: JavaScript state management
Workflow: JavaScript logic
Communications: JavaScript logging
Interface: HTML + Tailwind CSS

Integration Stack

Cross-system communication: JavaScript event system
Data flow: JavaScript variables
User interface: HTML + Tailwind CSS
Persistence: Local Storage

Backend Status: None Required

This project uses a pure frontend architecture, meaning all functionality runs entirely in the browser.

No backend server is required.

How the System Works Without a Backend
Data Simulation

Temperature data generated using JavaScript math functions
Sensor readings simulated using random walk algorithms
System states stored in JavaScript variables

Email Service

EmailJS handles sending emails
Emails are sent directly from the browser
Configuration is stored in Local Storage

Data Persistence

Local Storage stores persistent data
JavaScript variables manage session state
No database is required

API Simulation

Mock API implemented using JavaScript functions
Export features generate files directly in the browser
No server endpoints are required

Why No Backend?
Advantages

Easy deployment — simply upload files to a web server
No server costs — runs entirely in the browser
Fast performance — no network latency for most operations
Simple architecture — fewer components to maintain

When a Backend Would Be Needed

A backend would be required if the system needed:

Real sensor data from physical hardware

Multiple users sharing the system

Database storage for long-term records

User authentication and login systems

Current Architecture

This system is a fully client-side industrial monitoring dashboard that combines:

real-time simulation

predictive maintenance logic

automated alerts

maintenance workflow management

All running directly in the browser.
