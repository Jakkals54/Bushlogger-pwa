function renderChecklist(list) {

    elements.container.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    list.forEach(row => {

        if (!Array.isArray(row)) return;

        const birdNumber = row[0] || "";
        const english = row[1] || "";
        const afrikaans = row[2] || "";

        const wrapper = document.createElement("div");
        wrapper.className = "checklist-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        // ✅ PRE-CHECK if already logged today
        const alreadyLogged = state.sightings.some(s =>
            s.birdNumber === birdNumber &&
            s.date === today
        );

        checkbox.checked = alreadyLogged;

        const label = document.createElement("label");
        label.style.cursor = "pointer";
        label.appendChild(checkbox);

        const text = document.createTextNode(
            ` ${birdNumber} - ${english} / ${afrikaans}`
        );

        label.appendChild(text);
        wrapper.appendChild(label);
        elements.container.appendChild(wrapper);

        checkbox.addEventListener("change", function () {

            if (this.checked) {

                if (alreadyLogged) return;

                handleLog(
                    `${birdNumber} - ${english} / ${afrikaans}`,
                    birdNumber
                );

                renderChecklist(state.checklist); // refresh to sync ticks
            }
        });

    });
}
