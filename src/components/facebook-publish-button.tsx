"use client";

import { useFormStatus } from "react-dom";
import { approveAndPublishFacebookAction } from "@/app/actions";
import { Icons } from "./icons";

function PublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button warning" disabled={pending || disabled} type="submit">
      <Icons.megaphone size={18} />
      {pending ? "Publishing..." : "Approve & Publish"}
    </button>
  );
}

export function FacebookPublishForm({
  approvalId,
  returnTo,
  disabled = false,
  disabledReason
}: {
  approvalId: string;
  returnTo: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <form
      action={approveAndPublishFacebookAction}
      className="stack"
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (!window.confirm("This will publish the post to Facebook page")) {
          event.preventDefault();
        }
      }}
    >
      <input name="approvalId" type="hidden" value={approvalId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <PublishButton disabled={disabled} />
      {disabledReason ? <p className="warning-text">{disabledReason}</p> : null}
    </form>
  );
}
