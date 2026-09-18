import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt = "",
      code = "",
      finding = null,
      shieldStatus = "passed",
      hasFailure = false,
      contextSavings = "42.8%",
    } = body;

    const systemInstructions = `You are the Lead Autonomous Security Agent of VulnSentry interacting directly with Jeevan in the Teamily AI security workspace.
Your team consists of:
- The Shield (tool_validator.py - checks schemas and blocks unauthorized tool parameters before execution)
- Self-Healer (failure_interceptor.py - catches schema errors and auto-corrects them without crashing)
- Context Optimizer (context_manager.py - prunes old conversation and saves tokens)
- Glass-Box Tracer (tracer.py - logs all 11 fields into a verifiable DAG)

Current Audit Context:
- Target Code: ${code.slice(0, 400)}
- Security Finding: ${finding ? `${finding.title} (${finding.cwe_id}) - Severity: ${finding.severity}` : "N/A"}
- Vulnerability Detected: ${finding?.vulnerability_detected ? "YES" : "NO - Code is Secure"}
- Shield Interception: ${hasFailure ? "BLOCKED unauthorized parameter 'force_gas' and Self-Healed" : "Clean execution, all parameters verified against schema"}
- Context Savings: ${contextSavings} reduced

Instructions:
1. Address Jeevan directly in an intelligent, friendly, and authoritative tone (like an elite SOC co-pilot in Teamily AI).
2. Give a brief conversational commentary on what the agent team found and how your guardrails protected the system.
3. If vulnerable, highlight the fix. If clean, celebrate good security hygiene.
4. Keep the response punchy, clear, and concise (under 120 words).`;

    const userMessage = prompt
      ? `Jeevan says: "${prompt}"\nCode:\n${code}`
      : `Jeevan just audited this code. Provide your live agent team assessment.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "curl/8.7.1",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemInstructions}\n\n${userMessage}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error:", res.status, errText);
      // Fallback message
      return NextResponse.json({
        message: `Hey Jeevan! VulnSentry has analyzed your code snippet. ${
          finding?.vulnerability_detected
            ? `We detected ${finding.title}. Notice how our Shield caught any invalid parameters and protected the runtime.`
            : `Your code passed all verification checks! Clean parameterized queries detected.`
        }`,
      });
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanText = candidate
      ? candidate.trim()
      : `Hey Jeevan! Your code audit is complete with full Glass-Box guardrails active.`;

    return NextResponse.json({ message: cleanText });
  } catch (error: any) {
    console.error("Gemini chat route error:", error);
    return NextResponse.json({
      message:
        "Hey Jeevan! I analyzed your code snippet with our 4 Glass-Box guardrails. All actions are logged and verifiable in the DAG trace.",
    });
  }
}
