
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, motdepasseactuel, nouveaumotdepasse } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Compte non trouvé" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(motdepasseactuel, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(nouveaumotdepasse, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Mot de passe mis à jour" });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur" },
      { status: 500 }
    );
  }
}