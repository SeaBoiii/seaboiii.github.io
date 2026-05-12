import { redirect } from "next/navigation";

export default function Home() {
  // Root of the Next app redirects to the novel landing page.
  // The repo root index.html (Aleem's profile) is served separately at /.
  redirect("/novel");
}
