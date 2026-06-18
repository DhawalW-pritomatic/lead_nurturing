import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api
        .post("/bulk-import/tenant", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(
        `Import complete: ${data.total_created || data.created} leads created.`,
      );
      setFile(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Import failed"),
  });

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a CSV file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk CSV Import</h1>
        <p className="text-gray-500 mt-1">
          Import leads from a CSV file into your tenant.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-400 transition">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block mx-auto text-sm text-gray-600"
          />
          {file && (
            <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
              <FileText className="w-4 h-4" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Required CSV Columns
          </h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>Always required:</strong> first_name, last_name, email
            </p>
            <p>
              <strong>Optional:</strong> phone, company, city, source, consent
            </p>

          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {importMutation.isPending ? "Importing..." : "Import CSV"}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Import Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {result.total_in_file || result.total_rows}
              </p>
              <p className="text-xs text-gray-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {result.created || result.total_created}
              </p>
              <p className="text-xs text-green-600">Created</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">
                {result.duplicates_skipped || result.total_duplicates || 0}
              </p>
              <p className="text-xs text-amber-600">Duplicates Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">
                {result.errors || result.total_errors || 0}
              </p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>

          {result.tenant_results && result.tenant_results.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Per-Tenant Results
              </h4>
              <div className="space-y-2">
                {result.tenant_results.map((tr: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium">
                      {tr.tenant} ({tr.subdomain})
                    </span>
                    <span className="text-xs text-gray-600">
                      {tr.created} created, {tr.duplicates} duplicates
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.error_details && result.error_details.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Error Details
              </h4>
              <div className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {result.error_details.map((err: any, i: number) => (
                  <p key={i}>
                    {err.error} — {JSON.stringify(err.row).substring(0, 80)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
