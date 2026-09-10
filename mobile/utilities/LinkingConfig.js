const LinkingConfig = {
  prefixes: [
    "airms://",
    "http://localhost:8081",
    "https://airms.online",
    "https://www.airms.online",
    "http://10.0.2.2:8000",
    "https://airms-server.vercel.app",
  ],
  config: {
    screens: {
      login: "login",
      otpScreen: "verify-otp",
      forgotPassword: "forgot-password",
      resetPassword: "reset-password",
      securitySetup: "security-setup",
      dashboard: {
        path: "dashboard",
        screens: {
          "Reports and Analytics": "reports-and-analytics",
          Messages: "messages",
          "Manage Users": "user-management",
          "Activity Logs": "activity-logs",
          "Flight Logs": "flight-log",
          "Maintenance Logs": "maintenance-log",
          "Pre-Flight Inspection": "pre-flight-inspection",
          "Post-Flight Inspection": "post-flight-inspection",
          Tasks: "tasks",
          Mechanics: "mechanics",
          "Parts Lifespan Monitoring": "parts-lifespan-monitoring",
          "Maintenance Tracking": "maintenance-tracking",
          "Maintenance Priority Sorting": "maintenance-priority",
          "Parts Requisition": "parts-requisition",
          Profile: "profile",
        },
      },
    },
  },
};

export default LinkingConfig;
