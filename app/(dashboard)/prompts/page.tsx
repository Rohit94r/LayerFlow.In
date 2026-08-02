import { promptService } from "@/lib/services/prompts";
import PromptLibraryClient from "@/components/features/prompts/prompt-library-client";

export default async function PromptsPage() {
  const prompts = await promptService.listPrompts();
  return <PromptLibraryClient prompts={prompts} />;
}
