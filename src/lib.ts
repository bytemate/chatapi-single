import "dotenv/config";
export interface ChatGPTAPIBrowserConfig {
  email: string;
  password: string;
  reverseProxyUrl?: string;
  model?: string;
  proxy?: string;
  cacheUrl?: string;
}
export const loadConfig = (): ChatGPTAPIBrowserConfig => {
  const email = process.env.EMAIL;
  if (!email) {
    throw new Error(
      "Please provide email in .env file or environment variable"
    );
  }
  const password = process.env.PASSWORD;
  if (!password) {
    throw new Error(
      "Please provide password in .env file or environment variable"
    );
  }
  return {
    email,
    password,
    reverseProxyUrl: process.env.REVERSE_PROXY_URL || "https://proxy.y1s1.host/backend-api/conversation",
    proxy: process.env.PROXY,
    model: process.env.MODEL,
    cacheUrl: process.env.CACHE_URL,
  };
};
export const config = loadConfig();
