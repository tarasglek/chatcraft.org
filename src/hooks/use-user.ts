import { useState, useEffect } from "react";
import useClearParams from "use-clear-params";

// We expect to get a URL like: https://chatcraft.org/?token=...&login=... etc
// Remove the values from the URL and put into state as `user`.
function useUser() {
  const query = useClearParams();
  const [user, setUser] = useState<User | undefined>();

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

  return user;
}

export default useUser;
