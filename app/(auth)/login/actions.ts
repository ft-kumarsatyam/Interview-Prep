"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkCredentials, recordFailure, throttleMinutes } from "@/core/auth/credentials";
import { createSession } from "@/core/auth/session";

export interface LoginState {
  error?: string;
  email?: string;
  remember?: boolean;
}

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
  // An unchecked checkbox isn't submitted at all.
  remember: z.literal("on").nullable().transform((v) => v === "on"),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember"),
  });
  const email = String(formData.get("email") ?? "");
  const remember = formData.get("remember") === "on";
  if (!parsed.success) return { error: parsed.error.issues[0].message, email, remember };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  let wait = 0;
  try {
    wait = await throttleMinutes(ip);
  } catch {
    return {
      error:
        "Cannot reach MongoDB. Set a real MONGODB_URI in .env.local (Atlas M0), run npm run seed, then restart npm run dev.",
      email,
      remember,
    };
  }
  if (wait > 0) return { error: `Too many attempts. Try again in ${wait} min.`, email, remember };

  if (!(await checkCredentials(parsed.data.email, parsed.data.password))) {
    try {
      await recordFailure(ip);
    } catch {
      /* throttle write is best-effort when DB is down */
    }
    return { error: "Incorrect email or password.", email, remember };
  }

  await createSession({ remember: parsed.data.remember });
  redirect("/dashboard");
}
