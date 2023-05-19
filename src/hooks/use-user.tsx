import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  type FC,
  type ReactNode,
} from "react";
import useClearParams from "use-clear-params";

type UserContextType = {
  user?: User;
  login: () => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  user: undefined,
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
  const [user, setUser] = useState<User | undefined>({
    avatarUrl: "https://avatars.githubusercontent.com/u/427398?v=4",
    name: "David Humphrey",
    token: "...",
    username: "humphd",
  });

  useEffect(() => {
    if (!query) {
      return;
    }

    const token = query.get("token");
    const username = query.get("login");
    const name = query.get("name");
    const avatarUrl = query.get("avatar");

    if (token && username && name && avatarUrl) {
      setUser({
        token,
        username,
        name,
        avatarUrl,
      });
    }
  }, [query, setUser]);

  const logout = useCallback(() => {
    setUser(undefined);
  }, [setUser]);

  const value = {
    user,
    login() {
      window.location.href = "/api/login";
    },
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
