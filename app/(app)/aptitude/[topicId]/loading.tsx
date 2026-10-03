import { ChipsSkeleton, HeaderSkeleton, LoadingRegion, QuestionRunnerSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AptitudeTopicLoading() {
  return (
    <LoadingRegion label="Loading practice…">
      <HeaderSkeleton back />
      <ChipsSkeleton count={4} />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <QuestionRunnerSkeleton />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
