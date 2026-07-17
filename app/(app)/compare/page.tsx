import ComparePanel from "@/components/workspace/ComparePanel";
import { compareResults } from "@/lib/mock-data";

export const metadata = {
  title: "Compare",
};

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Compare Models
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Run the same prompt across GPT, Claude, Gemini, and DeepSeek — pick
          best, cheapest, or fastest.
        </p>
      </div>
      <ComparePanel results={compareResults} />
    </div>
  );
}
