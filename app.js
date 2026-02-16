document.addEventListener("DOMContentLoaded", function() {

    // --------------------------
    // ELEMENTS
    // --------------------------
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");

    const togglePhoto = document.getElementById("togglePhoto");
    const toggleSpeciesList = document.getElementById("toggleSpeciesList");
    const toggleEdit = document.getElementById("toggleEdit");

    const observerInput = document.getElementById("observer");
    const speciesInput = document.getElementById("species");
    const speciesMasterContainer = document.getElementById("speciesMasterContainer");
    const speciesMaster = document.getElementById("speciesMaster");
    const notesInput = document.getElementById("notes");
    const photoContainer = document.getElementById("photoContainer");
    const photoInput = document.getElementById("photoInput");
    const logButton = document.getElementById("logButton");
    const sightingsList = document.getElementById("sightingsList");
    const exportButton = document.getElementById("exportButton");

    let currentCoords = null;

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];
    let observers = JSON.parse(localStorage.getItem("recentObservers")) || [];

    // --------------------------
    // SETTINGS PANEL
    // --------------------------
    settingsToggle.addEventListener("click", () => settingsPanel.classList.add("open"));
    closeSettings.addEventListener("click", () => settingsPanel.classList.remove("open"));

    let settings = JSON.parse(localStorage.getItem("fieldSettings")) || {
        photo: false,
        speciesList: false,
        edit: false
    };

    function applySettings() {
        togglePhoto.checked = settings.photo;
        toggleSpeciesList.checked = settings.speciesList;
        toggleEdit.checked = settings.edit;

        photoContainer.style.display = settings.photo ? "block" : "none";
        speciesMasterContainer.style.display = settings.speciesList ? "block" : "none";
    }

    function saveSettings() {
        localStorage.setItem("fieldSettings", JSON.stringify(settings));
    }

    togglePhoto.addEventListener("change", () => { settings.photo = togglePhoto.checked; saveSettings(); applySettings(); });
    toggleSpeciesList.addEventListener("change", () => { settings.speciesList = toggleSpeciesList.checked; saveSettings(); applySettings(); });
    toggleEdit.addEventListener("change", () => { settings.edit = toggleEdit.checked; saveSettings(); });

    applySettings();

    // --------------------------
    // OBSERVER DROPDOWN HISTORY
    // --------------------------
    function populateObserverDropdown() {
        observerInput.innerHTML = ""; // clear
        observers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            observerInput.appendChild(option);
        });
    }

    function saveObserver(name) {
        observers = observers.filter(o => o !== name);
        observers.unshift(name);
        observers = observers.slice(0,5); // last 5
        localStorage.setItem("recentObservers", JSON.stringify(observers));
        populateObserverDropdown();
    }

    populateObserverDropdown();

    // --------------------------
    // RENDER SIGHTINGS
    // --------------------------
    function renderSightings() {
        sightingsList.innerHTML = "";
        sightings.forEach((s, i) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${s.species}</strong><br>
                Observer: ${s.observer}<br>
                GPS: ${s.lat}, ${s.lon}<br>
                Notes: ${s.notes || "—"}<br>
                Date: ${new Date(s.date).toLocaleString()}
            `;

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", () => {
                sightings.splice(i,1);
                localStorage.setItem("sightings", JSON.stringify(sightings));
                renderSightings();
            });

            li.appendChild(deleteBtn);
            sightingsList.appendChild(li);
        });
    }

    renderSightings();

    // --------------------------
    // GPS CAPTURE
    // --------------------------
    function getGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject("GPS not supported");
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude.toFixed(6),
                    lon: pos.coords.longitude.toFixed(6)
                }),
                () => reject("GPS failed"),
                { enableHighAccuracy: true }
            );
        });
    }

    // --------------------------
    // LOG SIGHTING
    // --------------------------
    logButton.addEventListener("click", async () => {
        const observer = observerInput.value.trim();
        const species = speciesInput.value.trim();
        const notes = notesInput.value.trim();

        if (!observer || !species) {
            alert("Observer and Species required.");
            return;
        }

        logButton.disabled = true;
        logButton.textContent = "Capturing GPS...";

        try {
            const coords = await getGPS();
            currentCoords = coords;

            const newSighting = {
                observer,
                species,
                notes,
                lat: coords.lat,
                lon: coords.lon,
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

        } catch(err) {
            alert("GPS required. Enable location services.");
        }

        logButton.disabled = false;
        logButton.textContent = "Log Sighting";
    });

    // --------------------------
    // EXPORT CSV
    // --------------------------
    exportButton.addEventListener("click", () => {
        if (sightings.length === 0) { alert("No data to export."); return; }

        const headers = ["Observer","Species","Latitude","Longitude","Notes","ISO_Date","Readable_Date"];
        const rows = sightings.map(s => [
            `"${s.observer.replace(/"/g,'""')}"`,
            `"${s.species.replace(/"/g,'""')}"`,
            s.lat,
            s.lon,
            `"${(s.notes||"").replace(/"/g,'""')}"`,
            s.date,
            `"${new Date(s.date).toLocaleString()}"`
        ]);

        const csvContent = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "BushLogger_FieldData.csv";
        a.click();
        URL.revokeObjectURL(url);
    });

});
