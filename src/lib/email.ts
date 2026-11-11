/**
 * Email template catalog — editable copy lives in the store via email-templates.
 * Kept so older imports keep resolving.
 */

export {
  EMAIL_TEMPLATE_META as EMAIL_TEMPLATES,
  DEFAULT_EMAIL_TEMPLATES,
  getTemplateMeta as getEmailTemplate,
  mergeEmailTemplates,
  renderEditableEmail,
  type EditableEmailTemplateId as EmailTemplateId,
  type EmailTemplateCopy,
  type EmailTemplateMeta as EmailTemplate,
  type StoredEmailTemplates,
} from "@/lib/email-templates";
