import "dotenv/config";
export interface ChatGPTAPIBrowserConfig {
  email: string;
  password: string;
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
