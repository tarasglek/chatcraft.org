import { createBrowserRouter, Navigate, redirect } from "react-router-dom";

import App from "./App";
import { loadShare } from "./lib/share";
import { ChatCraftChat } from "./lib/ChatCraftChat";

export default createBrowserRouter([
  // Redirect users from / -> /new so they can create a chat
  {
    path: "/",
    element: <Navigate to="/new" />,
  },
  // Create a new chat
  {
    path: "/new",
    async loader() {
      const chat = new ChatCraftChat();
      await chat.save();
      return redirect(`/c/${chat.id}`);
    },
  },
  // People shouldn't end-up here, but create new chat if they do
  {
    path: "/c",
    element: <Navigate to="/new" />,
  },
  // Load a chat, making sure it exists first
  {
    path: "/c/:id",
    async loader({ params }) {
      // If we try to load a chat, and it doesn't exist, create it first
      // so that we have something to render.
      const { id } = params;
      if (id && !(await ChatCraftChat.find(id))) {
        const chat = new ChatCraftChat({ id });
        await chat.save();
      }
      return null;
    },
    element: <App />,
  },
  // For an existing chat and redirect to it
  {
    path: "/c/:id/fork",
    async loader({ params }) {
      const { id } = params;
      if (id) {
        const chat = await ChatCraftChat.find(id);
        if (chat) {
          const forked = await chat.fork();
          return redirect(`/c/${forked.id}`);
        }
      }
      // Shouldn't happen, don't crash
      console.log("Unexpected redirect to /new, could not find chat to fork!");
      return redirect("/new");
    },
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
