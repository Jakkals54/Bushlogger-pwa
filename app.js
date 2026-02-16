document.addEventListener("DOMContentLoaded", function () {

    const observerInput = document.getElementById("observer");
    const observerSelect = document.getElementById("observerSelect");
    const speciesInput = document.getElementById("species");
    const notesInput = document.getElementById("notes");
    const logButton = document.getElementById("logButton");
    const sightingsList = document.getElementById("sightingsList");

    let currentCoords = null;

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];
    let observers = JSON.parse(localStorage.getItem("recentObservers")) || [];

    // =========================
    // GPS Capture
    // =========================
    function captureGPS() {
        if (!navigator.geolocation) {
            alert("GPS not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                currentCoords =
                    position.coords.latitude.toFixed(6) + ", " +
                    position.coords.longitude.toFixed(6);

                alert("GPS captured!");
            },
            () => {
                alert("Unable to retrieve GPS");
            }
        );
    }

    // Add GPS button dynamically
    const gpsButton = document.createElement("button");
    gpsButton.textContent = "Capture GPS";
    gpsButton.addEventListener("click", captureGPS);
    logButton.parentNode.insertBefore(gpsButton, logButton);

    // =========================
    // Observer Dropdown
    // =========================
    function populateObserverDropdown() {
        observerSelect.innerHTML = '<option value="">Select recent observer</option>';

        observers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            observerSelect.appendChild(option);
        });
    }

    observerSelect.addEventListener("change", function () {
        observerInput.value = observerSelect.value;
    });

    function saveObserver(name) {
        observers = observers.filter(o => o !== name);
        observers.unshift(name);
        observers = observers.slice(0, 5);

        localStorage.setItem("recentObservers", JSON.stringify(observers));
        populateObserverDropdown();
    }

    // =========================
    // Render Sightings
    // =========================
    function renderSightings() {
        sightingsList.innerHTML = "";

        sightings.forEach((sighting, index) => {

            const li = document.createElement("li");

            li.innerHTML = `
                <strong>${sighting.species}</strong><br>
                Observer: ${sighting.observer}<br>
                Notes: ${sighting.notes || "—"}<br>
                GPS: ${sighting.coords || "Not captured"}<br>
                Date: ${new Date(sighting.date).toLocaleString()}
            `;

            // Share Button (per sighting)
            const shareBtn = document.createElement("button");
            shareBtn.textContent = "Share";
            shareBtn.addEventListener("click", function () {

                const text =
                    `Species: ${sighting.species}\n` +
                    `Observer: ${sighting.observer}\n` +
                    `Notes: ${sighting.notes || ""}\n` +
                    `GPS: ${sighting.coords || ""}`;

                if (navigator.share) {
                    navigator.share({
                        title: "Bush Logger Sighting",
                        text: text
                    });
                } else {
                    navigator.clipboard.writeText(text);
                    alert("Copied to clipboard!");
                }
            });

            // Delete Button
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", function () {
                sightings.splice(index, 1);
                localStorage.setItem("sightings", JSON.stringify(sightings));
                renderSightings();
            });

            li.appendChild(shareBtn);
            li.appendChild(deleteBtn);

            sightingsList.appendChild(li);
        });
    }

    // =========================
    // Log Sighting
    // =========================
    logButton.addEventListener("click", function () {

        const observer = observerInput.value.trim();
        const species = speciesInput.value.trim();
        const notes = notesInput.value.trim();

        if (!observer || !species) {
            alert("Observer and Species required");
            return;
        }

        const newSighting = {
            observer,
            species,
            notes,
            coords: currentCoords,
            date: new Date().toISOString()
        };

        sightings.unshift(newSighting);
        localStorage.setItem("sightings", JSON.stringify(sightings));

        saveObserver(observer);

        observerInput.value = "";
        speciesInput.value = "";
        notesInput.value = "";
        currentCoords = null;

        renderSightings();
    });

    populateObserverDropdown();
    renderSightings();

});
