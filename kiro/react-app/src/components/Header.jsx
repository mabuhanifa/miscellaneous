import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-600">NEXUS</div>
          </div>

          {/* Desktop Navigation - Center */}
          <nav
            className="hidden md:flex items-center space-x-8"
            role="navigation"
            aria-label="Main navigation"
          >
            <a
              href="#"
              className="text-gray-900 hover:text-blue-600 font-medium"
            >
              Home
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              About
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              Services
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              Contact
            </a>
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="text-gray-600 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2">
              Login
            </button>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Sign Up
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div
              className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <a href="#" className="block px-3 py-2 text-gray-900 font-medium">
                Home
              </a>
              <a
                href="#"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                About
              </a>
              <a
                href="#"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                Services
              </a>
              <a
                href="#"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                Contact
              </a>
              <div className="border-t pt-4 mt-4">
                <button className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900">
                  Login
                </button>
                <button className="block w-full mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
