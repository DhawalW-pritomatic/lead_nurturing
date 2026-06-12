import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import OutreachPage from "../outreach/OutreachPage";
import CallsPage from "../calls/CallsPage";
import WhatsAppPage from "./WhatsAppPage";

type Tab = "email" | "call" | "whatsapp";

export default function NurturingPage() {
  const [tab, setTab] = useState<Tab>("email");
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nurturing</h1>
          <p className="text-gray-500 text-sm mt-1">Manage outreach across email, calls, and WhatsApp</p>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Nurturing Settings"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["email", "call", "whatsapp"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "email" ? "Email" : t === "call" ? "Calls" : "WhatsApp"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "email" && <OutreachPage embedded />}
      {tab === "call" && <CallsPage embedded />}
      {tab === "whatsapp" && <WhatsAppPage />}
    </div>
  );
}
