# Demo Data Seeding Guide

This guide explains how to use the demo data seeding functionality for the Bangladesh eCommerce Platform.

## Overview

The demo data seeding system allows you to populate your database with realistic sample data that matches all Mongoose model schemas. This is perfect for development, testing, and demonstrations.

## Demo Data Files

All demo data is stored in JSON files in the `src/data/` directory:

- `users.json` - Sample users (admin, merchants, delivery agents)
- `categories.json` - Product categories with hierarchical structure
- `products.json` - Sample products with variants, images, and SEO data
- `customers.json` - Customer profiles with addresses and analytics
- `orders.json` - Sample orders with complete order lifecycle data
- `settings.json` - Application settings and configuration

## Schema Compliance

All demo data files have been updated to ensure 100% compliance with the Mongoose models:

### ✅ Fixed Issues:

- **Date formats**: All dates are now in ISO format (`2024-12-25T00:00:00.000Z`)
- **ObjectId references**: Temporary slug-based references are resolved during seeding
- **Required fields**: All required fields are properly populated
- **Validation**: All data passes Mongoose validation rules
- **Relationships**: Parent-child relationships are properly established

### 🔧 Seeding Process:

1. **Settings** are seeded first
2. **Users** are created with hashed passwords
3. **Categories** are created with proper parent-child relationships
4. **Products** are linked to categories and created by users
5. **Customers** are created with complete profiles
6. **Orders** are linked to customers and products

## Usage

### Basic Seeding

```bash
# Seed with basic data (users, categories, products, settings)
node scripts/dev-cli.js seed

# Seed with demo data from JSON files
node scripts/dev-cli.js seed --demo

# Force seeding even if data exists
node scripts/dev-cli.js seed --demo --force
```

### Complete Demo Setup

```bash
# Reset database and seed with complete demo data
node scripts/dev-cli.js reset --confirm --demo
```

### Selective Seeding

```bash
# Seed only specific data types
node scripts/dev-cli.js seed --demo --no-products --no-orders

# Include customers and orders (demo only)
node scripts/dev-cli.js seed --demo --with-customers --with-orders
```

## Demo Data Contents

### Users (5 users)

- 1 Admin user
- 2 Merchant users
- 2 Delivery agent users
- All with proper profiles, addresses, and preferences

### Categories (10 categories)

- Electronics (with Smartphones, Laptops subcategories)
- Fashion (with Men's/Women's Clothing subcategories)
- Home & Living (with Furniture subcategory)
- Books
- Sports & Fitness

### Products (5 products)

- Samsung Galaxy S23 Ultra (with variants)
- iPhone 14 Pro Max (with variants)
- MacBook Air M2 (with variants)
- Premium Cotton T-Shirt (with size/color variants)
- Elegant Summer Dress (with variants)

### Customers (5 customers)

- Complete profiles with addresses
- Purchase history and analytics
- Loyalty points and segmentation
- Wishlist and search history

### Orders (5 orders)

- Various order statuses (pending, shipped, delivered, cancelled)
- Different payment methods (bKash, COD, Nagad, SSLCommerz)
- Multiple shipping providers (Pathao, Paperfly, eCourier)
- Complete order lifecycle tracking

### Settings (1 configuration)

- Complete application configuration
- Payment gateway settings (sandbox mode)
- Shipping provider configurations
- Localization and SEO settings

## Development Workflow

### 1. Initial Setup

```bash
# Start with fresh demo data
node scripts/dev-cli.js reset --confirm --demo
```

### 2. Check Status

```bash
# View seeding statistics
node scripts/dev-cli.js stats

# Check application status
node scripts/dev-cli.js status
```

### 3. Iterative Development

```bash
# Add new products without affecting existing data
node scripts/dev-cli.js seed --demo --no-users --no-categories --force
```

## Data Relationships

The demo data maintains proper relationships between models:

```
Settings (instance configuration)
├── Users (admin, merchants, delivery agents)
├── Categories (hierarchical structure)
│   └── Products (linked to categories and created by users)
├── Customers (with addresses and analytics)
└── Orders (linked to customers and products)
```

## Customization

### Adding New Demo Data

1. **Edit JSON files** in `src/data/` directory
2. **Maintain schema compliance** with Mongoose models
3. **Use temporary references** (e.g., `categorySlug` instead of ObjectId)
4. **Test seeding** with `--demo` flag

### Example: Adding a New Product

```json
{
  "name": "New Product",
  "slug": "new-product",
  "description": "Product description",
  "categorySlug": "electronics",
  "variants": [
    {
      "sku": "NEW-PROD-001",
      "price": 1000,
      "stock": 50
    }
  ],
  "_seedId": "new-product"
}
```

## Troubleshooting

### Common Issues

1. **Validation Errors**: Check that all required fields are present
2. **Reference Errors**: Ensure parent records exist before children
3. **Duplicate Keys**: Use `--force` flag to overwrite existing data

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* node scripts/dev-cli.js seed --demo
```

### Manual Verification

```bash
# Connect to MongoDB and verify data
mongo your-database-name
db.users.count()
db.products.count()
db.orders.count()
```

## Production Notes

⚠️ **Warning**: Demo data is for development only. Never use demo data in production environments.

- Demo passwords are simple and should not be used in production
- Demo API keys are placeholders and won't work with real services
- Demo customer data is fictional

## Next Steps

After seeding demo data:

1. **Start the application**: `npm start`
2. **Login with demo users**: Use credentials from `users.json`
3. **Explore the admin panel**: Test with admin user
4. **Place test orders**: Use demo customers and products
5. **Test integrations**: Configure real API keys for production use

## Support

For issues with demo data seeding:

1. Check the logs in `logs/` directory
2. Verify MongoDB connection
3. Ensure all dependencies are installed
4. Review the Mongoose model schemas

---

**Happy coding! 🚀**
