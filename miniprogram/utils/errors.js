const ERROR_MESSAGES = {
  adult_access_required: "Hina 小程序目前仅向年满 18 周岁的用户开放。",
  privacy_consent_required: "请先阅读并同意隐私保护指引。",
  auth_required: "登录状态已失效，请重新进入小程序。",
  wechat_mini_not_available: "微信登录服务正在准备中，请稍后再试。",
  wechat_code_exchange_failed: "微信登录暂时没有接通，请稍后再试。",
  missing_wechat_mini_credentials: "微信登录服务尚未完成配置。",
  content_not_allowed: "这条内容暂时无法发送，请换一种说法。",
  generated_content_not_allowed: "Hina 这次的回复没有通过安全检查，请再试一次。",
  safety_support_needed: "如果你正处在危险中，请立即联系身边可信任的人或拨打当地紧急求助电话。",
  quota_exceeded: "今天的免费对话次数已经用完，明天再来找 Hina 吧。",
  rate_limited: "说得太快啦，稍等片刻再试。",
  email_required: "请输入有效的邮箱地址。",
  account_not_found: "没有找到这个邮箱对应的 Hina 账号。",
  invalid_verification_code: "验证码不正确或已经过期。",
  verification_not_found: "验证码不正确或已经过期。",
  email_not_configured: "邮件服务暂时不可用。",
  feedback: "请写下你想告诉我们的内容。",
  network_failed: "网络好像走神了，请检查连接后重试。",
  request_failed: "服务暂时开了个小差，请稍后重试。",
};

function readableError(error) {
  if (error && error.data && error.data.message) return error.data.message;
  const message = error && error.message ? error.message : "request_failed";
  if (ERROR_MESSAGES[message]) return ERROR_MESSAGES[message];
  if (/timeout|network|request:fail/i.test(message)) return ERROR_MESSAGES.network_failed;
  return ERROR_MESSAGES.request_failed;
}

module.exports = { readableError };
