/**
 * 将任意值安全地转成可显示的字符串
 * - string / number：直接转字符串
 * - object / array：JSON.stringify
 * - 其他类型：String()
 * - null / undefined：空字符串
 */
export function formatDisplayValue(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object]";
    }
  }

  return String(value);
}
