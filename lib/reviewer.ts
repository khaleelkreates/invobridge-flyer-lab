const KEY = "invobridge.reviewer_id";

export function getReviewerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      "r_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    window.localStorage.setItem(KEY, id);
  }
  return id;
}