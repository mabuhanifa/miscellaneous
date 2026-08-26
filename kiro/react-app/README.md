# Travel Booking UI

A modern, responsive travel booking interface built with React, Vite, and Tailwind CSS. This application provides a complete user experience for discovering destinations, browsing accommodations, and making travel bookings.

## 🚀 Features

### Core Functionality

- **Hero Section** with animated search form and call-to-action
- **Features Showcase** highlighting key platform benefits
- **Destinations Gallery** with interactive destination cards
- **Accommodations Listing** with filtering and detailed property cards
- **Booking Interface** with date selection and guest management
- **Responsive Design** optimized for all device sizes

### Technical Features

- **Performance Optimized** with lazy loading and image optimization
- **Accessibility Compliant** with ARIA labels and keyboard navigation
- **Smooth Animations** with scroll-triggered and micro-interactions
- **Error Boundaries** for graceful error handling
- **Modern React Patterns** with hooks and functional components

## 🛠 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Beautiful SVG icons
- **ESLint & Prettier** - Code quality and formatting

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd travel-booking-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

## 🏗 Build & Deploy

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🧪 Testing

### Run Tests

```bash
npm run test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Accessibility Testing

The application includes automated accessibility testing using jest-axe to ensure WCAG compliance.

## 📱 Responsive Design

The application is fully responsive and optimized for:

- **Mobile** (320px - 768px)
- **Tablet** (768px - 1024px)
- **Desktop** (1024px+)

## ♿ Accessibility Features

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- Focus management

## 🎨 Design System

### Colors

- **Primary Blue**: #1e40af, #3b82f6
- **Background**: #f8fafc
- **Text Primary**: #1f2937
- **Text Secondary**: #6b7280

### Typography

- **Font Family**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700

### Animations

- Scroll-triggered animations
- Hover effects and transitions
- Loading states
- Micro-interactions

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── AccommodationCard.jsx
│   ├── AccommodationsSection.jsx
│   ├── BookingSection.jsx
│   ├── DestinationCard.jsx
│   ├── DestinationsSection.jsx
│   ├── ErrorBoundary.jsx
│   ├── FeaturesSection.jsx
│   ├── FloatingActionButton.jsx
│   ├── Footer.jsx
│   ├── Header.jsx
│   ├── HeroSection.jsx
│   ├── LazyImage.jsx
│   ├── LoadingSpinner.jsx
│   ├── PageTransition.jsx
│   └── SearchForm.jsx
├── hooks/              # Custom React hooks
│   ├── usePerformance.js
│   └── useScrollAnimation.js
├── tests/              # Test files
│   ├── App.test.jsx
│   └── accessibility.test.jsx
├── App.jsx             # Main application component
├── main.jsx           # Application entry point
└── index.css          # Global styles and animations
```

## 🔧 Configuration

### Vite Configuration

The project uses Vite for fast development and building. Configuration is in `vite.config.js`.

### Tailwind Configuration

Tailwind CSS is configured with custom colors and fonts in `tailwind.config.js`.

### ESLint Configuration

Code quality rules are defined in `.eslintrc.cjs`.

## 🚀 Performance Optimizations

- **Lazy Loading**: Images and components load on demand
- **Code Splitting**: Automatic code splitting with Vite
- **Image Optimization**: Responsive images with optimization
- **Bundle Analysis**: Built-in bundle size analysis
- **Performance Monitoring**: Custom performance hooks

## 🐛 Error Handling

- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Development Mode**: Detailed error information in development
- **Production Mode**: Clean error messages for users

## 🎯 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

Built with ❤️ using React and modern web technologies.
