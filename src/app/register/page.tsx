"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Creates the Firebase account and initializes the default user role.
  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", credential.user.uid), {
        email: credential.user.email,
        role: "user",
        createdAt: serverTimestamp(),
      });

      setSuccess("Account created successfully. Redirecting to login...");
      window.setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message.replace("Firebase: ", "")
          : "Unable to create your account.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold text-blue-700">Join Coordinate Relief</h1>
        <p className="mb-6 text-center text-gray-600">Create an account to join the response network.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              className="mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black font-semibold bg-white placeholder-gray-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="responder@network.org"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              className="mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black font-semibold bg-white placeholder-gray-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              className="mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black font-semibold bg-white placeholder-gray-500"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          {success && <p className="text-sm text-green-600" role="status">{success}</p>}

          <button
            className="w-full rounded-md bg-blue-600 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}