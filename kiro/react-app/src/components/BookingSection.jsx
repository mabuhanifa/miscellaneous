import {
  CalendarIcon,
  HomeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const BookingSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.2);
  const [bookingData, setBookingData] = useState({
    checkIn: "",
    checkOut: "",
    guests: 2,
    rooms: 1,
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bookingData.checkIn) {
      newErrors.checkIn = "Check-in date is required";
    }

    if (!bookingData.checkOut) {
      newErrors.checkOut = "Check-out date is required";
    }

    if (bookingData.checkIn && bookingData.checkOut) {
      const checkInDate = new Date(bookingData.checkIn);
      const checkOutDate = new Date(bookingData.checkOut);

      if (checkInDate >= checkOutDate) {
        newErrors.checkOut = "Check-out must be after check-in";
      }

      if (checkInDate < new Date().setHours(0, 0, 0, 0)) {
        newErrors.checkIn = "Check-in date cannot be in the past";
      }
    }

    if (bookingData.guests < 1) {
      newErrors.guests = "At least 1 guest is required";
    }

    if (bookingData.rooms < 1) {
      newErrors.rooms = "At least 1 room is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Calculate total price (mock calculation)
      const nights = Math.ceil(
        (new Date(bookingData.checkOut) - new Date(bookingData.checkIn)) /
          (1000 * 60 * 60 * 24)
      );
      const basePrice = 299; // Base price per night
      const totalPrice = nights * basePrice * bookingData.rooms;

      alert(`Booking Summary:
Check-in: ${bookingData.checkIn}
Check-out: ${bookingData.checkOut}
Guests: ${bookingData.guests}
Rooms: ${bookingData.rooms}
Nights: ${nights}
Total Price: $${totalPrice}

Booking submitted successfully!`);
    }
  };

  const incrementValue = (field) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: prev[field] + 1,
    }));
  };

  const decrementValue = (field) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: Math.max(1, prev[field] - 1),
    }));
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Stay
          </h2>
          <p className="text-lg text-gray-600">
            Complete your booking with our simple and secure process
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="inline h-4 w-4 mr-1" />
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={bookingData.checkIn}
                  onChange={(e) => handleInputChange("checkIn", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.checkIn ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.checkIn && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkIn}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="inline h-4 w-4 mr-1" />
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={bookingData.checkOut}
                  onChange={(e) =>
                    handleInputChange("checkOut", e.target.value)
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.checkOut ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.checkOut && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkOut}</p>
                )}
              </div>
            </div>

            {/* Guest and Room Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="inline h-4 w-4 mr-1" />
                  Number of Guests
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => decrementValue("guests")}
                    className="px-3 py-2 border border-gray-300 rounded-l-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={bookingData.guests}
                    onChange={(e) =>
                      handleInputChange("guests", parseInt(e.target.value) || 1)
                    }
                    className={`w-full px-4 py-2 border-t border-b text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.guests ? "border-red-500" : "border-gray-300"
                    }`}
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => incrementValue("guests")}
                    className="px-3 py-2 border border-gray-300 rounded-r-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    +
                  </button>
                </div>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-600">{errors.guests}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <HomeIcon className="inline h-4 w-4 mr-1" />
                  Number of Rooms
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => decrementValue("rooms")}
                    className="px-3 py-2 border border-gray-300 rounded-l-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={bookingData.rooms}
                    onChange={(e) =>
                      handleInputChange("rooms", parseInt(e.target.value) || 1)
                    }
                    className={`w-full px-4 py-2 border-t border-b text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.rooms ? "border-red-500" : "border-gray-300"
                    }`}
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => incrementValue("rooms")}
                    className="px-3 py-2 border border-gray-300 rounded-r-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    +
                  </button>
                </div>
                {errors.rooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.rooms}</p>
                )}
              </div>
            </div>

            {/* Room Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Type
              </label>
              <select
                value={bookingData.roomType || "standard"}
                onChange={(e) => handleInputChange("roomType", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="standard">Standard Room</option>
                <option value="deluxe">Deluxe Room</option>
                <option value="suite">Suite</option>
                <option value="presidential">Presidential Suite</option>
              </select>
            </div>

            {/* Price Summary */}
            {bookingData.checkIn && bookingData.checkOut && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Booking Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Check-in:</span>
                    <span>{bookingData.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-out:</span>
                    <span>{bookingData.checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nights:</span>
                    <span>
                      {Math.ceil(
                        (new Date(bookingData.checkOut) -
                          new Date(bookingData.checkIn)) /
                          (1000 * 60 * 60 * 24)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span>{bookingData.guests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rooms:</span>
                    <span>{bookingData.rooms}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>
                      $
                      {Math.ceil(
                        (new Date(bookingData.checkOut) -
                          new Date(bookingData.checkIn)) /
                          (1000 * 60 * 60 * 24)
                      ) *
                        299 *
                        bookingData.rooms}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Complete Booking
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;
