import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { BookOpen, TrendingUp, Target } from "lucide-react";

export default function GuidelinesPage() {
  const { data: scoring } = useQuery({
    queryKey: ["scoring-weights"],
    queryFn: () => api.get("/scoring/weights").then((r) => r.data),
  });

  const { data: thresholds } = useQuery({
    queryKey: ["scoring-thresholds"],
    queryFn: () => api.get("/scoring/thresholds").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-orange-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Scoring Guidelines
          </h1>
        </div>
        <p className="text-gray-500 mt-1">
          Lead scoring rules and engagement thresholds
        </p>
      </div>

      {/* Lead Type Thresholds */}
      {thresholds && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-gray-900">
              Lead Type Thresholds
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Score ranges that determine lead classification and prioritization
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">❄️</span>
              </div>
              <p className="text-sm text-blue-600 font-semibold mb-1">Cold Lead</p>
              <p className="text-2xl font-bold text-blue-800 mb-2">
                {thresholds.cold?.min}–{thresholds.cold?.max}
              </p>
              <p className="text-xs text-blue-700">
                Low engagement, requires nurturing
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 text-center">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">🔥</span>
              </div>
              <p className="text-sm text-amber-600 font-semibold mb-1">Warm Lead</p>
              <p className="text-2xl font-bold text-amber-800 mb-2">
                {thresholds.warm?.min}–{thresholds.warm?.max}
              </p>
              <p className="text-xs text-amber-700">
                Moderate engagement, follow up
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">🚀</span>
              </div>
              <p className="text-sm text-red-600 font-semibold mb-1">Hot Lead</p>
              <p className="text-2xl font-bold text-red-800 mb-2">
                {thresholds.hot?.min}+
              </p>
              <p className="text-xs text-red-700">
                High engagement, sales ready
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Weights */}
      {scoring && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-gray-900">
              Engagement Scoring Weights
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Points assigned for each engagement activity
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(scoring).map(([key, value]) => (
              <div
                key={key}
                className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  (value as number) > 0
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  {key.replace(/_/g, " ")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (value as number) > 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {(value as number) > 0 ? "+" : ""}
                  {value as number}
                </p>
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (value as number) > 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(Math.abs(value as number) * 5, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
            <p className="text-sm text-cyan-900 font-medium mb-1">
              💡 How Scoring Works
            </p>
            <p className="text-xs text-cyan-800">
              Each lead starts with a base score. As they engage with your
              content (opening emails, clicking links, visiting pages), points
              are added or subtracted based on these weights. The total score
              determines their classification (Cold/Warm/Hot) and routing
              priority.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
