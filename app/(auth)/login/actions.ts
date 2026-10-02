"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkCredentials, recordFailure, throttleMinutes } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
  email?: string;
}

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  let wait = 0;
  try {
    wait = await throttleMinutes(ip);
  } catch {
    return {
      error:
        "Cannot reach MongoDB. Set a real MONGODB_URI in .env.local (Atlas M0), run npm run seed, then restart npm run dev.",
      email,
    };
  }
  if (wait > 0) return { error: `Too many attempts. Try again in ${wait} min.`, email };

  if (!(await checkCredentials(parsed.data.email, parsed.data.password))) {
    try {
      await recordFailure(ip);
    } catch {
      /* throttle write is best-effort when DB is down */
    }
    return { error: "Incorrect email or password.", email };
  }

  await createSession();
  redirect("/dashboard");
}
