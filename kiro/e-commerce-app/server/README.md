# Bangladesh eCommerce Platform

A comprehensive, full-stack, open-source eCommerce platform specifically designed for small and medium-sized businesses (SMEs) in Bangladesh. This platform serves as a reusable template that can be independently deployed for each business, providing complete separation of data, branding, and configuration.

## Features

- **Instance Isolation**: Each deployment operates independently with its own database and configuration
- **Local Optimization**: Built specifically for Bangladesh with local payment gateways, shipping providers, and localization
- **Multi-Role Support**: Admin, Merchant, Customer, and Delivery Agent roles with proper RBAC
- **Payment Integration**: SSLcommerz, bKash, Nagad, Rocket, and Cash on Delivery support
- **Shipping Integration**: Pathao, Paperfly, and eCourier API integration
- **SEO Optimized**: Built-in SEO features with meta tags, sitemaps, and structured data
- **Security First**: Comprehensive security measures including JWT authentication, rate limiting, and data validation
- **Performance Optimized**: Redis caching, image optimization, and efficient database queries

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Authentication**: JWT with refresh tokens
- **File Processing**: Sharp for image optimization
- **Logging**: Winston with structured logging
- **Security**: Helmet.js, CORS, bcryptjs, rate limiting

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- Redis (optional, for caching)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bangladesh-ecommerce-platform
```

2. Install dependencies:

```bash
pnpm install
# or
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:

```bash
pnpm dev
# or
npm run dev
```

The server will start on `http://localhost:3000`

### Environment Configuration

The platform supports multiple environment configurations:

- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Copy the appropriate environment file to `.env` or set `NODE_ENV` to automatically load the correct configuration.

## API Documentation

Once the server is running, you can access:

- **Health Check**: `GET /health`
- **API Base**: `GET /api/v1`
- **API Documentation**: `GET /api/v1/docs` (coming soon)

## Project Structure

```
bangladesh-ecommerce-platform/
├── src/
│   ├── controllers/          # Request handlers
│   ├── services/            # Business logic
│   ├── repositories/        # Data access layer
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # Custom middleware
│   ├── routes/            # API routes
│   ├── config/           # Configuration files
│   ├── utils/           # Utility functions
│   └── jobs/           # Background jobs
├── uploads/           # File uploads
├── logs/             # Application logs
├── .env.*           # Environment configurations
└── README.md
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database Setup

The platform will automatically connect to MongoDB using the connection string in your environment configuration. Make sure MongoDB is running and accessible.

### Redis Setup (Optional)

Redis is used for caching and session management. If Redis is not available, the platform will still function but without caching benefits.

## Instance Configuration

Each deployment can be customized with instance-specific settings:

- **INSTANCE_NAME**: Your store name
- **INSTANCE_DOMAIN**: Your domain name
- **INSTANCE_TIMEZONE**: Timezone (default: Asia/Dhaka)
- **INSTANCE_CURRENCY**: Currency code (default: BDT)
- **INSTANCE_LANGUAGE**: Language code (default: en)

## Security

The platform implements multiple security layers:

- JWT-based authentication with refresh tokens
- Password hashing with bcryptjs
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS protection
- Security headers with Helmet.js
- HTTPS enforcement in production

## Payment Gateways

Supported payment methods:

- **Cash on Delivery (COD)** - Primary payment method
- **SSLcommerz** - Credit/debit cards and mobile banking
- **bKash** - Mobile financial service
- **Nagad** - Mobile financial service
- **Rocket** - Mobile financial service

## Shipping Providers

Integrated courier services:

- **Pathao** - On-demand delivery
- **Paperfly** - Nationwide courier
- **eCourier** - Express delivery service

## Localization

The platform supports:

- Bengali (বাংলা) and English languages
- Bangladesh Taka (৳) currency formatting
- Bangladesh timezone (GMT+6)
- Local address format (Division/District/Thana)
- VAT and local tax compliance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## Roadmap

- [ ] Complete API implementation
- [ ] Frontend integration
- [ ] Mobile app support
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Plugin system
- [ ] Docker deployment
- [ ] Cloud deployment guides

---

Built with ❤️ for Bangladesh's growing eCommerce ecosystem.
