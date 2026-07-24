import { notFound } from "next/navigation";

import { E2EPreview } from "./E2EPreview";

export default function E2EPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <E2EPreview />;
}
