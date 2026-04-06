const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000/ws',
  SECURE_STORE_TOKEN_KEY: 'lovora_access_token',
  SECURE_STORE_REFRESH_KEY: 'lovora_refresh_token',
} as const;

export default ENV;
