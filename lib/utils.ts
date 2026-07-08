export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    new: "Đơn mới",
    confirmed: "Đã nhận",
    processing: "Đang xử lý",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };

  return map[status] ?? status;
}
