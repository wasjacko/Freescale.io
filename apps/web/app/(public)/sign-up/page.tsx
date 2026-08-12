import { redirect } from "next/navigation";

export const metadata = { title: "Freescale" };

export default function SignUpPage() {
  redirect("/app");
}
