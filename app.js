document.addEventListener("DOMContentLoaded", function () {

    const observerInput = document.getElementById("observer");
    const observerSelect = document.getElementById("observerSelect");
    const speciesInput = document.getElementById("species");
    const notesInput = document.getElementById("notes");
    const logButton = document.getElementById("logButton");
    const sightingsList = document.getElementById("sightingsList");

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];
    let observers = JSON.parse(localStorage.getItem("recentObservers")) || [];

    // =========================
    // GPS Function (Required)
    // =========================
    function getGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject("GPS not supported");
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    const coords =
                        position.coords.latitude.toFixed(6) + ", " +
                        position.coords.longitude.toFixed(6);
                    resolve(coords);
                },
                () => reject("GPS failed"),
                { enableHighAccuracy: true }
            );
        });
    }

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
                GPS: ${sighting.coords}<br>
                Notes: ${sighting.notes || "—"}<br>
                Date: ${new Date(sighting.date).toLocaleString()}
            `;

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", function () {
                sightings.splice(index, 1);
                localStorage.setItem("sightings", JSON.stringify(sightings));
                renderSightings();
            });

            li.appendChild(deleteBtn);
            sightingsList.appendChild(li);
        });
    }

    // =========================
    // Log Sighting (GPS Required)
    // =========================
    logButton.addEventListener("click", async function () {

        const observer = observerInput.value.trim();
        const species = speciesInput.value.trim();
        const notes = notesInput.value.trim();

        if (!observer || !species) {
            alert("Observer and Species are required.");
            return;
        }

        logButton.disabled = true;
        logButton.textContent = "Capturing GPS...";

        try {
            const coords = await getGPS();

            const newSighting = {
                observer,
                species,
                notes,
                coords,
                date: new Date().toISOString()
            };

            sightings.unshift(newSighting);
            localStorage.setItem("sightings", JSON.stringify(sightings));

            saveObserver(observer);

            observerInput.value = "";
            speciesInput.value = "";
            notesInput.value = "";

            renderSightings();

        } catch (error) {
            alert("GPS required. Please enable location services.");
        }

        logButton.disabled = false;
        logButton.textContent = "Log Sighting";
    });

    populateObserverDropdown();
    renderSightings();
});
