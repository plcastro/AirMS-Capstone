const LinkingConfig = {
  prefixes: [
    "airms://",
    "http://localhost:8081",
    "https://airms.online",
    "https://www.airms.online",
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
          "Flight Logbook": "flight-log",
          "Pre-Inspection": "pre-inspection",
          "Post-Inspection": "post-inspection",
          Tasks: "tasks",
          Mechanics: "mechanics",
          "Parts Requisition": "parts-requisition",
          "User Management": "user-management",
          "Activity Logs": "activity-logs",
          Messages: "messages",
          Profile: "profile",
        },
      },
    },
  },
};

export default LinkingConfig;
