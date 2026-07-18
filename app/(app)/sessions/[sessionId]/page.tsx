import SessionDetailClient from "./SessionDetailClient";

export const metadata = {
  title: "Session",
};

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { sessionId } = await params;
  return <SessionDetailClient sessionId={sessionId} />;
}
