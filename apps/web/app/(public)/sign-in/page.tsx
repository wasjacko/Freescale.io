import { redirect } from "next/navigation";

export const metadata = { title: "Freescale" };

export default function SignInPage() {
  redirect("/app");
}
