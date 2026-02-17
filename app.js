document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // ELEMENTS
    // ==============================
    const observerSelect = document.getElementById("observer");
    const speciesInput = document.getElementById("species");
    const notesInput = document.getElementById("notes");
    const logButton = document.getElementById("logButton");
    const exportButton = document.getElementById("exportButton");
    const sightingsList = document.getElementById("sightingsList");

    // ==============================
    // SETTINGS
    // ==============================
    const observers = ["Frans", "Guest"];

    // Populate observer dropdown
    observers.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        observerSelect.appendChild(option);
    });

    // ==============================
    // STORAGE
    // ==============================
    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];

    function saveSightings() {
        localStorage.setItem("sightings", JSON.stringify(sightings));
    }

    // ==============================
    // DISPLAY
    // ==============================
    function renderSightings() {
        sightingsList.innerHTML = "";

        sightings.forEach((s, index) => {
            const li = document.createElement("li");
            li.textContent = `${s.date} | ${s.time} | ${s.observer} | ${s.species}`;
            sightingsList.appendChild(li);
        });
    }

    renderSightings();

    // ==============================
    // GPS (Desktop Safe Version)
    // ==============================
    function getGPS() {
        // Always safe for desktop testing
        return {
            lat: "-25.000000",
            lon: "31.000000"
        };
    }

    // ==============================
    // LOG SIGHTING
    // ==============================
    logButton.addEventListener("click", function () {

        const observer = observerSelect.value;
        const species = speciesInput.value.trim();
        const notes = notesInput.value.trim();

        if (!species) {
            alert("Please enter species.");
            return;
        }

        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];

        // Check duplicate species for same day
        const duplicate = sightings.find(s =>
            s.species.toLowerCase() === species.toLowerCase() &&
            s.date === date
        );

        if (duplicate) {
            const confirmDelete = confirm(
                "This species was already logged today.\n\nDo you want to delete the previous entry and log again?"
            );

            if (!confirmDelete) {
                return;
            }

            sightings = sightings.filter(s =>
                !(s.species.toLowerCase() === species.toLowerCase() &&
                  s.date === date)
            );
        }

        const gps = getGPS();

        const newEntry = {
            date: date,
            time: time,
            observer: observer,
            species: species,
            notes: notes,
            lat: gps.lat,
            lon: gps.lon
        };

        sightings.push(newEntry);
        saveSightings();
        renderSightings();

        speciesInput.value = "";
        notesInput.value = "";
    });

    // ==============================
    // EXPORT CSV
    // ==============================
    exportButton.addEventListener("click", function () {

        if (sightings.length === 0) {
            alert("No sightings to export.");
            return;
        }

        let csv = "Date,Time,Observer,Species,Notes,Latitude,Longitude\n";

        sightings.forEach(s => {
            csv += `${s.date},${s.time},${s.observer},${s.species},"${s.notes}",${s.lat},${s.lon}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "sightings.csv";
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

});
