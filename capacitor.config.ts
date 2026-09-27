import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.agdeskpro.app",
  appName: "AG Desk Pro",
  webDir: "www",
  server: {
    url: "https://agdeskpro.com",
    androidScheme: "https",
    allowNavigation: ["agdeskpro.com", "*.agdeskpro.com"],
  },
};

export default config;
