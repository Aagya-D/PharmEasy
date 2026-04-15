import { User, Stethoscope, Settings } from "lucide-react";

export function HowItWorksSection() {
  const flows = [
    {
      icon: User,
      title: "Patient Workflow",
      iconClass: "text-[#007f95]",
      ringClass: "ring-cyan-200",
      stepClass: "bg-[#0097b2]",
      steps: [
        { step: "Search Medicine", desc: null },
        { step: "View Nearby Pharmacies", desc: null },
        { step: "Check Real-Time Stock", desc: null },
        { step: "Get Directions or SOS", desc: "Submit SOS if unavailable" },
        { step: "Receive Notifications", desc: null },
      ],
    },
    {
      icon: Stethoscope,
      title: "Pharmacy Admin Workflow",
      iconClass: "text-[#0a6c80]",
      ringClass: "ring-cyan-200",
      stepClass: "bg-[#0a8aa4]",
      steps: [
        { step: "Register & Verify Pharmacy", desc: null },
        { step: "Upload/Manage Inventory", desc: null },
        { step: "Set Stock Thresholds", desc: null },
        { step: "Respond to SOS Requests", desc: "Real-time notifications" },
        { step: "View Demand Analytics", desc: null },
      ],
    },
    {
      icon: Settings,
      title: "System Admin Workflow",
      iconClass: "text-[#075f72]",
      ringClass: "ring-cyan-200",
      stepClass: "bg-[#0d7489]",
      steps: [
        { step: "Verify Pharmacies", desc: null },
        { step: "Monitor Platform", desc: null },
        { step: "View System Analytics", desc: null },
        { step: "Manage User Disputes", desc: null },
        { step: "Generate Reports", desc: null },
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className="px-6 py-20 bg-[#f7f6f3]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Intro label */}
        <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-[#007f95]/80">
          WORKFLOW DESIGN
        </p>

        <h2 className="landing-display text-4xl text-gray-900 mb-14 text-center md:text-5xl">
          How It Works
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {flows.map((flow) => {
            const Icon = flow.icon;

            return (
              <div
                key={flow.title}
                className={`rounded-2xl bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] ring-1 ${flow.ringClass}`}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 ${flow.iconClass}`}>
                    <Icon size={21} />
                  </div>
                  <h3 className={`m-0 text-lg font-semibold ${flow.iconClass}`}>
                    {flow.title}
                  </h3>
                </div>

                {flow.steps.map((item, idx) => (
                  <div key={item.step} className={`flex gap-4 ${idx < flow.steps.length - 1 ? "mb-5" : ""}`}>
                    <div className={`flex h-8 w-8 min-w-8 items-center justify-center rounded-full text-sm font-bold text-white ${flow.stepClass}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-gray-900">
                        {item.step}
                      </p>
                      {item.desc ? (
                        <p className="text-sm text-gray-600">
                          {item.desc}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
