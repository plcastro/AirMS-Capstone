const LinkingConfig = {
  prefixes: ["airms://", "http://localhost:8081"],
  config: {
    screens: {
      login: "login",
      forgotPassword: "forgot-password",
      resetPassword: "reset-password/:token",
      securitySetup: "security-setup",
      dashboard: "dashboard",
    },
  },
};

export default LinkingConfig;
