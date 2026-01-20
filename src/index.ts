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
      "${feedback}"

      Return ONLY valid JSON with this structure:
      {
        "summary": "string",
        "sentiment": "Positive | Neutral | Negative",
        "urgency": "Low | Medium | High"
      }

      Do not include explanations, markdown, or extra text.
      Return ONLY JSON.
      `;

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt
      });

      let summary, sentiment, urgency;
      try { 
        const parsed = JSON.parse(aiResponse.response); 
        summary = parsed.summary; 
        sentiment = parsed.sentiment; urgency = parsed.urgency; 
      } catch (err) { 
        return Response.json({ 
          error: "AI returned invalid JSON", 
          raw: aiResponse.response 
        }, { status: 500 }); 
      }

      await env.DB.prepare(
        `INSERT INTO feedback (text, summary, sentiment, urgency, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(feedback, summary, sentiment, urgency).run();

      return Response.json({ summary, sentiment, urgency });
    }

    
    if (request.method === "GET" && url.pathname === "/list") {
      const rows = await env.DB.prepare(
        "SELECT * FROM feedback ORDER BY created_at DESC"
      ).all();

      return Response.json(rows.results);
    }

    if (request.method === "GET" && url.pathname === "/dashboard") {
      return new Response(`
        <html>
          <head>
            <title>Feedback Dashboard</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
              th { background: #f4f4f4; }
            </style>
          </head>
          <body>
            <h1>Feedback Dashboard</h1>
            <table>
              <thead>
                <tr>
                  <th>Feedback</th>
                  <th>Summary</th>
                  <th>Sentiment</th>
                  <th>Urgency</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody id="rows"></tbody>
            </table>

            <script>
              fetch('/list')
                .then(res => res.json())
                .then(data => {
                  const tbody = document.getElementById('rows');
                  data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = \`
                      <td>\${row.text}</td>
                      <td>\${row.summary}</td>
                      <td>\${row.sentiment}</td>
                      <td>\${row.urgency}</td>
                      <td>\${row.created_at}</td>
                    \`;
                    tbody.appendChild(tr);
                  });
                });
            </script>
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" }});
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
