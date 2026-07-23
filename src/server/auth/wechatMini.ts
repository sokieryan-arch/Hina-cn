import { createHash } from "node:crypto";
import { getRuntimeEnvironment } from "../runtimeEnv.js";

interface WeChatMiniOptions {
  appId?: string;
  appSecret?: string;
  fetchImpl?: typeof fetch;
}

export interface WeChatMiniIdentity {
  openid: string;
  unionid?: string | null;
  sessionKey?: string | null;
}

export function createWeChatMiniAuth(options: WeChatMiniOptions = {}) {
  const appId = options.appId ?? process.env.WECHAT_MINI_APP_ID ?? "";
  const appSecret = options.appSecret ?? process.env.WECHAT_MINI_APP_SECRET ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    isConfigured() {
      return Boolean(appId && appSecret);
    },

    async exchangeCode(code: string): Promise<WeChatMiniIdentity> {
      const trimmedCode = code.trim();
      if (!trimmedCode) throw new Error("missing_wechat_code");

      if (!appId || !appSecret) {
        const allowMock = getRuntimeEnvironment().isDevelopment
          && process.env.WECHAT_MINI_DEV_LOGIN === "true";
        if (!allowMock) throw new Error("missing_wechat_mini_credentials");
        return {
          openid: `dev_${createHash("sha256").update(trimmedCode).digest("hex").slice(0, 24)}`,
          unionid: null,
          sessionKey: null,
        };
      }

      const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
      url.searchParams.set("appid", appId);
      url.searchParams.set("secret", appSecret);
      url.searchParams.set("js_code", trimmedCode);
      url.searchParams.set("grant_type", "authorization_code");

      const response = await fetchImpl(url);
      const payload = await response.json() as Record<string, unknown>;
      if (
        !response.ok
        || typeof payload.openid !== "string"
        || typeof payload.errcode === "number" && payload.errcode !== 0
      ) {
        throw new Error("wechat_mini_code_exchange_failed");
      }

      return {
        openid: payload.openid,
        unionid: typeof payload.unionid === "string" ? payload.unionid : null,
        sessionKey: typeof payload.session_key === "string" ? payload.session_key : null,
      };
    },
  };
}

export type WeChatMiniAuth = ReturnType<typeof createWeChatMiniAuth>;
