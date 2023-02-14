import axios from "axios";
import "dotenv/config";
import Keyv from "keyv";
export interface ChatGPTAPIBrowserConfig {
  email: string;
  password: string;
  sessionToken?: string;
  reverseProxyUrl?: string;
  isProAccount?: boolean;
  markdown?: boolean;
  debug?: boolean;
  isGoogleLogin?: boolean;
  isMicrosoftLogin?: boolean;
  minimize?: boolean;
  captchaToken?: string;
  nopechaKey?: string;
  executablePath?: string;
  proxyServer?: string;
  userDataDir?: string;
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
    sessionToken: process.env.SESSION_TOKEN,
    // FIXME: find new reverse proxy
    reverseProxyUrl: process.env.REVERSE_PROXY_URL || "https://chat.y1s1.host",
    isProAccount: process.env.IS_PRO_ACCOUNT === "true",
    markdown: process.env.MARKDOWN === "true",
    debug: process.env.DEBUG === "true",
    isGoogleLogin: process.env.IS_GOOGLE_LOGIN === "true",
    isMicrosoftLogin: process.env.IS_MICROSOFT_LOGIN === "true",
    minimize: process.env.MINIMIZE === "true",
    // no "" or undefined
    captchaToken: process.env.CAPTCHA_TOKEN
      ? process.env.CAPTCHA_TOKEN
      : undefined,
    nopechaKey: process.env.NOPECHA_KEY ? process.env.NOPECHA_KEY : undefined,
    executablePath: process.env.EXECUTABLE_PATH
      ? process.env.EXECUTABLE_PATH
      : undefined,
    proxyServer: process.env.PROXY_SERVER
      ? process.env.PROXY_SERVER
      : undefined,
    userDataDir: process.env.USER_DATA_DIR
      ? process.env.USER_DATA_DIR
      : undefined,
  };
};
const kv = new Keyv();

export const getAccessToken = async (sessionToken: string) => {
  if (await kv.has(sessionToken)) {
    return await kv.get(sessionToken);
  }
  const response = await axios({
    method: "GET",
    url: "https://explorer.api.openai.com/api/auth/session",
    headers: {
      Cookie: `__Secure-next-auth.session-token=${sessionToken};`,
    },
  });
  try {
    const accessToken = response.data.accessToken;
    console.log("Got new access token");
    console.log(accessToken);
    await kv.set(sessionToken, accessToken, 60 * 60 * 1000);
    return accessToken;
  } catch {
    return null;
  }
};
