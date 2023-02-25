import axios from "axios";
import { AxiosInstance } from "axios";
import { CookieJar } from "tough-cookie";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import qs from "qs";
import Keyv from "keyv";
import { config } from "./lib";
// Default cache url is memory
const keyv = new Keyv({
  uri: config.cacheUrl,
  namespace: "openai-auth",
});
export class OpenAIAuth {
  sessionToken: string;
  private email: string;
  private password: string;
  // TODO: add proxy support for auth
  private proxy?: string;
  session: AxiosInstance;
  jar: CookieJar;
  user_agent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";
  constructor() {
    this.email = config.email;
    this.password = config.password;
    this.proxy = config.proxy;
    const jar = new CookieJar();
    this.jar = jar;
    const session = axios.create({
      httpAgent: new HttpCookieAgent({
        cookies: { jar },
      }),
      httpsAgent: new HttpsCookieAgent({
        cookies: { jar },
        rejectUnauthorized: false,
      }),
      validateStatus: () => true,
    });
    const client = session;

    this.session = client;
    this.sessionToken = "";
  }
  async start() {
    if (await keyv.get("sessionToken")) {
      this.sessionToken = await keyv.get("sessionToken");
      return;
    }
    const url = "https://explorer.api.openai.com/";
    const headers = {
      // Host: "ask.openai.com",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": this.user_agent,
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    };
    const response = await this.session.get(url, { headers });
    if (response.status === 200) {
      await this.part_two();
    } else {
      console.log(response.request.socket);
      console.log(
        `Error in part one e=${response.status} ip=${response.request.socket.remoteAddress}`
      );
      throw new Error("Wrong status code");
    }
  }
  async part_two() {
    const url = "https://explorer.api.openai.com/api/auth/csrf";
    const headers = {
      // Host: "ask.openai.com",
      Accept: "*/*",
      Connection: "keep-alive",
      "User-Agent": this.user_agent,
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      Referer: "https://explorer.api.openai.com/auth/login",
      "Accept-Encoding": "gzip, deflate, br",
    };
    const response = await this.session.get(url, { headers });
    if (
      response.status === 200 &&
      response.headers["content-type"].includes("application/json")
    ) {
      const csrf_token = response.data.csrfToken;
      await this.part_three(csrf_token);
    } else {
      console.log("Error in part two");
      console.log("Status code: ", response.status);
      throw new Error("Wrong status code");
    }
  }

  async part_three(token: string) {
    const url =
      "https://explorer.api.openai.com/api/auth/signin/auth0?prompt=login";
    const payload = `callbackUrl=%2F&csrfToken=${token}&json=true`;
    const headers = {
      // Host: "explorer.api.openai.com",
      "User-Agent": this.user_agent,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "*/*",
      "Sec-Gpc": "1",
      "Accept-Language": "en-US,en;q=0.8",
      Origin: "https://explorer.api.openai.com",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://explorer.api.openai.com/auth/login",
      "Accept-Encoding": "gzip, deflate",
    };
    const response = await this.session.post(url, payload, { headers });
    if (
      response.status === 200 &&
      response.headers["content-type"].includes("application/json")
    ) {
      const url = response.data.url;
      if (
        url ===
          "https://explorer.api.openai.com/api/auth/error?error=OAuthSignin" ||
        url.includes("error")
      ) {
        throw new Error("You have been rate limited.");
      }
      await this.part_four(url);
    } else {
      console.log("Error in part three");
      console.log("Status code: ", response.status);
      throw new Error("Wrong status code");
    }
  }
  async part_four(url: string) {
    const headers = {
      // Host: "auth0.openai.com",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Connection: "keep-alive",
      "User-Agent": this.user_agent,
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://explorer.api.openai.com/",
    };
    const response = await this.session.get(url, { headers, maxRedirects: 0 });
    if (response.status === 302) {
      const state = response.data.match(/state=(.*)/)[1].split('"')[0];
      await this.part_five(state);
    } else {
      console.log("Error in part four");
      console.log("Status code: ", response.status);
      throw new Error("Wrong status code");
    }
  }

  async part_five(state: string) {
    const url = `https://auth0.openai.com/u/login/identifier?state=${state}`;

    const headers = {
      // Host: "auth0.openai.com",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Connection: "keep-alive",
      "User-Agent": this.user_agent,
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://explorer.api.openai.com/",
    };
    const response = await this.session.get(url, { headers });
    if (response.status == 200) {
      await this.part_six(state);
    } else {
      console.log("Error in part five");
      console.log("Status code: ", response.status, response.data);
      throw new Error("Wrong status code");
    }
  }

  async part_six(state: string) {
    //     """
    // We make a POST request to the login page with the captcha, email
    // :param state:
    // :return:
    // """

    const url = `https://auth0.openai.com/u/login/identifier?state=${state}`;

    const payload = {
      state: state,
      username: this.email,
      "js-available": "false",
      "webauthn-available": "true",
      "is-brave": "false",
      "webauthn-platform-available": "true",
      action: "default",
    };
    const headers = {
      Authority: "auth0.openai.com",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://auth0.openai.com",
      Referer: `https://auth0.openai.com/u/login/identifier?state=${state}`,
      "Sec-Ch-Ua": this.user_agent,
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": this.user_agent,
    };
    const data = qs.stringify(payload);
    const response = await this.session({
      method: "POST",
      url: "https://auth0.openai.com/u/login/identifier",
      params: {
        state: state,
      },
      headers: {
        Authority: "auth0.openai.com",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `https://auth0.openai.com/u/login/identifier?state=${state}`,
        "Sec-Ch-Ua":
          '"Chromium";v="110", "Not A(Brand";v="24", "Microsoft Edge";v="110"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.41",
        "Accept-Encoding": "gzip",
      },
      data,
      maxRedirects: 0,
    });
    if (response.status == 302) {
      await this.part_seven(state);
    } else {
      console.log("Error in part six");
      console.log(`Status code: ${response.status} text : ${response.data}`);
      throw new Error("Wrong status code");
    }
  }

  async part_seven(state: string) {
    const url = `https://auth0.openai.com/u/login/password?state=${state}`;
    const payload = {
      state: state,
      username: this.email,
      password: this.password,
      action: "default",
    };
    const headers = {
      // Host: "auth0.openai.com",
      Origin: "https://auth0.openai.com",
      Connection: "keep-alive",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": this.user_agent,
      Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const data = qs.stringify(payload);
    const response = await this.session({
      method: "POST",
      url: "https://auth0.openai.com/u/login/password",
      params: {
        state,
      },
      headers: {
        Authority: "auth0.openai.com",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://auth0.openai.com",
        Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
        "Sec-Ch-Ua":
          '"Chromium";v="110", "Not A(Brand";v="24", "Microsoft Edge";v="110"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.41",
      },
      data: data,
      maxRedirects: 0,
    });
    if (response.status >= 400) {
      console.log(
        `Error in part seven: ${response.status} ${response.statusText}`
      );
      throw new Error("Error in part seven");
    } else if (response.status == 302) {
      const new_state = response.data.match(/state=(.*)/)[1].split('"')[0];
      await this.part_eight(state, new_state);
    }
  }

  async part_eight(old_state: string, new_state: string) {
    const url = `https://auth0.openai.com/authorize/resume?state=${new_state}`;
    const headers = {
      // Host: "auth0.openai.com",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Connection: "keep-alive",
      "User-Agent": this.user_agent,
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      Referer: `https://auth0.openai.com/u/login/password?state=${old_state}`,
    };
    const response = await this.session.get(url, { headers });
    if (response.status >= 400) {
      console.log(response);
      console.log(
        `Error in part eight: ${response.status} ${response.statusText}`
      );
      throw new Error("Error in part eight");
    }
    console.log("Login Done");
    console.log("Start get Session Token");
    this.jar.toJSON().cookies.forEach((cookie) => {
      if (cookie.key === "__Secure-next-auth.session-token") {
        this.sessionToken = cookie.value;
      }
    });
    if (this.sessionToken === "") {
      throw new Error("Login failed Session token not found");
    }
    console.log("Session token found");
    await keyv.set(this.sessionToken, "", 1000 * 60 * 60 * 24 * 30);
  }
  async getAccessToken() {
    if (this.sessionToken === "") {
      console.log("Session token not found");
      console.log("Start login");
      await this.start();
    }
    const sessionToken = this.sessionToken;
    if (await keyv.get(sessionToken)) {
      return await keyv.get(sessionToken);
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
      await keyv.set(sessionToken, accessToken, 1000 * 60 * 60);
      return accessToken;
    } catch {
      return null;
    }
  }
}
export const openaiAuth = new OpenAIAuth();
