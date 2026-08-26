#!/usr/bin/env node

/**
 * Build validation script
 * Checks if all components are properly exported and the build is successful
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const components = [
  "AccommodationCard",
  "AccommodationsSection",
  "BookingSection",
  "Container",
  "DestinationCard",
  "DestinationsSection",
  "ErrorBoundary",
  "FeaturesSection",
  "FloatingActionButton",
  "Footer",
  "Header",
  "HeroSection",
  "LazyImage",
  "LoadingSpinner",
  "PageTransition",
  "SearchForm",
];

const hooks = ["usePerformance", "useScrollAnimation"];

console.log("🔍 Validating Travel Booking UI Build...\n");

// Check if all component files exist
console.log("📁 Checking component files...");
let missingComponents = [];

components.forEach((component) => {
  const filePath = join("src", "components", `${component}.jsx`);
  if (!existsSync(filePath)) {
    missingComponents.push(component);
  } else {
    console.log(`✅ ${component}.jsx`);
  }
});

if (missingComponents.length > 0) {
  console.log(`\n❌ Missing components: ${missingComponents.join(", ")}`);
  process.exit(1);
}

// Check if all hook files exist
console.log("\n🪝 Checking hook files...");
let missingHooks = [];

hooks.forEach((hook) => {
  const filePath = join("src", "hooks", `${hook}.js`);
  if (!existsSync(filePath)) {
    missingHooks.push(hook);
  } else {
    console.log(`✅ ${hook}.js`);
  }
});

if (missingHooks.length > 0) {
  console.log(`\n❌ Missing hooks: ${missingHooks.join(", ")}`);
  process.exit(1);
}

// Check if build succeeds
console.log("\n🏗️  Running build...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("\n✅ Build successful!");
} catch (error) {
  console.log("\n❌ Build failed!");
  process.exit(1);
}

// Check if dist folder exists
if (!existsSync("dist")) {
  console.log("\n❌ Dist folder not created!");
  process.exit(1);
}

console.log("\n🎉 All validations passed!");
console.log("\n📊 Build Summary:");
console.log(`   Components: ${components.length}`);
console.log(`   Hooks: ${hooks.length}`);
console.log("   Build: ✅ Success");
console.log("   Dist: ✅ Created");

console.log("\n🚀 Ready for deployment!");
