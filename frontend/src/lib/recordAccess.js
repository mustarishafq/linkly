export function canManageRecord(user, record) {
  if (!user || !record) return false;
  if (user.role === "admin") return true;
  if (record.owner_user_id == null || record.owner_user_id === "") return false;
  return String(record.owner_user_id) === String(user.id);
}
