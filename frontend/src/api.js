const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Sends code to the backend for AI review.
 * @param {string} code - The source code to analyze
 * @param {string} language - One of: python, javascript, java, cpp, auto
 * @returns {Promise<object>} - Parsed AnalyzeResponse JSON
 * @throws {Error} - With a user-friendly message on any failure
 */
export async function analyzeCode(code, language) {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  });

  const data = await response.json();

  if (!response.ok) {
    // FastAPI sends { detail: "..." } on errors
    const message =
      data?.detail ||
      `Server error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}
