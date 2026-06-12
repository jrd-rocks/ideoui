export function initHistoryApi() {
  return Promise.resolve(null);
}

export async function getAllHistory() {
  const resp = await fetch("/api/history");
  if (!resp.ok) throw new Error("Failed to fetch history from backend");
  const items = await resp.json();
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

export async function deleteHistoryItem(id, timestamp = null) {
  const deleteKey = timestamp || id;
  if (!deleteKey) return;

  const resp = await fetch(`/api/history/${deleteKey}`, { method: "DELETE" });
  if (!resp.ok) throw new Error("Failed to delete history item from backend");
}

export async function clearAllHistory() {
  const resp = await fetch("/api/history", { method: "DELETE" });
  if (!resp.ok) throw new Error("Failed to clear backend history");
}
