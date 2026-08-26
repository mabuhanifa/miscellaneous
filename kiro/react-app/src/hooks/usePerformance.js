import { useEffect } from "react";

export const usePerformance = () => {
  useEffect(() => {
    // Monitor Core Web Vitals
    if ("web-vital" in window) {
      // This would integrate with web-vitals library if installed
      // For now, we'll use basic performance monitoring
    }

    // Monitor loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "navigation") {
          console.log("Navigation timing:", {
            domContentLoaded:
              entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            totalTime: entry.loadEventEnd - entry.fetchStart,
          });
        }

        if (entry.entryType === "largest-contentful-paint") {
          console.log("LCP:", entry.startTime);
        }

        if (entry.entryType === "first-input") {
          console.log("FID:", entry.processingStart - entry.startTime);
        }
      }
    });

    observer.observe({
      entryTypes: ["navigation", "largest-contentful-paint", "first-input"],
    });

    return () => observer.disconnect();
  }, []);
};

export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const preloadImages = (srcArray) => {
  return Promise.all(srcArray.map(preloadImage));
};

// Utility to optimize image URLs (if using a CDN)
export const optimizeImageUrl = (url, options = {}) => {
  const { width, height, quality = 80, format = "auto" } = options;

  // If using Unsplash, we can add optimization parameters
  if (url.includes("unsplash.com")) {
    const urlObj = new URL(url);
    if (width) urlObj.searchParams.set("w", width);
    if (height) urlObj.searchParams.set("h", height);
    urlObj.searchParams.set("q", quality);
    if (format !== "auto") urlObj.searchParams.set("fm", format);
    return urlObj.toString();
  }

  return url;
};
