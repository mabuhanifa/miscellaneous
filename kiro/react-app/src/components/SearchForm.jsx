import {
  CalendarIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

const SearchForm = () => {
  const [searchData, setSearchData] = useState({
    destination: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
  });

  const handleInputChange = (field, value) => {
    setSearchData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Search data:", searchData);
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-2xl p-6 mx-auto"
      role="search"
      aria-label="Travel search form"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:flex-row gap-4 items-end"
        role="form"
        aria-label="Search for travel destinations"
      >
        {/* Destination */}
        <div className="flex-1">
          <label
            htmlFor="destination"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Where to?
          </label>
          <div className="relative">
            <MapPinIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="destination"
              type="text"
              placeholder="Search destinations"
              value={searchData.destination}
              onChange={(e) => handleInputChange("destination", e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              aria-describedby="destination-help"
            />
          </div>
          <div id="destination-help" className="sr-only">
            Enter your desired travel destination
          </div>
        </div>

        {/* Check-in Date */}
        <div className="flex-1">
          <label
            htmlFor="checkin"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Check-in
          </label>
          <div className="relative">
            <CalendarIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="checkin"
              type="date"
              value={searchData.checkIn}
              onChange={(e) => handleInputChange("checkIn", e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              aria-describedby="checkin-help"
            />
          </div>
          <div id="checkin-help" className="sr-only">
            Select your check-in date
          </div>
        </div>

        {/* Check-out Date */}
        <div className="flex-1">
          <label
            htmlFor="checkout"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Check-out
          </label>
          <div className="relative">
            <CalendarIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="checkout"
              type="date"
              value={searchData.checkOut}
              onChange={(e) => handleInputChange("checkOut", e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              aria-describedby="checkout-help"
            />
          </div>
          <div id="checkout-help" className="sr-only">
            Select your check-out date
          </div>
        </div>

        {/* Guests */}
        <div className="flex-1">
          <label
            htmlFor="guests"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Guests
          </label>
          <div className="relative">
            <UserGroupIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <select
              id="guests"
              value={searchData.guests}
              onChange={(e) =>
                handleInputChange("guests", parseInt(e.target.value))
              }
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
              aria-describedby="guests-help"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
          </div>
          <div id="guests-help" className="sr-only">
            Select the number of guests for your trip
          </div>
        </div>

        {/* Search Button */}
        <div className="flex-shrink-0">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center space-x-2 h-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Search for travel options"
          >
            <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
            <span>Search</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
