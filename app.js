/**
 * GeoPulse Live - Realtime Location Mapping & Simulation
 * Full Google Maps replica with rich telemetry, place search, and route simulation.
 */

(function () {
    // Application State Management
    const state = {
        map: null,
        userMarker: null,
        accuracyCircle: null,
        routePolyline: null,
        routeCoords: [], // Array of L.LatLng objects tracked
        isTracking: true,
        isDemoActive: false,
        demoIntervalId: null,
        demoRoutePoints: [],
        demoCurrentIndex: 0,
        demoSpeedMultiplier: 2,
        currentLat: null,
        currentLng: null,
        totalDistance: 0, // In kilometers
        watchPositionId: null,
        lastPositionTime: null,
        isFullscreen: false,
        activeMapStyle: 'dark', // default theme
        customMarkers: [] // Search / Custom destination markers
    };

    // Mapping Tile Provider Layers
    const mapLayers = {
        streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }),
        retro: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        })
    };

    // Preset Scenic Routes for Demo / Simulation Mode
    const scenicRoutes = {
        'golden-gate': {
            name: "San Francisco Scenic Coastline",
            startZoom: 14,
            points: [
                { lat: 37.8077, lng: -122.4750, alt: 32, speed: 45 },
                { lat: 37.8105, lng: -122.4771, alt: 58, speed: 50 },
                { lat: 37.8130, lng: -122.4782, alt: 65, speed: 55 },
                { lat: 37.8162, lng: -122.4785, alt: 65, speed: 55 },
                { lat: 37.8194, lng: -122.4786, alt: 64, speed: 55 },
                { lat: 37.8228, lng: -122.4787, alt: 64, speed: 55 },
                { lat: 37.8259, lng: -122.4791, alt: 62, speed: 50 },
                { lat: 37.8285, lng: -122.4815, alt: 45, speed: 40 },
                { lat: 37.8299, lng: -122.4834, alt: 36, speed: 30 },
                { lat: 37.8290, lng: -122.4862, alt: 85, speed: 35 },
                { lat: 37.8268, lng: -122.4900, alt: 110, speed: 40 },
                { lat: 37.8251, lng: -122.4942, alt: 135, speed: 42 },
                { lat: 37.8248, lng: -122.4985, alt: 142, speed: 45 },
                { lat: 37.8260, lng: -122.5028, alt: 115, speed: 45 },
                { lat: 37.8267, lng: -122.5065, alt: 88, speed: 40 },
                { lat: 37.8255, lng: -122.5100, alt: 42, speed: 35 },
                { lat: 37.8225, lng: -122.5122, alt: 15, speed: 25 },
                { lat: 37.8190, lng: -122.5135, alt: 8, speed: 20 }
            ]
        },
        'london-river': {
            name: "London Thames River Walk",
            startZoom: 15,
            points: [
                { lat: 51.5074, lng: -0.1278, alt: 14, speed: 4.2 }, // Trafalgar Square
                { lat: 51.5061, lng: -0.1245, alt: 12, speed: 4.8 },
                { lat: 51.5042, lng: -0.1225, alt: 11, speed: 5.0 }, // Big Ben / Westminster
                { lat: 51.5028, lng: -0.1205, alt: 9, speed: 4.5 },
                { lat: 51.5008, lng: -0.1165, alt: 8, speed: 4.8 }, // Lambeth Palace
                { lat: 51.5015, lng: -0.1115, alt: 9, speed: 5.2 },
                { lat: 51.5035, lng: -0.1118, alt: 11, speed: 4.6 }, // London Eye
                { lat: 51.5058, lng: -0.1132, alt: 10, speed: 4.0 },
                { lat: 51.5071, lng: -0.1145, alt: 12, speed: 3.5 }, // Waterloo Bridge
                { lat: 51.5085, lng: -0.1115, alt: 14, speed: 4.5 },
                { lat: 51.5095, lng: -0.1045, alt: 13, speed: 4.9 }, // Blackfriars
                { lat: 51.5088, lng: -0.0985, alt: 11, speed: 5.1 }, // Tate Modern
                { lat: 51.5075, lng: -0.0905, alt: 10, speed: 4.8 }, // London Bridge
                { lat: 51.5060, lng: -0.0835, alt: 11, speed: 4.5 }, // HMS Belfast
                { lat: 51.5045, lng: -0.0765, alt: 12, speed: 4.0 }  // Tower Bridge
            ]
        },
        'tokyo-shibuya': {
            name: "Tokyo Shibuya Crossing Loop",
            startZoom: 17,
            points: [
                { lat: 35.6580, lng: 139.7016, alt: 16, speed: 3.5 }, // Shibuya Station Hachiko Exit
                { lat: 35.6585, lng: 139.7012, alt: 16, speed: 4.1 }, // Crossing center
                { lat: 35.6592, lng: 139.7008, alt: 18, speed: 4.5 }, // Q-Front Building
                { lat: 35.6598, lng: 139.7005, alt: 19, speed: 3.8 }, // Inokashira street
                { lat: 35.6605, lng: 139.7011, alt: 22, speed: 3.0 }, // Towards Parco
                { lat: 35.6612, lng: 139.7018, alt: 25, speed: 4.2 },
                { lat: 35.6608, lng: 139.7028, alt: 24, speed: 5.0 }, // Fire Street
                { lat: 35.6600, lng: 139.7032, alt: 20, speed: 4.8 }, // Shibuya Modi
                { lat: 35.6592, lng: 139.7029, alt: 18, speed: 4.2 }, // Koen-dori street
                { lat: 35.6584, lng: 139.7024, alt: 17, speed: 3.5 }, // Back to Crossing
                { lat: 35.6580, lng: 139.7016, alt: 16, speed: 2.5 }  // Hachiko Square Loop End
            ]
        }
    };

    // DOM Elements Cache
    const el = {
        map: document.getElementById('map'),
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        searchResults: document.getElementById('search-results'),
        sidebar: document.getElementById('sidebar'),
        toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
        expandSidebarBtn: document.getElementById('expand-sidebar-btn'),
        currentAddress: document.getElementById('current-address'),
        lat: document.getElementById('telemetry-lat'),
        lng: document.getElementById('telemetry-lng'),
        speed: document.getElementById('telemetry-speed'),
        altitude: document.getElementById('telemetry-altitude'),
        heading: document.getElementById('telemetry-heading'),
        accuracy: document.getElementById('telemetry-accuracy'),
        routeDistance: document.getElementById('route-distance'),
        routePoints: document.getElementById('route-points'),
        clearTrailBtn: document.getElementById('clear-trail-btn'),
        exportGpxBtn: document.getElementById('export-gpx-btn'),
        demoStatus: document.getElementById('demo-status'),
        simRoute: document.getElementById('simulation-route'),
        simSpeed: document.getElementById('simulation-speed'),
        startSimBtn: document.getElementById('start-simulation-btn'),
        stopSimBtn: document.getElementById('stop-simulation-btn'),
        recenterBtn: document.getElementById('recenter-btn'),
        toggleTrackingBtn: document.getElementById('toggle-tracking-btn'),
        shareLocationBtn: document.getElementById('share-location-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        toggleStyleBtn: document.getElementById('toggle-style-btn'),
        styleOptions: document.getElementById('style-options'),
        styleItems: document.querySelectorAll('.style-option'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message')
    };

    /**
     * Display a sleek custom notification message to the user
     */
    function showNotification(message, duration = 3000) {
        el.toastMessage.innerText = message;
        el.toast.classList.remove('hidden');
        setTimeout(() => {
            el.toast.classList.add('hidden');
        }, duration);
    }

    /**
     * Initializing the Leaflet Map Engine
     */
    function initMap() {
        // Start center coordinate - default to London Trafalgar Square until user coords loaded
        const defaultCenter = [51.5074, -0.1278];
        const defaultZoom = 13;

        state.map = L.map('map', {
            zoomControl: true,
            layers: [mapLayers[state.activeMapStyle]] // Load default dark mode
        }).setView(defaultCenter, defaultZoom);

        // Customize Marker design: Sleek Radar Pulsing Circle
        const radarIcon = L.divIcon({
            className: 'custom-radar-marker',
            html: '<div class="radar-dot"></div><div class="radar-pulse"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Initialize user marker & accuracy representation
        state.userMarker = L.marker(defaultCenter, { icon: radarIcon }).addTo(state.map);
        state.accuracyCircle = L.circle(defaultCenter, {
            radius: 0,
            color: '#0ea5e9',
            fillColor: '#0ea5e9',
            fillOpacity: 0.12,
            weight: 1
        }).addTo(state.map);

        // Initialize historical routing trail line
        state.routePolyline = L.polyline([], {
            color: '#8b5cf6', // Indigo Violet Trail
            weight: 4,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '1, 2' // Dotted line effect
        }).addTo(state.map);

        showNotification("Interactive map initialization complete.");
    }

    /**
     * Update real-time coordinates, telemetry HUD, reverse geocode addresses, and pathing list
     */
    function updateLocation(lat, lng, accuracy = 0, speed = null, altitude = null, heading = null) {
        state.currentLat = lat;
        state.currentLng = lng;

        const newPos = L.latLng(lat, lng);

        // Update visual marker elements
        state.userMarker.setLatLng(newPos);
        state.accuracyCircle.setLatLng(newPos);
        state.accuracyCircle.setRadius(accuracy);

        // If active tracking is enabled, center map view smoothly
        if (state.isTracking) {
            state.map.panTo(newPos);
        }

        // Add to historical routing polyline if moved noticeably
        if (state.routeCoords.length === 0) {
            state.routeCoords.push(newPos);
            state.routePolyline.setLatLngs(state.routeCoords);
        } else {
            const lastPos = state.routeCoords[state.routeCoords.length - 1];
            const moveThreshold = 1.5; // meters
            const distMoved = state.map.distance(lastPos, newPos);

            if (distMoved >= moveThreshold) {
                // Calculate total accumulated distance
                state.totalDistance += distMoved / 1000; // Convert to km
                state.routeCoords.push(newPos);
                state.routePolyline.setLatLngs(state.routeCoords);
            }
        }

        // Update telemetry sidebar numbers
        el.lat.innerText = lat.toFixed(6);
        el.lng.innerText = lng.toFixed(6);
        el.accuracy.innerText = Math.round(accuracy);
        el.routePoints.innerText = state.routeCoords.length;
        el.routeDistance.innerText = `${state.totalDistance.toFixed(3)} km`;

        // Altitude rendering
        if (altitude !== null && altitude !== undefined) {
            el.altitude.innerText = Math.round(altitude);
        } else {
            el.altitude.innerText = "0";
        }

        // Speed rendering
        if (speed !== null && speed !== undefined && speed > 0) {
            // Speed comes in m/s from Geolocation API. Convert to km/h.
            const speedKmh = (speed * 3.6).toFixed(1);
            el.speed.innerText = speedKmh;
        } else {
            el.speed.innerText = "0.0";
        }

        // Heading angle compass rendering
        if (heading !== null && heading !== undefined && !isNaN(heading)) {
            let direction = 'N';
            if (heading > 22.5 && heading <= 67.5) direction = 'NE';
            else if (heading > 67.5 && heading <= 112.5) direction = 'E';
            else if (heading > 112.5 && heading <= 157.5) direction = 'SE';
            else if (heading > 157.5 && heading <= 202.5) direction = 'S';
            else if (heading > 202.5 && heading <= 247.5) direction = 'SW';
            else if (heading > 247.5 && heading <= 292.5) direction = 'W';
            else if (heading > 292.5 && heading <= 337.5) direction = 'NW';

            el.heading.innerText = `${Math.round(heading)}° (${direction})`;
        } else {
            el.heading.innerText = "N/A";
        }

        // Invoke Nominatim Reverse Geocoding API dynamically (Throttled using simple timestamp check)
        const now = Date.now();
        if (!state.lastPositionTime || now - state.lastPositionTime > 4000) {
            state.lastPositionTime = now;
            reverseGeocode(lat, lng);
        }
    }

    /**
     * Connects with open-source Nominatim API for full reverse geocoding
     */
    async function reverseGeocode(lat, lng) {
        try {
            el.currentAddress.innerText = "Locating full address...";
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`, {
                headers: {
                    'Accept-Language': 'en'
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    el.currentAddress.innerText = data.display_name;
                } else {
                    el.currentAddress.innerText = `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;
                }
            } else {
                el.currentAddress.innerText = `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;
            }
        } catch (err) {
            console.error("Reverse Geocode API Error:", err);
            el.currentAddress.innerText = `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;
        }
    }

    /**
     * HTML5 Geolocation API Active Watch Positioning
     */
    function startRealTimeTracking() {
        if (!navigator.geolocation) {
            showNotification("Your browser does not support GPS location tracking.", 5000);
            return;
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        state.watchPositionId = navigator.geolocation.watchPosition(
            (pos) => {
                // Ignore HTML5 inputs if user is currently viewing preset route simulator
                if (state.isDemoActive) return;

                const coords = pos.coords;
                updateLocation(
                    coords.latitude,
                    coords.longitude,
                    coords.accuracy,
                    coords.speed,
                    coords.altitude,
                    coords.heading
                );
            },
            (err) => {
                console.warn("Geolocation positioning error:", err.message);
                if (!state.isDemoActive) {
                    showNotification("GPS sensor signal weak or denied. Try starting the Scenic Simulation Mode in the sidebar panel!", 7000);
                }
            },
            geoOptions
        );
    }

    /**
     * Handles search querying of OpenStreetMap Nominatim API
     */
    async function performSearch() {
        const query = el.searchInput.value.trim();
        if (!query) return;

        el.searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'en'
                }
            });

            if (response.ok) {
                const results = await response.json();
                displaySearchResults(results);
            } else {
                showNotification("Search service currently unavailable.");
            }
        } catch (err) {
            console.error("Search fetch failed:", err);
            showNotification("Search failed. Check your internet connection.");
        } finally {
            el.searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
        }
    }

    /**
     * Display autocomplete suggestions beneath search bar
     */
    function displaySearchResults(results) {
        el.searchResults.innerHTML = '';

        if (!results || results.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><div class="result-info"><span class="result-title">No places found</span></div>`;
            el.searchResults.appendChild(emptyItem);
            el.searchResults.classList.remove('hidden');
            return;
        }

        results.forEach(place => {
            const li = document.createElement('li');
            const name = place.display_name.split(',')[0];
            const addressDetails = place.display_name.split(',').slice(1).join(',').trim();

            li.innerHTML = `
                <i class="fa-solid fa-map-pin"></i>
                <div class="result-info">
                    <span class="result-title">${name}</span>
                    <span class="result-subtitle">${addressDetails}</span>
                </div>
            `;

            li.addEventListener('click', () => {
                selectSearchResult(place);
            });

            el.searchResults.appendChild(li);
        });

        el.searchResults.classList.remove('hidden');
    }

    /**
     * Selects and navigates user to search location
     */
    function selectSearchResult(place) {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        el.searchResults.classList.add('hidden');
        el.searchInput.value = place.display_name;
        el.clearSearchBtn.classList.remove('hidden');

        // Center view on place
        state.map.setView([lat, lon], 16);

        // Remove any existing destination markers
        state.customMarkers.forEach(marker => state.map.removeLayer(marker));
        state.customMarkers = [];

        // Pin dynamic marker with details popup
        const destMarker = L.marker([lat, lon]).addTo(state.map);
        destMarker.bindPopup(`
            <div style="color: #0f172a; font-family: 'Inter', sans-serif; padding: 4px;">
                <h4 style="margin: 0 0 4px 0; font-weight: 700; color: #0ea5e9;">${place.display_name.split(',')[0]}</h4>
                <p style="margin: 0 0 8px 0; font-size: 0.8rem; color: #64748b;">${place.display_name}</p>
                <button id="calc-distance-btn" class="btn btn-primary" style="padding: 4px 8px; font-size: 0.75rem; width: auto;" onclick="window.calcDistanceTo(${lat}, ${lon})">
                    Calculate Distance
                </button>
            </div>
        `).openPopup();

        state.customMarkers.push(destMarker);
    }

    /**
     * Calculates line distance to a destination target point
     */
    window.calcDistanceTo = function (destLat, destLng) {
        if (state.currentLat === null || state.currentLng === null) {
            showNotification("Please detect your live location first.");
            return;
        }

        const start = L.latLng(state.currentLat, state.currentLng);
        const dest = L.latLng(destLat, destLng);
        const distanceM = state.map.distance(start, dest);
        const distanceKm = (distanceM / 1000).toFixed(2);

        // Draw distance line indicators
        const distLine = L.polyline([start, dest], {
            color: '#ef4444',
            weight: 3,
            dashArray: '5, 10'
        }).addTo(state.map);

        state.customMarkers.push(distLine);

        showNotification(`Distance from current location to target is: ${distanceKm} km`, 6000);
    };

    /**
     * Starts realistic, scenery route path simulation
     */
    function startDemoSimulation() {
        if (state.isDemoActive) return;

        // Reset trail history and statistics before beginning simulation
        clearTrailHistory();

        const selectedRouteKey = el.simRoute.value;
        const routeData = scenicRoutes[selectedRouteKey];
        if (!routeData) return;

        state.isDemoActive = true;
        el.demoStatus.innerText = "ACTIVE";
        el.demoStatus.classList.add('active');

        el.startSimBtn.classList.add('hidden');
        el.stopSimBtn.classList.remove('hidden');

        // Prepopulate coordinates list
        state.demoRoutePoints = routeData.points;
        state.demoCurrentIndex = 0;
        state.demoSpeedMultiplier = parseInt(el.simSpeed.value) || 2;

        // Position initial map perspective
        const firstPoint = state.demoRoutePoints[0];
        state.map.setView([firstPoint.lat, firstPoint.lng], routeData.startZoom);

        showNotification(`Simulation Mode Active: Walking along ${routeData.name}!`);

        // Frame interval loop calculations (updates positions based on speed multiplier)
        const updateInterval = 2000 / state.demoSpeedMultiplier;

        function runStep() {
            if (!state.isDemoActive) return;

            const pt = state.demoRoutePoints[state.demoCurrentIndex];

            // Introduce slight realistic positioning noise
            const gpsNoiseLat = (Math.random() - 0.5) * 0.00015;
            const gpsNoiseLng = (Math.random() - 0.5) * 0.00015;
            const liveLat = pt.lat + gpsNoiseLat;
            const liveLng = pt.lng + gpsNoiseLng;

            // Generate fluctuating speed/accuracy values
            const speedFluctuation = pt.speed + (Math.random() - 0.5) * (pt.speed * 0.15);
            const liveAccuracy = 5 + Math.random() * 8; // high precision simulator

            // Update GPS core location
            updateLocation(liveLat, liveLng, liveAccuracy, speedFluctuation, pt.alt, Math.random() * 360);

            // Move pointer list forward
            state.demoCurrentIndex++;
            if (state.demoCurrentIndex >= state.demoRoutePoints.length) {
                state.demoCurrentIndex = 0; // loop preset coordinates
            }

            // Set dynamic timer for next frame iteration
            state.demoIntervalId = setTimeout(runStep, updateInterval);
        }

        runStep();
    }

    /**
     * Stops scenic route simulation
     */
    function stopDemoSimulation() {
        if (!state.isDemoActive) return;

        state.isDemoActive = false;
        clearTimeout(state.demoIntervalId);
        state.demoIntervalId = null;

        el.demoStatus.innerText = "OFF";
        el.demoStatus.classList.remove('active');

        el.startSimBtn.classList.remove('hidden');
        el.stopSimBtn.classList.add('hidden');

        showNotification("Simulation Mode deactivated. Returning to GPS sensors.");
    }

    /**
     * Resets historical user paths
     */
    function clearTrailHistory() {
        state.routeCoords = [];
        state.totalDistance = 0;
        state.routePolyline.setLatLngs([]);

        el.routePoints.innerText = "0";
        el.routeDistance.innerText = "0.00 km";

        showNotification("Breadcrumb route trails cleared.");
    }

    /**
     * Package path trail coordinates as coordinate GPX schema data payload
     */
    function exportGpxFile() {
        if (state.routeCoords.length === 0) {
            showNotification("No breadcrumb points tracked to export. Turn on Demo Simulation or walk around to build track logs.");
            return;
        }

        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GeoPulse Live Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>GeoPulse Active Track Path</name>
    <desc>Real-time path points logs</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Live Track log</name>
    <trkseg>`;

        state.routeCoords.forEach(pt => {
            gpx += `\n      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}"></trkpt>`;
        });

        gpx += `\n    </trkseg>
  </trk>
</gpx>`;

        // Construct dynamic file trigger download
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geopulse-track-${Date.now()}.gpx`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification("GPX trail coordinates exported successfully.");
    }

    /**
     * Copy coordinates to clipboard
     */
    function shareLocation() {
        if (state.currentLat === null || state.currentLng === null) {
            showNotification("Current coordinates unavailable.");
            return;
        }

        const shareUrl = `https://maps.google.com/?q=${state.currentLat},${state.currentLng}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification("Google Maps location URL copied to clipboard!");
        }).catch(err => {
            // fallback
            alert(`My Coordinates: Lat ${state.currentLat}, Lng ${state.currentLng}`);
        });
    }

    /**
     * Center view on current user
     */
    function centerOnUser() {
        if (state.currentLat === null || state.currentLng === null) {
            showNotification("Real-time coordinates pending GPS resolution.");
            return;
        }

        state.map.setView([state.currentLat, state.currentLng], 15);
        showNotification("Centered perspective on current position.");
    }

    /**
     * Toggle full screen mode
     */
    function toggleFullscreen() {
        const doc = document.documentElement;
        if (!state.isFullscreen) {
            if (doc.requestFullscreen) doc.requestFullscreen();
            state.isFullscreen = true;
            el.fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
            showNotification("Fullscreen view enabled.");
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            state.isFullscreen = false;
            el.fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
            showNotification("Fullscreen view disabled.");
        }
    }

    /**
     * Event Listeners Setup
     */
    function setupEvents() {
        // Search interactions
        el.searchBtn.addEventListener('click', performSearch);
        el.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        el.searchInput.addEventListener('input', () => {
            if (el.searchInput.value.trim() !== '') {
                el.clearSearchBtn.classList.remove('hidden');
            } else {
                el.clearSearchBtn.classList.add('hidden');
                el.searchResults.classList.add('hidden');
            }
        });

        el.clearSearchBtn.addEventListener('click', () => {
            el.searchInput.value = '';
            el.clearSearchBtn.classList.add('hidden');
            el.searchResults.classList.add('hidden');
            state.customMarkers.forEach(marker => state.map.removeLayer(marker));
            state.customMarkers = [];
        });

        // Sidebar collapsible controls
        el.toggleSidebarBtn.addEventListener('click', () => {
            el.sidebar.classList.add('hidden');
            el.expandSidebarBtn.classList.remove('hidden');
        });

        el.expandSidebarBtn.addEventListener('click', () => {
            el.sidebar.classList.remove('hidden');
            el.expandSidebarBtn.classList.add('hidden');
        });

        // Quick Actions HUD
        el.recenterBtn.addEventListener('click', centerOnUser);

        el.toggleTrackingBtn.addEventListener('click', () => {
            state.isTracking = !state.isTracking;
            if (state.isTracking) {
                el.toggleTrackingBtn.classList.add('active-state');
                el.toggleTrackingBtn.title = "Pause Camera Tracking";
                showNotification("Auto-centering camera tracking active.");
            } else {
                el.toggleTrackingBtn.classList.remove('active-state');
                el.toggleTrackingBtn.title = "Resume Camera Tracking";
                showNotification("Auto-centering tracking paused.");
            }
        });

        el.shareLocationBtn.addEventListener('click', shareLocation);
        el.fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Sidebar stats
        el.clearTrailBtn.addEventListener('click', clearTrailHistory);
        el.exportGpxBtn.addEventListener('click', exportGpxFile);

        // Preset Scenario Simulation
        el.startSimBtn.addEventListener('click', startDemoSimulation);
        el.stopSimBtn.addEventListener('click', stopDemoSimulation);

        // Style switcher widgets
        el.toggleStyleBtn.addEventListener('click', () => {
            el.styleOptions.classList.toggle('hidden');
        });

        el.styleItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetStyle = item.getAttribute('data-style');
                if (targetStyle === state.activeMapStyle) return;

                // Remove current layer from map
                state.map.removeLayer(mapLayers[state.activeMapStyle]);

                // Update active selection status
                el.styleItems.forEach(opt => opt.classList.remove('active'));
                item.classList.add('active');

                // Apply dynamic styles to map container element
                state.activeMapStyle = targetStyle;
                mapLayers[state.activeMapStyle].addTo(state.map);

                // Hide style selections panel
                el.styleOptions.classList.add('hidden');
                showNotification(`Map style transformed to: ${targetStyle.toUpperCase()}`);
            });
        });

        // Close search list on clicking outside map layer
        state.map.on('click', () => {
            el.searchResults.classList.add('hidden');
            el.styleOptions.classList.add('hidden');
        });
    }

    /**
     * Start application bootstrap setup
     */
    function bootstrap() {
        initMap();
        setupEvents();
        startRealTimeTracking();

        // Display welcoming simulation prompt
        setTimeout(() => {
            showNotification("Welcome! GeoPulse is ready. Trigger Demo Simulation to preview live location routing instantly!", 5000);
        }, 1500);
    }

    // Run bootstrapping sequence
    window.addEventListener('DOMContentLoaded', bootstrap);
})();
