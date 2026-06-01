const LinkingConfig = {
  prefixes: [
    "airms://",
    "http://localhost:8081",
    "https://airms.online",
    "https://www.airms.online",
    "https://api.airms.online",
  ],
  config: {
    screens: {
      login: "login",
      otpScreen: "verify-otp",
      forgotPassword: "forgot-password",
      resetPassword: "reset-password",
      securitySetup: "security-setup",
      dashboard: "dashboard",
    },
  },
};

export default LinkingConfig;
