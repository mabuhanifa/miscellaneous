/**
 * Tax Calculation Utilities for Bangladesh
 * Handles VAT and local tax compliance
 */

/**
 * Bangladesh tax configuration
 */
const bangladeshTaxConfig = {
  // Standard VAT rate in Bangladesh
  standardVatRate: 15, // 15%

  // Reduced VAT rates for specific categories
  reducedVatRates: {
    food: 5,
    medicine: 0,
    books: 0,
    agriculture: 5,
    textiles: 10,
  },

  // VAT exempted categories
  vatExempted: ["medicine", "books", "educational_materials", "raw_materials"],

  // Supplementary Duty (SD) rates
  supplementaryDutyRates: {
    luxury_goods: 20,
    tobacco: 60,
    cosmetics: 35,
    electronics: 10,
  },

  // Advance Tax (AT) rates
  advanceTaxRates: {
    import: 5,
    local_supply: 3,
  },

  // Minimum taxable amount (in BDT)
  minimumTaxableAmount: 0,

  // VAT registration threshold (in BDT annually)
  vatRegistrationThreshold: 3000000, // 30 lakh BDT
};

/**
 * Calculate VAT for a product/service
 * @param {number} amount - Base amount
 * @param {string} category - Product category
 * @param {Object} options - Calculation options
 * @returns {Object} - VAT calculation result
 */
const calculateVAT = (amount, category = "general", options = {}) => {
  const {
    isVatExempted = false,
    customVatRate = null,
    includeSupplementaryDuty = false,
  } = options;

  // Check if VAT exempted
  if (isVatExempted || bangladeshTaxConfig.vatExempted.includes(category)) {
    return {
      baseAmount: amount,
      vatRate: 0,
      vatAmount: 0,
      supplementaryDuty: 0,
      totalAmount: amount,
      isExempted: true,
    };
  }

  // Determine VAT rate
  let vatRate;
  if (customVatRate !== null) {
    vatRate = customVatRate;
  } else if (bangladeshTaxConfig.reducedVatRates[category]) {
    vatRate = bangladeshTaxConfig.reducedVatRates[category];
  } else {
    vatRate = bangladeshTaxConfig.standardVatRate;
  }

  // Calculate VAT amount
  const vatAmount = (amount * vatRate) / 100;

  // Calculate Supplementary Duty if applicable
  let supplementaryDuty = 0;
  if (
    includeSupplementaryDuty &&
    bangladeshTaxConfig.supplementaryDutyRates[category]
  ) {
    const sdRate = bangladeshTaxConfig.supplementaryDutyRates[category];
    supplementaryDuty = (amount * sdRate) / 100;
  }

  const totalAmount = amount + vatAmount + supplementaryDuty;

  return {
    baseAmount: amount,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    supplementaryDuty: Math.round(supplementaryDuty * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    isExempted: false,
  };
};

/**
 * Calculate VAT for multiple items (shopping cart)
 * @param {Array} items - Array of items with amount and category
 * @param {Object} options - Calculation options
 * @returns {Object} - Total VAT calculation
 */
const calculateCartVAT = (items, options = {}) => {
  const { applyThreshold = true, businessVatRegistered = false } = options;

  let totalBaseAmount = 0;
  let totalVatAmount = 0;
  let totalSupplementaryDuty = 0;
  const itemCalculations = [];

  items.forEach((item) => {
    const calculation = calculateVAT(
      item.amount,
      item.category,
      item.options || {}
    );

    totalBaseAmount += calculation.baseAmount;
    totalVatAmount += calculation.vatAmount;
    totalSupplementaryDuty += calculation.supplementaryDuty;

    itemCalculations.push({
      ...item,
      calculation,
    });
  });

  // Apply minimum threshold if applicable
  if (
    applyThreshold &&
    totalBaseAmount < bangladeshTaxConfig.minimumTaxableAmount
  ) {
    totalVatAmount = 0;
    totalSupplementaryDuty = 0;
  }

  const totalAmount = totalBaseAmount + totalVatAmount + totalSupplementaryDuty;

  return {
    items: itemCalculations,
    summary: {
      baseAmount: Math.round(totalBaseAmount * 100) / 100,
      vatAmount: Math.round(totalVatAmount * 100) / 100,
      supplementaryDuty: Math.round(totalSupplementaryDuty * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      effectiveVatRate:
        totalBaseAmount > 0 ? (totalVatAmount / totalBaseAmount) * 100 : 0,
    },
    businessVatRegistered,
    thresholdApplied:
      applyThreshold &&
      totalBaseAmount < bangladeshTaxConfig.minimumTaxableAmount,
  };
};

/**
 * Calculate reverse VAT (extract VAT from inclusive amount)
 * @param {number} inclusiveAmount - Amount including VAT
 * @param {string} category - Product category
 * @param {Object} options - Calculation options
 * @returns {Object} - Reverse VAT calculation
 */
const calculateReverseVAT = (
  inclusiveAmount,
  category = "general",
  options = {}
) => {
  const { customVatRate = null } = options;

  // Determine VAT rate
  let vatRate;
  if (customVatRate !== null) {
    vatRate = customVatRate;
  } else if (bangladeshTaxConfig.reducedVatRates[category]) {
    vatRate = bangladeshTaxConfig.reducedVatRates[category];
  } else {
    vatRate = bangladeshTaxConfig.standardVatRate;
  }

  // Calculate base amount and VAT
  const baseAmount = inclusiveAmount / (1 + vatRate / 100);
  const vatAmount = inclusiveAmount - baseAmount;

  return {
    inclusiveAmount,
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    vatRate,
  };
};

/**
 * Generate VAT invoice details
 * @param {Object} orderData - Order data
 * @param {Object} businessInfo - Business information
 * @returns {Object} - VAT invoice details
 */
const generateVATInvoice = (orderData, businessInfo) => {
  const { items, customer, orderNumber, orderDate } = orderData;

  // Calculate VAT for all items
  const vatCalculation = calculateCartVAT(items, {
    businessVatRegistered: businessInfo.vatRegistered || false,
  });

  // Generate VAT invoice number
  const vatInvoiceNumber = `VAT-${orderNumber}-${new Date().getFullYear()}`;

  return {
    invoiceNumber: vatInvoiceNumber,
    orderNumber,
    issueDate: orderDate,
    dueDate: new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days

    // Business details
    supplier: {
      name: businessInfo.name,
      address: businessInfo.address,
      vatNumber: businessInfo.vatNumber,
      binNumber: businessInfo.binNumber,
      phone: businessInfo.phone,
      email: businessInfo.email,
    },

    // Customer details
    customer: {
      name: customer.name,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
    },

    // VAT calculation details
    calculation: vatCalculation,

    // Compliance information
    compliance: {
      vatRegistrationRequired:
        vatCalculation.summary.baseAmount >=
        bangladeshTaxConfig.vatRegistrationThreshold,
      vatChallanRequired:
        businessInfo.vatRegistered && vatCalculation.summary.vatAmount > 0,
      treasuryChallanNumber: null, // To be filled when payment is made
    },
  };
};

/**
 * Calculate advance tax
 * @param {number} amount - Transaction amount
 * @param {string} type - Transaction type (import, local_supply)
 * @returns {Object} - Advance tax calculation
 */
const calculateAdvanceTax = (amount, type = "local_supply") => {
  const rate = bangladeshTaxConfig.advanceTaxRates[type] || 0;
  const taxAmount = (amount * rate) / 100;

  return {
    baseAmount: amount,
    taxRate: rate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round((amount + taxAmount) * 100) / 100,
  };
};

/**
 * Get tax rates for a category
 * @param {string} category - Product category
 * @returns {Object} - Tax rates for the category
 */
const getTaxRates = (category) => {
  return {
    category,
    vatRate:
      bangladeshTaxConfig.reducedVatRates[category] ||
      bangladeshTaxConfig.standardVatRate,
    supplementaryDutyRate:
      bangladeshTaxConfig.supplementaryDutyRates[category] || 0,
    isVatExempted: bangladeshTaxConfig.vatExempted.includes(category),
    advanceTaxRate: bangladeshTaxConfig.advanceTaxRates.local_supply,
  };
};

/**
 * Validate VAT number format (Bangladesh BIN)
 * @param {string} vatNumber - VAT/BIN number
 * @returns {boolean} - Whether VAT number is valid
 */
const validateVATNumber = (vatNumber) => {
  // Bangladesh BIN format: 9 digits
  const binPattern = /^\d{9}$/;
  return binPattern.test(vatNumber);
};

/**
 * Format tax amount for display
 * @param {number} amount - Tax amount
 * @param {string} locale - Locale
 * @returns {string} - Formatted tax amount
 */
const formatTaxAmount = (amount, locale = "bn-BD") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get current tax year
 * @returns {string} - Current tax year (July to June)
 */
const getCurrentTaxYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // Bangladesh tax year runs from July 1 to June 30
  if (currentMonth >= 6) {
    // July onwards
    return `${currentYear}-${currentYear + 1}`;
  } else {
    // January to June
    return `${currentYear - 1}-${currentYear}`;
  }
};

module.exports = {
  calculateVAT,
  calculateCartVAT,
  calculateReverseVAT,
  generateVATInvoice,
  calculateAdvanceTax,
  getTaxRates,
  validateVATNumber,
  formatTaxAmount,
  getCurrentTaxYear,
  bangladeshTaxConfig,
};
