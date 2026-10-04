import { getSetupChecklist } from "@/modules/planner/services/setup";
import { SetupBanner } from "./setup-banner";

/** Async section: required setup steps still open. */
export async function SetupSection({ remember }: { remember: boolean }) {
  const setup = await getSetupChecklist({ remember });
  return <SetupBanner requiredLeft={setup.requiredLeft} done={setup.done} total={setup.total} items={setup.items} />;
}
