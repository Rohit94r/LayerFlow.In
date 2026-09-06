"use client";

import { useRouter } from "next/navigation";
import { CommandPalette } from "@/components/ui/command-palette";
import { useCopy } from "@/lib/hooks";
import { applyTheme, persistTheme, readStoredTheme, resolveInitialTheme, emitThemeToggle } from "@/lib/theme";
import type { CommandItem } from "@/lib/config/commands";
import { appConfig } from "@/lib/config/site";

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { copy } = useCopy();
  const router = useRouter();

  const handleAction = (item: CommandItem) => {
    switch (item.action) {
      case "toggle-theme": {
        const next = (readStoredTheme() ?? resolveInitialTheme()) === "light" ? "dark" : "light";
        persistTheme(next);
        applyTheme(next);
        emitThemeToggle();
        break;
      }
      case "copy-install": {
        void copy(appConfig.installCommand);
        break;
      }
      case "new-rescue": {
        router.push("/chat");
        break;
      }
    }
  };

  return <CommandPalette open={open} onClose={onClose} onAction={handleAction} />;
}
