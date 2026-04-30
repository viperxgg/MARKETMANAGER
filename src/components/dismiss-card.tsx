import { dismissDashboardCardAction, restoreDashboardCardAction } from "@/app/actions";
import { Icons } from "./icons";

export function ShowDismissedToggle({
  basePath,
  showDismissed
}: {
  basePath: string;
  showDismissed: boolean;
}) {
  const href = showDismissed
    ? basePath
    : `${basePath}${basePath.includes("?") ? "&" : "?"}showDismissed=1`;

  return (
    <a className="button secondary compact" href={href}>
      {showDismissed ? "إخفاء العناصر المخفية" : "إظهار العناصر المخفية"}
    </a>
  );
}

export function DismissCardButton({
  itemType,
  itemId,
  productSlug,
  returnTo,
  isDismissed = false
}: {
  itemType: string;
  itemId: string;
  productSlug?: string;
  returnTo: string;
  isDismissed?: boolean;
}) {
  return (
    <form action={isDismissed ? restoreDashboardCardAction : dismissDashboardCardAction}>
      <input name="itemType" type="hidden" value={itemType} />
      <input name="itemId" type="hidden" value={itemId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      {productSlug ? <input name="productSlug" type="hidden" value={productSlug} /> : null}
      {!isDismissed ? <input name="dismissReason" type="hidden" value="owner_visual_cleanup" /> : null}
      <button
        aria-label={isDismissed ? "إعادة إظهار البطاقة" : "إخفاء البطاقة من العرض"}
        className="icon-button"
        title={isDismissed ? "إعادة إظهار البطاقة" : "إخفاء البطاقة فقط"}
        type="submit"
      >
        <Icons.x size={16} />
      </button>
    </form>
  );
}
