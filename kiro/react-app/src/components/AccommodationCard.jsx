import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { optimizeImageUrl } from "../hooks/usePerformance";
import LazyImage from "./LazyImage";

const AccommodationCard = ({
  images,
  name,
  location,
  rating,
  reviewCount,
  price,
  amenities,
  description,
}) => {
  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i} className="h-4 w-4 text-yellow-400" />);
      } else {
        stars.push(
          <StarOutlineIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }

    return stars;
  };

  return (
    <article
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
      role="article"
      aria-labelledby={`accommodation-${name
        .replace(/\s+/g, "-")
        .toLowerCase()}`}
    >
      {/* Image Section */}
      <div className="relative">
        <LazyImage
          src={optimizeImageUrl(images[0], {
            width: 400,
            height: 300,
            quality: 85,
          })}
          alt={`${name} - Main view of accommodation in ${location}`}
          className="w-full h-48 object-cover"
        />
        {images.length > 1 && (
          <div
            className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm"
            aria-label={`${images.length - 1} additional photos available`}
          >
            +{images.length - 1} photos
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-3">
          <h3
            id={`accommodation-${name.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {name}
          </h3>
          <p
            className="text-sm text-gray-600"
            aria-label={`Located in ${location}`}
          >
            {location}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center mb-3">
          <div
            className="flex items-center"
            role="img"
            aria-label={`${rating} out of 5 stars`}
          >
            {renderStars(rating)}
          </div>
          <span
            className="ml-2 text-sm text-gray-600"
            aria-label={`Rating: ${rating} out of 5 stars based on ${reviewCount} reviews`}
          >
            {rating} ({reviewCount} reviews)
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* Amenities */}
        {amenities && amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {amenities.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Price and Booking */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">${price}</span>
            <span className="text-sm text-gray-600 ml-1">/ night</span>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Book ${name} accommodation in ${location}`}
          >
            Book Now
          </button>
        </div>
      </div>
    </article>
  );
};

export default AccommodationCard;
