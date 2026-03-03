import { getStore } from "@netlify/blobs";
import { getUserIdFromRequest, json } from "./auth.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return json({ error: "No token provided." }, 401);
  }

  try {
    const store = getStore("users");
    const user = await store.get(`id:${userId}`, { type: "json" });

    if (!user) {
      return json({ error: "User not found." }, 401);
    }

    user.plan = "pro";
    await store.setJSON(`id:${userId}`, user);
    await store.setJSON(`email:${user.email}`, user);

    return json({ success: true, message: "Upgraded to Pro!" });
  } catch (err) {
    console.error("Upgrade error:", err);
    return json({ error: "Upgrade failed." }, 500);
  }
};

export const config = {
  path: "/api/upgrade",
};
