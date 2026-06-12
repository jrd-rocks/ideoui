export function getGCD(a, b) {
    return b ? getGCD(b, a % b) : a;
}

export function computeAspectRatio(sizeStr) {
    if (!sizeStr) return "1:1";
    const [width, height] = sizeStr.split("x").map(Number);
    const divisor = getGCD(width, height) || 1;
    return `${width / divisor}:${height / divisor}`;
}

export function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

export async function extractAndRepairJson(text) {
    if (!text) return "";
    let extracted = text.trim();

    // 1. Try to extract JSON codeblock or JSON boundaries
    const jsonBlockMatch = extracted.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch) {
        extracted = jsonBlockMatch[1].trim();
    } else {
        const codeBlockMatch = extracted.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            extracted = codeBlockMatch[1].trim();
        } else {
            const startIdx = extracted.indexOf('{');
            const endIdx = extracted.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                extracted = extracted.substring(startIdx, endIdx + 1);
            }
        }
    }

    // 2. Attempt direct JSON parsing in the browser
    try {
        JSON.parse(extracted);
        return extracted;
    } catch (err) {
        console.warn("Direct JSON parsing failed. Requesting repair from backend...", err);
    }

    // 3. Fallback: Query the backend's json_repair endpoint
    try {
        const response = await fetch("/api/repair_json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: extracted })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.repaired) {
                // Verify the repaired JSON is valid before returning
                JSON.parse(data.repaired);
                return data.repaired;
            }
        }
    } catch (repairErr) {
        console.error("Backend JSON repair failed:", repairErr);
    }

    // If repair fails, run a final parse to throw the original syntax error
    JSON.parse(extracted);
    return extracted;
}
