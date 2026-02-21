document.addEventListener("DOMContentLoaded", () => {

    const csvInput = document.getElementById("csvInput");
    const dropdown = document.getElementById("csvSpeciesColumn");
    const container = document.getElementById("checklistContainer");

    let csvRows = [];

    csvInput.addEventListener("change", function () {

        const file = this.files[0];
        if (!file) return;

        console.log("File selected:", file.name);

        const reader = new FileReader();

        reader.onload = function (e) {

            const text = e.target.result;

            const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
            if (lines.length === 0) return;

            // Detect delimiter
            let delimiter = ",";
            if (lines[0].includes("\t")) delimiter = "\t";
            if (lines[0].includes(";")) delimiter = ";";

            const headers = lines[0].split(delimiter).map(h => h.trim());

            // Store full dataset (excluding header row)
            csvRows = lines.slice(1).map(line =>
                line.split(delimiter).map(cell => cell.trim())
            );

            // Populate dropdown
            dropdown.innerHTML = "";
            headers.forEach((header, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = header;
                dropdown.appendChild(option);
            });

            console.log("Headers loaded:", headers.length);
            console.log("Rows loaded:", csvRows.length);

            renderPreview(0); // show first column by default
        };

        reader.readAsText(file);
    });

    dropdown.addEventListener("change", function () {
        renderPreview(parseInt(this.value));
    });

    function renderPreview(columnIndex) {

        container.innerHTML = "";

        if (!csvRows.length) return;

        csvRows.forEach(row => {

            const value = row[columnIndex];
            if (!value) return;

            const div = document.createElement("div");
            div.textContent = value;
            container.appendChild(div);

        });
    }

});
