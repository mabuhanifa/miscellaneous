import React from "react";
import {
  useScrollAnimation,
  useStaggeredAnimation,
} from "../hooks/useScrollAnimation";
import DestinationCard from "./DestinationCard";

const DestinationsSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.2);
  const [visibleItems, setTriggerAnimation] = useStaggeredAnimation(3, 200);

  React.useEffect(() => {
    if (isVisible) {
      setTriggerAnimation(true);
    }
  }, [isVisible, setTriggerAnimation]);
  const destinations = [
    {
      id: 1,
      title: "Bali, Indonesia",
      description: "Tropical paradise with stunning beaches",
      image:
        "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: "299",
    },
    {
      id: 2,
      title: "Paris, France",
      description: "City of lights and romance",
      image:
        "https://images.unsplash.com/photo-1502602898536-47ad22581b52?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: "599",
    },
    {
      id: 3,
      title: "Tokyo, Japan",
      description: "Modern metropolis meets ancient culture",
      image:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: "799",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          <p className="text-lg text-gray-600">
            Discover the world's most amazing places
          </p>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {destinations.map((destination, index) => (
            <div
              key={destination.id}
              className={`transition-all duration-700 ${
                visibleItems.has(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: `${index * 200}ms`,
              }}
            >
              <DestinationCard
                image={destination.image}
                title={destination.title}
                description={destination.description}
                price={destination.price}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DestinationsSection;
