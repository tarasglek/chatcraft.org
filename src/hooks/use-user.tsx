import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  type FC,
  type ReactNode,
  useState,
} from "react";
import { useCookie } from "react-use";
import { decodeJwt } from "jose";

type UserContextType = {
  user?: User;
  login: (chatId?: string) => void;
  logout: (chatId?: string) => Promise<void>;
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
  const [idToken] = useCookie("__Host-id_token");
  const [user, setUser] = useState<User | undefined>();

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
        setUser({ username, name, avatarUrl });
      }
    } catch (err) {
      console.error("Unable to decode id token", { err, idToken });
    }
  }, [idToken, setUser]);

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
        // No matter what, remove the user in storage
        setUser(undefined);
      }
    },
    [setUser]
  );

  const value = {
    user,
    login(chatId?: string) {
      const loginUrl = chatId ? `/api/login?chat_id=${chatId}` : `/api/login`;
      window.location.href = loginUrl;
    },
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
