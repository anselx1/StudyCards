import { getStore } from "@netlify/blobs";
import { verifyPassword, createToken, json } from "./auth.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return json({ error: "Email and password are required." }, 400);
    }

    const store = getStore("users");
    const user = await store.get(`email:${email}`, { type: "json" });

    if (!user) {
      return json({ error: "Invalid email or password." }, 401);
    }

    const match = verifyPassword(password, user.password_hash);
    if (!match) {
      return json({ error: "Invalid email or password." }, 401);
    }

    const token = createToken({ id: user.id });

    return json({
      token,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    });
  } catch (err) {
    console.error("Login error:", err);
    return json({ error: "Server error. Please try again." }, 500);
  }
};

export const config = {
  path: "/api/login",
};
