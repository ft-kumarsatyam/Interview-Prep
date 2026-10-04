import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeetCodeCard } from "@/modules/dsa/components/leetcode/leetcode-card";
import type { DashboardData } from "@/modules/progress/services/dashboard";
import { Heatmap } from "./heatmap";

type Props = { heatmap: DashboardData["heatmap"]; username: string | null; lastSyncLabel: string | null; showLeetCodeCompact: boolean };

/** Plan-long activity heatmap, with a compact LeetCode link when the full card is hidden. */
export function ActivityCard({ heatmap, username, lastSyncLabel, showLeetCodeCompact }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>The whole plan, week by week.</CardDescription>
        {showLeetCodeCompact && (
          <CardAction>
            <LeetCodeCard compact username={username} lastSyncLabel={lastSyncLabel} needsDetails={[]} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <Heatmap cells={heatmap} />
      </CardContent>
    </Card>
  );
}
