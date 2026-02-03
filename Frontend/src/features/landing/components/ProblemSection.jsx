import { AlertCircle, Eye, TrendingUp, LogIn } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="px-6 py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          The Healthcare Gap We're Solving
        </h2>

        <p className="text-base text-gray-600 max-w-4xl mx-auto mb-16 text-center leading-relaxed">
          Fragmented pharmaceutical supply chains create information asymmetry.
          Patients waste time and resources searching for medicines across
          multiple locations, while pharmacies lack visibility into demand and
          inventory optimization.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: AlertCircle,
              title: "Pharmacy Hopping",
              desc: "Patients visit multiple locations to find a single medicine, especially critical during emergencies",
            },
            {
              icon: Eye,
              title: "Lack of Visibility",
              desc: "No centralized system to track inventory across pharmacies. Stock-outs go unnoticed until too late",
            },
            {
              icon: TrendingUp,
              title: "Reactive Not Proactive",
              desc: "Pharmacies cannot anticipate demand, leading to wastage or shortages without warning",
            },
            {
              icon: LogIn,
              title: "Information Asymmetry",
              desc: "Patients have no way to know which pharmacy has their required medicine in stock",
            },
          ].map((problem, idx) => {
            const Icon = problem.icon;
            return (
              <div
                key={idx}
                className="p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow duration-300"
              >
                <Icon size={40} className="text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {problem.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {problem.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
