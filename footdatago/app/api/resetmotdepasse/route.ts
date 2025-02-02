import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { createElement } from "react";
import { sendEmail } from "@/app/utils/email";
import ResetPasswordEmail from "@/app/(emails)/ResetPassword";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Génère un code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 3600000); // 1 heure normalement

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: resetCode,
        resetTokenExpiry: codeExpiry,
      },
    });

    const emailElement = createElement(ResetPasswordEmail, { resetCode });
    await sendEmail({
      to: email,
      subject: "Code de réinitialisation",
      emailComponent: emailElement,
    });

    return NextResponse.json({ message: "Code envoyé par email" });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur" },
      { status: 500 }
    );
  }
}