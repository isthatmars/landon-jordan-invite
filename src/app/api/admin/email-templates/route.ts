import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import {
  EMAIL_TEMPLATE_META,
  mergeEmailTemplates,
  type EditableEmailTemplateId,
  type EmailTemplateCopy,
} from "@/lib/email-templates";
import { getStore, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const templates = mergeEmailTemplates(store.emailTemplates);
  return NextResponse.json({
    templates,
    meta: EMAIL_TEMPLATE_META,
  });
}

export async function PUT(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: EditableEmailTemplateId;
    copy?: Partial<EmailTemplateCopy>;
    templates?: Partial<Record<EditableEmailTemplateId, Partial<EmailTemplateCopy>>>;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await updateStore((s) => {
    const current = mergeEmailTemplates(s.emailTemplates);
    if (body.id && body.copy) {
      const id = body.id;
      if (!EMAIL_TEMPLATE_META.some((m) => m.id === id)) return;
      current[id] = {
        ...current[id],
        ...pickCopy(body.copy),
      };
    }
    if (body.templates) {
      for (const meta of EMAIL_TEMPLATE_META) {
        const row = body.templates[meta.id];
        if (!row) continue;
        current[meta.id] = {
          ...current[meta.id],
          ...pickCopy(row),
        };
      }
    }
    s.emailTemplates = current;
  });

  return NextResponse.json({
    ok: true,
    templates: mergeEmailTemplates((await getStore()).emailTemplates),
  });
}

function pickCopy(row: Partial<EmailTemplateCopy>): Partial<EmailTemplateCopy> {
  const out: Partial<EmailTemplateCopy> = {};
  if (typeof row.subject === "string") out.subject = row.subject;
  if (typeof row.eyebrow === "string") out.eyebrow = row.eyebrow;
  if (typeof row.headline === "string") out.headline = row.headline;
  if (typeof row.body === "string") out.body = row.body;
  if (typeof row.ctaLabel === "string") out.ctaLabel = row.ctaLabel;
  if (typeof row.ctaUrl === "string") out.ctaUrl = row.ctaUrl;
  if (typeof row.uploadLink === "string") out.uploadLink = row.uploadLink;
  return out;
}
