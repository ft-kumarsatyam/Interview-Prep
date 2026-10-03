import { FormSkeleton, HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <LoadingRegion label="Loading settings…">
      <HeaderSkeleton actions={1} />
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 space-y-4">
          <FormSkeleton fields={6} />
          <FormSkeleton fields={3} />
        </div>
      </div>
    </LoadingRegion>
  );
}
