interface WeChatContentSafetyOptions {
  appId?: string;
  appSecret?: string;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createWeChatContentSafety(options: WeChatContentSafetyOptions = {}) {
  const appId = options.appId ?? process.env.WECHAT_MINI_APP_ID ?? "";
  const appSecret = options.appSecret ?? process.env.WECHAT_MINI_APP_SECRET ?? "";
  const enabled = options.enabled
    ?? process.env.WECHAT_CONTENT_SECURITY_ENABLED === "true";
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());
  let cachedToken: { value: string; expiresAt: number } | null = null;

  async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > now() + 60_000) return cachedToken.value;
    if (!appId || !appSecret) throw new Error("missing_wechat_mini_credentials");

    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    const response = await fetchImpl(url);
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof payload.access_token !== "string") {
      throw new Error("wechat_access_token_failed");
    }
    cachedToken = {
      value: payload.access_token,
      expiresAt: now() + Math.max(300, Number(payload.expires_in ?? 7200)) * 1000,
    };
    return cachedToken.value;
  }

  return {
    isEnabled() {
      return enabled;
    },

    async checkText(input: { openid: string; content: string }) {
      if (!enabled) return { allowed: true as const };
      const token = await getAccessToken();
      const response = await fetchImpl(
        `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: input.content.slice(0, 2500),
            version: 2,
            scene: 2,
            openid: input.openid,
          }),
        },
      );
      const payload = await response.json() as Record<string, any>;
      if (!response.ok || payload.errcode !== 0) throw new Error("wechat_content_check_failed");
      const suggest = payload.result?.suggest;
      return {
        allowed: suggest === "pass",
        suggest: typeof suggest === "string" ? suggest : "unknown",
        label: Number(payload.result?.label ?? 0),
      };
    },
  };
}

export type WeChatContentSafety = ReturnType<typeof createWeChatContentSafety>;
