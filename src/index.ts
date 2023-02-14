import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { ChatGPTAPIBrowser, SendMessageOptions } from "chatgpt";
import { loadConfig, getAccessToken } from "./lib";
import express from "express";
import AsyncRetry from "async-retry";
import { Queue } from "async-await-queue";
import { randomUUID } from "crypto";
const prisma = new PrismaClient();
// ChatGPT (not plus) is limited to 1 request one time.
const mesasgeQueue = new Queue(1, 100);
const config = loadConfig();
const app = express();
let chatGPTAPIBrowser: ChatGPTAPIBrowser;
app.use(express.json());
app.get(`/`, async (req, res) => {
  return res.json({
    message: "Hello/👋",
    name: "ChatGPT",
  });
});

app.post(`/message`, async (req, res) => {
  try {
    const { message } = req.body;
    console.log(`Received message: ${message}`);
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
const sendMesasge = async (message: string, sessionId?: string) => {
  let conversationInfo;
  if (sessionId) {
    conversationInfo = await getOrCreateConversationInfo(sessionId);
  }
  const jobId = randomUUID();
  await mesasgeQueue.wait(jobId);
  const startTime = new Date().getTime();
  let response;
  try {
    response = await chatGPTAPIBrowser.sendMessage(message, conversationInfo);
    console.log(response);
    console.log(`Response: ${response}`);
  } catch (e) {
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
app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    console.log(`Received message: ${message} for session: ${sessionId}`);
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
  const PORT = process.env.PORT || 4000;
  console.log(`🎉 Started chatgpt success!`);
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://localhost:${PORT}`);
  });
}
main();
