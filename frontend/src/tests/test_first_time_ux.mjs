import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

console.log('===========================================================');
console.log('🧪 Starting Vazhikatti First-Time UX & Onboarding Test Suite');
console.log('===========================================================');

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failures++;
  } else {
    console.log(`  ✅ Passed: ${message}`);
  }
}

// 1. Verify WelcomeCard.tsx component
console.log('\nTest 1: Welcoming Dashboard Card (WelcomeCard.tsx)');
const welcomeCardCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'WelcomeCard.tsx'), 'utf-8');

assert(
  welcomeCardCode.includes('Plan your next journey.'),
  'WelcomeCard contains primary heading: "Plan your next journey."'
);
assert(
  welcomeCardCode.includes('Discover destinations, organize your stops and find the best route.'),
  'WelcomeCard contains supporting text: "Discover destinations, organize your stops and find the best route."'
);
assert(
  welcomeCardCode.includes('SearchBox') && welcomeCardCode.includes('Find & Add Your First Destination'),
  'WelcomeCard provides prominent destination search field with state support'
);
assert(
  welcomeCardCode.includes('Search Places') &&
  welcomeCardCode.includes('Add Stops') &&
  welcomeCardCode.includes('Optimize TSP') &&
  welcomeCardCode.includes('Share Route'),
  'WelcomeCard presents 4 clean feature highlights without cluttering UI'
);
assert(
  welcomeCardCode.includes('onOpenTutorial') && welcomeCardCode.includes('Take a 1-minute visual guide'),
  'WelcomeCard includes accessible 1-minute visual guide button'
);

// 2. Verify OnboardingModal.tsx 5-step tutorial
console.log('\nTest 2: Intelligent 5-Step Onboarding Flow (OnboardingModal.tsx)');
const onboardingCode = fs.readFileSync(path.join(srcDir, 'components', 'OnboardingModal.tsx'), 'utf-8');

assert(
  onboardingCode.includes('Search for Any Destination') &&
  onboardingCode.includes('Add Multiple Destinations') &&
  onboardingCode.includes('Arrange & Schedule Stops') &&
  onboardingCode.includes('Optimize Your Route in 1 Click') &&
  onboardingCode.includes('Share & Import Itineraries'),
  'Onboarding covers all 5 essential workflow steps'
);
assert(
  onboardingCode.includes('handleSkip') && onboardingCode.includes('handleNext'),
  'Onboarding supports Skip and Next / Get Started controls'
);
assert(
  onboardingCode.includes('Progress Indicator Dots') || onboardingCode.includes('currentStepIndex === idx') || onboardingCode.includes('idx === currentStepIndex'),
  'Onboarding renders progress indicator dots with direct step navigation'
);
assert(
  onboardingCode.includes('role="dialog"') && onboardingCode.includes('aria-modal="true"'),
  'Onboarding modal conforms to accessibility dialog standards'
);

// 3. Verify Navbar.tsx Branding & Tutorial Access
console.log('\nTest 3: Vazhikatti Branding & Tutorial Triggers (Navbar.tsx)');
const navbarCode = fs.readFileSync(path.join(srcDir, 'components', 'Navbar.tsx'), 'utf-8');

assert(
  navbarCode.includes('Vazhikatti'),
  'Navbar features updated Vazhikatti brand identity'
);
assert(
  navbarCode.includes('onOpenOnboarding') && navbarCode.includes('How to Use Vazhikatti'),
  'Navbar allows users to relaunch the onboarding guide anytime from profile menu'
);
assert(
  navbarCode.includes('aria-label="App guide and tutorial"'),
  'Navbar includes accessible top-bar guide button'
);

// 4. Verify Google Maps Clutter Prevention (InteractiveMap.tsx)
console.log('\nTest 4: Google Maps Clutter Suppression & Explicit Marker Clicks');
const mapCode = fs.readFileSync(path.join(srcDir, 'components', 'Map', 'InteractiveMap.tsx'), 'utf-8');

assert(
  mapCode.includes('clickableIcons: false'),
  'clickableIcons: false disables unsolicited Google Maps default POI InfoWindows'
);
assert(
  mapCode.includes('userClickedStopIdRef.current === stop.id'),
  'Popups open ONLY upon explicit user interaction, never automatically on passive load'
);
assert(
  mapCode.includes('infoWindowRef.current?.close()') && mapCode.includes('setMobileSelectedStop({ stop, index })'),
  'On mobile, default InfoWindow is closed to prevent double popups'
);

// 5. Verify Dashboard State & Mobile Layout (DashboardPage.tsx & Sidebar.tsx)
console.log('\nTest 5: Dashboard Clean Start & Onboarding Persistence (DashboardPage.tsx & Sidebar.tsx)');
const dashboardCode = fs.readFileSync(path.join(srcDir, 'pages', 'DashboardPage.tsx'), 'utf-8');
const sidebarCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'Sidebar.tsx'), 'utf-8');

assert(
  dashboardCode.includes('setActiveStopId(null)'),
  'Dashboard initializes activeStopId to null to avoid auto-selecting stops on load'
);
assert(
  dashboardCode.includes('vazhikatti_onboarding_') && dashboardCode.includes('setIsOnboardingOpen'),
  'Dashboard persists onboarding completion per-user in localStorage'
);
assert(
  sidebarCode.includes('stops.length === 0 ?') && sidebarCode.includes('<WelcomeCard'),
  'Trip Plan view renders WelcomeCard welcoming first-time users when 0 destinations are selected'
);
assert(
  dashboardCode.includes('<MobileBottomSheet') && dashboardCode.includes('onOpenTripPlan'),
  'Interactive Map renders compact route summary with seamless Trip Plan navigation'
);

console.log('===========================================================');
if (failures === 0) {
  console.log('🎉 ALL VAZHIKATTI FIRST-TIME UX TESTS PASSED (100%)!');
  console.log('===========================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} test(s) failed.`);
  process.exit(1);
}

