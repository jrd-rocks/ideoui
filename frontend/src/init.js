let isReportingError = false;

// Function to report frontend errors back to the backend terminal log
async function reportErrorToBackend(errorMsg, text, url = "", status = "", context = "") {
  if (isReportingError) return;
  isReportingError = true;
  try {
    // Skip reporting logs for the log endpoint itself to avoid loops
    if (url && url.includes("/api/log_error")) {
      return;
    }
    await fetch("/api/log_error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: errorMsg,
        text: text,
        url: url,
        status: status,
        context: context
      })
    });
  } catch (e) {
    // Ignore error logging failures
  } finally {
    isReportingError = false;
  }
}

// Global interception for JSON.parse errors to log the erroneous input
const originalParse = JSON.parse;
JSON.parse = function(text, reviver) {
  try {
    return originalParse(text, reviver);
  } catch (err) {
    console.error("JSON.parse failed!");
    console.error("Erroneous input string:", text);
    console.error("Original parsing error:", err);
    reportErrorToBackend(err.message, text, "", "", "JSON.parse");
    throw err;
  }
};

// Global interception for Response.prototype.json to print details on bad responses
const originalResponseJson = Response.prototype.json;
Response.prototype.json = async function() {
  const text = await this.text();
  try {
    return originalParse(text);
  } catch (err) {
    console.error(`Response.json() failed to parse. Status: ${this.status}, URL: ${this.url}`);
    console.error("Erroneous response body content:", text);
    console.error("Original parsing error:", err);
    reportErrorToBackend(err.message, text, this.url, String(this.status), "Response.json");
    throw err;
  }
};
