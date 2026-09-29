// Upgrade cached profiles from before the Admin Staff role rename.
export const normalizeAccountRoles = (user) => {
  if (!user) return user;
  const rename = (value) =>
    typeof value === "string" && value.trim().toLowerCase() === "superadmin"
      ? "Admin Staff"
      : value;
  return { ...user, jobTitle: rename(user.jobTitle), access: rename(user.access) };
};
