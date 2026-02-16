document.addEventListener("DOMContentLoaded", function () {

    const observerInput = document.getElementById("observer");
    const observerSelect = document.getElementById("observerSelect");
    const speciesInput = document.getElementById("species");
    const notesInput = document.getElementById("notes");
    const logButton = document.getElementById("logButton");
    const sightingsList = document.getElementById("sightingsList");
    const exportButton = document.getElementById("exportButton");

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];
    let observers = JSON.parse(localStorage.getItem("recentObservers")) || [];

    // =========================
    // GPS REQUIRED
    // =========================
    function getGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject("No GPS");

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        lat: position.coords.latitude.toFixed(6),
                        lon: position.coords.longitude.toFixed(6)
                    });
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
    // Render List
    // =========================
    function renderSightings() {
        sightingsList.innerHTML = "";

        sightings.forEach((s, index) => {

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
    // Log Sighting
    // =========================
    logButton.addEventListener("click", async function () {

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
            const gps = await getGPS();

            const newSighting = {
                observer,
                species,
                notes,
                lat: gps.lat,
                lon: gps.lon,
                date: new Date().toISOString()
            };

            sightings.unshift(newSighting);
            localStorage.setItem("sightings", JSON.stringify(sightings));

            saveObserver(observer);

            observerInput.value = "";
            speciesInput.value = "";
            notesInput.value = "";

            renderSightings();

        } catch (err) {
            alert("GPS required. Enable location services.");
        }

        logButton.disabled = false;
        logButton.textContent = "Log Sighting";
    });

    // =========================
    // ADVANCED CSV EXPORT
    // =========================
    exportButton.addEventListener("click", function () {

        if (sightings.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = [
            "Observer",
            "Species",
            "Latitude",
            "Longitude",
            "Notes",
            "ISO_Date",
            "Readable_Date"
        ];

        let rows = sightings.map(s => [
            escapeCSV(s.observer),
            escapeCSV(s.species),
            s.lat,
            s.lon,
            escapeCSV(s.notes || ""),
            s.date,
            new Date(s.date).toLocaleString()
        ]);

        let csvContent =
            headers.join(",") + "\n" +
            rows.map(r => r.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "BushLogger_FieldData.csv";
        link.click();

        URL.revokeObjectURL(url);
    });

    // Prevent broken commas in notes
    function escapeCSV(value) {
        if (!value) return "";
        value = value.replace(/"/g, '""');
        return `"${value}"`;
    }

    populateObserverDropdown();
    renderSightings();
});
