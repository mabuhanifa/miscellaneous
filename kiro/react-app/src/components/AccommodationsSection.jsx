import React from "react";
import {
  useScrollAnimation,
  useStaggeredAnimation,
} from "../hooks/useScrollAnimation";
import AccommodationCard from "./AccommodationCard";

const AccommodationsSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.2);
  const [visibleItems, setTriggerAnimation] = useStaggeredAnimation(6, 150);

  React.useEffect(() => {
    if (isVisible) {
      setTriggerAnimation(true);
    }
  }, [isVisible, setTriggerAnimation]);
  const accommodations = [
    {
      id: 1,
      name: "Luxury Beach Resort",
      location: "Bali, Indonesia",
      images: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.8,
      reviewCount: 324,
      pricePerNight: 299,
      amenities: ["Pool", "Spa", "Beach Access", "WiFi", "Restaurant", "Gym"],
      description:
        "Experience luxury at its finest with stunning ocean views, world-class amenities, and exceptional service in this beachfront paradise.",
      available: true,
    },
    {
      id: 2,
      name: "Boutique City Hotel",
      location: "Paris, France",
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.6,
      reviewCount: 189,
      pricePerNight: 599,
      amenities: ["WiFi", "Concierge", "Room Service", "Business Center"],
      description:
        "Charming boutique hotel in the heart of Paris, walking distance to major attractions and featuring elegant French design.",
      available: true,
    },
    {
      id: 3,
      name: "Modern Tokyo Suites",
      location: "Tokyo, Japan",
      images: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.7,
      reviewCount: 256,
      pricePerNight: 799,
      amenities: [
        "WiFi",
        "Fitness Center",
        "City Views",
        "Kitchenette",
        "Laundry",
      ],
      description:
        "Contemporary suites offering panoramic city views and modern amenities in the vibrant heart of Tokyo.",
      available: true,
    },
    {
      id: 4,
      name: "Mountain Lodge Retreat",
      location: "Swiss Alps, Switzerland",
      images: [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.9,
      reviewCount: 142,
      pricePerNight: 450,
      amenities: [
        "Fireplace",
        "Mountain Views",
        "Hiking Trails",
        "WiFi",
        "Restaurant",
      ],
      description:
        "Cozy mountain lodge offering breathtaking alpine views and access to world-class skiing and hiking trails.",
      available: true,
    },
    {
      id: 5,
      name: "Desert Oasis Resort",
      location: "Dubai, UAE",
      images: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.5,
      reviewCount: 298,
      pricePerNight: 650,
      amenities: [
        "Pool",
        "Spa",
        "Desert Safari",
        "WiFi",
        "Multiple Restaurants",
        "Golf Course",
      ],
      description:
        "Luxurious desert resort featuring traditional Arabian hospitality with modern amenities and stunning desert landscapes.",
      available: true,
    },
    {
      id: 6,
      name: "Coastal Villa Escape",
      location: "Santorini, Greece",
      images: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      ],
      rating: 4.8,
      reviewCount: 167,
      pricePerNight: 520,
      amenities: [
        "Ocean Views",
        "Private Pool",
        "WiFi",
        "Kitchenette",
        "Terrace",
      ],
      description:
        "Stunning clifftop villa with panoramic Aegean Sea views, featuring traditional Cycladic architecture and modern comforts.",
      available: true,
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Accommodations
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover handpicked hotels and resorts that offer exceptional
            experiences and comfort
          </p>
        </div>

        {/* Filter Options */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            All Properties
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Hotels
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Resorts
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Villas
          </button>
        </div>

        {/* Accommodations Grid */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {accommodations.map((accommodation, index) => (
            <div
              key={accommodation.id}
              className={`transition-all duration-700 ${
                visibleItems.has(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: `${index * 150}ms`,
              }}
            >
              <AccommodationCard
                images={accommodation.images}
                name={accommodation.name}
                location={accommodation.location}
                rating={accommodation.rating}
                reviewCount={accommodation.reviewCount}
                price={accommodation.pricePerNight}
                amenities={accommodation.amenities}
                description={accommodation.description}
              />
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-600 hover:text-white transition-colors">
            Load More Properties
          </button>
        </div>
      </div>
    </section>
  );
};

export default AccommodationsSection;
