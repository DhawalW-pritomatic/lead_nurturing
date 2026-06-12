import { useMemo } from "react";
import { X, Edit2, Mail, Tag, Monitor } from "lucide-react";

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  category: string;
  tenant_id: string;
  assigned_from_id?: string | null;
  tenant?: { id: string; name: string };
  assignedTenants?: { id: string; name: string }[];
}

interface Props {
  template: Template | null;
  onClose: () => void;
  onEdit: (t: Template) => void;
}

const SAMPLE_VARS: Record<string, string> = {
  "lead.first_name":       "John",
  "lead.last_name":        "Doe",
  "lead.email":            "john.doe@example.com",
  "lead.phone":            "+1 (555) 234-5678",
  "lead.company":          "Acme Corp",
  "company.name":          "Acme Corp",
  "rep.name":              "Sarah Smith",
  "rep.first_name":        "Sarah",
  "rep.email":             "sarah@yourcompany.com",
  "rep.phone":             "+1 (555) 987-6543",
  "tracking.cta_url":      "#",
  "tracking.unsubscribe_url": "#",
  "tracking.pixel_url":    "",
};

function resolveVars(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return SAMPLE_VARS[trimmed] ?? `[${trimmed}]`;
  });
}

const categoryColors: Record<string, string> = {
  welcome:       "bg-green-100 text-green-700",
  onboarding:    "bg-blue-100 text-blue-700",
  follow_up:     "bg-purple-100 text-purple-700",
  discount:      "bg-amber-100 text-amber-700",
  post_purchase: "bg-teal-100 text-teal-700",
  reengagement:  "bg-orange-100 text-orange-700",
  general:       "bg-gray-100 text-gray-700",
};

export default function TemplatePreviewModal({ template, onClose, onEdit }: Props) {
  const resolvedSubject = useMemo(
    () => (template?.subject ? resolveVars(template.subject) : "(No subject)"),
    [template]
  );

  const resolvedBody = useMemo(() => {
    if (!template?.body) return "";
    const body = resolveVars(template.body);
    // Wrap plain text (no HTML tags) in a styled div so it renders nicely
    const hasHtml = /<[a-z][\s\S]*>/i.test(body);
    if (hasHtml) return body;
    return body
      .split("\n")
      .map((line) => (line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : "<br/>"))
      .join("");
  }, [template]);

  const iframeDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2937;
    background: #f9fafb;
  }
  .email-wrap {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .email-body { padding: 32px; }
  img  { max-width: 100%; height: auto; display: block; margin: 12px 0; }
  a    { color: #0891b2; }
  p    { margin: 0 0 14px; }
  h1,h2,h3 { margin: 0 0 12px; line-height: 1.3; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 8px; border: 1px solid #e5e7eb; }
  ul,ol { padding-left: 20px; margin: 0 0 14px; }
</style>
</head>
<body>
  <div class="email-wrap">
    <div class="email-body">${resolvedBody}</div>
  </div>
</body>
</html>`;

  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-100 rounded-lg">
              <Monitor className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">{template.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${categoryColors[template.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {template.category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {template.channel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEdit(template); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fake email client chrome */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 space-y-1.5 text-xs">
          <div className="flex gap-2">
            <span className="text-gray-400 w-12 shrink-0">From</span>
            <span className="text-gray-700 font-medium">Sarah Smith &lt;sarah@yourcompany.com&gt;</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-12 shrink-0">To</span>
            <span className="text-gray-700">John Doe &lt;john.doe@example.com&gt;</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-12 shrink-0">Subject</span>
            <span className="text-gray-900 font-semibold truncate">{resolvedSubject}</span>
          </div>
        </div>

        {/* Sample data notice */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Variables replaced with sample data for preview.{" "}
            <span className="font-medium">Actual emails use real lead &amp; rep data.</span>
          </p>
        </div>

        {/* iframe body */}
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          <iframe
            title="Template Preview"
            srcDoc={iframeDoc}
            sandbox="allow-same-origin"
            className="w-full h-full border-0"
            style={{ minHeight: "400px" }}
          />
        </div>
      </div>
    </div>
  );
}
