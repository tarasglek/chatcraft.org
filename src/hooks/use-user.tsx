import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  type FC,
  type ReactNode,
  useState,
  useMemo,
} from "react";
import { useCookie } from "react-use";
import { decodeJwt } from "jose";
import useSWR from "swr";
import { isProd } from "../lib/utils";

type UserContextType = {
  user?: User;
  login: (provider: string, chatId?: string) => void;
  logout: (chatId?: string) => Promise<void>;
};

interface UserInfoResponse {
  username?: string;
  name?: string;
  avatarUrl?: string;
  systemProviders?: Record<
    string,
    {
      apiUrl: string;
      defaultModel: string;
      apiKey: string;
    }
  >;
}

const fetchUserInfo = async (url: string): Promise<UserInfoResponse> => {
  // XXX - just for testing
  const systemProviders = {
    "Custom AI Providers": {
      apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
      defaultModel: "auto",
      apiKey: "api-key",
    },
  };

  return {
    username: "username",
    name: "name",
    avatarUrl: "avatar-url",
    systemProviders,
  };

  // const res = await fetch(url, { credentials: "same-origin" });
  // if (!res.ok) throw new Error("Failed to fetch user info");
  // return res.json();
};

const UserContext = createContext<UserContextType>({
  user: undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login: (chatId?: string) => {
    /* do nothing */
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout: (chatId?: string) => {
    return new Promise(() => {
      /* do nothing */
    });
  },
});

export const useUser = () => useContext(UserContext);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // We set both an id_token and access_token in the serverless functions, but
  // only the id_token is available to the browser.
  const cookieName = isProd() ? "__Host-id_token" : "id_token";
  const [idToken] = useCookie(cookieName);
  const [cookieUser, setCookieUser] = useState<User | undefined>();

  // Try to fetch user info from the /api/user-info endpoint
  const { data: apiUserInfo, mutate } = useSWR("/api/user-info", fetchUserInfo, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  // Also parse the cookie-based user info (eventually we'll do this via /api/user-info)
  useEffect(() => {
    if (!idToken) {
      return;
    }

    // Try to extract user info from the idToken's payload
    try {
      const { username, name, avatarUrl } = decodeJwt(idToken);
      if (
        typeof username === "string" &&
        typeof name === "string" &&
        typeof avatarUrl === "string"
      ) {
        setCookieUser({ username, name, avatarUrl });
      } else {
        console.warn("ChatCraft ID Token missing expected values, ignoring", {
          username,
          name,
          avatarUrl,
        });
      }
    } catch (err) {
      console.error("Unable to decode id token", { err, idToken });
    }
  }, [idToken]);

  // Merge cookie and API user info, preferring API data
  const user = useMemo(() => {
    if (!apiUserInfo && !cookieUser) {
      return undefined;
    }

    const merged = {
      ...cookieUser,
      ...apiUserInfo,
    };

    // Only return a valid User if we have all required fields
    if (merged.username && merged.name && merged.avatarUrl) {
      return merged as User;
    }

    return undefined;
  }, [apiUserInfo, cookieUser]);

  const logout = useCallback(
    async (chatId?: string) => {
      const logoutUrl = chatId ? `/api/logout?chat_id=${chatId}` : `/api/login`;

      try {
        const res = await fetch(logoutUrl, { credentials: "same-origin" });
        if (!res.ok) {
          throw new Error("Unable to logout");
        }
      } catch (err) {
        console.warn("Logout error", err);
      } finally {
        // Clear both cookie user and API cache
        setCookieUser(undefined);
        await mutate(undefined, { revalidate: false });
      }
    },
    [mutate]
  );

  const value = {
    user,
    login(provider: string, chatId?: string) {
      const loginUrl = chatId
        ? `/api/login?provider=${provider}&chat_id=${chatId}`
        : `/api/login?provider=${provider}`;
      window.location.href = loginUrl;
    },
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
