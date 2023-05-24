import { createContext, useEffect, useCallback, useContext, type FC, type ReactNode } from "react";
import useClearParams from "use-clear-params";
import { useLocalStorage } from "react-use";

type UserContextType = {
  user?: User;
  token?: string;
  login: () => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  user: undefined,
  token: undefined,
  login: () => {
    /* do nothing */
  },
  logout: () => {
    /* do nothing */
  },
});

export const useUser = () => useContext(UserContext);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const query = useClearParams();
  const [token, setToken] = useLocalStorage<string | undefined>("gh_token");
  const [user, setUser] = useLocalStorage<User | undefined>("gh_user");

  useEffect(() => {
    if (!query) {
      return;
    }

    const token = query.get("token");
    const username = query.get("login");
    const name = query.get("name");
    const avatarUrl = query.get("avatar");

    if (username && name && avatarUrl) {
      setUser({
        username,
        name,
        avatarUrl,
      });
    }

    if (token) {
      setToken(token);
    }
  }, [query, setUser, setToken]);

  const logout = useCallback(() => {
    setUser(undefined);
  }, [setUser]);

  const value = {
    user,
    token,
    login() {
      window.location.href = "/api/login";
    },
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
