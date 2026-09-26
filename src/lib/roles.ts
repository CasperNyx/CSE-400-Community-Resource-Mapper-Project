import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export type AccessRole = "pending" | "user" | "volunteer" | "dispatcher" | "super-admin";

/**
 * Reads the canonical profile first, then supports the users collection used
 * by registration. The legacy admin value maps to the app's super-admin role.
 */
export async function getUserRole(uid: string): Promise<AccessRole> {
  const profileSnapshot = await getDoc(doc(db, "userProfiles", uid));
  const profileRole = profileSnapshot.data()?.role as AccessRole | undefined;
  if (profileRole) return profileRole;

  const userSnapshot = await getDoc(doc(db, "users", uid));
  const userRole = userSnapshot.data()?.role as string | undefined;
  if (userRole === "admin") return "super-admin";
  if (userRole === "user") return "user";
  return "pending";
}
