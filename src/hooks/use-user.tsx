import { createContext, useEffect, useCallback, useContext, type FC, type ReactNode } from "react";
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

// We may or may not have user info on the search params. Consume if we do.
function extractUser(queryParams: URLSearchParams) {
  const username = queryParams.get("login");
  const name = queryParams.get("name");
  const avatarUrl = queryParams.get("avatar");

  if (username && name && avatarUrl) {
    queryParams.delete("login");
    queryParams.delete("name");
    queryParams.delete("avatar");

    return { username, name, avatarUrl };
  }
}

// We may or may not have a token on the search params. Consume if we do.
function extractToken(queryParams: URLSearchParams) {
  const token = queryParams.get("token");

  if (token) {
    queryParams.delete("token");
    return token;
  }
}

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useLocalStorage<string | undefined>("gh_token");
  const [user, setUser] = useLocalStorage<User | undefined>("gh_user");

  useEffect(() => {
    const { pathname, search, hash } = location;

    if (!search) {
      return;
    }

    const queryParams = new URLSearchParams(search);
    let shouldUpdateUrl = false;

    const user = extractUser(queryParams);
    if (user) {
      setUser(user);
      shouldUpdateUrl = true;
    }

    const token = extractToken(queryParams);
    if (token) {
      setToken(token);
      shouldUpdateUrl = true;
    }

    if (shouldUpdateUrl) {
      let url = `${pathname}?${queryParams}`;
      if (hash) {
        url += `${hash}`;
      }

      history.replaceState({}, "", url);
    }
  }, [setUser, setToken]);

  const logout = useCallback(() => {
    setUser(undefined);
    setToken(undefined);
  }, [setUser, setToken]);

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
