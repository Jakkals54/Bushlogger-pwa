document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("sightingForm");
    const sightingsList = document.getElementById("sightingsList");
    const exportBtn = document.getElementById("exportBtn");
    const observerSelect = document.getElementById("observer");

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];

    // =========================
    // Populate Observer Dropdown
    // =========================

    const observers = ["Frans", "Ranger A", "Ranger B"];

    observers.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        observerSelect.appendChild(option);
    });

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
                Location: ${sighting.location}<br>
                Notes: ${sighting.notes}<br>
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;
            sightingsList.appendChild(li);
        });

        // Delete buttons
        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const index = e.target.getAttribute("data-index");
                sightings.splice(index, 1);
                localStorage.setItem("sightings", JSON.stringify(sightings));
                renderSightings();
            });
        });
    }

    // =========================
    // Log Sighting
    // =========================

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const species = document.getElementById("species").value;
        const observer = observerSelect.value;
        const location = document.getElementById("location").value;
        const notes = document.getElementById("notes").value;

        const newSighting = {
            species,
            observer,
            location,
            notes,
            timestamp: new Date().toISOString()
        };

        sightings.push(newSighting);
        localStorage.setItem("sightings", JSON.stringify(sightings));

        form.reset();
        renderSightings();
    });

    // =========================
    // Export CSV
    // =========================

    exportBtn.addEventListener("click", () => {
        if (sightings.length === 0) {
            alert("No data to export.");
            return;
        }

        let csv = "Species,Observer,Location,Notes,Timestamp\n";

        sightings.forEach(s => {
            csv += `"${s.species}","${s.observer}","${s.location}","${s.notes}","${s.timestamp}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "sightings.csv";
        a.click();

        URL.revokeObjectURL(url);
    });

    // Initial render
    renderSightings();
});
