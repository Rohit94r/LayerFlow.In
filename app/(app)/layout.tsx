import AppSidebar from "@/components/workspace/AppSidebar";
import AppTopBar from "@/components/workspace/AppTopBar";

export const metadata = {
  title: "Workspace",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
