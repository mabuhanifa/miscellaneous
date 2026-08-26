import {
  AccommodationsSection,
  BookingSection,
  DestinationsSection,
  ErrorBoundary,
  FeaturesSection,
  FloatingActionButton,
  Footer,
  Header,
  HeroSection,
  PageTransition,
} from "./components";
import { usePerformance } from "./hooks/usePerformance";

function App() {
  // Monitor performance metrics
  usePerformance();

  return (
    <ErrorBoundary>
      <PageTransition>
        <div className="min-h-screen bg-white">
          <Header />
          <main>
            <HeroSection />
            <FeaturesSection />
            <DestinationsSection />
            <AccommodationsSection />
            <BookingSection />
          </main>
          <Footer />
          <FloatingActionButton />
        </div>
      </PageTransition>
    </ErrorBoundary>
  );
}

export default App;
