/**
 * Mock API Layer for Pipe Monitoring Dashboard
 * 
 * Architecture: Sensor Layer → Monitoring Dashboard → Maintenance API
 * 
 * This mock API simulates external infrastructure APIs while remaining
 * fully deployable on GitHub Pages (no backend required).
 */

// Mock API for sensor data
function fetchSensorData() {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = {
        temperature: Math.random() * 100 + 20,
        pressure: Math.random() * 100 + 30,
        pumpLoad: Math.random() * 80 + 20,
        flowRate: Math.random() * 40 + 40,
        timestamp: new Date().toISOString(),
        status: 'active'
      };
      resolve({
        success: true,
        data: mockData
      });
    }, 100); // Simulate network latency
  });
}

// Mock API for maintenance ticket creation
function createMaintenanceTicket(ticketData) {
  // Simulate API call to external maintenance system
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('API: Creating maintenance ticket:', ticketData);
      
      // Simulate ticket creation response
      const response = {
        success: true,
        status: "created",
        ticketId: ticketData.ticketId || 'TCK-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        timestamp: new Date().toISOString(),
        message: "Maintenance ticket successfully created in external system"
      };
      
      // Log to console for debugging (simulates external system logs)
      console.log('External Maintenance API Response:', response);
      
      resolve(response);
    }, 200); // Simulate network latency
  });
}

// Mock API for system health check
function checkSystemHealth() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        status: 'healthy',
        services: {
          sensors: 'online',
          monitoring: 'online',
          maintenance: 'online'
        },
        timestamp: new Date().toISOString()
      });
    }, 50);
  });
}

// Export mock API functions for use in main application
window.MockAPI = {
  fetchSensorData,
  createMaintenanceTicket,
  checkSystemHealth
};
