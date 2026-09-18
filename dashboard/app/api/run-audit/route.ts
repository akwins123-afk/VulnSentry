import { NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rootDir = path.resolve(process.cwd(), "..");
    const interactiveScript = path.resolve(rootDir, "run_interactive_audit.py");
    const runAuditScript = path.resolve(rootDir, "run_audit.py");

    const hasCustomInput = Boolean(body.code || body.prompt || body.trigger_demo_failure !== undefined);

    if (hasCustomInput && fs.existsSync(interactiveScript)) {
      // Run interactive audit script with custom code via stdin
      const pyProcess = spawn("python3", ["run_interactive_audit.py"], {
        cwd: rootDir,
      });

      let stdout = "";
      let stderr = "";

      pyProcess.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      pyProcess.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      const payload = JSON.stringify({
        code: body.code || body.prompt || "",
        trigger_demo_failure: Boolean(body.trigger_demo_failure),
        history: body.history || [],
      });

      pyProcess.stdin.write(payload);
      pyProcess.stdin.end();

      await new Promise<void>((resolve, reject) => {
        pyProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        });
        pyProcess.on("error", reject);
      });

      try {
        const parsed = JSON.parse(stdout);
        const trace = parsed.trace || parsed;
        // Sync to public/audit_trace.json
        const publicPath = path.resolve(process.cwd(), "public", "audit_trace.json");
        fs.writeFileSync(publicPath, JSON.stringify(trace, null, 2), "utf-8");
        return NextResponse.json(trace);
      } catch (e) {
        console.warn("Could not parse interactive output JSON, falling back to file:", e);
      }
    } else if (fs.existsSync(runAuditScript)) {
      await new Promise<void>((resolve) => {
        exec("python3 run_audit.py", { cwd: rootDir }, () => resolve());
      });
    }

    const auditTracePath = path.resolve(rootDir, "audit_trace.json");
    if (fs.existsSync(auditTracePath)) {
      const content = fs.readFileSync(auditTracePath, "utf-8");
      const json = JSON.parse(content);
      const publicPath = path.resolve(process.cwd(), "public", "audit_trace.json");
      fs.writeFileSync(publicPath, content, "utf-8");
      return NextResponse.json(json);
    }

    return NextResponse.json({ error: "audit_trace.json not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Failed to run audit:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute audit" },
      { status: 500 }
    );
  }
}
