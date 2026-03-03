import { getStore } from "@netlify/blobs";
import { getUserIdFromRequest, json } from "./auth.mjs";

export default async (req) => {
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

    return json({
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    });
  } catch (err) {
    console.error("Me error:", err);
    return json({ error: "Server error." }, 500);
  }
};

export const config = {
  path: "/api/me",
};
