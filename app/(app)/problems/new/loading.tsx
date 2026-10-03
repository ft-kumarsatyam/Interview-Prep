import { FormSkeleton, HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";

export default function NewProblemLoading() {
  return (
    <LoadingRegion label="Loading editor…">
      <HeaderSkeleton />
      <FormSkeleton fields={5} />
    </LoadingRegion>
  );
}
