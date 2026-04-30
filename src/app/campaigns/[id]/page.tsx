import Link from "next/link";
import { notFound } from "next/navigation";
import { createCampaignLeadReportAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { Icons } from "@/components/icons";
import { getCampaignDetail } from "@/lib/data-service";
import { channelAr, statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function CampaignDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const campaign = await getCampaignDetail(id);

  if (!campaign) {
    notFound();
  }

  const importedLeads = campaign.leads.length;
  const qualifiedLeads = campaign.leads.filter((lead) => lead.fitScore >= 85).length;
  const verifiedContacts = campaign.leads.filter(
    (lead) => lead.officialEmail && lead.emailSourceUrl
  ).length;
  const isLeadResearchCampaign = campaign.channel === "codex_research";

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">معاينة الحملة</div>
            <h1 className="page-title">{campaign.name}</h1>
            <p className="muted">
              راجع الاستراتيجية والمسودات المرتبطة وحالة الموافقة وسياق التتبع. لا يحدث إرسال أو نشر هنا.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(campaign.status)}</span>
            <span className="badge">التنفيذ اليدوي مطلوب: نعم</span>
          </div>
        </div>

        <section className="grid three">
          <div className="panel stat">
            <span className="muted">المنتج</span>
            <span className="stat-value">{campaign.product.name}</span>
          </div>
          <div className="panel stat">
            <span className="muted">القناة</span>
            <span className="stat-value">{channelAr(campaign.channel)}</span>
          </div>
          <div className="panel stat">
            <span className="muted">تاريخ الإنشاء</span>
            <span className="stat-value compact">{formatDate(campaign.createdAt)}</span>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الاستراتيجية</h2>
            <div className="stack">
              <div>
                <strong>الشريحة المستهدفة</strong>
                <p className="muted">{campaign.targetSegment}</p>
              </div>
              <div>
                <strong>الهدف</strong>
                <p>{campaign.objective}</p>
              </div>
              <div>
                <strong>زاوية الرسالة</strong>
                <p>{campaign.messageAngle || "لم تُحدد بعد."}</p>
              </div>
              <div>
                <strong>الفرضية</strong>
                <p>{campaign.hypothesis}</p>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">حالة السلامة</h2>
            <ul className="list bullets">
              <li>موافقة المالك: {String(campaign.approved_by_owner)}</li>
              <li>التنفيذ اليدوي مطلوب: {String(campaign.manual_execution_required)}</li>
              <li>إرسال البريد المباشر معطل.</li>
              <li>نشر المحتوى الاجتماعي المباشر معطل.</li>
              <li>أي تواصل خارجي لا يزال يحتاج إجراء يدويًا من المالك.</li>
            </ul>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">موجز الحملة</h2>
          <pre className="code-block">{campaign.brief || "لا يوجد موجز محفوظ بعد."}</pre>
        </section>

        {isLeadResearchCampaign ? (
          <section className="panel">
            <div className="split-row">
              <div>
                <h2 className="section-title">حالة تقرير بحث 20 عميلًا</h2>
                <p className="muted">
                  تبدأ هذه الحملة كمهمة بحث. يظهر تقرير العملاء الفعلي هنا فقط بعد استيراد العملاء
                  مع روابط مصادر البريد الرسمية.
                </p>
              </div>
              <span className="badge warning">{importedLeads}/20 مستورد</span>
            </div>
            <div className="grid three">
              <div className="panel subtle stat">
                <span className="muted">العملاء المستوردون</span>
                <span className="stat-value">{importedLeads}</span>
              </div>
              <div className="panel subtle stat">
                <span className="muted">درجة ملاءمة مؤهلة</span>
                <span className="stat-value">{qualifiedLeads}</span>
              </div>
              <div className="panel subtle stat">
                <span className="muted">جهات اتصال رسمية</span>
                <span className="stat-value">{verifiedContacts}</span>
              </div>
            </div>
            {importedLeads === 0 ? (
              <div className="notice warning">
                لا يوجد تقرير 20 عميلًا بعد. العنصر المحفوظ هو موجز بحث Codex وليس تقرير عملاء مكتمل.
                افتح بحث العملاء واستورد العملاء المتحقق منهم بعد البحث.
              </div>
            ) : (
              <div className="button-row">
                <form action={createCampaignLeadReportAction}>
                  <input name="campaignId" type="hidden" value={campaign.id} />
                  <button className="button" type="submit">
                    <Icons.file size={18} />
                    إنشاء تقرير عملاء من العملاء المستوردين
                  </button>
                </form>
                <Link className="button secondary" href="/reports">
                  <Icons.file size={18} />
                  فتح التقارير
                </Link>
              </div>
            )}
            <Link className="button secondary" href="/lead-research">
              <Icons.search size={18} />
              استيراد العملاء الذين تم بحثهم
            </Link>
          </section>
        ) : null}

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">مسودات المحتوى الاجتماعي</h2>
            {campaign.socialPostDrafts.length === 0 ? (
              <p className="muted">لا توجد مسودات محتوى اجتماعي مرتبطة بهذه الحملة بعد.</p>
            ) : (
              <div className="stack">
                {campaign.socialPostDrafts.map((post) => (
                  <div className="panel subtle" key={post.id}>
                    <div className="split-row">
                      <strong>{channelAr(post.platform)}</strong>
                      <span className="badge warning">{statusAr(post.status)}</span>
                    </div>
                    <p>{post.hook}</p>
                    <Link className="button secondary" href={`/social-studio/${post.id}`}>
                      <Icons.megaphone size={18} />
                      معاينة المسودة
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">العملاء المحتملون</h2>
            {campaign.leads.length === 0 ? (
              <div className="stack">
                <p className="muted">
                  لم يتم استيراد عملاء لهذه الحملة بعد، لذلك لا يوجد تقرير عملاء للمعاينة.
                </p>
                <Link className="button secondary" href="/lead-research">
                  <Icons.search size={18} />
                  إضافة عملاء تم بحثهم
                </Link>
              </div>
            ) : (
              <div className="stack">
                {campaign.leads.map((lead) => (
                  <div className="panel subtle" key={lead.id}>
                    <div className="split-row">
                      <strong>{lead.companyName}</strong>
                      <span className="badge">{lead.fitScore}</span>
                    </div>
                    <p className="muted">{statusAr(lead.status)}</p>
                    <Link className="button secondary" href={`/leads/${lead.id}`}>
                      <Icons.target size={18} />
                      فتح العميل
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">مسودات التواصل</h2>
            {campaign.outreachDrafts.length === 0 ? (
              <Link className="button secondary" href="/outreach-studio">
                <Icons.mail size={18} />
                إنشاء مسودة تواصل
              </Link>
            ) : (
              <div className="stack">
                {campaign.outreachDrafts.map((draft) => (
                  <div className="panel subtle" key={draft.id}>
                    <div className="split-row">
                      <strong>{draft.company}</strong>
                      <span className="badge warning">{statusAr(draft.status)}</span>
                    </div>
                    <p className="muted">{draft.subject}</p>
                    <Link className="button secondary" href={`/outreach-studio/${draft.id}`}>
                      <Icons.mail size={18} />
                      معاينة البريد
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">عناصر الموافقة</h2>
            {campaign.approvalItems.length === 0 ? (
              <p className="muted">لا توجد عناصر موافقة مرتبطة بهذه الحملة بعد.</p>
            ) : (
              <div className="stack">
                {campaign.approvalItems.map((item) => (
                  <div className="panel subtle" key={item.id}>
                    <div className="split-row">
                      <strong>{item.itemType}</strong>
                      <span className="badge warning">{statusAr(item.status)}</span>
                    </div>
                    <p>{item.contentPreview}</p>
                    <Link className="button secondary" href={`/approval-center/${item.id}`}>
                      <Icons.approval size={18} />
                      مراجعة العنصر
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
