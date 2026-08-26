import React, { useEffect, useState } from "react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import SearchForm from "./SearchForm";

const HeroSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.2);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={ref}
      className="relative h-screen flex flex-col justify-center overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.4), rgba(30, 64, 175, 0.6)), url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80')`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4">
        <div className="text-center text-white max-w-4xl mx-auto mb-20">
          <h1
            className={`text-5xl md:text-7xl font-bold mb-6 leading-tight transition-all duration-1000 ${
              isVisible
                ? "animate-fade-in-up opacity-100"
                : "opacity-0 translate-y-8"
            }`}
          >
            Save Up To 70% On
            <br />
            <span className="text-yellow-300">Every Trip</span> Guaranteed
          </h1>

          <p
            className={`text-xl md:text-2xl mb-8 text-gray-100 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${
              isVisible
                ? "animate-fade-in-up opacity-100"
                : "opacity-0 translate-y-8"
            }`}
          >
            Discover amazing destinations and create unforgettable memories with
            our exclusive travel deals
          </p>

          <button
            className={`bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform ${
              isVisible ? "animate-scale-in opacity-100" : "opacity-0 scale-95"
            } animate-delay-400`}
          >
            Explore Now
          </button>
        </div>

        {/* Search Form positioned at bottom */}
        <div
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-6xl px-4 transition-all duration-1000 ${
            isVisible
              ? "animate-fade-in-up opacity-100"
              : "opacity-0 translate-y-8"
          } animate-delay-500`}
        >
          <SearchForm />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
