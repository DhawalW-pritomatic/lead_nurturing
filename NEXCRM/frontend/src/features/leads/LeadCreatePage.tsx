import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function LeadCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    source: "Field Visit",
    application_type_id: "",
    notes: "",
    gdpr_consent: false,
  });

  const { data: appTypes } = useQuery({
    queryKey: ["application-types"],
    queryFn: () => api.get("/tenants/application-types").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/leads", data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(
        "Lead enrolled successfully! Welcome message will be sent.",
      );
      navigate(`/leads/${data.id}`);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to create lead"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/leads")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enroll New Lead</h1>
          <p className="text-gray-500 mt-1">Add a new lead to the pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone / WhatsApp
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="+91-9876543210"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lead Source
            </label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="input-field"
            >
              <option>Field Visit</option>
              <option>Cold Call</option>
              <option>Referral</option>
              <option>Event/Expo</option>
              <option>Website</option>
              <option>Ad Campaign</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Type
            </label>
            <select
              value={form.application_type_id}
              onChange={(e) =>
                setForm({ ...form, application_type_id: e.target.value })
              }
              className="input-field"
            >
              <option value="">Select type...</option>
              {(appTypes || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-field"
            rows={3}
            placeholder="Context captured from the field..."
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="consent"
            checked={form.gdpr_consent}
            onChange={(e) =>
              setForm({ ...form, gdpr_consent: e.target.checked })
            }
            className="w-4 h-4 text-brand-600 rounded"
          />
          <label htmlFor="consent" className="text-sm text-gray-700">
            Lead has consented to be contacted
          </label>
        </div>
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? "Enrolling..." : "Enroll Lead"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/leads")}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
