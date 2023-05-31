import { createBrowserRouter, Navigate, redirect } from "react-router-dom";

import Chat from "./Chat";
import { loadShare } from "./lib/share";
import { ChatCraftChat } from "./lib/ChatCraftChat";
import Search, { loader as searchLoader } from "./Search";
import db from "./lib/db";
import { getUser } from "./lib/storage";

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

  // People shouldn't end-up here, so create new chat if they do
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
    element: <Chat readonly={false} />,
  },
  // Fork an existing chat and redirect to it. If a `messageId` is included,
  // use that as our starting message vs. whole chat (partial fork)
  {
    path: "/c/:chatId/fork/:messageId?",
    async loader({ params }) {
      const { chatId, messageId } = params;

      if (!chatId) {
        // Shouldn't happen, don't crash
        console.error("No chatId passed to /fork");
        return redirect("/new");
      }

      const chat = await ChatCraftChat.find(chatId);
      if (!chat) {
        console.error("Couldn't find chat with given chatId");
        return redirect("/new");
      }

      // Pass the starting message id, if we have one
      const forked = await chat.fork(messageId);
      if (!forked) {
        console.error("Couldn't fork");
        return redirect("/new");
      }

      return redirect(`/c/${forked.id}`);
    },
  },
  // Loading a shared chat, which may or may not be owned by this user
  {
    path: "/c/:user/:chatId",
    async loader({ params }) {
      const { user, chatId } = params;
      if (!(user && chatId)) {
        return redirect("/");
      }

      // Check if we own this share
      const currentUser = getUser();
      if (currentUser?.username === user && (await db.chats.get(chatId))) {
        return redirect(`/c/${chatId}`);
      }

      // Otherwise, try to load it remotely
      try {
        return loadShare(user, chatId);
      } catch (err) {
        console.warn(`Error loading shared chat ${user}/${chatId}`, err);
        redirect(`/`);
      }
    },
    element: <Chat readonly={true} />,
  },

  // Search. Process `GET /s?q=...` and return results
  {
    path: "/s",
    loader: searchLoader,
    element: <Search />,
  },
]);
