
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Attempt simple query
        const userCount = await prisma.user.count();

        return NextResponse.json({
            status: "ok",
            message: "Database connected successfully",
            userCount,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV,
            }
        });
    } catch (error: any) {
        console.error("Database health check failed:", error);
        return NextResponse.json({
            status: "error",
            message: "Database connection failed",
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
