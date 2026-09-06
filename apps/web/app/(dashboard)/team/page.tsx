import { Users } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { TeamManager } from "@/components/features/team/team-manager";
import { teamService } from "@/lib/services/team";

export default async function TeamPage() {
  const team = await teamService.get();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Members, roles and invitations for your workspace."
      />
      <TeamManager role={team.role} members={team.members} invitations={team.invitations} />
    </div>
  );
}
