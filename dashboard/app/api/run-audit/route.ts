import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const runAuditScript = path.resolve(rootDir, "run_audit.py");

    // Execute python3 run_audit.py from root
    if (fs.existsSync(runAuditScript)) {
      try {
        await execAsync("python3 run_audit.py", { cwd: rootDir });
      } catch (err) {
        console.warn("Python execution warning (falling back to existing trace):", err);
      }
    }

    const auditTracePath = path.resolve(rootDir, "audit_trace.json");
    if (fs.existsSync(auditTracePath)) {
      const content = fs.readFileSync(auditTracePath, "utf-8");
      return NextResponse.json(JSON.parse(content));
    }

    const publicPath = path.resolve(process.cwd(), "public", "audit_trace.json");
    if (fs.existsSync(publicPath)) {
      const content = fs.readFileSync(publicPath, "utf-8");
      return NextResponse.json(JSON.parse(content));
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
