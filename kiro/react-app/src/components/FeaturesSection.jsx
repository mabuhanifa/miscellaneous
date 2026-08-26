import {
  ClockIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import {
  useScrollAnimation,
  useStaggeredAnimation,
} from "../hooks/useScrollAnimation";

const FeaturesSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.2);
  const [visibleItems, setTriggerAnimation] = useStaggeredAnimation(4, 150);

  React.useEffect(() => {
    if (isVisible) {
      setTriggerAnimation(true);
    }
  }, [isVisible, setTriggerAnimation]);

  const features = [
    {
      icon: GlobeAltIcon,
      title: "Worldwide Coverage",
      description: "Access to destinations across the globe",
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure Booking",
      description: "Safe and secure payment processing",
    },
    {
      icon: CurrencyDollarIcon,
      title: "Best Prices",
      description: "Guaranteed lowest prices available",
    },
    {
      icon: ClockIcon,
      title: "24/7 Support",
      description: "Round-the-clock customer assistance",
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            All in One Solution
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need for the perfect trip, all in one place
          </p>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className={`text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 group ${
                visibleItems.has(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${index * 150}ms`,
              }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-200 transition-colors duration-300 group-hover:scale-110 transform">
                <feature.icon className="h-6 w-6 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
