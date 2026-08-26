/**
 * Localization Service for Bangladesh eCommerce Platform
 * Handles Bengali language support, currency formatting, and regional features
 */

class LocalizationService {
  constructor() {
    this.defaultLocale = "bn-BD";
    this.supportedLocales = ["bn-BD", "en-US"];
    this.defaultCurrency = "BDT";
    this.timezone = "Asia/Dhaka";

    // Bengali numerals mapping
    this.bengaliNumerals = {
      0: "০",
      1: "১",
      2: "২",
      3: "৩",
      4: "৪",
      5: "৫",
      6: "৬",
      7: "৭",
      8: "৮",
      9: "৯",
    };

    // English to Bengali numerals mapping (reverse)
    this.englishNumerals = Object.fromEntries(
      Object.entries(this.bengaliNumerals).map(([k, v]) => [v, k])
    );
  }

  /**
   * Format currency for Bangladesh (BDT)
   * @param {number} amount - Amount to format
   * @param {string} locale - Locale (bn-BD or en-US)
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted currency string
   */
  formatCurrency(amount, locale = "bn-BD", options = {}) {
    const {
      showSymbol = true,
      useBengaliNumerals = locale === "bn-BD",
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options;

    // Format the number
    let formatted;

    if (locale === "bn-BD") {
      // Bengali locale formatting
      formatted = new Intl.NumberFormat("bn-BD", {
        style: showSymbol ? "currency" : "decimal",
        currency: "BDT",
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount);
    } else {
      // English locale formatting
      formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount);

      if (showSymbol) {
        formatted = `৳${formatted}`;
      }
    }

    // Convert to Bengali numerals if requested
    if (useBengaliNumerals && locale === "bn-BD") {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Convert English numerals to Bengali numerals
   * @param {string} text - Text containing English numerals
   * @returns {string} - Text with Bengali numerals
   */
  convertToBengaliNumerals(text) {
    return text.replace(
      /[0-9]/g,
      (digit) => this.bengaliNumerals[digit] || digit
    );
  }

  /**
   * Convert Bengali numerals to English numerals
   * @param {string} text - Text containing Bengali numerals
   * @returns {string} - Text with English numerals
   */
  convertToEnglishNumerals(text) {
    return text.replace(
      /[০-৯]/g,
      (digit) => this.englishNumerals[digit] || digit
    );
  }

  /**
   * Format date and time for Bangladesh
   * @param {Date} date - Date to format
   * @param {string} locale - Locale
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted date string
   */
  formatDateTime(date, locale = "bn-BD", options = {}) {
    const {
      dateStyle = "medium",
      timeStyle = "short",
      timeZone = this.timezone,
      useBengaliNumerals = locale === "bn-BD",
    } = options;

    const formatOptions = {
      timeZone,
      dateStyle,
      timeStyle,
    };

    let formatted = new Intl.DateTimeFormat(locale, formatOptions).format(date);

    if (useBengaliNumerals && locale === "bn-BD") {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Format date only
   * @param {Date} date - Date to format
   * @param {string} locale - Locale
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted date string
   */
  formatDate(date, locale = "bn-BD", options = {}) {
    const {
      dateStyle = "medium",
      timeZone = this.timezone,
      useBengaliNumerals = locale === "bn-BD",
    } = options;

    const formatOptions = {
      timeZone,
      dateStyle,
    };

    let formatted = new Intl.DateTimeFormat(locale, formatOptions).format(date);

    if (useBengaliNumerals && locale === "bn-BD") {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Format time only
   * @param {Date} date - Date to format
   * @param {string} locale - Locale
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted time string
   */
  formatTime(date, locale = "bn-BD", options = {}) {
    const {
      timeStyle = "short",
      timeZone = this.timezone,
      useBengaliNumerals = locale === "bn-BD",
    } = options;

    const formatOptions = {
      timeZone,
      timeStyle,
    };

    let formatted = new Intl.DateTimeFormat(locale, formatOptions).format(date);

    if (useBengaliNumerals && locale === "bn-BD") {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Format numbers with proper locale
   * @param {number} number - Number to format
   * @param {string} locale - Locale
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted number string
   */
  formatNumber(number, locale = "bn-BD", options = {}) {
    const {
      useBengaliNumerals = locale === "bn-BD",
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
    } = options;

    let formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(number);

    if (useBengaliNumerals && locale === "bn-BD") {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Get current time in Bangladesh timezone
   * @returns {Date} - Current date/time in Bangladesh timezone
   */
  getCurrentBangladeshTime() {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: this.timezone })
    );
  }

  /**
   * Convert UTC time to Bangladesh time
   * @param {Date} utcDate - UTC date
   * @returns {Date} - Bangladesh time
   */
  convertToBangladeshTime(utcDate) {
    return new Date(
      utcDate.toLocaleString("en-US", { timeZone: this.timezone })
    );
  }

  /**
   * Get localized text based on locale
   * @param {string} key - Translation key
   * @param {string} locale - Locale
   * @param {Object} params - Parameters for interpolation
   * @returns {string} - Localized text
   */
  getText(key, locale = "bn-BD", params = {}) {
    const translations = this.getTranslations();

    let text =
      translations[locale]?.[key] || translations["en-US"]?.[key] || key;

    // Simple parameter interpolation
    Object.keys(params).forEach((param) => {
      text = text.replace(new RegExp(`{{${param}}}`, "g"), params[param]);
    });

    return text;
  }

  /**
   * Get translation dictionary
   * @returns {Object} - Translation dictionary
   */
  getTranslations() {
    return {
      "bn-BD": {
        // Common terms
        welcome: "স্বাগতম",
        hello: "হ্যালো",
        goodbye: "বিদায়",
        thank_you: "ধন্যবাদ",
        please: "অনুগ্রহ করে",
        yes: "হ্যাঁ",
        no: "না",

        // E-commerce terms
        product: "পণ্য",
        products: "পণ্যসমূহ",
        category: "বিভাগ",
        categories: "বিভাগসমূহ",
        price: "দাম",
        total: "মোট",
        subtotal: "উপমোট",
        discount: "ছাড়",
        tax: "কর",
        shipping: "শিপিং",
        delivery: "ডেলিভারি",
        order: "অর্ডার",
        orders: "অর্ডারসমূহ",
        cart: "কার্ট",
        checkout: "চেকআউট",
        payment: "পেমেন্ট",
        customer: "গ্রাহক",
        customers: "গ্রাহকগণ",

        // Order status
        pending: "অপেক্ষমাণ",
        confirmed: "নিশ্চিত",
        processing: "প্রক্রিয়াধীন",
        shipped: "পাঠানো হয়েছে",
        delivered: "ডেলিভার হয়েছে",
        cancelled: "বাতিল",

        // Payment methods
        cash_on_delivery: "ক্যাশ অন ডেলিভারি",
        bkash: "বিকাশ",
        nagad: "নগদ",
        rocket: "রকেট",
        bank_transfer: "ব্যাংক ট্রান্সফার",

        // Time periods
        today: "আজ",
        yesterday: "গতকাল",
        tomorrow: "আগামীকাল",
        this_week: "এই সপ্তাহ",
        this_month: "এই মাস",
        this_year: "এই বছর",

        // Actions
        add: "যোগ করুন",
        edit: "সম্পাদনা",
        delete: "মুছুন",
        save: "সংরক্ষণ",
        cancel: "বাতিল",
        submit: "জমা দিন",
        search: "খুঁজুন",
        filter: "ফিল্টার",
        sort: "সাজান",

        // Messages
        order_placed: "আপনার অর্ডার সফলভাবে দেওয়া হয়েছে",
        payment_successful: "পেমেন্ট সফল হয়েছে",
        order_confirmed: "অর্ডার নিশ্চিত করা হয়েছে",
        out_of_stock: "স্টক নেই",
        low_stock: "কম স্টক",
      },
      "en-US": {
        // Common terms
        welcome: "Welcome",
        hello: "Hello",
        goodbye: "Goodbye",
        thank_you: "Thank you",
        please: "Please",
        yes: "Yes",
        no: "No",

        // E-commerce terms
        product: "Product",
        products: "Products",
        category: "Category",
        categories: "Categories",
        price: "Price",
        total: "Total",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        shipping: "Shipping",
        delivery: "Delivery",
        order: "Order",
        orders: "Orders",
        cart: "Cart",
        checkout: "Checkout",
        payment: "Payment",
        customer: "Customer",
        customers: "Customers",

        // Order status
        pending: "Pending",
        confirmed: "Confirmed",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",

        // Payment methods
        cash_on_delivery: "Cash on Delivery",
        bkash: "bKash",
        nagad: "Nagad",
        rocket: "Rocket",
        bank_transfer: "Bank Transfer",

        // Time periods
        today: "Today",
        yesterday: "Yesterday",
        tomorrow: "Tomorrow",
        this_week: "This Week",
        this_month: "This Month",
        this_year: "This Year",

        // Actions
        add: "Add",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        submit: "Submit",
        search: "Search",
        filter: "Filter",
        sort: "Sort",

        // Messages
        order_placed: "Your order has been placed successfully",
        payment_successful: "Payment successful",
        order_confirmed: "Order confirmed",
        out_of_stock: "Out of stock",
        low_stock: "Low stock",
      },
    };
  }

  /**
   * Validate locale
   * @param {string} locale - Locale to validate
   * @returns {boolean} - Whether locale is supported
   */
  isValidLocale(locale) {
    return this.supportedLocales.includes(locale);
  }

  /**
   * Get default locale
   * @returns {string} - Default locale
   */
  getDefaultLocale() {
    return this.defaultLocale;
  }

  /**
   * Get supported locales
   * @returns {Array} - Array of supported locales
   */
  getSupportedLocales() {
    return this.supportedLocales;
  }

  /**
   * Get timezone
   * @returns {string} - Timezone string
   */
  getTimezone() {
    return this.timezone;
  }

  /**
   * Format phone number for Bangladesh
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Handle different formats
    if (cleaned.startsWith("880")) {
      // International format
      return `+${cleaned}`;
    } else if (cleaned.startsWith("01") && cleaned.length === 11) {
      // Local format
      return `+880${cleaned.substring(1)}`;
    } else if (cleaned.length === 10 && cleaned.startsWith("1")) {
      // Without leading 0
      return `+880${cleaned}`;
    }

    return phoneNumber; // Return original if can't format
  }

  /**
   * Validate Bangladesh phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - Whether phone number is valid
   */
  isValidPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Check various valid formats
    const patterns = [
      /^880[1-9]\d{8}$/, // +880xxxxxxxxx
      /^01[3-9]\d{8}$/, // 01xxxxxxxxx
      /^1[3-9]\d{8}$/, // 1xxxxxxxxx
    ];

    return patterns.some((pattern) => pattern.test(cleaned));
  }
}

module.exports = new LocalizationService();
