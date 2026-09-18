import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { TracePayload } from "@/app/types";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Look for latest_trace.json in data/ directory or public/data/
    const dataDirTrace = path.resolve(process.cwd(), "..", "data", "latest_trace.json");
    const localDataTrace = path.resolve(process.cwd(), "data", "latest_trace.json");
    const publicDataTrace = path.resolve(process.cwd(), "public", "data", "latest_trace.json");

    let filePath = "";
    if (fs.existsSync(dataDirTrace)) {
      filePath = dataDirTrace;
    } else if (fs.existsSync(localDataTrace)) {
      filePath = localDataTrace;
    } else if (fs.existsSync(publicDataTrace)) {
      filePath = publicDataTrace;
    }

    if (filePath) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed: TracePayload = JSON.parse(raw);
      return NextResponse.json(parsed);
    }

    // If file doesn't exist yet, run scripts/generate_trace.py
    const rootDir = path.resolve(process.cwd(), "..");
    const scriptPath = path.resolve(rootDir, "scripts", "generate_trace.py");
    await execAsync(`python3 "${scriptPath}"`, { cwd: rootDir });

    if (fs.existsSync(dataDirTrace)) {
      const raw = fs.readFileSync(dataDirTrace, "utf-8");
      return NextResponse.json(JSON.parse(raw));
    }

    return NextResponse.json({ error: "Trace file not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load trace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const triggerFailure = body.trigger_failure !== false;
    const customCode = body.code_snippet;

    const rootDir = path.resolve(process.cwd(), "..");
    const scriptPath = path.resolve(rootDir, "scripts", "generate_trace.py");

    // Write temp code snippet if custom code provided
    if (customCode) {
      const tempFixture = path.resolve(rootDir, "test_fixtures", "vulnerable_app.py");
      fs.writeFileSync(tempFixture, customCode, "utf-8");
    }

    // Run trace generator
    await execAsync(`python3 "${scriptPath}"`, { cwd: rootDir });

    const dataDirTrace = path.resolve(rootDir, "data", "latest_trace.json");
    if (fs.existsSync(dataDirTrace)) {
      const raw = fs.readFileSync(dataDirTrace, "utf-8");
      return NextResponse.json(JSON.parse(raw));
    }

    return NextResponse.json({ error: "Failed to generate trace" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Execution failed" }, { status: 500 });
  }
}
