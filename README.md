# Chevron Industrial Pipe Monitoring Dashboard

## Description
This project was created for the Chevron Hack Island challenge. It is designed to solve the problem of autonomous industrial pipe temperature monitoring and maintenance workflow automation through an AI-driven system that Detects → Decides → Acts → Explains pipe temperature anomalies without human intervention.

## Features
- **Multi-Pipe Temperature Monitoring**: Real-time monitoring of 6 industrial pipes with independent temperature sensors and historical data tracking
- **Autonomous AI-Driven Workflow**: Complete Detect → Decide → Act → Explain cycle for automatic maintenance ticket generation
- **Advanced Risk Prediction**: Overheat risk prediction using weighted algorithm (40% temperature, 30% rate, 20% pump load, 10% pressure)
- **Failure Prediction System**: Predicts time to failure with confidence levels based on current trends
- **Automated Maintenance System**: Auto-generates maintenance tickets after 90 seconds of critical temperature
- **Technician Dispatch**: Automatic technician assignment and workflow management
- **Dynamic Ticket Sorting**: Sort maintenance tickets by Pipe ID, Temperature (descending), or Risk % (descending)
- **Real-time Alerts**: Critical temperature alerts with visual indicators and email notifications
- **Interactive Dashboard**: Blue selection highlighting for active pipes, Live/Paused status indicators
- **Data Export**: Export monitoring data in TXT, CSV, or HTML formats with auto-export options
- **Email Notifications**: Configurable EmailJS integration for critical and warning alerts
- **Communications Hub**: System communication log for tracking all maintenance activities
- **Responsive Design**: Modern dark theme industrial control panel interface

## Technologies Used
- HTML5
- Tailwind CSS
- JavaScript (ES6+)
- Chart.js (for temperature history visualization)
- Font Awesome (for icons)
- EmailJS (for email notifications)

## How to Run

Clone the repository:

```
git clone https://github.com/jalenharrison1664/chevron-demo.git
```

Open the project folder and run the HTML file in a web browser:

```
cd chevron-demo
open index.html
```

Or use a local server for better development experience:

```
python -m http.server 8000
```

Then navigate to `http://localhost:8000`

## Future Improvements
- Real-time sensor integration with actual industrial hardware
- Machine learning model for enhanced failure prediction
- Mobile application for remote monitoring
- Integration with industrial SCADA systems
- Multi-user role-based access control
- Advanced analytics dashboard with predictive maintenance scheduling
- IoT device management and calibration tools