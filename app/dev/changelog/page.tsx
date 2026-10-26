import { redirect } from "next/navigation";

export const instant = false;

export default function DevChangelogPage() {
  redirect("/dev/requests?tab=updates");
}
