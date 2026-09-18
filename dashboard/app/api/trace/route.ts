import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const primaryPath = path.resolve(rootDir, "audit_trace.json");
    const localPath = path.resolve(process.cwd(), "audit_trace.json");
    const publicPath = path.resolve(process.cwd(), "public", "audit_trace.json");

    let filePath = "";
    if (fs.existsSync(primaryPath)) {
      filePath = primaryPath;
    } else if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    } else if (fs.existsSync(localPath)) {
      filePath = localPath;
    }

    if (!filePath) {
      return NextResponse.json(
        { error: "audit_trace.json not found. Run python3 run_audit.py first." },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const traceJson = JSON.parse(fileContent);

    return NextResponse.json(traceJson);
  } catch (error: any) {
    console.error("Error reading audit_trace.json:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load audit trace" },
      { status: 500 }
    );
  }
}
