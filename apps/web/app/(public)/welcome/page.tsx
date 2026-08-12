import { redirect } from "next/navigation";

export const metadata = { title: "Freescale" };

export default function WelcomePage() {
  redirect("/app");
}
