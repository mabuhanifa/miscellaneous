import React from "react";
import { optimizeImageUrl } from "../hooks/usePerformance";
import LazyImage from "./LazyImage";

const DestinationCard = ({ image, title, description, price }) => {
  return (
    <article
      className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transform hover:-translate-y-2 hover:scale-105"
      role="article"
      tabIndex="0"
      aria-labelledby={`destination-${title
        .replace(/\s+/g, "-")
        .toLowerCase()}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          // Handle click action here
        }
      }}
    >
      <div className="aspect-w-16 aspect-h-12">
        <LazyImage
          src={optimizeImageUrl(image, {
            width: 600,
            height: 400,
            quality: 85,
          })}
          alt={`${title} - ${description}`}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-500"
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform group-hover:translate-y-0 transition-transform duration-500">
        <h3
          id={`destination-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-xl font-bold mb-2 group-hover:text-yellow-300 transition-colors duration-300"
        >
          {title}
        </h3>
        <p className="text-sm text-gray-200 mb-2">{description}</p>
        {price && (
          <p
            className="text-lg font-semibold"
            aria-label={`Starting from $${price} per person`}
          >
            From ${price}
          </p>
        )}
      </div>
    </article>
  );
};

export default DestinationCard;
