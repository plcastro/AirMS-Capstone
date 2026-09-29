const assert = require("node:assert/strict");
const test = require("node:test");
const User = require("../models/userModel");
const AdminActivityLog = require("../models/adminActivityLogModel");
const permissions = require("../config/permissions");
const { hasPermission } = require("../middleware/permissions");
const { hasNavAccess, default: navigation } = require("../../shared/navigationAccess");
const { canExportModule } = require("../../shared/exportAccess");
const { roleOf, isOversight } = require("../../shared/partsRequisitionWorkflow");
const { normalizeAccountRoles } = require("../../shared/accountRoles");
const { targets, changesFor } = require("../scripts/migrateAdminStaff");

test("Admin Staff validates for new accounts and audit records; old role is rejected", () => {
  const user = new User({ firstName: "Admin", lastName: "Staff", username: "staff", email: "staff@example.com", password: "hash", jobTitle: "Admin Staff", access: "Admin Staff" });
  assert.equal(user.validateSync(), undefined);
  user.jobTitle = user.access = "Superadmin";
  const errors = user.validateSync().errors;
  assert.ok(errors.jobTitle);
  assert.ok(errors.access);
  const log = new AdminActivityLog({ admin: { id: user._id, username: "staff", email: "staff@example.com", accessLevel: "Admin Staff" }, action: "USER_CREATED" });
  assert.equal(log.validateSync(), undefined);
});

test("Admin Staff retains permissions through job title or access level", () => {
  assert.equal(permissions.ADMINSTAFF_PANEL, "adminstaff.panel");
  for (const user of [{ jobTitle: "Admin Staff", access: "User" }, { jobTitle: "Mechanic", access: "Admin Staff" }]) {
    for (const permission of Object.values(permissions)) assert.equal(hasPermission({ user }, permission), true, permission);
    assert.equal(isOversight(user), true);
    assert.equal(roleOf(user), "admin staff");
  }
  for (const jobTitle of ["Mechanic", "Pilot", "Maintenance Manager", "Warehouse Personnel"]) {
    assert.equal(hasPermission({ user: { jobTitle, access: "User" } }, permissions.USERS_DELETE), false);
  }
});

test("Admin Staff can open every navigation module and export", () => {
  for (const module of Object.keys(navigation)) assert.equal(hasNavAccess("Admin Staff", module), true, module);
  assert.equal(canExportModule("Admin Staff", "activityLogs"), true);
  assert.equal(hasNavAccess("Mechanic", "userManagement"), false);
});

test("cached legacy profiles are upgraded without changing identity or unrelated roles", () => {
  const profile = { id: "unchanged", username: "superadmin", email: "appreviewsuperadmin@airms.online", jobTitle: "Superadmin", access: "superadmin" };
  assert.deepEqual(normalizeAccountRoles(profile), { ...profile, jobTitle: "Admin Staff", access: "Admin Staff" });
  assert.equal(profile.jobTitle, "Superadmin");
  const mechanic = { jobTitle: "Mechanic", access: "Superuser" };
  assert.deepEqual(normalizeAccountRoles(mechanic), mechanic);
  assert.equal(normalizeAccountRoles(null), null);
});

test("database migration changes only role fields and is idempotent", () => {
  const user = { username: "superadmin", email: "appreviewsuperadmin@airms.online", jobTitle: " Superadmin ", access: "Superadmin" };
  const changes = changesFor(user, targets[0]);
  assert.deepEqual(changes, { jobTitle: "Admin Staff", access: "Admin Staff" });
  assert.deepEqual(changesFor({ ...user, ...changes }, targets[0]), {});
  assert.deepEqual(changesFor({ jobTitle: "Mechanic", access: "Superuser" }, targets[0]), {});
  assert.deepEqual(changesFor({ admin: { accessLevel: "Superadmin" } }, targets[1]), { "admin.accessLevel": "Admin Staff" });
  assert.deepEqual(changesFor({ details: { previousValue: { access: "Superadmin", username: "superadmin" }, newValue: "Superadmin" } }, targets[2]), {
    "details.previousValue": { access: "Admin Staff", username: "superadmin" }, "details.newValue": "Admin Staff",
  });
  assert.deepEqual(changesFor({ recipientRoles: ["superadmin", "admin staff", "maintenance manager"] }, targets[3]), { recipientRoles: ["admin staff", "maintenance manager"] });
  assert.deepEqual(changesFor({ recipientRoles: ["admin staff", "maintenance manager"] }, targets[3]), {});
});
