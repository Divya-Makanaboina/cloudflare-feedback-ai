

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/ingest") {
      const { text } = await request.json();

      await env.DB.prepare(
        "INSERT INTO feedback (text) VALUES (?)"
      ).bind(text).run();

      return Response.json({ status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/summary") {
      const rows = await env.DB.prepare(
        "SELECT text FROM feedback ORDER BY created_at DESC LIMIT 20"
      ).all();

      const combined = rows.results.map(r => r.text).join("\n");

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: `Summarize the following feedback:\n${combined}`
      });

      return Response.json(aiResponse);
    }

    if (request.method === "POST" && url.pathname === "/analyze") {
      const body = await request.json();
      const feedback = body.feedback;

      const prompt = `
You are a product manager analyzing customer feedback.

Feedback:
"""
${feedback}
"""

Return a JSON object with:
- summary (1–2 sentences)
- sentiment (Positive, Neutral, or Negative)
- urgency (Low, Medium, or High)
`;

      const aiResponse = await env.AI.run(
        "@cf/meta/llama-3-8b-instruct",
        {
          messages: [
            { role: "user", content: prompt }
          ]
        }
      );

      return Response.json(aiResponse);
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Feedback Analyzer</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 700px;
              margin: auto;
            }
            textarea {
              width: 100%;
              height: 150px;
              margin-bottom: 20px;
            }
            button {
              padding: 10px 20px;
              font-size: 16px;
            }
            pre {
              background: #f4f4f4;
              padding: 15px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>Feedback Analyzer (Prototype)</h1>
          <p>Paste customer feedback below and analyze it.</p>

          <textarea id="feedback"></textarea><br />
          <button onclick="analyze()">Analyze</button>

          <pre id="result"></pre>

          <script>
            async function analyze() {
              const feedback = document.getElementById("feedback").value;
              const res = await fetch("/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedback })
              });
              const data = await res.json();
              document.getElementById("result").textContent =
                JSON.stringify(data, null, 2);
            }
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }
};
