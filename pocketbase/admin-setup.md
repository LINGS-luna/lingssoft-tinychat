# PocketBase Admin Setup Guide

This guide walks you through the initial setup of PocketBase for `tinyChat`.

## 1. Access the Admin UI
1. Start the services using `docker compose up -d`.
2. Open your browser and navigate to the PocketBase Admin UI: [http://localhost:8090/_/](http://localhost:8090/_/).

## 2. Create the Initial Admin Account
1. Upon your first visit, PocketBase will prompt you to create an admin account.
2. Enter a valid email address and a secure password.
3. Click **Create and login** to access the dashboard.

## 3. Create the Bot User Account
The FastAPI AI service requires a dedicated user record to act as the "Bot". This prevents infinite loops and allows the frontend to distinguish bot messages from user messages.

1. In the Admin UI sidebar, click on the **users** collection.
2. Click the **New record** button.
3. Fill in the user details (e.g., set the username or name to "AI Bot", add an avatar if desired).
4. Click **Create** to save the record.
5. After creating, copy the **id** of this newly created user record (it is typically a 15-character string).

## 4. Configure the Environment
1. Open your `.env` file (copy from `.env.sample` if you haven't already).
2. Paste the copied bot user ID into the `BOT_USER_ID` variable:
   ```env
   BOT_USER_ID=your_copied_15_char_id
   ```
3. Restart the services to apply the changes:
   ```bash
   docker compose down
   docker compose up -d
   ```

## 5. Schema Configuration
To set up the necessary collections (`messages`, `documents`, `attachments`), please refer to the detailed schema guide:
[Schema Reference](./schema-reference.md)
