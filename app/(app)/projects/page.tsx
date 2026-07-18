import { Suspense } from "react";
import ProjectsClient from "./ProjectsClient";

export const metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading projects…</p>}>
      <ProjectsClient />
    </Suspense>
  );
}
