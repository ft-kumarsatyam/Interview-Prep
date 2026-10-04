import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { listApiTokens } from "@/core/services/api-tokens";
import { ApiTokensPanel } from "@/modules/settings/components/api-tokens-panel";

export const metadata: Metadata = { title: "API tokens" };

export default async function ApiTokensPage() {
  const tokens = await listApiTokens();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/settings">Settings</BackLink>
      <PageHeader
        icon={KeyRound}
        title="API tokens"
        description={
          <span>
            Let the Chrome extension or an automation talk to PrepOS without a browser tab. Each token has scopes and an expiry; only a hash is stored. The API is described at{" "}
            <a href="/api/v1/openapi.json" className="underline underline-offset-2">
              /api/v1/openapi.json
            </a>
            .
          </span>
        }
      />
      <ApiTokensPanel tokens={tokens} />
    </div>
  );
}
