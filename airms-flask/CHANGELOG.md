# AirMS Flask Changes

## 2026-06-01

- Added the Flask AirMS app and nested React client.
- Added MongoDB Atlas TLS support using `certifi`.
- Added SMTP email sending for OTP login and password reset flows.
- Enabled pilot access to Messages and Profile.
- Implemented Flask message routes for users, conversations, threads, group chats, and sending messages.
- Added profile image upload support and upload serving.
- Updated superadmin route and sidebar access to match the main `client-web` app.
- Removed the Add Requisition action for warehouse department users.
- Added ignores for env files, Python cache files, virtual environments, and uploads.

## Safety

- No `.env` files are included.
- No `node_modules`, `dist`, Vite cache, `__pycache__`, or `.pyc` files are included.
- Changes were pushed only to the `poonam` branch.
