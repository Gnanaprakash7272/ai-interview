import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id;
    const { name, skills, experienceLevel, resumeText } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Parse skills: accept both string (comma-separated) and array
    const skillsArray: string[] = Array.isArray(skills)
      ? skills
      : (typeof skills === "string" && skills.trim())
        ? skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        skills: skillsArray,
        experienceLevel: experienceLevel || "fresher",
        resumeText: resumeText || "",
        isProfileComplete: true,
      },
      { new: true }
    ).select("-password");

    return NextResponse.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error: any) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
