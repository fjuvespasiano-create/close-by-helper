export function waUrl(phone: string | null | undefined, msg?: string) {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  const text = msg ? `?text=${encodeURIComponent(msg)}` : "";
  return `https://wa.me/${clean}${text}`;
}

export function telUrl(phone: string | null | undefined) {
  if (!phone) return "#";
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
