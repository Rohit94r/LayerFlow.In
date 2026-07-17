import ComparePanel from "@/components/workspace/ComparePanel";
import PageHeader from "@/components/workspace/PageHeader";
import { compareResults } from "@/lib/mock-data";

export const metadata = {
  title: "Compare",
};

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prompt Workspace"
        title="Compare"
        description="Run the same prompt across GPT, Claude, Gemini, and DeepSeek — pick best, cheapest, or fastest."
      />
      <ComparePanel results={compareResults} />
    </div>
  );
}
