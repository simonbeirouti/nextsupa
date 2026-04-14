"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearCachedAuthUser,
  getCachedAuthUser,
  setCachedAuthUser,
} from "@/lib/query/persistence";
import { createClient } from "@/lib/supabase/client";

type AuthUser = {
  email: string | null;
  id: string;
};

type AuthContextValue = {
  isLoading: boolean;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    email: user.email ?? null,
    id: user.id,
  };
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const router = useRouter();

  const persistUser = useEffectEvent((nextUser: AuthUser | null) => {
    const persistenceTask = nextUser ? setCachedAuthUser(nextUser) : clearCachedAuthUser();

    void persistenceTask.catch((error) => {
      console.error("Failed to persist auth user", error);
    });
  });

  const applySession = useEffectEvent(
    ({ refreshServer, session }: { refreshServer: boolean; session: Session | null }) => {
      if (!isMountedRef.current) {
        return;
      }

      const nextUser = mapUser(session?.user ?? null);
      const previousUserId = previousUserIdRef.current;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = previousUserId !== nextUserId;

      previousUserIdRef.current = nextUserId;
      setUser(nextUser);
      setIsLoading(false);
      persistUser(nextUser);

      if (refreshServer && (userChanged || (!nextUserId && previousUserId))) {
        startTransition(() => {
          router.refresh();
        });
      }
    },
  );

  const hydrateCachedUser = useEffectEvent(async () => {
    try {
      const cachedUser = await getCachedAuthUser();

      if (!isMountedRef.current || !cachedUser) {
        return;
      }

      previousUserIdRef.current = cachedUser.id;
      setUser(cachedUser);
    } catch (error) {
      console.error("Failed to hydrate cached auth user", error);
      return;
    }
  });

  const handleAuthStateChange = useEffectEvent(
    (event: AuthChangeEvent, session: Session | null) => {
      const shouldRefreshServer =
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED";

      applySession({
        refreshServer: shouldRefreshServer,
        session,
      });
    },
  );

  useEffect(() => {
    isMountedRef.current = true;
    const supabase = createClient();

    void hydrateCachedUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      handleAuthStateChange(event, session);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ isLoading, user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
