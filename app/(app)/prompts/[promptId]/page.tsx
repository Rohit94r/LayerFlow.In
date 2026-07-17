import { notFound } from "next/navigation";
import PromptDetailClient from "./PromptDetailClient";
import { getPrompt } from "@/lib/mock-data";

export const metadata = {
  title: "Prompt",
};

interface PromptDetailPageProps {
  params: Promise<{ promptId: string }>;
}

export default async function PromptDetailPage({ params }: PromptDetailPageProps) {
  const { promptId } = await params;
  const prompt = getPrompt(promptId);
  if (!prompt) notFound();

  return <PromptDetailClient prompt={prompt} />;
}
