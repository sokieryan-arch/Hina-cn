interface WeChatOAuthOptions {
  appId?: string;
  appSecret?: string;
  appUrl?: string;
  stateStore: Map<string, number>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface WeChatIdentity {
  openid: string;
  unionid?: string | null;
  accessToken: string;
  refreshToken?: string | null;
}

export function createWeChatOAuth(options: WeChatOAuthOptions) {
  const appId = options.appId ?? process.env.WECHAT_APP_ID ?? "";
  const appSecret = options.appSecret ?? process.env.WECHAT_APP_SECRET ?? "";
  const appUrl = (options.appUrl ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());

  return {
    createLoginUrl(state: string) {
      if (!appId) throw new Error("missing_wechat_app_id");
      options.stateStore.set(state, now() + 10 * 60 * 1000);
      const url = new URL("https://open.weixin.qq.com/connect/qrconnect");
      url.searchParams.set("appid", appId);
      url.searchParams.set("redirect_uri", `${appUrl}/api/auth/wechat/callback`);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "snsapi_login");
      url.searchParams.set("state", state);
      url.hash = "wechat_redirect";
      return url.toString();
    },

    async exchangeCode(input: { code: string; state: string }): Promise<WeChatIdentity> {
      const expiresAt = options.stateStore.get(input.state);
      options.stateStore.delete(input.state);
      if (!expiresAt || expiresAt < now()) throw new Error("invalid_wechat_state");
      if (!appId || !appSecret) throw new Error("missing_wechat_credentials");

      const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
      url.searchParams.set("appid", appId);
      url.searchParams.set("secret", appSecret);
      url.searchParams.set("code", input.code);
      url.searchParams.set("grant_type", "authorization_code");

      const response = await fetchImpl(url);
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok || typeof payload.openid !== "string" || typeof payload.access_token !== "string") {
        throw new Error("wechat_code_exchange_failed");
      }

      return {
        openid: payload.openid,
        unionid: typeof payload.unionid === "string" ? payload.unionid : null,
        accessToken: payload.access_token,
        refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
      };
    },
  };
}
