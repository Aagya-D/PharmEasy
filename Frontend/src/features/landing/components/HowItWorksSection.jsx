import { User, Stethoscope, Settings } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="px-6 py-20 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Patient Flow */}
          <div className="p-8 bg-white rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-4 mb-6">
              <User size={28} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-600 m-0">
                Patient Workflow
              </h3>
            </div>

            {[
              { step: "Search Medicine", desc: null },
              { step: "View Nearby Pharmacies", desc: null },
              { step: "Check Real-Time Stock", desc: null },
              { step: "Get Directions or SOS", desc: "Submit SOS if unavailable" },
              { step: "Receive Notifications", desc: null },
            ].map((item, idx) => (
              <div key={idx} className={`flex gap-4 ${idx < 4 ? 'mb-6' : ''}`}>
                <div className="min-w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    {item.step}
                  </p>
                  {item.desc && (
                    <p className="text-sm text-gray-600">
                      {item.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pharmacy Admin Flow */}
          <div className="p-8 bg-white rounded-xl border-2 border-green-200">
            <div className="flex items-center gap-4 mb-6">
              <Stethoscope size={28} className="text-green-600" />
              <h3 className="text-lg font-semibold text-green-600 m-0">
                Pharmacy Admin Workflow
              </h3>
            </div>

            {[
              { step: "Register & Verify Pharmacy", desc: null },
              { step: "Upload/Manage Inventory", desc: null },
              { step: "Set Stock Thresholds", desc: null },
              { step: "Respond to SOS Requests", desc: "Real-time notifications" },
              { step: "View Demand Analytics", desc: null },
            ].map((item, idx) => (
              <div key={idx} className={`flex gap-4 ${idx < 4 ? 'mb-6' : ''}`}>
                <div className="min-w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    {item.step}
                  </p>
                  {item.desc && (
                    <p className="text-sm text-gray-600">
                      {item.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* System Admin Flow */}
          <div className="p-8 bg-white rounded-xl border-2 border-yellow-200">
            <div className="flex items-center gap-4 mb-6">
              <Settings size={28} className="text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-600 m-0">
                System Admin Workflow
              </h3>
            </div>

            {[
              "Verify Pharmacies",
              "Monitor Platform",
              "View System Analytics",
              "Manage User Disputes",
              "Generate Reports",
            ].map((step, idx) => (
              <div key={idx} className={`flex gap-4 ${idx < 4 ? 'mb-6' : ''}`}>
                <div className="min-w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <p className="font-medium text-gray-900">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
