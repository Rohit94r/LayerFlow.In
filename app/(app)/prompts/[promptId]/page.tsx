import PromptDetailClient from "./PromptDetailClient";

export const metadata = {
  title: "Prompt",
};

interface PromptPageProps {
  params: Promise<{ promptId: string }>;
}

export default async function PromptPage({ params }: PromptPageProps) {
  const { promptId } = await params;
  return <PromptDetailClient promptId={promptId} />;
}
