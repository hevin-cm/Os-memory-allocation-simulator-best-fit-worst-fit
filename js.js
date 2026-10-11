function getInput() {
    let blockInput = document.getElementById("blocks");
    let processInput = document.getElementById("processes");
    let error = document.getElementById("error");

    error.style.display = "none";
    blockInput.classList.remove("invalid");
    processInput.classList.remove("invalid");

    let blockText = blockInput.value.trim();
    let processText = processInput.value.trim();

    if (blockText === "" || processText === "") {
        error.textContent = "Please enter both memory blocks and processes.";
        error.style.display = "block";

        if (blockText === "") blockInput.classList.add("invalid");
        if (processText === "") processInput.classList.add("invalid");
        return null;
    }

    let blocks = blockText.split(",").map(x => x.trim());
    let processes = processText.split(",").map(x => x.trim());

    if (blocks.some(x => !/^\d+$/.test(x) || Number(x) <= 0)) {
        error.textContent =
            "Memory Blocks: '" +
            blocks.find(x => !/^\d+$/.test(x) || Number(x) <= 0) +
            "' is not a valid positive whole number.";

        error.style.display = "block";
        blockInput.classList.add("invalid");
        return null;
    }

    if (processes.some(x => !/^\d+$/.test(x) || Number(x) <= 0)) {
        error.textContent =
            "Process Sizes: '" +
            processes.find(x => !/^\d+$/.test(x) || Number(x) <= 0) +
            "' is not a valid positive whole number.";

        error.style.display = "block";
        processInput.classList.add("invalid");
        return null;
    }

    blocks = blocks.map(Number);
    processes = processes.map(Number);

    if (![...blocks, ...processes].every(Number.isSafeInteger) ||
        !Number.isSafeInteger(blocks.reduce((a, b) => a + b, 0)) ||
        !Number.isSafeInteger(processes.reduce((a, b) => a + b, 0))) {
        error.textContent = "Please enter smaller whole numbers.";
        error.style.display = "block";
        return null;
    }

    return { blocks: blocks, processes: processes };
}

function allocate(blocks, processes, type) {
    let available = blocks.map(() => true);
    let allocations = [];
    let fulfilled = 0;
    let failed = 0;
    let fragmentation = 0;
    let usedMemory = 0;

    for (let i = 0; i < processes.length; i++) {
        let index = -1;

        for (let j = 0; j < blocks.length; j++) {
            if (available[j] && blocks[j] >= processes[i]) {
                if (index === -1) {
                    index = j;
                } else if (type === "Best Fit" &&
                           blocks[j] < blocks[index]) {
                    index = j;
                } else if (type === "Worst Fit" &&
                           blocks[j] > blocks[index]) {
                    index = j;
                }
            }
        }

        if (index !== -1) {
            available[index] = false;
            fulfilled++;
            usedMemory += processes[i];
            fragmentation += blocks[index] - processes[i];

            allocations.push({
                process: i + 1,
                size: processes[i],
                block: index + 1,
                blockSize: blocks[index],
                status: "Allocated"
            });
        } else {
            failed++;

            allocations.push({
                process: i + 1,
                size: processes[i],
                block: "-",
                blockSize: "-",
                status: "Not Allocated"
            });
        }
    }

    let totalMemory = blocks.reduce((a, b) => a + b, 0);
    let unused = 0;

    for (let i = 0; i < blocks.length; i++) {
        if (available[i]) {
            unused += blocks[i];
        }
    }

    return {
        name: type,
        allocations: allocations,
        totalMemory: totalMemory,
        usedMemory: usedMemory,
        utilization: totalMemory > 0
            ? (usedMemory / totalMemory) * 100
            : 0,
        fragmentation: fragmentation,
        unused: unused,
        fulfilled: fulfilled,
        failed: failed
    };
}

function showCard(data) {
    let rows = "";

    for (let item of data.allocations) {
        let statusClass = item.status === "Allocated"
            ? "success"
            : "failure";

        rows +=
            "<tr>" +
            "<td>" + item.process + "</td>" +
            "<td>" + item.size + "</td>" +
            "<td>" + item.block + "</td>" +
            "<td>" + item.blockSize + "</td>" +
            '<td class="' + statusClass + '">' +
            item.status + "</td>" +
            "</tr>";
    }

    return `
        <div class="result-card">
            <h3>${data.name}</h3>

            <p><b>Total Memory:</b> ${data.totalMemory} KB</p>
            <p><b>Memory Utilization:</b> ${data.utilization.toFixed(2)}%</p>
            <p><b>Internal Fragmentation:</b> ${data.fragmentation} KB</p>
            <p><b>Unused Block Space:</b> ${data.unused} KB</p>
            <p><b>Processes Fulfilled:</b> ${data.fulfilled}</p>
            <p><b>Processes Failed:</b> ${data.failed}</p>

            <h4>Process Allocation Details</h4>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Process</th>
                            <th>Size</th>
                            <th>Block</th>
                            <th>Block Size</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function showComparison(best, worst) {
    let rows = [
        ["Total Memory (KB)", best.totalMemory, worst.totalMemory],
        ["Memory Utilization (%)", best.utilization.toFixed(2),
            worst.utilization.toFixed(2)],
        ["Internal Fragmentation (KB)", best.fragmentation,
            worst.fragmentation],
        ["Unused Block Space (KB)", best.unused, worst.unused],
        ["Processes Fulfilled", best.fulfilled, worst.fulfilled],
        ["Processes Failed", best.failed, worst.failed]
    ];

    let html = "";

    for (let row of rows) {
        let bestValue = Number(row[1]);
        let worstValue = Number(row[2]);
        let bestClass = "";
        let worstClass = "";

        if (row[0] === "Memory Utilization (%)" ||
            row[0] === "Processes Fulfilled") {
            if (bestValue > worstValue) bestClass = "best-value";
            if (worstValue > bestValue) worstClass = "best-value";
        }

        if (row[0] === "Internal Fragmentation (KB)" ||
            row[0] === "Unused Block Space (KB)" ||
            row[0] === "Processes Failed") {
            if (bestValue < worstValue) bestClass = "best-value";
            if (worstValue < bestValue) worstClass = "best-value";
        }

        html += `
            <tr>
                <td>${row[0]}</td>
                <td class="${bestClass}">${row[1]}</td>
                <td class="${worstClass}">${row[2]}</td>
            </tr>
        `;
    }

    document.getElementById("comparison").innerHTML = html;

    let summary = "";

    if (best.fulfilled > worst.fulfilled) {
        summary = `Best Fit allocated ${best.fulfilled} processes compared
        with ${worst.fulfilled} for Worst Fit.`;
    } else if (worst.fulfilled > best.fulfilled) {
        summary = `Worst Fit allocated ${worst.fulfilled} processes compared
        with ${best.fulfilled} for Best Fit.`;
    } else {
        summary = `Both algorithms allocated ${best.fulfilled} processes.`;
    }

    summary += ` Best Fit utilization was ${best.utilization.toFixed(2)}%,
    while Worst Fit utilization was ${worst.utilization.toFixed(2)}%.
    Compare utilization, fragmentation, and failed processes together
    to understand their performance.`;

    document.getElementById("summary").textContent =
        summary.replace(/\s+/g, " ").trim();
}

function runOne(type) {
    let input = getInput();

    if (!input) return;

    let result = allocate(input.blocks, input.processes, type);

    document.getElementById("results").innerHTML = showCard(result);

    document.getElementById("comparison").innerHTML =
        '<tr><td colspan="3">Click Compare Both to compare the algorithms.</td></tr>';

    document.getElementById("summary").textContent =
        type + " simulation completed successfully.";
}

function compareBoth() {
    let input = getInput();

    if (!input) return;

    let best = allocate(input.blocks, input.processes, "Best Fit");
    let worst = allocate(input.blocks, input.processes, "Worst Fit");

    document.getElementById("results").innerHTML =
        showCard(best) + showCard(worst);

    showComparison(best, worst);
}

function resetAll() {
    document.getElementById("blocks").value =
        "100, 500, 200, 300, 600";

    document.getElementById("processes").value =
        "212, 417, 112, 426";

    document.getElementById("results").innerHTML =
        '<p class="placeholder">Enter the inputs and run a simulation.</p>';

    document.getElementById("comparison").innerHTML =
        '<tr><td colspan="3">Run Compare Both to see the comparison.</td></tr>';

    document.getElementById("summary").textContent =
        "The performance summary will appear here.";

    document.getElementById("error").textContent = "";
    document.getElementById("error").style.display = "none";

    document.getElementById("blocks").classList.remove("invalid");
    document.getElementById("processes").classList.remove("invalid");
}

function exitApp() {
    if (confirm("Do you want to exit the simulator?")) {
        document.body.innerHTML =
            '<div style="text-align:center;padding:100px 20px;' +
            'font-family:Arial;color:#24458f">' +
            '<h1>Simulator Closed</h1>' +
            '<p>You can close this browser tab.</p>' +
            '<button onclick="location.reload()" ' +
            'style="margin-top:20px;padding:12px;background:#2864e8;' +
            'color:white;border:0;border-radius:6px;cursor:pointer">' +
            'Reopen Simulator</button></div>';
    }
}