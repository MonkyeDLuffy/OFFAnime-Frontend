import { redirect } from "next/navigation";

/**
 * Temporary root until the combined landing experience exists.
 * `/anime` and `/movies` are the section homepages.
 */
export default function RootPage() {
  redirect("/anime");
}
