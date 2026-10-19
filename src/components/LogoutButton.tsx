"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="mp-btn-ghost w-full"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/connexion");
        router.refresh();
      }}
    >
      <LogOut size={16} /> Se déconnecter
    </button>
  );
}
