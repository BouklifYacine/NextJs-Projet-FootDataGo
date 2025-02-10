'use server'

import { prisma } from "@/prisma"
import { compare, hash } from "bcryptjs"
import { sendEmail } from "@/app/utils/email"
import { createElement } from "react"
import CodeConfirmation from "@/app/(emails)/CodeConfirmation"
import EmailChangement from "@/app/(emails)/ChangementEmail"
import NotifChangementMotDePasse from "@/app/(emails)/NotifChangementMotDePasse"
import EmailChangementPseudo from "@/app/(emails)/EmailChangementPseudo"
import SuppressionCompte from "@/app/(emails)/SuppressionCompte"
import { revalidatePath } from "next/cache"
import { auth, signOut } from "@/auth"
import { TypeEmail, TypeMotDePasse, TypePseudo } from "./schema"
import { redirect } from "next/navigation"

export async function verifierMotDePasse(motdepasse: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Non autorisé")

    const utilisateur = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    })

    if (!utilisateur) throw new Error("Utilisateur non trouvé")

    if (utilisateur.accounts.length > 0) {
      const provider = utilisateur.accounts[0].provider
      throw new Error(`Cette fonctionnalité n'est pas disponible car votre compte est lié à ${provider}`)
    }

    if (!utilisateur.password) {
      throw new Error("Aucun mot de passe défini pour ce compte")
    }

    const motDePasseValide = await compare(motdepasse, utilisateur.password)
    if (!motDePasseValide) throw new Error("Mot de passe incorrect")

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        resetToken: resetCode,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
      }
    })

    await sendEmail({
      to: utilisateur.email!,
      subject: "Code de vérification",
      emailComponent: createElement(CodeConfirmation, {
        resetCode,
        pseudo: utilisateur.name || "Utilisateur"
      })
    })

    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function changerEmail(donnees: TypeEmail) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Non autorisé")

    const { nouvelEmail, codeVerification } = donnees

    const emailExistant = await prisma.user.findUnique({
      where: { email: nouvelEmail }
    })

    if (emailExistant) {
      throw new Error("Cet email est déjà utilisé")
    }

    const utilisateur = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        resetToken: codeVerification,
        resetTokenExpiry: { gt: new Date() }
      }
    })

    if (!utilisateur) {
      throw new Error("Code de vérification invalide ou expiré")
    }

    const ancienEmail = utilisateur.email

    await prisma.$transaction(async (db) => {
      await db.user.update({
        where: { id: session?.user?.id },
        data: {
          email: nouvelEmail,
          resetToken: null,
          resetTokenExpiry: null
        }
      })
      await db.session.deleteMany({
        where: { userId: session?.user?.id}
      })
    })

    await Promise.all([
      sendEmail({
        to: ancienEmail!,
        subject: "Changement de votre email",
        emailComponent: createElement(EmailChangement, {
          pseudo: utilisateur.name || "",
          email: nouvelEmail,
          ancienemail: ancienEmail || ""
        })
      }),
      sendEmail({
        to: nouvelEmail,
        subject: "Confirmation de votre nouvel email",
        emailComponent: createElement(EmailChangement, {
          pseudo: utilisateur.name || "",
          email: nouvelEmail,
          ancienemail: ancienEmail || ""
        })
      })
    ])

    revalidatePath('/parametres')
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function changerMotDePasse(donnees: TypeMotDePasse) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Non autorisé")

    const { motdepasse, codeverification } = donnees

    const utilisateur = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        resetToken: codeverification,
        resetTokenExpiry: { gt: new Date() }
      }
    })

    if (!utilisateur) {
      throw new Error("Code de vérification invalide ou expiré")
    }

    const motDePasseHashe = await hash(motdepasse, 10)

    await prisma.$transaction(async (db) => {
      await db.user.update({
        where: { id: session?.user?.id },
        data: {
          password: motDePasseHashe,
          resetToken: null,
          resetTokenExpiry: null
        }
      })
      await db.session.deleteMany({
        where: { userId: session?.user?.id }
      })
    })

    await sendEmail({
      to: utilisateur.email!,
      subject: "Changement de mot de passe",
      emailComponent: createElement(NotifChangementMotDePasse, {
        pseudo: utilisateur.name || ""
      })
    })

    revalidatePath('/parametres')
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function changerPseudo(donnees: { pseudo: string, codeverification?: string }) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Non autorisé")

    const { pseudo, codeverification } = donnees

    // Vérifier l'utilisateur et ses accounts
    const utilisateur = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    })

    if (!utilisateur) throw new Error("Utilisateur non trouvé")

    const hasProvider = utilisateur.accounts.length > 0

    // Vérifier si le pseudo existe déjà
    const pseudoExistant = await prisma.user.findUnique({
      where: { name: pseudo }
    })

    if (pseudoExistant) {
      throw new Error("Ce pseudo est déjà utilisé")
    }

    // Pour les utilisateurs avec credentials, vérifier le code
    if (!hasProvider) {
      if (!codeverification) {
        throw new Error("Code de vérification requis")
      }

      const codeValide = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          resetToken: codeverification,
          resetTokenExpiry: { gt: new Date() }
        }
      })

      if (!codeValide) {
        throw new Error("Code de vérification invalide ou expiré")
      }
    }

    const ancienPseudo = utilisateur.name

    // Mise à jour selon le type d'authentification
    const updateData = hasProvider 
      ? { name: pseudo }
      : { 
          name: pseudo,
          resetToken: null,
          resetTokenExpiry: null
        }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    // Envoyer l'email de confirmation
    await sendEmail({
      to: utilisateur.email!,
      subject: "Changement de pseudo",
      emailComponent: createElement(EmailChangementPseudo, {
        pseudo: ancienPseudo || "",
        name: pseudo
      })
    })

    revalidatePath('/parametres')
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function supprimerCompte() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Non autorisé" }
    }

    const utilisateur = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    })

    if (!utilisateur) {
      return { error: "Utilisateur non trouvé" }
    }

    try {
      await prisma.$transaction(async (db) => {
        await db.session.deleteMany({
          where: { userId: session?.user?.id }
        })
        await db.account.deleteMany({
          where: { userId: session?.user?.id}
        })
        await db.authenticator.deleteMany({
          where: { userId: session?.user?.id }
        })
        
        if (utilisateur.clientId) {
          try {
            await db.abonnement.delete({
              where: { userId: session?.user?.id }
            })
          } catch (error) {
            console.error("Erreur lors de la suppression de l'abonnement:", error)
          }
        }
        
        await db.user.delete({
          where: { id: session?.user?.id }
        })
      })

      await sendEmail({
        to: utilisateur.email!,
        subject: "Suppression de votre compte",
        emailComponent: createElement(SuppressionCompte, {
          pseudo: utilisateur.name || ""
        })
      })

      await signOut()
      revalidatePath('/')
      redirect('/')
      
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      return { error: "Une erreur est survenue lors de la suppression du compte" }
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur générale:", error)
    return { error: (error as Error).message }
  }
}