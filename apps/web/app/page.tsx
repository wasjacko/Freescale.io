import { redirect } from "next/navigation";

/**
 * Freescale n'a plus de landing intermediaire : le domaine ouvre directement
 * l'application. Le middleware redirigera ensuite vers l'authentification si
 * la session l'exige.
 */
export default function RootPage() {
  redirect("/app");
}
