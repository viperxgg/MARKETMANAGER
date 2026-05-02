import Link from "next/link";
import { notFound } from "next/navigation";
import {
  runLeadResearchPipelineAction,
  runLiveLeadResearchAction
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { hasDatabaseUrl } from "@/lib/db";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";
import { getProduct, products } from "@/lib/product-data";

export const dynamic = "force-dynamic";

const researchSteps = [
  "Load product context",
  "Check previous contacts",
  "Search the market",
  "Score leads",
  "Draft owner-review outreach",
  "Save results for approval"
];

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export default async function LiveLeadResearchPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string; runId?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const providerStatus = getLeadSearchProviderStatus();
  const dbConfigured = hasDatabaseUrl();
  const canRunLiveResearch =
    dbConfigured &&
    providerStatus.providerConfigured &&
    providerStatus.providerImplemented &&
    providerStatus.openAiConfigured;
  const missing = [
    !dbConfigured ? "DATABASE_URL" : "",
    ...providerStatus.missing
  ].filter(Boolean);

  return (
    <AppShell>
      <Notice code={query.notice} runId={query.runId} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">Live lead research</div>
            <h1 className="page-title">{product.name}: research control</h1>
            <p className="muted">
              Opening this page is read-only. Live provider calls and database writes only run
              after the owner submits the explicit action below.
            </p>
          </div>
          <Link className="button secondary" href={`/products/${product.slug}`}>
            <Icons.file size={18} />
            Back to product
          </Link>
        </div>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">Run status</h2>
              <p className="muted">{providerStatus.message}</p>
            </div>
            <span className="badge warning">Owner action required</span>
          </div>
          <ol className="research-steps">
            {researchSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">Configuration</h2>
            <div className="stack">
              <div className="split-row">
                <span>Database</span>
                <span className={dbConfigured ? "badge" : "badge warning"}>
                  {dbConfigured ? "configured" : "missing"}
                </span>
              </div>
              <div className="split-row">
                <span>Lead provider</span>
                <span className={providerStatus.providerConfigured ? "badge" : "badge warning"}>
                  {providerStatus.providerConfigured ? "configured" : "missing"}
                </span>
              </div>
              <div className="split-row">
                <span>Provider adapter</span>
                <span className={providerStatus.providerImplemented ? "badge" : "badge warning"}>
                  {providerStatus.providerImplemented ? "implemented" : "not implemented"}
                </span>
              </div>
              <div className="split-row">
                <span>OpenAI</span>
                <span className={providerStatus.openAiConfigured ? "badge" : "badge warning"}>
                  {providerStatus.openAiConfigured ? "configured" : "missing"}
                </span>
              </div>
              <p className="muted">Selected provider: {providerStatus.providerName}</p>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">Live run</h2>
            {missing.length > 0 ? (
              <div className="notice warning">
                Missing or blocked: {missing.join(", ")}
              </div>
            ) : null}
            <form action={runLiveLeadResearchAction} className="stack">
              <input name="productSlug" type="hidden" value={product.slug} />
              <input
                name="returnTo"
                type="hidden"
                value={`/products/${product.slug}/lead-research/live`}
              />
              <SubmitButton
                className="button"
                disabled={!canRunLiveResearch}
                pendingLabel="Running live research..."
              >
                <Icons.search size={18} />
                Run live lead research
              </SubmitButton>
              {!canRunLiveResearch ? (
                <p className="muted">
                  The button is disabled until database, provider, adapter, and OpenAI
                  configuration are all present.
                </p>
              ) : (
                <p className="muted">
                  This may call the configured lead provider, call OpenAI, and save leads,
                  outreach drafts, and approval items.
                </p>
              )}
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">Manual CSV import</h2>
              <p className="muted">
                Upload owner-provided companies for {product.name}. Required columns:
                companyName, website, officialEmail, businessType, city, notes.
              </p>
            </div>
            <span className="badge">manual-csv</span>
          </div>
          <form action={runLeadResearchPipelineAction} className="stack">
            <input name="productSlug" type="hidden" value={product.slug} />
            <input name="targetCount" type="hidden" value="20" />
            <input
              name="returnTo"
              type="hidden"
              value={`/products/${product.slug}/lead-research/live`}
            />
            <div className="field">
              <label>CSV file</label>
              <input accept=".csv,text/csv" name="csvFile" required type="file" />
            </div>
            <SubmitButton
              className="button secondary"
              pendingLabel="Running CSV lead workflow..."
            >
              <Icons.search size={18} />
              Run CSV lead workflow
            </SubmitButton>
            <p className="muted">
              CSV import is also POST-only. It creates review records only and never contacts
              companies automatically.
            </p>
          </form>
        </section>

        <section className="panel">
          <h2 className="section-title">Next review points</h2>
          <div className="button-row">
            <Link className="button secondary" href={`/leads?product=${product.slug}`}>
              <Icons.target size={18} />
              Review leads
            </Link>
            <Link className="button secondary" href={`/approval-center?product=${product.slug}`}>
              <Icons.approval size={18} />
              Review approvals
            </Link>
            <Link className="button secondary" href={`/outreach-studio?product=${product.slug}`}>
              <Icons.mail size={18} />
              Review outreach drafts
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
