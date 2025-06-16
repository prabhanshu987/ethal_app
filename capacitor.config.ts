import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethal.app',
  appName: 'ethal',
  webDir: 'dist/ethal'  // ✅ Corrected path
};

export default config