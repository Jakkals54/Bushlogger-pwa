document.addEventListener("DOMContentLoaded", function () {

    const observerInput = document.getElementById("observer");
    const observerSelect = document.getElementById("observerSelect");
    const speciesInput = document.getElementById("species");
    const notesInput = document.getElementById("notes");
    const logButton = document.getElementById("logButton");
    const sightingsList = document.getElementById("sightingsList");
    const shareButton = document.getElementById("shareButton");

    let sightings = JSON.parse(localStorage.getItem("sightings")) || [];
    let observers = JSON.parse(localStorage.getItem("recentObservers")) || [];

    // =========================
    // Populate Observer Dropdown
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
        if (observerSelect.value !== "") {
            observerInput.value = observerSelect.value;
        }
    });

    // =========================
    // Save Observer (max 5)
    // =========================
    function saveObserver(name) {
        if (!name) return;

        observers = observers.filter(o => o !== name);
        observers.unshift(name);

        if (observers.length > 5) {
            observers = observers.slice(0, 5);
        }

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
    // Log New Sighting
    // =========================
    logButton.addEventListener("click", function () {

        const observer = observerInput.value.trim();
        const species = speciesInput.value.trim();
        const notes = notesInput.value.trim();

        if (!observer || !species) {
            alert("Observer and Species are required.");
            return;
        }

        const newSighting = {
            observer,
            species,
            notes,
            date: new Date().toISOString()
        };

        sightings.unshift(newSighting);
        localStorage.setItem("sightings", JSON.stringify(sightings));

        saveObserver(observer);

        observerInput.value = "";
        speciesInput.value = "";
        notesInput.value = "";

        renderSightings();
    });

    // =========================
    // Share Function
    // =========================
    shareButton.addEventListener("click", function () {

        const shareText = sightings.map(s =>
            `${s.species} (Observer: ${s.observer})`
        ).join("\n");

        if (navigator.share) {
            navigator.share({
                title: "Bush Logger Sightings",
                text: shareText
            });
        } else {
            navigator.clipboard.writeText(shareText);
            alert("Copied to clipboard!");
        }
    });

    // Initial Load
    populateObserverDropdown();
    renderSightings();

});
