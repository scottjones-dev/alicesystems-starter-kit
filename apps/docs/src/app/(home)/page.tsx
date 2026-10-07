import { redirect } from "next/navigation";
import { docsRoute } from "@/lib/shared";

// The docs are the whole site, so the home page just opens them.
export default function HomePage() {
  redirect(docsRoute);
}
