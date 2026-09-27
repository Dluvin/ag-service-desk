import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.agdeskpro.app",
  appName: "AG Desk Pro",
  webDir: "www",
  server: {
    url: "https://agdeskpro.com/login",
    androidScheme: "https",
    allowNavigation: ["agdeskpro.com", "*.agdeskpro.com"],
  },
};

export default config;
