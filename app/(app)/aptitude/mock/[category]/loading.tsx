import { HeaderSkeleton, LoadingRegion, QuestionRunnerSkeleton } from "@/components/shared/page-skeleton";

export default function AptitudeMockLoading() {
  return (
    <LoadingRegion label="Preparing your mock test…">
      <HeaderSkeleton back />
      <QuestionRunnerSkeleton />
    </LoadingRegion>
  );
}
