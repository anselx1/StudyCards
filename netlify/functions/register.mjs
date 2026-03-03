import crypto from "crypto";
import { getStore } from "@netlify/blobs";
import { hashPassword, createToken, json } from "./auth.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return json({ error: "Name, email, and password are required." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, 400);
    }

    const store = getStore("users");
    const existing = await store.get(`email:${email}`, { type: "json" });

    if (existing) {
      return json({ error: "An account with this email already exists." }, 409);
    }

    const id = crypto.randomUUID();
    const password_hash = hashPassword(password);
    const user = {
      id,
      name,
      email,
      password_hash,
      plan: "free",
      created_at: new Date().toISOString(),
    };

    await store.setJSON(`email:${email}`, user);
    await store.setJSON(`id:${id}`, user);

    const token = createToken({ id });

    return json(
      { token, user: { id, name, email, plan: "free" } },
      201
    );
  } catch (err) {
    console.error("Register error:", err);
    return json({ error: "Server error. Please try again." }, 500);
  }
};

export const config = {
  path: "/api/register",
};
