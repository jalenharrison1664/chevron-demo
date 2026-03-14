Chevron Industrial Pipe Monitoring Dashboard
Description

This project was created for the Chevron Hack Island challenge. It demonstrates an autonomous industrial pipe monitoring system designed to Detect → Decide → Act → Explain pipe temperature anomalies without human intervention.

The dashboard simulates an industrial control panel that monitors pipe temperatures, predicts potential failures, automatically generates maintenance tickets, and logs system communications.

Features

Multi-Pipe Temperature Monitoring
Real-time monitoring of 6 industrial pipes with independent temperature sensors and historical tracking.

Autonomous AI-Driven Workflow
Implements a Detect → Decide → Act → Explain pipeline for automated maintenance response.

Advanced Risk Prediction
Overheat risk prediction using a weighted algorithm:

40% Temperature

30% Temperature Rate

20% Pump Load

10% Pressure

Failure Prediction System
Estimates time to failure with confidence levels based on system trends.

Automated Maintenance System
Automatically generates maintenance tickets after prolonged critical temperature conditions.

Technician Dispatch System
Automatically assigns technicians and tracks maintenance workflow stages.

Dynamic Ticket Sorting
Maintenance tickets can be sorted by:

Pipe ID

Temperature (descending)

Risk Percentage (descending)

Real-time Alerts
Visual alerts and automated email notifications for critical conditions.

Interactive Dashboard
Active pipes are highlighted with blue selection indicators and live monitoring status.

Data Export
Monitoring data can be exported as TXT, CSV, or HTML reports.

Email Notifications
EmailJS integration for sending automated alerts without a backend server.

Communications Hub
Logs system communications and maintenance workflow events.

Responsive Industrial UI
Modern dark-theme dashboard styled to resemble an industrial control panel.

Technologies Used
HTML5

Provides the structural foundation of the dashboard.

Used for:

Dashboard layout and sections

Panels, forms, and monitoring components

Semantic structure and accessibility

Tailwind CSS

Utility-first CSS framework used for styling and responsive layout.

Used for:

Dashboard grid layouts

Industrial dark theme styling

Spacing, typography, and UI components

Status indicators and responsive behavior

JavaScript (ES6+)

Handles all application logic and system behavior.

Used for:

Temperature simulation

Risk and failure prediction algorithms

Maintenance ticket generation

Workflow state management

Dynamic UI updates

Event handling and system control

Chart.js

Data visualization library used to display monitoring data.

Used for:

Temperature history charts

Threshold visualization

Real-time chart updates

Font Awesome

Icon library used to enhance the dashboard interface.

Used for:

Status indicators

Alert icons

Navigation and UI elements

EmailJS

Third-party service used for sending emails without a backend.

Used for:

Automated critical temperature alerts

Maintenance notifications

Test email functionality from the dashboard

System Architecture

The system follows a Detect → Decide → Act → Explain pipeline.

Sensor Data
     │
     ▼
Monitoring System
     │
     ▼
Risk & Failure Prediction
     │
     ▼
Maintenance Ticket Creation
     │
     ▼
Technician Dispatch
     │
     ▼
Communications Hub + Email Alerts
System Components
Detection Layer

Responsible for monitoring sensor data and identifying anomalies.

Components

Temperature monitoring system

Multi-pipe sensor simulation

Threshold detection logic

Functions

Detect abnormal temperature spikes

Monitor temperature rate changes

Track pressure and pump load

Decision Layer

Evaluates anomalies and determines system risk levels.

Components

Risk prediction algorithm

Failure prediction system

Functions

Calculate overheat risk

Predict estimated time to failure

Generate confidence scores

Action Layer

Responds to critical events by initiating maintenance workflows.

Components

Maintenance ticket system

Technician assignment system

Parts reservation system

Workflow Stages

OPEN → RESOLVED → CLOSED
Communication Layer

Handles communication between subsystems and logs system activity.

Components

Communications Hub

Email alert system

Functions

Log system events

Send automated alerts

Track maintenance workflow progress

Explanation Layer

Provides context for system actions and decisions.

Components

AI system explanation generator

Maintenance workflow logs

Functions

Explain why alerts were triggered

Document maintenance actions

Provide traceable decision history

How to Run

Clone the repository:

git clone https://github.com/jalenharrison1664/chevron-demo.git

Navigate to the project folder:

cd chevron-demo

Open the dashboard in your browser:

open index.html

Or run a local server:

python -m http.server 8000

Then visit:

http://localhost:8000
Future Improvements

Integration with real industrial sensor hardware

Machine learning model for enhanced failure prediction

Mobile application for remote monitoring

Integration with industrial SCADA systems

Multi-user authentication and role-based access

Advanced analytics and predictive maintenance scheduling

IoT device management and calibration tools

Current Architecture

This system currently runs as a pure frontend monitoring simulation.

All processing occurs directly in the browser using JavaScript without requiring a backend server.

Future versions could integrate:

IoT sensors

Cloud databases

Real industrial monitoring systems

If you'd like, I can also help you add two README sections that make hackathon judges and recruiters much more impressed:

Architecture Diagram (visual version)

Detect → Decide → Act → Explain explanation section that reads like an AI pipeline.
