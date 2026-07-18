import ProjectDetailClient from "./ProjectDetailClient";

export const metadata = {
  title: "Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  return <ProjectDetailClient projectId={projectId} />;
}
