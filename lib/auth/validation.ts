export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\d .'-]{1,58}$/u;
const WEAK_PASSWORDS = new Set([
  "password123",
  "password1234",
  "qwerty12345",
  "1234567890",
  "ksolar1234",
]);

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "").trim();
}

export function validateEmail(value: string): ValidationResult {
  const email = normalizeEmail(value);

  if (!email) {
    return { valid: false, message: "请输入邮箱。" };
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { valid: false, message: "邮箱格式不正确。" };
  }

  return { valid: true };
}

export function validatePhone(value: string): ValidationResult {
  const phone = normalizePhone(value);

  if (!phone) {
    return { valid: true };
  }

  if (!PHONE_PATTERN.test(phone)) {
    return { valid: false, message: "手机号请使用国际格式，例如 +66812345678。" };
  }

  return { valid: true };
}

export function validateDisplayName(value: string): ValidationResult {
  const displayName = value.trim().replace(/\s+/g, " ");

  if (!displayName) {
    return { valid: false, message: "请输入销售姓名。" };
  }

  if (displayName.length < 2 || displayName.length > 60 || !DISPLAY_NAME_PATTERN.test(displayName)) {
    return {
      valid: false,
      message: "姓名需为 2-60 个字符，可包含中英泰文字母、数字、空格、点、连字符或撇号。",
    };
  }

  if (/https?:\/\//i.test(displayName)) {
    return { valid: false, message: "姓名不能包含链接。" };
  }

  return { valid: true };
}

export function validatePassword(value: string): ValidationResult {
  const password = value.trim();

  if (password.length < 10) {
    return { valid: false, message: "密码至少需要 10 位。" };
  }

  if (password.length > 72) {
    return { valid: false, message: "密码不能超过 72 位。" };
  }

  if (/\s/.test(password)) {
    return { valid: false, message: "密码不能包含空格。" };
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: "密码必须同时包含英文字母和数字。" };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "密码还需要至少 1 个特殊字符，例如 ! @ # %。" };
  }

  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, message: "这个密码太常见，请换一个更安全的密码。" };
  }

  return { valid: true };
}

export const PASSWORD_RULES = [
  "至少 10 位",
  "同时包含英文字母和数字",
  "至少 1 个特殊字符，例如 ! @ # %",
  "不能包含空格或常见弱密码",
] as const;
