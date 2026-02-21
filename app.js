document.addEventListener("DOMContentLoaded", () => {

    const csvInput = document.getElementById("csvInput");
    const dropdown = document.getElementById("csvSpeciesColumn");

    csvInput.addEventListener("change", function () {

        const file = this.files[0];
        if (!file) return;

        console.log("File selected:", file.name);

        const reader = new FileReader();

        reader.onload = function (e) {

            const text = e.target.result;
            console.log("File loaded");

            const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
            if (lines.length === 0) {
                console.log("No lines found");
                return;
            }

            let delimiter = ",";
            if (lines[0].includes("\t")) delimiter = "\t";
            if (lines[0].includes(";")) delimiter = ";";

            console.log("Delimiter:", delimiter);

            const headers = lines[0].split(delimiter).map(h => h.trim());
            console.log("Headers:", headers);

            dropdown.innerHTML = "";

            headers.forEach((header, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = header;
                dropdown.appendChild(option);
            });

            console.log("Dropdown options count:", dropdown.options.length);
        };

        reader.readAsText(file);
    });

});
