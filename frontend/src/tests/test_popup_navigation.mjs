// RouteWise Destination Marker Popup Navigation Test Suite
import assert from 'node:assert';

console.log('===========================================================');
console.log('🧪 Starting RouteWise Destination Popup Navigation Tests');
console.log('===========================================================\n');

// Real Mumbai Destinations dataset from RouteWise
const MUMBAI_DESTINATIONS = [
  { id: 'gateway-of-india', name: 'Gateway of India', coordinates: { lat: 18.9220, lng: 72.8347 }, category: 'heritage' },
  { id: 'marine-drive', name: "Marine Drive & Queen's Necklace", coordinates: { lat: 18.9432, lng: 72.8231 }, category: 'beach' },
  { id: 'csmt', name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', coordinates: { lat: 18.9398, lng: 72.8354 }, category: 'heritage' },
  { id: 'colaba-causeway', name: 'Colaba Causeway', coordinates: { lat: 18.9160, lng: 72.8286 }, category: 'market' },
  { id: 'elephanta-caves', name: 'Elephanta Caves', coordinates: { lat: 18.9633, lng: 72.9315 }, category: 'heritage' },
  { id: 'haji-ali', name: 'Haji Ali Dargah', coordinates: { lat: 18.9772, lng: 72.8105 }, category: 'spiritual' },
  { id: 'bandra-sea-link', name: 'Bandra-Worli Sea Link', coordinates: { lat: 19.0274, lng: 72.8180 }, category: 'modern' },
  { id: 'bandra-bandstand', name: 'Bandra Bandstand & Mount Mary', coordinates: { lat: 19.0469, lng: 72.8227 }, category: 'beach' },
  { id: 'siddhivinayak', name: 'Shree Siddhivinayak Temple', coordinates: { lat: 19.0168, lng: 72.8302 }, category: 'spiritual' },
  { id: 'juhu-beach', name: 'Juhu Beach', coordinates: { lat: 19.0988, lng: 72.8264 }, category: 'beach' },
  { id: 'crawford-market', name: 'Crawford Market', coordinates: { lat: 18.9472, lng: 72.8340 }, category: 'market' },
  { id: 'sanjay-gandhi-national-park', name: 'Sanjay Gandhi National Park', coordinates: { lat: 19.2288, lng: 72.9158 }, category: 'nature' },
  { id: 'girgaon-chowpatty', name: 'Girgaon Chowpatty', coordinates: { lat: 18.9543, lng: 72.8150 }, category: 'beach' },
  { id: 'dhobi-ghat', name: 'Mahalaxmi Dhobi Ghat', coordinates: { lat: 18.9827, lng: 72.8252 }, category: 'heritage' },
];

// 1. Verify URL Construction Logic (matching InteractiveMap.tsx implementation)
function getGoogleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

console.log('Test 1: Google Maps Universal Directions URL Construction');
MUMBAI_DESTINATIONS.forEach((place) => {
  const url = getGoogleMapsDirectionsUrl(place.coordinates.lat, place.coordinates.lng);
  const parsed = new URL(url);

  // Check origin is NOT set (so Google Maps determines current location without asking unnecessary permissions)
  assert.strictEqual(parsed.searchParams.get('origin'), null, 
    `Origin must NOT be hardcoded for ${place.name}`);

  // Check destination coordinates match exact place coordinates
  assert.strictEqual(parsed.searchParams.get('destination'), `${place.coordinates.lat},${place.coordinates.lng}`,
    `Destination coordinates mismatch for ${place.name}`);

  // Check travelmode is driving by default
  assert.strictEqual(parsed.searchParams.get('travelmode'), 'driving',
    `Travelmode must be driving for ${place.name}`);

  // Check api version parameter
  assert.strictEqual(parsed.searchParams.get('api'), '1',
    `API version parameter must be 1 for ${place.name}`);

  // Check domain is official Google Maps
  assert.strictEqual(parsed.hostname, 'www.google.com',
    `Hostname must be www.google.com for ${place.name}`);
  assert.strictEqual(parsed.pathname, '/maps/dir/',
    `Pathname must be /maps/dir/ for ${place.name}`);
});
console.log(`  ✅ Passed for all ${MUMBAI_DESTINATIONS.length} Mumbai destinations.`);

console.log('\nTest 2: Preserve exact destinations even with duplicate or identical place names');
const stopA = {
  id: 'stop-a',
  name: 'Starbucks Coffee',
  coordinates: { lat: 18.9225, lng: 72.8335 },
};
const stopB = {
  id: 'stop-b',
  name: 'Starbucks Coffee',
  coordinates: { lat: 19.0759, lng: 72.8776 },
};

const urlA = getGoogleMapsDirectionsUrl(stopA.coordinates.lat, stopA.coordinates.lng);
const urlB = getGoogleMapsDirectionsUrl(stopB.coordinates.lat, stopB.coordinates.lng);

assert.notStrictEqual(urlA, urlB, 'Two stops with identical names must produce distinct destination coordinates in URL');
assert.ok(urlA.includes('18.9225,72.8335'), 'Stop A coordinates properly preserved');
assert.ok(urlB.includes('19.0759,72.8776'), 'Stop B coordinates properly preserved');
console.log('  ✅ Passed: Stops with identical names maintain exact distinct coordinates.');

console.log('\nTest 3: Popup DOM structure, Accessibility & Event Handlers Simulation');
function simulateOpenInfoWindowForStop(stop, stopIndex, totalStops, onRemoveCallback) {
  const badgeLabel =
    stopIndex === 0
      ? 'Stop 1 (Start)'
      : stopIndex === totalStops - 1 && totalStops > 1
      ? `Stop ${stopIndex + 1} (End)`
      : `Stop ${stopIndex + 1}`;

  const destLat = stop.coordinates.lat;
  const destLng = stop.coordinates.lng;
  const navUrl = getGoogleMapsDirectionsUrl(destLat, destLng);

  let windowOpenedWith = null;
  const windowMock = {
    open: (url, target, features) => {
      windowOpenedWith = { url, target, features };
      return {};
    }
  };

  let clicked = false;
  let propagationStopped = false;
  let defaultPrevented = false;

  const navLink = {
    tagName: 'A',
    href: navUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    title: 'Navigate with Google Maps',
    attributes: {
      'aria-label': 'Navigate with Google Maps',
      'data-testid': 'gmaps-nav-button',
      class: 'gmaps-nav-btn',
    },
    click: (e = { button: 0 }) => {
      clicked = true;
      const event = {
        button: e.button ?? 0,
        ctrlKey: e.ctrlKey ?? false,
        metaKey: e.metaKey ?? false,
        shiftKey: e.shiftKey ?? false,
        stopPropagation: () => { propagationStopped = true; },
        preventDefault: () => { defaultPrevented = true; },
      };
      // Handled identically to InteractiveMap.tsx onclick
      event.stopPropagation();
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        windowMock.open(navUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  let removeStopCalled = false;
  let infoWindowClosed = false;
  const removeBtn = {
    tagName: 'BUTTON',
    innerText: 'Remove Stop',
    attributes: {
      'data-testid': 'remove-stop-btn',
    },
    click: () => {
      infoWindowClosed = true;
      onRemoveCallback(stop.id);
      removeStopCalled = true;
    }
  };

  return {
    badgeLabel,
    navUrl,
    navLink,
    removeBtn,
    getWindowOpenedWith: () => windowOpenedWith,
    isPropagationStopped: () => propagationStopped,
    isDefaultPrevented: () => defaultPrevented,
    isRemoveStopCalled: () => removeStopCalled,
    isInfoWindowClosed: () => infoWindowClosed,
  };
}

MUMBAI_DESTINATIONS.forEach((place, idx) => {
  let removedId = null;
  const popup = simulateOpenInfoWindowForStop(
    place, 
    idx, 
    MUMBAI_DESTINATIONS.length, 
    (id) => { removedId = id; }
  );

  // Check link attributes & accessibility
  assert.strictEqual(popup.navLink.title, 'Navigate with Google Maps', 'Must have tooltip');
  assert.strictEqual(popup.navLink.attributes['aria-label'], 'Navigate with Google Maps', 'Must have aria-label');
  assert.strictEqual(popup.navLink.target, '_blank', 'Must target _blank');
  assert.strictEqual(popup.navLink.rel, 'noopener noreferrer', 'Must have rel noopener noreferrer');

  // Trigger click on navigation icon
  popup.navLink.click();
  const opened = popup.getWindowOpenedWith();
  assert.ok(opened, 'window.open was called');
  assert.strictEqual(opened.target, '_blank');
  assert.strictEqual(opened.features, 'noopener,noreferrer');
  assert.strictEqual(opened.url, popup.navUrl);
  assert.ok(popup.isPropagationStopped(), 'Click propagation stopped to avoid map interference');
  assert.ok(popup.isDefaultPrevented(), 'Default link navigation prevented in favor of controlled window.open');

  // Trigger Remove Stop button
  popup.removeBtn.click();
  assert.ok(popup.isRemoveStopCalled(), 'Remove stop handler invoked');
  assert.ok(popup.isInfoWindowClosed(), 'InfoWindow close invoked');
  assert.strictEqual(removedId, place.id, 'Target place ID received by onRemoveStop');
});
console.log(`  ✅ Passed: Navigation link click and Remove Stop button verified across all ${MUMBAI_DESTINATIONS.length} stops.`);

console.log('\n===========================================================');
console.log('🎉 ALL ROUTEWISE DESTINATION POPUP NAVIGATION TESTS PASSED!');
console.log('===========================================================\n');
