import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { ChatGPTAPIBrowser, ChatResponse, SendMessageOptions } from "chatgpt";
import { loadConfig, getAccessToken } from "./lib";
import express from "express";
import AsyncRetry from "async-retry";
import { Queue } from "async-await-queue";
import { randomUUID } from "crypto";
import Keyv from "keyv";
const prisma = new PrismaClient();
// ChatGPT (not plus) is limited to 1 request one time.
const mesasgeQueue = new Queue(1, 100);
const config = loadConfig();
const app = express();
const kv = new Keyv();
let chatGPTAPIBrowser: ChatGPTAPIBrowser;
app.use(express.json());
app.get(`/`, async (req, res) => {
  return res.json({
    message: "Hello/👋",
    name: "ChatGPT",
  });
});

const getOrCreateConversationInfo = async (
  sessionId: string
): Promise<SendMessageOptions> => {
  const conversationInfo = await prisma.conversations.findFirst({
    where: {
      sessionId,
    },
  });
  if (conversationInfo) {
    return {
      conversationId: conversationInfo.conversationId,
      parentMessageId: conversationInfo.messageId,
    };
  } else {
    return {};
  }
};
const sendMesasge = async (
  message: string,
  sessionId?: string,
  // if message id is provided, it will be used to store the partial response
  mesasgeId?: string
) => {
  let conversationInfo;
  if (sessionId) {
    conversationInfo = await getOrCreateConversationInfo(sessionId);
  }
  const jobId = randomUUID();
  await mesasgeQueue.wait(jobId);
  const startTime = new Date().getTime();
  let response;
  let endFlag = false;
  conversationInfo = {
    ...conversationInfo,
    mesasgeId,
  };
  if (mesasgeId) {
    console.log(`message set ${mesasgeId}`);
    await kv.set(
      mesasgeId,
      {
        response: "",
        status: "process",
      },
      30 * 60 * 1000
    );
  }
  try {
    response = await chatGPTAPIBrowser.sendMessage(message, {
      ...conversationInfo,
      messageId: mesasgeId,
      onProgress: mesasgeId
        ? async (partialResponse: ChatResponse) => {
            await kv.set(
              mesasgeId,
              {
                ...partialResponse,
                status: endFlag ? "done" : "process",
              },
              30 * 60 * 1000
            );
          }
        : undefined,
    });
    endFlag = true;
    console.log(response);
    console.log(`Response: ${response}`);
  } catch (e) {
    if (mesasgeId) {
      await kv.set(
        mesasgeId,
        {
          response: "",
          status: "error",
        },
        30 * 60 * 1000
      );
    }
    console.error(e);
    throw e;
  } finally {
    mesasgeQueue.end(jobId);
  }
  const endTime = new Date().getTime();
  if (sessionId) {
    await prisma.conversations.upsert({
      where: {
        sessionId_conversationId: {
          sessionId,
          conversationId: response.conversationId,
        },
      },
      create: {
        sessionId,
        conversationId: response.conversationId,
        messageId: response.messageId,
      },
      update: {
        messageId: response.messageId,
      },
    });
  }
  await prisma.result.create({
    data: {
      request: message,
      response: response.response,
      conversationsId: response.conversationId,
      messageId: response.messageId,
      responseTime: endTime - startTime,
    },
  });
  return response;
};
app.post(`/message`, async (req, res) => {
  try {
    const { message } = req.body;
    const { stream } = req.headers;
    console.log(`Received message: ${message}`);
    if (stream == "enable") {
      const messageId = randomUUID();
      sendMesasge(message, undefined, messageId).catch((e) => {
        console.error(e);
        console.log(`Error while sending message ${messageId}`);
      });
      return res.json({
        messageId,
      });
    }
    const reply = await sendMesasge(message);
    return res.json({
      response: reply.response,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    console.log(`Received message: ${message} for session: ${sessionId}`);
    const { stream } = req.headers;
    if (stream == "enable") {
      const messageId = randomUUID();
      sendMesasge(message, sessionId, messageId).catch((e) => {
        console.error(e);
        console.log(
          `Error while sending message ${messageId}, sessionId: ${sessionId}`
        );
      });
      return res.json({
        messageId,
      });
    }
    const response = await sendMesasge(message, sessionId);
    return res.json({
      response: response.response,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
app.get("/message/:messageId", async (req, res) => {
  const { messageId } = req.params;
  console.log(`${messageId}`);
  const response = await kv.get(messageId);
  if (response) {
    return res.json(response);
  } else {
    return res.status(404).json({
      message: "Not found",
    });
  }
});
app.delete(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await prisma.conversations.deleteMany({
      where: {
        sessionId,
      },
    });
    return res.json({
      message: "Deleted",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
async function main() {
  // @ts-ignore
  console.log(
    `Starting chatgpt with config: ${JSON.stringify(config, null, 2)}`
  );
  const { ChatGPTAPIBrowser, ChatGPTAPI } = await import("chatgpt");
  // if sessionsToken is not provided, it will use the default token.
  if (config.sessionToken) {
    // @ts-ignore
    chatGPTAPIBrowser = new ChatGPTAPI({
      sessionToken: config.sessionToken,
      clearanceToken: "proxy-dont-use-this-token",
      backendApiBaseUrl: config.reverseProxyUrl + "/api",
      apiBaseUrl: "https://explorer.api.openai.com/api",
    });
  } else {
    chatGPTAPIBrowser = new ChatGPTAPIBrowser(config);
    await AsyncRetry(
      async () => {
        await chatGPTAPIBrowser.initSession();
      },
      {
        retries: 5,
        onRetry: (error) => {
          console.error(`Starting chatgpt failed, retrying...`);
          console.error(error);
        },
      }
    );
  }
  const PORT = Number(process.env.PORT) || 4000;
  const HOST = process.env.HOST || "localhost";
  console.log(`🎉 Started chatgpt success!`);
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server ready at: http://${HOST}:${PORT}/`);
  });
}
main();
