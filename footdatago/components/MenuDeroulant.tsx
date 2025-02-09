'use client'

import { ChartPie, CreditCard, DoorOpen, LogOut, Menu, Settings, Star, Table2, User } from "lucide-react";
import { useSession, signOut } from 'next-auth/react'
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuGroup,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UtilisateurAbonner } from "@/app/pro/action";

export function MenuDeroulant() {
 const { data: session } = useSession()

 const { data } = useQuery({
  queryKey: ["utilisateurabonner"],
  queryFn: async () => UtilisateurAbonner(),
});

const utilisateurabonner = data?.abonner

 return (
  <>
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Menu className="cursor-pointer text-white" />
     </DropdownMenuTrigger>
     <DropdownMenuContent className="w-56">
       <div className="flex items-center gap-2 px-2 py-1.5">
         <Avatar className="h-6 w-6">
           <AvatarImage 
             src={session ? session.user?.image ?? "" : "https://cdn.vox-cdn.com/thumbor/r0U59Lx7DOSI2Z_F7WLnzcbQfuU=/1400x1400/filters:format(jpeg)/cdn.vox-cdn.com/uploads/chorus_asset/file/24953495/1698708349.jpg"} 
             alt={session ? session.user?.name ?? "User avatar" : "Logo"}
           />
           <AvatarFallback>{session ? session.user?.name?.[0]?.toUpperCase() : "LFC"}</AvatarFallback>
         </Avatar>
         <DropdownMenuLabel className="px-0">Mon compte</DropdownMenuLabel>
       </div>
       <DropdownMenuSeparator />

       {session && utilisateurabonner && (
         <>
         <DropdownMenuGroup>
             <Link href={process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL!} className="cursor-pointer">
               <DropdownMenuItem>
                 <CreditCard className="mr-2 h-4 w-4 text-black" />
                 <span className="text-black font-medium">Abonnement</span>
               </DropdownMenuItem>
             </Link>
           </DropdownMenuGroup>
          
         </>
       )}
       
       <DropdownMenuSeparator />

       {session ? (
     
         <DropdownMenuGroup>
           <DropdownMenuItem>
             <User className="mr-2 h-4 w-4" />
             <span>{session.user?.name || 'Profil'}</span>
           </DropdownMenuItem>
           <DropdownMenuItem>
             <ChartPie className="mr-2 h-4 w-4" />
             <span>Data</span>
           </DropdownMenuItem>
           <DropdownMenuItem>
             <Table2 className="mr-2 h-4 w-4" />
             <span>Classement</span>
           </DropdownMenuItem>
           <DropdownMenuItem>
             <Star className="mr-2 h-4 w-4" />
             <span>Favoris</span>
           </DropdownMenuItem>
           <DropdownMenuItem>
             <Settings className="mr-2 h-4 w-4" />
             <span>Paramètres</span>
           </DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => signOut()}>
             <LogOut className="mr-2 h-4 w-4" />
             <span>Déconnexion</span>
           </DropdownMenuItem>
         </DropdownMenuGroup>
       ) : (
  

        <Link href="connexion">

         <DropdownMenuItem >
           <DoorOpen className="mr-2 h-4 w-4" />
           <span>Connexion</span>
         </DropdownMenuItem>

</Link>
       )}
     </DropdownMenuContent>
   </DropdownMenu>
   </>
 )
}