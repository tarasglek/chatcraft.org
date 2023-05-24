import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import { loadShare } from "./lib/share";

export default createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  // XXX: need better nested routing, just a hack to get started with loading a chat
  {
    path: ":user/:chatId",
    async loader({ params }) {
      const { user, chatId } = params;
      if (!(user && chatId)) {
        return;
      }

      try {
        const chat = await loadShare(user, chatId);
        return chat;
      } catch (err) {
        console.warn(`Error loading shared chat ${user}/${chatId}`, err);
      }
    },
    // TODO: should split <App /> up so I can load bits into <Outlet />s
    element: <App />,
  },
]);
