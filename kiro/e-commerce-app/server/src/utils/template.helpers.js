const handlebars = require("handlebars");
const moment = require("moment-timezone");

/**
 * Register Handlebars helpers for notification templates
 */
function registerHelpers() {
  // Format price helper
  handlebars.registerHelper("formatPrice", function (price) {
    if (typeof price !== "number") {
      return "0.00";
    }
    return price.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });

  // Format date helper
  handlebars.registerHelper(
    "formatDate",
    function (date, format = "MMMM Do, YYYY") {
      if (!date) return "";
      return moment(date).tz("Asia/Dhaka").format(format);
    }
  );

  // Format date and time helper
  handlebars.registerHelper(
    "formatDateTime",
    function (date, format = "MMMM Do, YYYY [at] h:mm A") {
      if (!date) return "";
      return moment(date).tz("Asia/Dhaka").format(format);
    }
  );

  // Relative time helper
  handlebars.registerHelper("fromNow", function (date) {
    if (!date) return "";
    return moment(date).tz("Asia/Dhaka").fromNow();
  });

  // Uppercase helper
  handlebars.registerHelper("uppercase", function (str) {
    if (typeof str !== "string") return "";
    return str.toUpperCase();
  });

  // Lowercase helper
  handlebars.registerHelper("lowercase", function (str) {
    if (typeof str !== "string") return "";
    return str.toLowerCase();
  });

  // Capitalize helper
  handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });

  // Truncate helper
  handlebars.registerHelper("truncate", function (str, length = 100) {
    if (typeof str !== "string") return "";
    if (str.length <= length) return str;
    return str.substring(0, length) + "...";
  });

  // Currency symbol helper
  handlebars.registerHelper("currencySymbol", function (currency) {
    const symbols = {
      BDT: "৳",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || currency;
  });

  // Format phone number helper
  handlebars.registerHelper("formatPhone", function (phone) {
    if (typeof phone !== "string") return "";

    // Bangladesh phone number formatting
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("88") && cleaned.length === 13) {
      return `+88 ${cleaned.substring(2, 5)} ${cleaned.substring(
        5,
        8
      )} ${cleaned.substring(8)}`;
    } else if (cleaned.startsWith("01") && cleaned.length === 11) {
      return `${cleaned.substring(0, 3)} ${cleaned.substring(
        3,
        6
      )} ${cleaned.substring(6)}`;
    }
    return phone;
  });

  // Conditional helper
  handlebars.registerHelper("if_eq", function (a, b, options) {
    if (a === b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // Not equal helper
  handlebars.registerHelper("if_ne", function (a, b, options) {
    if (a !== b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // Greater than helper
  handlebars.registerHelper("if_gt", function (a, b, options) {
    if (a > b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // Less than helper
  handlebars.registerHelper("if_lt", function (a, b, options) {
    if (a < b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // Array length helper
  handlebars.registerHelper("length", function (array) {
    if (!Array.isArray(array)) return 0;
    return array.length;
  });

  // Math helpers
  handlebars.registerHelper("add", function (a, b) {
    return (parseFloat(a) || 0) + (parseFloat(b) || 0);
  });

  handlebars.registerHelper("subtract", function (a, b) {
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  });

  handlebars.registerHelper("multiply", function (a, b) {
    return (parseFloat(a) || 0) * (parseFloat(b) || 0);
  });

  handlebars.registerHelper("divide", function (a, b) {
    const divisor = parseFloat(b);
    if (divisor === 0) return 0;
    return (parseFloat(a) || 0) / divisor;
  });

  // Percentage helper
  handlebars.registerHelper("percentage", function (value, total) {
    const val = parseFloat(value) || 0;
    const tot = parseFloat(total) || 0;
    if (tot === 0) return "0%";
    return ((val / tot) * 100).toFixed(1) + "%";
  });

  // JSON stringify helper
  handlebars.registerHelper("json", function (context) {
    return JSON.stringify(context);
  });

  // Default value helper
  handlebars.registerHelper("default", function (value, defaultValue) {
    return value || defaultValue;
  });

  // Order status helper
  handlebars.registerHelper("orderStatus", function (status) {
    const statusMap = {
      pending: "⏳ Pending",
      confirmed: "✅ Confirmed",
      processing: "🔄 Processing",
      shipped: "📦 Shipped",
      delivered: "🎉 Delivered",
      cancelled: "❌ Cancelled",
    };
    return statusMap[status] || status;
  });

  // Payment status helper
  handlebars.registerHelper("paymentStatus", function (status) {
    const statusMap = {
      pending: "⏳ Pending",
      paid: "✅ Paid",
      failed: "❌ Failed",
      refunded: "↩️ Refunded",
    };
    return statusMap[status] || status;
  });

  // Bengali number helper
  handlebars.registerHelper("bengaliNumber", function (number) {
    const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return number
      .toString()
      .replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  });

  // URL helper
  handlebars.registerHelper("url", function (path, baseUrl) {
    const base = baseUrl || process.env.APP_URL || "http://localhost:3000";
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  });

  console.log("Handlebars helpers registered successfully");
}

module.exports = {
  registerHelpers,
};
