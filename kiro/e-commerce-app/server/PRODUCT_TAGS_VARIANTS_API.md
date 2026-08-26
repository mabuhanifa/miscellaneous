# Product Tags and Variants API Documentation

This document describes the enhanced product functionality for tags and variants in the Bangladesh eCommerce Platform.

## 🏷️ Tags Functionality

### Get All Available Tags

```http
GET /api/v1/products/tags
```

**Response:**

```json
{
  "success": true,
  "data": [
    { "tag": "casual", "count": 15 },
    { "tag": "summer", "count": 8 },
    { "tag": "cotton", "count": 12 }
  ],
  "message": "Tags retrieved successfully"
}
```

### Get Products by Tags

```http
GET /api/v1/products/tags/{tags}?page=1&limit=20
```

**Parameters:**

- `tags` (path): Comma-separated list of tags (e.g., "casual,summer")
- `page` (query): Page number (default: 1)
- `limit` (query): Items per page (default: 20, max: 100)
- `sortBy` (query): Sort field (default: "createdAt")
- `sortOrder` (query): Sort order "asc" or "desc" (default: "desc")

**Example:**

```http
GET /api/v1/products/tags/casual,summer?page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "...",
        "name": "Cotton T-Shirt",
        "tags": ["cotton", "casual", "summer"],
        "variants": [...],
        "category": {...}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🎨 Variants Functionality

### Enhanced Variant Structure

Products now support flexible variant attributes using a Map structure:

```json
{
  "variants": [
    {
      "sku": "TSHIRT-M-BLUE",
      "name": "Medium Blue T-Shirt",
      "attributes": {
        "size": "M",
        "color": "Blue",
        "material": "Cotton",
        "fit": "Regular"
      },
      "price": 25.99,
      "stock": 50,
      "weight": 0.2,
      "dimensions": {
        "length": 70,
        "width": 50,
        "height": 2,
        "unit": "cm"
      },
      "barcode": "1234567890123"
    }
  ]
}
```

### Get Available Variant Attributes

```http
GET /api/v1/products/variant-attributes
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "attribute": "size",
      "values": ["XS", "S", "M", "L", "XL"],
      "count": 45
    },
    {
      "attribute": "color",
      "values": ["Red", "Blue", "Green", "Black", "White"],
      "count": 38
    },
    {
      "attribute": "material",
      "values": ["Cotton", "Polyester", "Denim", "Silk"],
      "count": 42
    }
  ]
}
```

### Get Products by Variant Attributes

```http
GET /api/v1/products/attributes?size=M&color=Blue,Red&page=1&limit=20
```

**Parameters:**

- Any attribute name as query parameter
- Multiple values can be comma-separated
- Standard pagination parameters

**Example:**

```http
GET /api/v1/products/attributes?size=M,L&material=Cotton&color=Blue
```

## 🔍 Advanced Search

### Advanced Product Search

```http
POST /api/v1/products/advanced-search
```

**Request Body:**

```json
{
  "searchTerm": "cotton shirt",
  "tags": ["casual", "summer"],
  "category": "clothing-category-id",
  "priceRange": {
    "min": 20,
    "max": 100
  },
  "attributes": {
    "size": ["M", "L"],
    "color": "Blue",
    "material": "Cotton"
  },
  "inStock": true,
  "featured": false,
  "page": 1,
  "limit": 20,
  "sortBy": "price",
  "sortOrder": "asc"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {...}
  },
  "message": "Search completed successfully"
}
```

## 📝 Creating Products with Tags and Variants

### Create Product with Enhanced Variants

```http
POST /api/v1/products
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data:**

```json
{
  "name": "Premium Cotton T-Shirt",
  "description": "High-quality cotton t-shirt for everyday wear",
  "category": "clothing-category-id",
  "tags": ["cotton", "casual", "premium", "comfortable"],
  "variants": [
    {
      "sku": "PREMIUM-TSHIRT-S-RED",
      "name": "Small Red",
      "attributes": {
        "size": "S",
        "color": "Red",
        "material": "100% Cotton",
        "fit": "Regular",
        "neckline": "Crew"
      },
      "price": 29.99,
      "comparePrice": 39.99,
      "stock": 25,
      "weight": 0.18,
      "dimensions": {
        "length": 65,
        "width": 45,
        "height": 1,
        "unit": "cm"
      },
      "barcode": "1234567890001"
    },
    {
      "sku": "PREMIUM-TSHIRT-M-BLUE",
      "name": "Medium Blue",
      "attributes": {
        "size": "M",
        "color": "Blue",
        "material": "100% Cotton",
        "fit": "Regular",
        "neckline": "Crew"
      },
      "price": 29.99,
      "stock": 30,
      "weight": 0.2
    }
  ]
}
```

## 🔧 Usage Examples

### Frontend Filter Implementation

```javascript
// Get available filter options
const getFilterOptions = async () => {
  const [tags, attributes] = await Promise.all([
    fetch("/api/v1/products/tags").then((r) => r.json()),
    fetch("/api/v1/products/variant-attributes").then((r) => r.json()),
  ]);

  return {
    tags: tags.data,
    attributes: attributes.data,
  };
};

// Search products with filters
const searchProducts = async (filters) => {
  const response = await fetch("/api/v1/products/advanced-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });

  return response.json();
};

// Example usage
const results = await searchProducts({
  tags: ["casual", "summer"],
  attributes: {
    size: ["M", "L"],
    color: "Blue",
  },
  priceRange: { min: 20, max: 80 },
  inStock: true,
});
```

### Product Filtering by Tags

```javascript
// Get summer products
const summerProducts = await fetch("/api/v1/products/tags/summer").then((r) =>
  r.json()
);

// Get casual OR summer products
const casualOrSummer = await fetch("/api/v1/products/tags/casual,summer").then(
  (r) => r.json()
);
```

### Product Filtering by Attributes

```javascript
// Get medium-sized blue products
const mediumBlue = await fetch(
  "/api/v1/products/attributes?size=M&color=Blue"
).then((r) => r.json());

// Get cotton products in multiple sizes
const cottonProducts = await fetch(
  "/api/v1/products/attributes?material=Cotton&size=S,M,L"
).then((r) => r.json());
```

## 📊 Performance Notes

1. **Indexing**: The following indexes are automatically created for optimal performance:

   - `{ tags: 1 }` - for tag-based queries
   - `{ name: "text", description: "text", tags: "text" }` - for text search
   - `{ "variants.attributes.size": 1 }` - for size filtering
   - `{ "variants.attributes.color": 1 }` - for color filtering

2. **Caching**: All product queries support Redis caching via the `productCacheMiddleware`

3. **Pagination**: Always use pagination for large result sets (max 100 items per page)

## 🚀 New Features Added

✅ **Enhanced Variant Structure**

- Flexible attribute system using Map
- Support for dimensions and weight
- Barcode support
- Named variants

✅ **Tag-Based Filtering**

- Get all available tags with counts
- Filter products by single or multiple tags
- Tag-based search integration

✅ **Attribute-Based Filtering**

- Dynamic attribute discovery
- Multi-value attribute filtering
- Attribute statistics

✅ **Advanced Search**

- Combined text, tag, and attribute search
- Price range filtering
- Stock availability filtering
- Complex query building

✅ **API Endpoints**

- `GET /api/v1/products/tags` - Get all tags
- `GET /api/v1/products/tags/{tags}` - Filter by tags
- `GET /api/v1/products/attributes` - Filter by attributes
- `GET /api/v1/products/variant-attributes` - Get available attributes
- `POST /api/v1/products/advanced-search` - Advanced search

All endpoints support pagination, sorting, and caching for optimal performance! 🎉
